const pkg = require('./package.json');

/**
 * Expo dynamic config: wires iOS associatedDomains from EXPO_PUBLIC_PASSKEY_RP_ID.
 *
 * If EXPO_PUBLIC_PASSKEY_RP_ID is set (e.g. veil.app or your-domain.com), an
 * associatedDomains entry of the form `webcredentials:<rp-id>` will be injected
 * into the generated iOS build config so passkey / credential sharing works.
 */
module.exports = () => {
  const rpId = process.env.EXPO_PUBLIC_PASSKEY_RP_ID || undefined;

  return {
    expo: {
      name: pkg.name || 'veil-mobile',
      slug: pkg.name || 'veil-mobile',
      version: pkg.version || '0.1.0',
      ios: {
        // Only include the associatedDomains section when an rp-id is configured
        associatedDomains: rpId ? [`webcredentials:${rpId}`] : undefined,
      },
    },
  };
};
