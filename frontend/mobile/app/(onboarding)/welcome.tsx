import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useTheme } from '../../hooks/useTheme';
import type { ThemeColors } from '../../lib/theme';
import { fontFamily } from '../../theme/typography';
import { VeilLogo } from '../../components/VeilLogo';

const SEEN_WELCOME_KEY = 'veil_seen_welcome';

/** Heights (px) of the little equaliser bars in the header motif. */
const BAR_HEIGHTS = [34, 22, 40, 16, 28, 36, 20, 30];
const BAR_OPACITY = [1, 0.6, 0.85, 0.4, 0.7, 1, 0.5, 0.8];

/**
 * Landing / onboarding entry — the design's "4b" screen.
 *
 * A full-bleed statement of the product ("Spend naira. Earn dollars. No keys.")
 * over the Veil brand, with one primary action (create) and recovery beneath.
 * Redirects straight to the dashboard once a wallet exists.
 */
export default function Welcome() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [ready, setReady] = useState(false);

  // The index route already redirects when a wallet exists, so the landing just
  // renders. A one-tick gate avoids a fonts-not-ready flash on cold start.
  useEffect(() => {
    setReady(true);
  }, []);

  const handleCreate = async () => {
    await AsyncStorage.setItem(SEEN_WELCOME_KEY, '1');
    router.push('/create-wallet');
  };

  const handleRecover = async () => {
    await AsyncStorage.setItem(SEEN_WELCOME_KEY, '1');
    router.push('/recover');
  };

  if (!ready) return <View style={styles.screen} />;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="welcome-screen">
      <View style={styles.body}>
        {/* Header — brand + network */}
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <VeilLogo size={26} color={colors.accent} />
            <Text style={styles.wordmark}>VEIL</Text>
          </View>
          <Text style={styles.network}>SOROBAN · TESTNET</Text>
        </View>

        {/* Ticker + equaliser motif */}
        <View style={styles.motifRow}>
          <Text style={styles.ticker}>EST · 2026 / LAGOS → GLOBAL</Text>
          <View style={styles.motifDivider} />
          <View style={styles.bars}>
            {BAR_HEIGHTS.map((h, i) => (
              <View
                key={i}
                style={[styles.bar, { height: h, opacity: BAR_OPACITY[i] }]}
              />
            ))}
          </View>
        </View>

        {/* Statement */}
        <Text style={styles.statement}>
          Spend{'\n'}naira.{'\n'}Earn{'\n'}dollars.{'\n'}
          <Text style={styles.statementGold}>No keys.</Text>
        </Text>

        {/* Footer facts */}
        <View style={styles.facts}>
          <Text style={styles.factAddr}>GDKF…9QX3</Text>
          <Text style={styles.factYield}>6.2% APY · FEES SPONSORED</Text>
        </View>

        <View style={styles.spacer} />

        <Pressable
          onPress={handleCreate}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          testID="welcome-create"
        >
          <Text style={styles.primaryLabel}>Create wallet with Face ID</Text>
        </Pressable>
        <Pressable
          onPress={handleRecover}
          accessibilityRole="button"
          style={({ pressed }) => [styles.recoverBtn, pressed && styles.pressed]}
        >
          <Text style={styles.recoverLabel}>I already have a wallet</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    body: {
      flex: 1,
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 32,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    wordmark: {
      fontFamily: fontFamily.accent,
      fontSize: 19,
      letterSpacing: 1.5,
      color: colors.accent,
    },
    network: {
      fontFamily: fontFamily.address,
      fontSize: 11,
      letterSpacing: 1.3,
      color: colors.textFaint,
    },
    motifRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      marginTop: 40,
      height: 44,
    },
    ticker: {
      fontFamily: fontFamily.address,
      fontSize: 10,
      letterSpacing: 1.3,
      color: colors.textFaint,
      width: 150,
    },
    motifDivider: {
      width: 1,
      height: 44,
      backgroundColor: colors.border,
    },
    bars: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      height: 44,
    },
    bar: {
      width: 3,
      borderRadius: 1,
      backgroundColor: colors.accent,
    },
    statement: {
      fontFamily: fontFamily.accent,
      fontSize: 50,
      lineHeight: 52,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: colors.textPrimary,
      marginTop: 24,
    },
    statementGold: {
      color: colors.accent,
    },
    facts: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: colors.border,
      marginTop: 22,
      paddingTop: 14,
    },
    factAddr: {
      fontFamily: fontFamily.address,
      fontSize: 11,
      letterSpacing: 1,
      color: colors.textFaint,
    },
    factYield: {
      fontFamily: fontFamily.address,
      fontSize: 11,
      letterSpacing: 1,
      color: colors.positive,
    },
    spacer: {
      flex: 1,
    },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 17,
      alignItems: 'center',
    },
    primaryLabel: {
      color: colors.onAccent,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 15,
    },
    recoverBtn: {
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 4,
    },
    recoverLabel: {
      color: colors.textSecondary,
      fontFamily: fontFamily.bodyMedium,
      fontSize: 14,
    },
    pressed: {
      opacity: 0.7,
    },
  });
