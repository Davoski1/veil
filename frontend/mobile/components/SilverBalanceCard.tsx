import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Pressable, StyleSheet, Text, View } from 'react-native';
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
const CARD_HEIGHT = 208;

export type SilverBalanceCardProps = {
  /** Native balance string (XLM), or undefined while loading. */
  balance?: string;
  /** Fiat value in USD, or null when unpriced. */
  usd?: number | null;
  loading?: boolean;
  error?: boolean;
};

/** Trim a raw balance string to at most 2 decimals for display. */
function trimAmount(raw: string): string {
  const n = Number(raw);
  if (!isFinite(n)) return raw;
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The brushed-metal face + diagonal shine, filling its parent. */
function Metal() {
  return (
    <>
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
    </>
  );
}

/**
 * The home balance on a brushed-silver card (design "3a") — now a FLIP card.
 *
 * The face shows the balance in crypto (XLM); tapping it flips the card (a
 * rotateY animation) to the same balance in the user's local currency — whichever
 * they set in Settings, via `useCurrency`. Send / Receive live on both faces. The
 * balance and its fiat value are real (dashboard balance × Lens price); the
 * "earning" chip is a static affordance until the live Blend yield lands.
 */
export function SilverBalanceCard({ balance, usd = null, loading, error }: SilverBalanceCardProps) {
  const router = useRouter();
  const { currency, format } = useCurrency();
  const { mask } = useHiddenAmounts();
  const styles = useMemo(() => createStyles(), []);

  const flip = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  const toggleFlip = useCallback(() => {
    const to = flipped ? 0 : 1;
    Animated.spring(flip, { toValue: to, useNativeDriver: true, friction: 9, tension: 12 }).start();
    setFlipped((f) => !f);
  }, [flip, flipped]);

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  const showLoading = !!loading && balance === undefined;
  const hasFiat = usd !== null && usd !== undefined;
  const cryptoText = balance !== undefined ? `${trimAmount(balance)} XLM` : '—';
  const fiatText = hasFiat ? format(usd) : '—';

  const face = (label: string, big: string, sub: string) => (
    <>
      <Metal />
      <Pressable onPress={toggleFlip} accessibilityRole="button" accessibilityLabel="Flip balance" style={styles.balanceArea}>
        <View style={styles.headerRow}>
          <Text style={styles.label}>{label}</Text>
          <VeilLogo size={26} color={INK} />
        </View>
        <Text style={styles.amount} numberOfLines={1} adjustsFontSizeToFit>
          {mask(big)}
        </Text>
        <Text style={styles.sub}>{sub}</Text>
      </Pressable>
      <View style={styles.actions}>
        <Pressable onPress={() => router.push('/send')} accessibilityRole="button" accessibilityLabel="Send" style={({ pressed }) => [styles.sendBtn, pressed && styles.pressed]}>
          <SendIcon size={18} color="#FDDA24" strokeWidth={2} />
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/receive')} accessibilityRole="button" accessibilityLabel="Receive" style={({ pressed }) => [styles.receiveBtn, pressed && styles.pressed]}>
          <ReceiveIcon size={18} color={INK} strokeWidth={2} />
          <Text style={styles.receiveText}>Receive</Text>
        </Pressable>
      </View>
    </>
  );

  if (showLoading || error || balance === undefined) {
    return (
      <View style={styles.wrap}>
        <View style={styles.staticFace}>
          <Metal />
          <Text style={styles.label}>Total balance</Text>
          {error ? (
            <Text style={styles.errorText}>Couldn’t load your balance.</Text>
          ) : (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={INK} />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.face, { transform: [{ perspective: 1400 }, { rotateY: frontRotate }] }]}>
        {face('Total balance', cryptoText, hasFiat ? `≈ ${format(usd)}` : 'no price yet')}
      </Animated.View>
      <Animated.View style={[styles.face, { transform: [{ perspective: 1400 }, { rotateY: backRotate }] }]}>
        {face(`Balance · ${currency}`, fiatText, `≈ ${trimAmount(balance)} XLM`)}
      </Animated.View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    wrap: {
      height: CARD_HEIGHT,
    },
    face: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 24,
      padding: 24,
      overflow: 'hidden',
      backfaceVisibility: 'hidden',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 18 },
      shadowOpacity: 0.5,
      shadowRadius: 40,
      elevation: 10,
    },
    staticFace: {
      ...StyleSheet.absoluteFillObject,
      borderRadius: 24,
      padding: 24,
      overflow: 'hidden',
    },
    balanceArea: {
      // The tappable flip region (everything above the actions).
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
    amount: {
      color: INK,
      fontFamily: fontFamily.heading,
      fontSize: 44,
      lineHeight: 50,
      marginTop: 10,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
    },
    sub: {
      color: INK_60,
      fontFamily: fontFamily.address,
      fontSize: 12,
      marginTop: 12,
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
    loadingRow: {
      paddingVertical: 20,
      alignItems: 'flex-start',
    },
    errorText: {
      color: INK,
      fontFamily: fontFamily.body,
      fontSize: 14,
      marginTop: 12,
    },
    actions: {
      position: 'absolute',
      left: 24,
      right: 24,
      bottom: 24,
      flexDirection: 'row',
      gap: 10,
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
