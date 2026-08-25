import { Keypair } from '@stellar/stellar-sdk'
import { walletLocal } from '@/lib/walletStorage'

/**
 * Deterministically derive a fee-payer Ed25519 keypair from a WebAuthn credential ID.
 *
 * SECURITY (known limitation — see docs/adr/0003-fee-payer-key-from-webauthn-prf.md):
 * The WebAuthn credential ID is NOT a secret. It is stored in plaintext
 * (`invisible_wallet_key_id`), returned in `allowCredentials` during every
 * assertion, and observable by any relying party. This derivation therefore does
 * NOT bind the fee-payer key to a biometric — anyone who can read the credential
 * ID can reconstruct this keypair with no passkey prompt. The blast radius is the
 * G… fee account only (the C… contract holds the funds), and the acute remote
 * exfiltration path (agent-chat XSS) is closed, but this is weaker than the
 * product's "no private keys" positioning implies. The planned fix (ADR 0003)
 * derives the seed from a WebAuthn PRF output instead — a value only the passkey
 * can produce. Do not add new callers that rely on this being passkey-bound.
 *
 * The derivation uses HKDF (RFC 5869) with SHA-256:
 *   - IKM  = raw credential ID bytes
 *   - salt = fixed domain string to prevent cross-app collisions
 *   - info = version tag so we can rotate the scheme if needed
 *
 * The 32-byte HKDF output is used as an Ed25519 seed.
 */

const SALT = new TextEncoder().encode('veil:feepayer:salt:v1')
const INFO = new TextEncoder().encode('veil:feepayer:ed25519:v1')

function base64UrlToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  const binary = atob(padded)
  const rawId = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) rawId[i] = binary.charCodeAt(i)
  return rawId
}

/**
 * Derive a Stellar Keypair from a base64url-encoded WebAuthn credential ID.
 */
export async function deriveFeePayerKeypair(credentialIdBase64url: string): Promise<Keypair> {
  // Decode base64url → raw bytes
  const rawId = base64UrlToUint8Array(credentialIdBase64url)

  // HKDF: extract then expand
  const keyMaterial = await crypto.subtle.importKey(
    'raw', rawId, 'HKDF', false, ['deriveBits']
  )

  const derived = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: SALT, info: INFO },
    keyMaterial,
    256 // 32 bytes = Ed25519 seed
  )

  return Keypair.fromRawEd25519Seed(Buffer.from(derived))
}

/**
 * Convenience: derive the fee-payer from the credential ID stored in localStorage.
 * Returns null if no credential ID is stored.
 */
export async function deriveStoredFeePayer(): Promise<Keypair | null> {
  const keyId = walletLocal.getItem('invisible_wallet_key_id')
  if (!keyId) return null
  return deriveFeePayerKeypair(keyId)
}
