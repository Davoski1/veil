import { useCallback, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import { FlowHeader } from '../components/FlowHeader';
import { isValidDestination } from '../lib/address';
import { ContactPicker } from '../components/ContactPicker';
import { QrScanner } from '../components/QrScanner';
import type { Contact } from '../hooks/useContacts';
import { requireSigner } from '../lib/signer';
import { sendPayment } from '../lib/sendPayment';
import { truncateAddress } from '../components/ui/AddressChip';

/** expo-router yields `string | string[]` for a repeated query key. */
function firstValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

type Step = 'form' | 'authorizing' | 'submitting' | 'done' | 'error';

export default function SendScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  // Deep links land here prefilled: `to`, `amount`, `asset`, `memo` from
  // veil://send, https://app.veil.xyz/send, or a SEP-7 request forwarded by /pay.
  const params = useLocalSearchParams<{ to?: string; amount?: string; asset?: string; memo?: string }>();
  const asset = firstValue(params.asset) || 'XLM';
  const memo = firstValue(params.memo);

  const [recipient, setRecipient] = useState(() => firstValue(params.to));
  const [amount, setAmount] = useState(() => firstValue(params.amount));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  const [step, setStep] = useState<Step>('form');
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = recipient.trim();
  const recipientValid = isValidDestination(trimmed);
  const showError = trimmed.length > 0 && !recipientValid;
  const editable = step === 'form' || step === 'error';
  const canSubmit = recipientValid && Number(amount) > 0 && editable;

  const handleSelectContact = useCallback((contact: Contact) => {
    setRecipient(contact.address);
    setPickerOpen(false);
  }, []);

  const handleSend = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      setStep('authorizing');
      const signer = await requireSigner();
      setStep('submitting');
      const result = await sendPayment(recipient, amount, signer);
      setHash(result.hash);
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setStep('error');
    }
  };

  const reset = () => {
    setRecipient('');
    setAmount('');
    setStep('form');
    setHash(null);
    setError(null);
  };

  const buttonText =
    step === 'authorizing' ? 'Waiting for passkey…' : step === 'submitting' ? 'Submitting…' : step === 'error' ? 'Try again' : 'Review & confirm';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="send-screen">
      <View style={styles.body}>
        <FlowHeader title="Send" />

        {step === 'done' ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Payment sent</Text>
            <Text style={styles.resultLabel}>Transaction</Text>
            <Text style={styles.hash} numberOfLines={1} testID="send-hash">
              {hash ? truncateAddress(hash, 8, 8) : ''}
            </Text>
            <Pressable style={styles.primaryBtn} onPress={reset} testID="send-reset">
              <Text style={styles.primaryText}>Send another</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Recipient */}
            <View style={styles.field}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Recipient</Text>
                <View style={styles.labelActions}>
                  <Pressable onPress={() => setScannerOpen(true)} hitSlop={8} disabled={!editable} accessibilityRole="button" accessibilityLabel="Scan a QR code">
                    <Text style={styles.link}>Scan QR</Text>
                  </Pressable>
                  <Pressable onPress={() => setPickerOpen(true)} hitSlop={8} disabled={!editable} accessibilityRole="button">
                    <Text style={styles.link}>Contacts</Text>
                  </Pressable>
                </View>
              </View>
              <TextInput
                style={[styles.recipientInput, showError && styles.inputError]}
                testID="send-recipient"
                value={recipient}
                onChangeText={setRecipient}
                placeholder="Address or name*domain"
                placeholderTextColor={colors.textFaint}
                autoCapitalize="none"
                autoCorrect={false}
                editable={editable}
              />
              {showError && (
                <Text style={styles.errorText}>Enter a valid Stellar address (G/M/C…) or federated address (name*domain).</Text>
              )}
            </View>

            {/* Amount */}
            <View style={styles.field}>
              <Text style={styles.label}>Amount</Text>
              <View style={styles.amountRow}>
                <TextInput
                  testID="send-amount"
                  style={styles.amountInput}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  editable={editable}
                />
                <Text style={styles.assetUnit}>{asset}</Text>
              </View>
            </View>

            {memo ? (
              <View style={styles.field}>
                <Text style={styles.label}>Memo</Text>
                <Text testID="send-memo" style={styles.memo}>{memo}</Text>
              </View>
            ) : null}

            {/* Sponsored fee */}
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Network fee</Text>
              <Text style={styles.feeValue}>Sponsored — you pay nothing</Text>
            </View>

            {(step === 'authorizing' || step === 'submitting') && (
              <View style={styles.status}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.statusText}>{step === 'authorizing' ? 'Waiting for passkey…' : 'Submitting…'}</Text>
              </View>
            )}
            {step === 'error' && error && <Text style={styles.errorBanner}>{error}</Text>}

            <View style={styles.spacer} />

            <Pressable
              testID="send-submit"
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              style={[styles.primaryBtn, !canSubmit && styles.disabled]}
              onPress={handleSend}
            >
              <Text style={styles.primaryText}>{buttonText}</Text>
            </Pressable>
          </>
        )}
      </View>

      <QrScanner visible={scannerOpen} onScan={(address) => { setRecipient(address); setScannerOpen(false); }} onClose={() => setScannerOpen(false)} />
      <ContactPicker visible={pickerOpen} onSelect={handleSelectContact} onClose={() => setPickerOpen(false)} />
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, gap: 26 },
    field: { gap: 10 },
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    labelActions: { flexDirection: 'row', gap: 16 },
    label: {
      color: colors.textFaint,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    link: { color: colors.accent, fontFamily: fontFamily.bodyMedium, fontSize: 13 },
    recipientInput: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      paddingVertical: 12,
      color: colors.textPrimary,
      fontFamily: fontFamily.address,
      fontSize: 16,
    },
    inputError: { borderBottomColor: colors.danger },
    errorText: { color: colors.danger, fontFamily: fontFamily.body, fontSize: 13, lineHeight: 18 },
    amountRow: { flexDirection: 'row', alignItems: 'baseline', borderBottomWidth: 1, borderBottomColor: colors.border, paddingVertical: 4 },
    amountInput: {
      flex: 1,
      color: colors.textStrong,
      fontFamily: fontFamily.heading,
      fontSize: 44,
      paddingVertical: 4,
    },
    assetUnit: { color: colors.textSecondary, fontFamily: fontFamily.bodySemiBold, fontSize: 18 },
    memo: { color: colors.textPrimary, fontFamily: fontFamily.body, fontSize: 15 },
    feeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 16,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: colors.border,
    },
    feeLabel: { color: colors.textSecondary, fontFamily: fontFamily.body, fontSize: 13 },
    feeValue: { color: colors.positive, fontFamily: fontFamily.bodyMedium, fontSize: 13 },
    status: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusText: { color: colors.textSecondary, fontFamily: fontFamily.body, fontSize: 14 },
    errorBanner: {
      color: colors.danger,
      fontFamily: fontFamily.body,
      fontSize: 13,
      backgroundColor: colors.dangerSurface,
      borderRadius: 10,
      padding: 12,
    },
    spacer: { flex: 1 },
    primaryBtn: {
      backgroundColor: colors.accent,
      borderRadius: 999,
      paddingVertical: 16,
      alignItems: 'center',
    },
    disabled: { opacity: 0.4 },
    primaryText: { color: colors.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 15 },
    resultCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      gap: 8,
      marginTop: 20,
    },
    resultTitle: { color: colors.textStrong, fontFamily: fontFamily.heading, fontSize: 22 },
    resultLabel: { color: colors.textFaint, fontFamily: fontFamily.body, fontSize: 13, marginTop: 4 },
    hash: { color: colors.accent, fontFamily: fontFamily.address, fontSize: 14 },
  });
