import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useCurrency } from '../hooks/useCurrency';
import { useHiddenAmounts } from '../hooks/useHiddenAmounts';
import { fontFamily } from '../theme/typography';
import { formatUsd } from '../lib/fetchPrice';
import { VeilLogo } from './VeilLogo';
import { ReceiveIcon, SendIcon } from './icons';

/** Ink used on the light silver face. */
const INK = '#0F0F0F';
const INK_55 = 'rgba(15,15,15,0.55)';
const INK_60 = 'rgba(15,15,15,0.6)';

export type SilverBalanceCardProps = {
  /** Native balance string (XLM), or undefined while loading. */
  balance?: string;
  /** Fiat value in USD, or null when unpriced. */
  usd?: number | null;
  loading?: boolean;
  error?: boolean;
};

/**
 * The home balance on a brushed-silver card — the centerpiece of the redesign
 * (design screen "3a"). Fiat is the hero (Lora italic, the user's local
 * currency), the USDC amount sits beneath as the "under the hood" line, and
 * Send / Receive are the two primary actions. The metallic face and diagonal
 * shine are drawn with react-native-svg gradients (no extra dependency); content
 * is dark ink on the light metal.
 *
 * The balance and its USDC equivalent are real (from the dashboard's balance +
 * Lens price, converted by `useCurrency`); the "earning" chip is a static
 * affordance — the live Blend yield figure is wired in a later phase, so no
 * fabricated rate is shown.
 */
export function SilverBalanceCard({ balance, usd = null, loading, error }: SilverBalanceCardProps) {
  const router = useRouter();
  const { format } = useCurrency();
  const { mask } = useHiddenAmounts();
  const styles = useMemo(() => createStyles(), []);

  const hasFiat = usd !== null && usd !== undefined;
  const showLoading = !!loading && balance === undefined;

  return (
    <View style={styles.card}>
      {/* Metallic face + diagonal shine — expo-linear-gradient fills the whole
          card reliably (react-native-svg percentage sizing did not). */}
      <LinearGradient
        colors={['#3a3d42', '#8f959c', '#e8ebee', '#9aa0a7', '#5c6066', '#caced3', '#75797f']}
        locations={[0, 0.22, 0.38, 0.52, 0.7, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']}
        locations={[0.38, 0.46, 0.55]}
        start={{ x: 0.05, y: 0 }}
        end={{ x: 0.75, y: 0.35 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.headerRow}>
        <Text style={styles.label}>Total balance</Text>
        <VeilLogo size={26} color={INK} />
      </View>

      {showLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={INK} />
        </View>
      ) : error ? (
        <Text style={styles.error}>Couldn’t load your balance.</Text>
      ) : (
        <>
          <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
            {mask(hasFiat ? format(usd) : (balance ? `${balance} XLM` : '—'))}
          </Text>
          <View style={styles.subRow}>
            <Text style={styles.usdc}>
              {hasFiat ? mask(`${formatUsd(usd)} USDC`) : 'Awaiting price'}
            </Text>
            <View style={styles.earnChip}>
              <Text style={styles.earnChipText}>Earning yield</Text>
            </View>
          </View>
        </>
      )}

      <View style={styles.actions}>
        <Pressable
          onPress={() => router.push('/send')}
          accessibilityRole="button"
          accessibilityLabel="Send"
          style={({ pressed }) => [styles.sendBtn, pressed && styles.pressed]}
        >
          <SendIcon size={18} color="#FDDA24" strokeWidth={2} />
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/receive')}
          accessibilityRole="button"
          accessibilityLabel="Receive"
          style={({ pressed }) => [styles.receiveBtn, pressed && styles.pressed]}
        >
          <ReceiveIcon size={18} color={INK} strokeWidth={2} />
          <Text style={styles.receiveText}>Receive</Text>
        </Pressable>
      </View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    card: {
      borderRadius: 24,
      padding: 24,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 10,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    label: {
      color: INK_55,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    loadingRow: {
      paddingVertical: 18,
      alignItems: 'flex-start',
    },
    amount: {
      color: INK,
      fontFamily: fontFamily.heading,
      fontStyle: 'italic',
      fontSize: 44,
      lineHeight: 50,
      marginTop: 12,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
    },
    usdc: {
      color: INK_60,
      fontFamily: fontFamily.address,
      fontSize: 12,
    },
    earnChip: {
      backgroundColor: 'rgba(15,15,15,0.85)',
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 4,
    },
    earnChipText: {
      color: '#00E0F0',
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
    },
    error: {
      color: INK,
      fontFamily: fontFamily.body,
      fontSize: 14,
      marginTop: 12,
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 18,
    },
    sendBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: INK,
      borderRadius: 999,
      paddingVertical: 12,
    },
    sendText: {
      color: '#FDDA24',
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 14,
    },
    receiveBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      borderWidth: 1.5,
      borderColor: INK_55,
      borderRadius: 999,
      paddingVertical: 10.5,
    },
    receiveText: {
      color: INK,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 14,
    },
    pressed: {
      opacity: 0.7,
    },
  });
