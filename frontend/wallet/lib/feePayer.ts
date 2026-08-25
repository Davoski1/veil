import { Keypair } from '@stellar/stellar-sdk'
import { deriveFeePayerSeedFromPrf, evaluateFeePayerPrf, type PrfEvaluator } from '@veil/prf'

import { deriveFeePayerKeypair } from './deriveFeePayer'
import { getNetwork } from './network'

/**
 * Single accessor for the fee-payer (sponsor) key — the one place the rest of
 * the app reads it from (ADR 0003). Two derivation modes, pinned per wallet:
 *
 *  - **prf** — the seed is derived from a WebAuthn PRF output, so it is
 *    passkey-bound (only an authenticator holding the credential can produce it)
 *    and the plaintext seed is kept in `sessionStorage` only, never
 *    `localStorage`. This fixes C2 (was derived from the non-secret credential
 *    ID) and C3 (was persisted in plaintext across sessions), and makes the
 *    inactivity lock meaningful — the seed is gone once the tab closes / locks.
 *
 *  - **legacy** — today's behaviour: seed = HKDF(credentialId), persisted in
 *    `localStorage`. Used for wallets created before this change and as the
 *    fallback when the authenticator does not support PRF, so no device is ever
 *    bricked (the fallback preserves the exact prior behaviour).
 *
 * The mode is decided once, at first establishment, and pinned in
 * `veil_feepayer_mode` so a wallet's fee-payer address never changes mid-life:
 * a wallet with an already-persisted secret stays legacy; a brand-new wallet
 * tries PRF and pins whichever mode actually worked.
 */

const KEY_ID = 'invisible_wallet_key_id'
const SECRET = 'veil_signer_secret'
const PUBKEY = 'veil_signer_public_key'
const MODE = 'veil_feepayer_mode'

/**
 * How the fee-payer seed is produced.
 *
 *  - **prf-raw**   PRF output used directly as the Ed25519 seed. This is what
 *                  the MOBILE app does, so it is the interoperable variant and
 *                  the default for new wallets.
 *  - **prf-hkdf**  PRF output run through HKDF first. What the web wallet used
 *                  to do unconditionally — kept so wallets already pinned that
 *                  way keep their existing G-address.
 *  - **legacy**    HKDF over the (non-secret) credential ID. Pre-PRF wallets.
 */
export type FeePayerMode = 'prf-raw' | 'prf-hkdf' | 'legacy'

// Session-scoped, in-memory cache. For the PRF mode this (plus sessionStorage)
// is the ONLY place the seed lives — it is re-derived via a passkey assertion
// when the session is cold. Cleared on lock via clearFeePayer().
let cached: Keypair | null = null

function hasWindow(): boolean {
  return typeof window !== 'undefined'
}

/** The pinned derivation mode for this wallet, or null if not yet established. */
export function getFeePayerMode(): FeePayerMode | null {
  if (!hasWindow()) return null
  const m = localStorage.getItem(MODE)
  // 'prf' is what older builds wrote, and it meant the HKDF variant.
  if (m === 'prf') return 'prf-hkdf'
  return m === 'prf-raw' || m === 'prf-hkdf' || m === 'legacy' ? m : null
}

/**
 * Synchronous read of the established fee-payer secret for this session, without
 * triggering a passkey prompt. Returns the in-memory cache first, then the
 * session/local persisted secret (legacy). Callers that only need to *use* an
 * already-established key (the common case, mid-session) use this.
 */
export function peekFeePayerSecret(): string | null {
  if (cached) return cached.secret()
  if (!hasWindow()) return null
  return sessionStorage.getItem(SECRET) || localStorage.getItem(SECRET)
}

/** Convenience: the established fee-payer Keypair, or null. Sync, no prompt. */
export function peekFeePayerKeypair(): Keypair | null {
  const secret = peekFeePayerSecret()
  if (!secret) return null
  try {
    return Keypair.fromSecret(secret)
  } catch {
    return null
  }
}

/**
 * Establish the fee-payer for this session, deriving it if necessary. Idempotent
 * and memoised — the interactive PRF assertion runs at most once per cold
 * session. Call this at session entry points (wallet create, recover, unlock,
 * dashboard mount) so later synchronous {@link peekFeePayerSecret} reads succeed.
 *
 * On any PRF failure (unsupported authenticator, cancelled ceremony, error) it
 * falls back to the legacy credential-ID derivation, so it never leaves the
 * caller without a key on a device that worked before.
 *
 * @param evaluator injectable PRF ceremony, for tests / non-browser platforms.
 */
