import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useTheme } from '../../hooks/useTheme';
import { useCurrency } from '../../hooks/useCurrency';
import { CURRENCIES, CURRENCY_CODES } from '../../lib/currency';
import type { ThemeColors } from '../../lib/theme';
import { fontFamily } from '../../theme/typography';
import { getNetwork } from '../../lib/network';
import { getWalletAddress } from '../../lib/walletStore';
import { fundWithFriendbot } from '../../lib/testnetWallet';

type Row = {
  key: string;
  title: string;
  subtitle: string;
  value?: string;
  onPress: () => void;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { colors, isDark, toggle } = useTheme();
  const { currency, meta, select } = useCurrency();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);

  const appearance: Row[] = [
    {
      key: 'theme',
      title: 'Appearance',
      subtitle: 'Light or dark',
      value: isDark ? 'Dark' : 'Light',
      onPress: toggle,
    },
    {
      key: 'currency',
      title: 'Display currency',
      subtitle: 'Tap your balance card to flip between crypto and this',
      value: `${meta.symbol} ${currency}`,
      onPress: () => setCurrencyPickerOpen(true),
    },
  ];

  const security: Row[] = [
    { key: 'passkeys', title: 'Passkeys', subtitle: 'Devices registered on this wallet', onPress: () => {} },
    { key: 'recovery', title: 'Recovery', subtitle: 'Trusted servers to recover access', onPress: () => router.push('/recover') },
    { key: 'lock', title: 'Security & lock', subtitle: 'Auto-lock after inactivity', onPress: () => router.push('/settings/security') },
  ];

  const general: Row[] = [
    { key: 'contacts', title: 'Address book', subtitle: 'Saved recipients and labels', onPress: () => router.push('/contacts') },
    { key: 'about', title: 'About', subtitle: 'Version, licenses, and support', onPress: () => {} },
  ];

  const onTestnet = getNetwork().name === 'testnet';
  const fundTestXlm = async () => {
    const address = await getWalletAddress();
    if (!address) {
      Alert.alert('No wallet', 'Create a wallet first.');
      return;
    }
    const ok = await fundWithFriendbot(address);
    Alert.alert(ok ? 'Funded' : 'Friendbot busy', ok ? 'Test XLM is on its way to your wallet.' : 'Try again in a moment.');
  };
  const developer: Row[] = [
    { key: 'fund', title: 'Fund test XLM', subtitle: 'Top up this wallet from Friendbot', value: 'Testnet', onPress: fundTestXlm },
  ];

  const group = (heading: string, rows: Row[]) => (
    <View style={styles.group}>
      <Text style={styles.groupHeading}>{heading}</Text>
      <View style={styles.card}>
        {rows.map((row, i) => (
          <Pressable
            key={row.key}
            onPress={row.onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.row, i > 0 && styles.rowDivider, pressed && styles.pressed]}
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <Text style={styles.rowSubtitle}>{row.subtitle}</Text>
            </View>
            {row.value ? <Text style={styles.rowValue}>{row.value}</Text> : null}
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top']} testID="settings-screen">
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Settings</Text>

        {group('Appearance', appearance)}
        {group('Security', security)}
        {group('General', general)}
        {onTestnet && group('Developer', developer)}
      </ScrollView>

      <Modal visible={currencyPickerOpen} transparent animationType="fade" onRequestClose={() => setCurrencyPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCurrencyPickerOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Display currency</Text>
            {CURRENCY_CODES.map((code) => {
              const c = CURRENCIES[code];
              const selected = code === currency;
              return (
                <Pressable
                  key={code}
                  onPress={() => { select(code); setCurrencyPickerOpen(false); }}
                  style={({ pressed }) => [styles.sheetRow, pressed && styles.pressed]}
                >
                  <Text style={[styles.sheetSymbol, selected && styles.sheetSelected]}>{c.symbol}</Text>
                  <Text style={[styles.sheetName, selected && styles.sheetSelected]}>{c.label}</Text>
                  <Text style={styles.sheetCode}>{selected ? '✓' : code}</Text>
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 130, gap: 20 },
    title: { color: colors.textStrong, fontFamily: fontFamily.heading, fontSize: 28, marginTop: 8 },
    group: { gap: 8 },
    groupHeading: {
      color: colors.label,
      fontFamily: fontFamily.accent,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      marginLeft: 4,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      overflow: 'hidden',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 16, paddingHorizontal: 16 },
    rowDivider: { borderTopWidth: 1, borderTopColor: colors.border },
    rowText: { flex: 1 },
    rowTitle: { color: colors.textPrimary, fontFamily: fontFamily.bodyMedium, fontSize: 15 },
    rowSubtitle: { color: colors.textFaint, fontFamily: fontFamily.body, fontSize: 12, lineHeight: 17, marginTop: 3 },
    rowValue: { color: colors.accent, fontFamily: fontFamily.bodyMedium, fontSize: 14 },
    chevron: { color: colors.textFaint, fontSize: 20 },
    pressed: { opacity: 0.6 },
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surfaceMd, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40 },
    sheetTitle: { color: colors.textFaint, fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14 },
    sheetSymbol: { color: colors.textSecondary, fontFamily: fontFamily.bodySemiBold, fontSize: 16, width: 28 },
    sheetName: { flex: 1, color: colors.textPrimary, fontFamily: fontFamily.body, fontSize: 15 },
    sheetCode: { color: colors.textFaint, fontFamily: fontFamily.address, fontSize: 13 },
    sheetSelected: { color: colors.accent },
  });
