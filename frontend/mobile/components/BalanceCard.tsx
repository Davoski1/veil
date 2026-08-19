import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Horizon } from '@stellar/stellar-sdk';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useHiddenAmounts } from '../hooks/useHiddenAmounts';
import type { ThemeColors } from '../lib/theme';
import { CURRENCY_CODES } from '../lib/currency';
import { getNetwork } from '../lib/network';
import { getWalletAddress } from '../lib/walletStore';
import { fetchPrice, formatUsd, usdValue } from '../lib/fetchPrice';

/** A 404 from Horizon means the account exists in-wallet but isn't funded yet. */
function isAccountNotFound(err: unknown): boolean {
  const e = err as { name?: string; response?: { status?: number } };
  return e?.name === 'NotFoundError' || e?.response?.status === 404;
}

async function fetchNativeBalance(publicKey: string): Promise<string> {
  const server = new Horizon.Server(getNetwork().horizonUrl);
  try {
    const account = await server.loadAccount(publicKey);
    const native = account.balances.find((b) => b.asset_type === 'native');
    return native ? native.balance : '0';
  } catch (err) {
    if (isAccountNotFound(err)) return '0'; // unfunded → zero, not an error
    throw err;
  }
}

type State =
  | { status: 'loading' }
  | { status: 'no-wallet' }
  | { status: 'error' }
  | { status: 'ready'; balance: string; usd: number | null };

export type BalanceCardProps = {
  /** If provided, overrides the internal balance loading logic. */
  balance?: string;
  /** If provided, overrides the internal price loading logic. */
  usd?: number | null;
  /** If provided, overrides the internal loading status. */
  loading?: boolean;
  /** If provided, overrides the internal error status. */
  error?: boolean;
};

/**
 * The dashboard's primary balance — the fiat-facing hero of the wallet.
 *
 * Veil is fiat-first: the big number is the balance in the user's chosen local
 * currency (₦, $, KSh…), and the dollar/USDC figure sits underneath as the
 * "under the hood" line. The fiat value derives from the native XLM balance and
 * its price from the Lens oracle (`fetchPrice`), converted to local currency by
 * `useCurrency`. Both degrade gracefully: when the oracle can't price the
 * balance the card falls back to showing the raw crypto amount, so a slow or
 * gated oracle never blanks the screen.
 *
 * Two controls live on the card because both are global preferences that any
 * screen shares: the eye toggles "hide amounts" (`useHiddenAmounts`), and the
 * currency chip cycles the display currency (`useCurrency`).
 */
export function BalanceCard({ balance: propBalance, usd: propUsd, loading: propLoading, error: propError }: BalanceCardProps = {}) {
  const { colors } = useTheme();
  const { currency, select, format } = useCurrency();
  const { hidden, toggle: toggleHidden, mask } = useHiddenAmounts();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [state, setState] = useState<State>({ status: 'loading' });

  const load = useCallback(async () => {
    if (propBalance !== undefined) return;
    setState({ status: 'loading' });
    try {
      const address = await getWalletAddress();
      if (!address) {
        setState({ status: 'no-wallet' });
        return;
      }
      // Balance is load-bearing; price is best-effort and settles independently.
      const [balance, price] = await Promise.all([
        fetchNativeBalance(address),
        fetchPrice('XLM', null),
      ]);
      setState({ status: 'ready', balance, usd: usdValue(balance, price) });
    } catch {
      setState({ status: 'error' });
    }
  }, [propBalance]);

  useEffect(() => {
    void load();
  }, [load]);

  // Cycle to the next display currency — a lightweight picker good enough for the
  // hero; a full currency sheet can replace it later.
  const cycleCurrency = useCallback(() => {
    const i = CURRENCY_CODES.indexOf(currency);
    select(CURRENCY_CODES[(i + 1) % CURRENCY_CODES.length]);
  }, [currency, select]);

  // Determine active status and fields based on props vs state
  const isControlled = propBalance !== undefined;
  const isLoading = isControlled ? !!propLoading : state.status === 'loading';
  const isError = isControlled ? !!propError : state.status === 'error';
  const showBalance = isControlled ? propBalance : (state.status === 'ready' ? state.balance : null);
  const showUsd = isControlled ? (propUsd ?? null) : (state.status === 'ready' ? state.usd : null);

  const hasFiat = showUsd !== null;
  // Hero: fiat when we can price it, else the raw crypto amount so the balance
  // is never hidden behind a missing price.
  const heroText = hasFiat ? format(showUsd) : (showBalance ?? '0');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.label}>Total balance</Text>
        <View style={styles.controls}>
          <Pressable
            onPress={cycleCurrency}
            accessibilityRole="button"
            accessibilityLabel={`Display currency: ${currency}. Tap to change.`}
            hitSlop={8}
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.chipText}>{currency}</Text>
            <ChevronDown color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={toggleHidden}
            accessibilityRole="switch"
            accessibilityState={{ checked: hidden }}
            accessibilityLabel={hidden ? 'Show amounts' : 'Hide amounts'}
            hitSlop={8}
            style={({ pressed }) => [styles.eyeButton, pressed && styles.pressed]}
          >
            {hidden ? <EyeOffIcon color={colors.textSecondary} /> : <EyeIcon color={colors.textSecondary} />}
          </Pressable>
        </View>
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && !isError && showBalance === null && (
        <Text style={styles.muted}>No wallet yet — create or import one to see your balance.</Text>
      )}

      {isError && (
        <Text style={styles.error}>Couldn’t load your balance. Pull to refresh.</Text>
      )}

      {!isLoading && !isError && showBalance !== null && (
        <>
          <View style={styles.amountRow}>
            <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
              {mask(heroText)}
            </Text>
            {!hasFiat && <Text style={styles.unit}>XLM</Text>}
          </View>
          {hasFiat && (
            <Text style={styles.subline}>
              {hidden ? mask('') : `≈ ${formatUsd(showUsd)} USDC`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

// ── Icons (react-native-svg, matching ThemeToggle's convention) ──────────────

function EyeIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M1 9s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx="9" cy="9" r="2.5" stroke={color} strokeWidth={1.5} />
    </Svg>
  );
}

function EyeOffIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 18 18" fill="none">
      <Path
        d="M7.3 3.2A7.6 7.6 0 0 1 9 3c5 0 8 6 8 6a13.6 13.6 0 0 1-1.8 2.5M4 4.4A13.4 13.4 0 0 0 1 9s3 6 8 6a7.7 7.7 0 0 0 3-.6"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path d="M7.4 7.4a2.5 2.5 0 0 0 3.3 3.3" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <Line x1="2" y1="2" x2="16" y2="16" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}

function ChevronDown({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 12 12" fill="none">
      <Path d="M3 4.5 6 7.5 9 4.5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      gap: 6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    controls: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    chipText: {
      color: colors.textSecondary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 0.4,
    },
    eyeButton: {
      width: 32,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      color: colors.textFaint,
      fontSize: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    center: {
      paddingVertical: 12,
      alignItems: 'flex-start',
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      marginTop: 4,
    },
    amount: {
      color: colors.textStrong,
      fontSize: 44,
      fontWeight: '800',
      flexShrink: 1,
    },
    unit: {
      color: colors.textSecondary,
      fontSize: 18,
      fontWeight: '600',
    },
    subline: {
      color: colors.accentText,
      fontSize: 15,
      fontWeight: '600',
    },
    muted: {
      color: colors.textSecondary,
      fontSize: 14,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
    },
  });
