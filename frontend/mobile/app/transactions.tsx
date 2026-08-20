import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { FlowHeader } from '../components/FlowHeader';
import ActivityFeed from '../components/ActivityFeed';
import { hydrateActivityFeed } from '../lib/activityFeed';
import { loadHorizonActivity } from '../lib/horizonActivity';
import { getWalletAddress } from '../lib/walletStore';
import { getNetwork } from '../lib/network';

/**
 * Full transaction history — the "See all" destination from the dashboard's
 * 3-row Activity preview. On testnet it (re)loads straight from Horizon; on
 * mainnet it shows the shared store already populated by Wraith.
 */
export default function TransactionsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const onTestnet = getNetwork().name === 'testnet';

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (onTestnet) {
      const addr = await getWalletAddress().catch(() => null);
      if (addr) {
        try {
          hydrateActivityFeed(await loadHorizonActivity(addr, 100));
        } catch {
          // keep whatever is in the store
        }
      }
    }
    setLoading(false);
  }, [onTestnet]);

  useEffect(() => {
    void load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="transactions-screen">
      <View style={styles.header}>
        <FlowHeader title="Transactions" />
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
      >
        <ActivityFeed filter="all" loading={loading} />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: { paddingHorizontal: 24, paddingTop: 16 },
    body: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 },
  });
