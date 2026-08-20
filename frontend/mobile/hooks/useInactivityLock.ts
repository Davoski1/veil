import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useRouter, useSegments } from 'expo-router';

import { createIdleWatcher } from '../lib/appLock';
import { getWalletAddress } from '../lib/walletStore';
import { isPasskeySupported } from '../lib/passkey';

/**
 * Locks the wallet after inactivity or when the app is backgrounded, so a lost
 * or borrowed phone doesn't expose funds.
 *
 * The countdown lives in `lib/appLock.ts`; this hook wires it to React Native's
 * `AppState` and expo-router. Sending the app to the background locks it
 * immediately; returning to the foreground restarts the idle countdown. Either
 * trigger routes to `/lock`, which re-prompts a biometric. It re-arms itself off
 * the current route so it never fights the lock screen it just pushed.
 *
 * The lock only arms once a wallet exists. Before then there is nothing to
 * protect, and `/lock` would be a dead end — there is no passkey to unlock with —
 * so an onboarding user must never be sent there. (This is also what stops a
 * fresh install from being trapped on the lock screen the moment Expo Go hands
 * off to the project and fires an `AppState` background event.)
 *
 * Mount once at the app root (alongside the connectivity gate in `_layout.tsx`).
 */
export function useInactivityLock(): void {
  const router = useRouter();
  const segments = useSegments();
  const onLockRoute = segments[0] === 'lock';

  useEffect(() => {
    // Already locked — don't re-arm on top of the lock screen.
    if (onLockRoute) return;

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    (async () => {
      const wallet = await getWalletAddress().catch(() => null);
      if (cancelled || !wallet) return; // no wallet → never lock

      // The lock screen can only be dismissed with a passkey. Where passkeys are
      // unavailable (Expo Go — no native module), locking would trap the user with
      // no way back in, so don't arm it. A dev build (real passkeys) locks normally.
      if (!isPasskeySupported()) return;

      const lock = () => router.replace('/lock');
      const watcher = createIdleWatcher({ onLock: lock });
      watcher.start();

      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'background') {
          // Backgrounded: lock now so returning requires a biometric.
          watcher.stop();
          lock();
        }
      });

      cleanup = () => {
        watcher.stop();
        subscription.remove();
      };
    })();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [router, onLockRoute]);
}
