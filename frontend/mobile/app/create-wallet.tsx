import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import { FlowHeader } from '../components/FlowHeader';
import { createTestnetWallet, importTestnetWallet, type CreatedWallet } from '../lib/testnetWallet';

type Status = 'idle' | 'busy' | 'created' | 'error';

function shortAddr(a: string): string {
  return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-6)}` : a;
}

/**
 * Testnet wallet onboarding. Generates a Stellar keypair, funds it with
 * Friendbot, and stores it as the active wallet — a real, signable account so
 * every flow (send / receive / swap / earn) works on testnet. Also supports
 * importing an existing secret seed.
 */
export default function CreateWallet() {
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [status, setStatus] = useState<Status>('idle');
  const [result, setResult] = useState<CreatedWallet | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [secret, setSecret] = useState('');

  async function run(fn: () => Promise<CreatedWallet>) {
    setStatus('busy');
    setError(null);
    try {
      setResult(await fn());
      setStatus('created');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }

  if (status === 'created' && result) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <FlowHeader title="Wallet ready" />
          <View style={styles.doneCard}>
            <Text style={styles.doneTitle}>You&apos;re all set</Text>
            <Text style={styles.label}>Address</Text>
            <Text testID="create-wallet-address" style={styles.addr}>{shortAddr(result.address)}</Text>
            <Text style={[styles.fund, { color: result.funded ? colors.positive : colors.textMuted }]}>
              {result.funded ? 'Funded with test XLM ✓' : 'Not funded yet — top up from Settings'}
            </Text>
          </View>
          <View style={styles.spacer} />
          <Pressable
            testID="create-wallet-continue-button"
            accessibilityRole="button"
            onPress={() => router.replace('/dashboard')}
            style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
          >
            <Text style={styles.ctaText}>Continue</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="create-wallet-screen">
      <View style={styles.body}>
        <FlowHeader title="Create wallet" />
        <Text style={styles.caption}>
          Spin up a testnet wallet to try Veil end-to-end. It&apos;s a real Stellar account, funded with
          test XLM — no seed phrase to write down.
        </Text>

        {importing ? (
          <>
            <Text style={styles.section}>Secret key</Text>
            <View style={styles.card}>
              <TextInput
                style={styles.input}
                value={secret}
                onChangeText={setSecret}
                placeholder="S… (56 characters)"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={status === 'busy' || secret.trim().length < 56}
              onPress={() => run(() => importTestnetWallet(secret))}
              style={({ pressed }) => [styles.cta, (status === 'busy' || secret.trim().length < 56) && styles.disabled, pressed && styles.pressed]}
            >
              {status === 'busy' ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.ctaText}>Import wallet</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setImporting(false)} style={styles.linkBtn}>
              <Text style={styles.link}>Create a new one instead</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.spacer} />
            <Pressable
              testID="create-wallet-button"
              accessibilityRole="button"
              disabled={status === 'busy'}
              onPress={() => run(createTestnetWallet)}
              style={({ pressed }) => [styles.cta, status === 'busy' && styles.disabled, pressed && styles.pressed]}
            >
              {status === 'busy' ? <ActivityIndicator color={colors.onAccent} /> : <Text style={styles.ctaText}>Create testnet wallet</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setImporting(true)} style={styles.linkBtn}>
              <Text style={styles.link}>I already have a secret key</Text>
            </Pressable>
          </>
        )}

        {status === 'error' && error && <Text style={styles.errorText}>{error}</Text>}
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 },
    caption: {
      color: colors.textSecondary,
      fontFamily: fontFamily.body,
      fontSize: 14,
      lineHeight: 21,
      marginTop: 18,
    },
    section: {
      color: colors.textFaint,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginTop: 28,
      marginBottom: 8,
    },
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 13,
    },
    input: { color: colors.textPrimary, fontFamily: fontFamily.address, fontSize: 14, padding: 0 },
    spacer: { flex: 1 },
    cta: {
      backgroundColor: colors.accent,
      borderRadius: 100,
      paddingVertical: 17,
      alignItems: 'center',
      marginTop: 18,
    },
    disabled: { opacity: 0.4 },
    ctaText: { color: colors.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 15 },
    linkBtn: { alignItems: 'center', paddingVertical: 14 },
    link: { color: colors.accent, fontFamily: fontFamily.bodyMedium, fontSize: 14 },
    errorText: { color: colors.danger, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18, marginTop: 14, textAlign: 'center' },

    doneCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 22,
      marginTop: 28,
      gap: 6,
    },
    doneTitle: { color: colors.textStrong, fontFamily: fontFamily.heading, fontSize: 22, marginBottom: 6 },
    label: { color: colors.textFaint, fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginTop: 4 },
    addr: { color: colors.textPrimary, fontFamily: fontFamily.address, fontSize: 15 },
    fund: { fontFamily: fontFamily.bodyMedium, fontSize: 13, marginTop: 8 },
    pressed: { opacity: 0.7 },
  });
