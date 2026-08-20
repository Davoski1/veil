/**
 * The WebAuthn relying-party id — the domain passkeys are scoped to. Must be a
 * live domain we control that serves the Android assetlinks association file
 * (and, for iOS, apple-app-site-association).
 *
 * NOTE: veil.xyz is NOT owned (parked / for sale), so the canonical
 * `app.veil.xyz` from older configs cannot work. The live wallet deployment
 * is the relying party.
 */
export function getRelyingPartyId(): string {
  return process.env['EXPO_PUBLIC_PASSKEY_RP_ID']?.trim() || 'veil-ezry.vercel.app';
}
