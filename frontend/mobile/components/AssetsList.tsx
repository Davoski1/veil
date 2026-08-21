import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Horizon } from '@stellar/stellar-sdk';
import { useFocusEffect, useRouter } from 'expo-router';

import { TokenIcon } from './TokenIcon';
import { useTheme } from '../hooks/useTheme';
import { useCurrency } from '../hooks/useCurrency';
import { useHiddenAmounts } from '../hooks/useHiddenAmounts';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import { getNetwork } from '../lib/network';
import { fetchPrice, usdValue } from '../lib/fetchPrice';

type Holding = {
  code: string;
  name: string;
  issuer: string | null;
  balance: string;
  usd: number | null;
};

/** Display name for well-known assets; falls back to the code. */
const ASSET_NAMES: Record<string, string> = {
  XLM: 'Lumens',
  USDC: 'USD Coin',
};

function isAccountNotFound(err: unknown): boolean {
  const e = err as { name?: string; response?: { status?: number } };
  return e?.name === 'NotFoundError' || e?.response?.status === 404;
}

/** Trim a raw balance to at most 4 decimals, grouped. */
function fmtAmount(raw: string): string {
  const n = Number(raw);
  if (!isFinite(n)) return raw;
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
}

async function loadHoldings(address: string): Promise<Holding[]> {
  const server = new Horizon.Server(getNetwork().horizonUrl);
  let balances: Array<{ asset_type: string; asset_code?: string; asset_issuer?: string; balance: string }>;
  try {
    const account = await server.loadAccount(address);
    balances = account.balances as typeof balances;
  } catch (err) {
    if (isAccountNotFound(err)) return [];
    throw err;
  }

  // Native XLM first, then classic assets. Pool shares are skipped.
  const rows: Array<{ code: string; issuer: string | null; balance: string }> = [];
  for (const b of balances) {
    if (b.asset_type === 'native') rows.unshift({ code: 'XLM', issuer: null, balance: b.balance });
    else if ((b.asset_type === 'credit_alphanum4' || b.asset_type === 'credit_alphanum12') && b.asset_code) {
      rows.push({ code: b.asset_code, issuer: b.asset_issuer ?? null, balance: b.balance });
    }
  }

  // Price each holding (best-effort, in parallel).
  return Promise.all(
    rows.map(async (r): Promise<Holding> => {
      const price = await fetchPrice(r.code, r.issuer);
      return {
        code: r.code,
        name: ASSET_NAMES[r.code] ?? r.code,
        issuer: r.issuer,
        balance: r.balance,
        usd: usdValue(r.balance, price),
      };
    }),
  );
}

/**
 * The wallet's portfolio — one row per held asset (native XLM + trustlines), with
 * a token badge, name, on-chain balance, and its value in the user's currency.
 * Mirrors the assets list every consumer wallet shows under the balance.
 */
export function AssetsList({ address }: { address: string | null }) {
  const router = useRouter();
  const { colors } = useTheme();
  const { format } = useCurrency();
  const { mask } = useHiddenAmounts();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!address) {
      setHoldings([]);
      return;
    }
    try {
      setHoldings(await loadHoldings(address));
      setLoadError(false);
    } catch (err) {
      console.warn('[assets] loadHoldings failed:', err instanceof Error ? `${err.name}: ${err.message}` : err);
      setHoldings([]);
      setLoadError(true);
    }
  }, [address]);

  useEffect(() => {
    void load();
  }, [load]);

  // Reload on focus so new trustlines/balances (e.g. USDC after a swap) appear.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Assets</Text>
      {holdings === null ? (
        <Text style={styles.empty}>Loading…</Text>
      ) : holdings.length === 0 ? (
        <Text style={styles.empty}>
          {loadError ? "Couldn't load assets — pull to refresh." : 'No assets yet. Fund this wallet to get started.'}
        </Text>
      ) : (
        holdings.map((h, i) => (
          <Pressable
            key={`${h.code}-${h.issuer ?? 'native'}`}
            onPress={() => router.push(`/token/${encodeURIComponent(h.issuer ? `${h.code}:${h.issuer}` : h.code)}`)}
            accessibilityRole="button"
            accessibilityLabel={`${h.name} details`}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowBorder, pressed && styles.pressed]}
          >
            <View style={styles.left}>
              <TokenIcon code={h.code} size={38} />
              <View>
                <Text style={styles.name}>{h.name}</Text>
                <Text style={styles.code}>{h.code}</Text>
              </View>
            </View>
            <View style={styles.right}>
              <Text style={styles.balance}>{mask(fmtAmount(h.balance))}</Text>
              <Text style={styles.fiat}>{h.usd === null ? '—' : mask(format(h.usd))}</Text>
            </View>
          </Pressable>
        ))
      )}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 6,
    },
    heading: {
      color: colors.accent,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingVertical: 4,
    },
    empty: {
      color: colors.textMuted,
      fontFamily: fontFamily.body,
      fontSize: 13,
      paddingVertical: 12,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 13,
    },
    rowBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pressed: { opacity: 0.6 },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flexShrink: 1,
    },
    name: {
      color: colors.textPrimary,
      fontFamily: fontFamily.bodyMedium,
      fontSize: 14.5,
    },
    code: {
      color: colors.textFaint,
      fontFamily: fontFamily.body,
      fontSize: 11,
      marginTop: 2,
    },
    right: {
      alignItems: 'flex-end',
    },
    balance: {
      color: colors.textPrimary,
      fontFamily: fontFamily.address,
      fontSize: 14.5,
    },
    fiat: {
      color: colors.textFaint,
      fontFamily: fontFamily.body,
      fontSize: 11,
      marginTop: 2,
    },
  });