export async function ensureFeePayer(evaluator?: PrfEvaluator): Promise<Keypair | null> {
  if (cached) return cached
  if (!hasWindow()) return null

  const pinned = getFeePayerMode()
  const existing = peekFeePayerSecret()

  // Fast path: the session already holds a secret under a pinned mode → reuse it
  // with no prompt.
  if (existing && pinned) {
    cached = Keypair.fromSecret(existing)
    return cached
  }

  const credentialId = localStorage.getItem(KEY_ID)
  if (!credentialId) {
    // No passkey registered yet — best-effort from any persisted secret.
    cached = existing ? Keypair.fromSecret(existing) : null
    return cached
  }

  // A persisted secret with no pinned mode is a wallet from before modes
  // existed: it is legacy by definition, and its G-address may be funded. Treat
  // it as pinned so no PRF ceremony runs and the address cannot move.
  const effectiveMode: FeePayerMode | null = pinned ?? (existing ? 'legacy' : null)

  const candidates: Array<{ mode: FeePayerMode; kp: Keypair }> = []

  if (effectiveMode !== 'legacy') {
    try {
      const prf = await evaluateFeePayerPrf(credentialId, undefined, evaluator)
      if (prf && prf.length >= 32) {
        // Mobile uses the PRF output directly; the web used to HKDF it. Same
        // passkey, same PRF output, different seed — which is why a wallet
        // created on the phone resolved to a different (unfunded) G-address
        // here. Both are derived so whichever one actually exists can win.
        candidates.push({ mode: 'prf-raw', kp: Keypair.fromRawEd25519Seed(Buffer.from(prf.subarray(0, 32))) })
        const hkdf = await deriveFeePayerSeedFromPrf(prf)
        candidates.push({ mode: 'prf-hkdf', kp: Keypair.fromRawEd25519Seed(Buffer.from(hkdf)) })
      }
    } catch {
      // PRF cancelled/unsupported → the legacy candidate below still applies.
    }
  }

  candidates.push({ mode: 'legacy', kp: await deriveFeePayerKeypair(credentialId) })

  // If the wallet was pinned, honour that exactly — moving a funded account
  // because a probe failed would be worse than a failed probe.
  const chosen = effectiveMode
    ? candidates.find((c) => c.mode === effectiveMode) ?? candidates[0]!
    : (await pickFundedCandidate(candidates)) ?? candidates[0]!

  cached = chosen.kp
  localStorage.setItem(MODE, chosen.mode)
  sessionStorage.setItem(SECRET, chosen.kp.secret())
  sessionStorage.setItem(PUBKEY, chosen.kp.publicKey())
  // Only the legacy variant is recoverable without the passkey, so only it is
  // persisted; PRF seeds stay session-scoped (ADR 0003, C3).
  if (chosen.mode === 'legacy') {
    localStorage.setItem(SECRET, chosen.kp.secret())
    localStorage.setItem(PUBKEY, chosen.kp.publicKey())
  }
  return chosen.kp
}

/**
 * Pick the candidate whose account already exists on-chain.
 *
 * The variants are all deterministic, so the only question is which one this
 * wallet was actually created with — and the ledger already knows. Probing beats
 * guessing: guessing wrong strands the user on an unfunded fee-payer with no
 * error message and no way to pay the fee that would fix it.
 *
 * Returns null when none exist (a genuinely new wallet), leaving the caller to
 * take the first candidate — prf-raw, which is what mobile produces, so a wallet
 * created here stays recoverable there.
 */
async function pickFundedCandidate(
  candidates: Array<{ mode: FeePayerMode; kp: Keypair }>,
): Promise<{ mode: FeePayerMode; kp: Keypair } | null> {
  const { horizonUrl } = getNetwork()
  for (const candidate of candidates) {
    try {
      const res = await fetch(`${horizonUrl}/accounts/${candidate.kp.publicKey()}`)
      if (res.ok) return candidate
    } catch {
      // Network trouble — try the next rather than claiming this one is absent.
    }
  }
  return null
}

/**
 * Drop the in-memory + session copies of the fee-payer (call on inactivity
 * lock). For a PRF-mode wallet nothing recoverable remains afterwards — the seed
 * is re-derived from the passkey on the next {@link ensureFeePayer}. Legacy
 * wallets still have their seed in localStorage (unchanged), so unlock restores
 * it without a prompt.
 */
export function clearFeePayer(): void {
  cached = null
  if (!hasWindow()) return
  sessionStorage.removeItem(SECRET)
  sessionStorage.removeItem(PUBKEY)
}

/**
 * Full teardown (logout / wipe): drop every copy of the fee-payer, including the
 * pinned mode and the legacy localStorage seed.
 */
export function resetFeePayer(): void {
  cached = null
  if (!hasWindow()) return
  sessionStorage.removeItem(SECRET)
  sessionStorage.removeItem(PUBKEY)
  localStorage.removeItem(SECRET)
  localStorage.removeItem(PUBKEY)
  localStorage.removeItem(MODE)
}
