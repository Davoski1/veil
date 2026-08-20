import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors } from '@/components/ScreenScaffold';
import { FirstRunTutorial } from '../../components/OnboardingTutorial';
import { TxDetailSheet } from '../../components/TxDetailSheet';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { VeilLogo } from '../../components/VeilLogo';
import { SilverBalanceCard } from '../../components/SilverBalanceCard';
import { PayForGrid } from '../../components/PayForGrid';
import { AssetsList } from '../../components/AssetsList';
import { fontFamily } from '../../theme/typography';
import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../lib/theme';
import { getWalletAddress } from '../../lib/walletStore';
import ActivityFeed from '../../components/ActivityFeed';
import { useInitActivityFeed, type TxRecord } from '../../lib/activityFeed';
import { usePolling } from '../../hooks/usePolling';
import { fetchDashboardData } from '../../lib/activity';
import { fetchPrice, usdValue } from '../../lib/fetchPrice';

/** Shorten a Stellar address for the header chip: `GDKF…9QX3`. */
function shortAddress(addr: string): string {
  return addr.length > 8 ? `${addr.slice(0, 4)}…${addr.slice(-4)}` : addr;
}

const WRAITH_URL =
  process.env.EXPO_PUBLIC_WRAITH_URL?.replace(/\/+$/, '') ?? null;

/**
 * Dashboard tab — primary destination after unlock.
 *
 * Shows the wallet balance, quick actions, and a live activity feed
 * sourced from the Wraith indexer.
 */
export default function DashboardTab() {
  const { colors: themeColors } = useTheme();
  const themedStyles = useMemo(() => createThemedStyles(themeColors), [themeColors]);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('—');
  const [price, setPrice] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTx, setSelectedTx] = useState<TxRecord | null>(null);
  const detailSheetRef = useRef<BottomSheetModal>(null);

  const handleSelectTx = useCallback((tx: TxRecord) => {
    setSelectedTx(tx);
    detailSheetRef.current?.present();
  }, []);

  // Load the wallet address, balance, and price from secure storage on mount
  useEffect(() => {
    getWalletAddress()
      .then(async (addr) => {
        setWalletAddress(addr);
        if (addr) {
          try {
            const [data, p] = await Promise.all([
              fetchDashboardData(addr),
              fetchPrice('XLM', null),
            ]);
            setBalance(data.xlmBalance);
            setPrice(p);
          } catch {
            setBalance('0');
          }
        }
      })
      .catch(() => setWalletAddress(null));
  }, []);

  // Initialise the activity feed (no-op when address is null — renders empty state)
  const { loading, error, refresh: refreshFeed } = useInitActivityFeed(walletAddress, WRAITH_URL);

  // Background polling for XLM balance and price every 15s
  usePolling(async () => {
    if (walletAddress) {
      try {
        const [data, p] = await Promise.all([
          fetchDashboardData(walletAddress),
          fetchPrice('XLM', null),
        ]);
        setBalance(data.xlmBalance);
        setPrice(p);
      } catch {
        // fail silently during background poll
      }
    }
  }, 15_000, !!walletAddress);

  // Handle pull-to-refresh gesture
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (walletAddress) {
      try {
        const [data, p] = await Promise.all([
          fetchDashboardData(walletAddress),
          fetchPrice('XLM', null),
          refreshFeed(),
        ]);
        setBalance(data.xlmBalance);
        setPrice(p);
      } catch {
        // ignore errors to finish refreshing
      }
    }
    setRefreshing(false);
  }, [walletAddress, refreshFeed]);

  const usd = useMemo(() => usdValue(balance, price), [balance, price]);

  return (
    <SafeAreaView style={themedStyles.screen} edges={['top']} testID="dashboard-screen">
      <ScrollView
        contentContainerStyle={themedStyles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={themeColors.accent}
          />
        }
      >
      {/* Header — Drape logo + wordmark, and the wallet address chip */}
      <View style={themedStyles.homeHeader}>
        <View style={themedStyles.brand}>
          <VeilLogo size={22} color={themeColors.accent} />
          <Text style={themedStyles.wordmark}>VEIL</Text>
        </View>
        {walletAddress ? (
          <View style={themedStyles.addrChip}>
            <Text style={themedStyles.addrText}>{shortAddress(walletAddress)}</Text>
          </View>
        ) : null}
      </View>

      <SilverBalanceCard
        balance={balance === '—' ? undefined : balance}
        usd={usd}
        loading={balance === '—' && loading}
        error={!!error}
      />

      <PayForGrid />

      <AssetsList address={walletAddress} />

      {/* Activity feed */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Activity</Text>
        <Text style={styles.sectionHint}>Recent transfers</Text>
      </View>
      <ActivityFeed filter="all" loading={loading} error={error} onSelectTx={handleSelectTx} />

      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Shows once per install; self-gates on the persisted flag. */}
      <FirstRunTutorial />

      {/* Opened by tapping a row in the activity feed. */}
      <TxDetailSheet ref={detailSheetRef} tx={selectedTx} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sectionTitle: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 11,
  },
  grid: {
    gap: 8,
  },
  errorBanner: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderColor: 'rgba(255, 107, 107, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    textAlign: 'center',
  },
});

const createThemedStyles = (themeColors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      // Extra bottom room so the floating VeilTabBar never covers the last row.
      paddingBottom: 140,
      // Breathing room between the card, Pay-for, Assets, and Activity.
      gap: 22,
    },
    homeHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
      marginBottom: 6,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    wordmark: {
      fontFamily: fontFamily.accent,
      fontSize: 15,
      letterSpacing: 1.2,
      color: themeColors.accent,
    },
    addrChip: {
      borderWidth: 1,
      borderColor: 'rgba(253,218,36,0.18)',
      backgroundColor: 'rgba(253,218,36,0.08)',
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 5,
    },
    addrText: {
      fontFamily: fontFamily.address,
      fontSize: 13,
      color: themeColors.accent,
    },
    connectButton: {
      alignSelf: 'flex-start',
      backgroundColor: themeColors.accent,
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 28,
    },
    pressed: {
      opacity: 0.75,
    },
    connectLabel: {
      color: themeColors.onAccent,
      fontSize: 15,
      fontWeight: '700',
    },
    sessions: {
      alignSelf: 'stretch',
      gap: 8,
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      borderWidth: 1,
      borderColor: themeColors.border,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 12,
    },
    sessionName: {
      color: themeColors.textPrimary,
      fontSize: 14,
      flexShrink: 1,
    },
    disconnect: {
      color: themeColors.accentText,
      fontSize: 13,
      fontWeight: '600',
    },
  });