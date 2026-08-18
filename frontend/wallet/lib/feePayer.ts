import { Keypair } from '@stellar/stellar-sdk'
import { deriveFeePayerSeedFromPrf, evaluateFeePayerPrf, type PrfEvaluator } from '@veil/prf'

import { deriveFeePayerKeypair } from './deriveFeePayer'

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

export type FeePayerMode = 'prf' | 'legacy'

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
  return m === 'prf' || m === 'legacy' ? m : null
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

  // Decide the mode on first establishment. A wallet that already has a
  // persisted (credential-ID) secret is a pre-existing wallet → keep it legacy
  // so its funded G-address does not move. A fresh wallet tries PRF.
  const mode: FeePayerMode | null = pinned ?? (existing ? 'legacy' : null)

  if (mode !== 'legacy') {
    try {
      const prf = await evaluateFeePayerPrf(credentialId, undefined, evaluator)
      if (prf && prf.length > 0) {
        const seed = await deriveFeePayerSeedFromPrf(prf)
        const kp = Keypair.fromRawEd25519Seed(Buffer.from(seed))
        cached = kp
        localStorage.setItem(MODE, 'prf')
        // C3: the seed lives in sessionStorage only — cleared on lock/tab close.
        sessionStorage.setItem(SECRET, kp.secret())
        sessionStorage.setItem(PUBKEY, kp.publicKey())
        return kp
      }
    } catch {
      // PRF cancelled/unsupported → fall through to the legacy derivation.
    }
  }

  // Legacy path — unchanged behaviour, persisted in localStorage.
  const kp = await deriveFeePayerKeypair(credentialId)
  cached = kp
  localStorage.setItem(MODE, 'legacy')
  localStorage.setItem(SECRET, kp.secret())
  localStorage.setItem(PUBKEY, kp.publicKey())
  sessionStorage.setItem(SECRET, kp.secret())
  return kp
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
