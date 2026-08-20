import { useEffect, useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import { FlowHeader } from '../components/FlowHeader';
import { getWalletAddress } from '../lib/walletStore';
import { buildSep7PayUri } from '../lib/sep7';

const FALLBACK = 'GA3DHM4WL2VXPHR7NQKPZ7XK9FQJ2ULTQ6ZT4W2M5N6Q7RSTUVWXK9FQ';

function shortAddress(a: string): string {
  return a.length > 10 ? `${a.slice(0, 4)}…${a.slice(-4)}` : a;
}

export default function ReceiveScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [address, setAddress] = useState<string>(FALLBACK);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getWalletAddress()
      .then((a) => a && setAddress(a))
      .catch(() => undefined);
  }, []);

  const payUri = buildSep7PayUri({ destination: address });

  async function handleCopy() {
    await Clipboard.setStringAsync(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  async function handleShare() {
    await Share.share({ message: address, title: 'My Veil wallet address' });
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="receive-screen">
      <View style={styles.body}>
        <FlowHeader title="Receive" />

        <View style={styles.center}>
          <View style={styles.qrFrame}>
            <QRCode value={payUri} size={196} backgroundColor="#FFFFFF" color="#0F0F0F" />
          </View>

          <Pressable
            testID="receive-address"
            onPress={handleCopy}
            accessibilityRole="button"
            style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
          >
            <Text style={styles.chipText}>
              {shortAddress(address)} · {copied ? 'copied' : 'tap to copy'}
            </Text>
          </Pressable>

          <Text style={styles.hint}>
            Share this address to receive XLM or USDC. Incoming funds start earning automatically.
          </Text>
        </View>

        <View style={styles.spacer} />

        <Pressable
          testID="receive-share-button"
          onPress={handleShare}
          accessibilityRole="button"
          style={({ pressed }) => [styles.shareBtn, pressed && styles.pressed]}
        >
          <Text style={styles.shareText}>Share address</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32 },
    center: { alignItems: 'center', marginTop: 40 },
    qrFrame: {
      padding: 22,
      borderRadius: 20,
      backgroundColor: '#F6F7F8',
    },
    chip: {
      marginTop: 28,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: 'rgba(253,218,36,0.18)',
      backgroundColor: 'rgba(253,218,36,0.08)',
      paddingHorizontal: 18,
      paddingVertical: 8,
    },
    chipText: {
      color: colors.accent,
      fontFamily: fontFamily.address,
      fontSize: 13,
    },
    hint: {
      color: colors.textSecondary,
      fontFamily: fontFamily.body,
      fontSize: 14,
      lineHeight: 22,
      textAlign: 'center',
      marginTop: 20,
      maxWidth: 280,
    },
    spacer: { flex: 1 },
    shareBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 15,
      alignItems: 'center',
    },
    shareText: {
      color: colors.textPrimary,
      fontFamily: fontFamily.bodyMedium,
      fontSize: 14,
    },
    pressed: { opacity: 0.7 },
  });
