import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { rpc as SorobanRpc, TransactionBuilder } from '@stellar/stellar-sdk';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import { FlowHeader } from '../components/FlowHeader';
import { SlideToConfirm } from '../components/SlideToConfirm';
import { SwapVerticalIcon } from '../components/icons';
import { registerPasskeySigner } from '../lib/passkey';
import { getSoroswapQuote, buildSoroswapSwapXdr, resolveTokenAddress, type SwapQuote } from '../lib/soroswap';
import { getNetwork } from '../lib/network';
import { signXdrPayload } from '../lib/walletConnect';
import { getWalletAddress } from '../lib/walletStore';

type Token = { code: string; name: string };
type Step = 'form' | 'signing' | 'submitting' | 'done' | 'error';

const TOKENS: Token[] = [
  { code: 'XLM', name: 'Stellar Lumens' },
  { code: 'USDC', name: 'USD Coin' },
  { code: 'EURC', name: 'Euro Coin' },
  { code: 'AQUA', name: 'Aquarius' },
];

const SLIPPAGE_BPS = 50; // 0.5 %
const DEBOUNCE_MS = 600;

export default function SwapScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [tokenIn, setTokenIn] = useState<Token>(TOKENS[0]!);
  const [tokenOut, setTokenOut] = useState<Token>(TOKENS[1]!);
  const [amountIn, setAmountIn] = useState('');
  const [picker, setPicker] = useState<null | 'in' | 'out'>(null);

  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [isFetchingQuote, setIsFetchingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [step, setStep] = useState<Step>('form');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Quote fetching (debounced) — unchanged engine ──────────────────────────
  useEffect(() => {
    const parsed = parseFloat(amountIn);
    if (!amountIn || isNaN(parsed) || parsed <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setIsFetchingQuote(true);
      setQuoteError(null);
      try {
        const [tokenInAddr, tokenOutAddr, walletAddress] = await Promise.all([
          resolveTokenAddress(tokenIn.code),
          resolveTokenAddress(tokenOut.code),
          getWalletAddress(),
        ]);
        if (!tokenInAddr || !tokenOutAddr) {
          setQuoteError('Token not found in Soroswap list.');
          setQuote(null);
          return;
        }
        if (!walletAddress) {
          setQuoteError('Wallet not set up yet.');
          setQuote(null);
          return;
        }
        const result = await getSoroswapQuote({
          tokenIn: tokenInAddr,
          tokenOut: tokenOutAddr,
          amountIn: Math.round(parsed * 1e7).toString(),
          slippageBps: SLIPPAGE_BPS,
          feePayerAddress: walletAddress,
        });
        setQuote(result);
        if (!result) setQuoteError('No liquidity found for this pair.');
      } catch {
        setQuoteError('Quote failed. Check your connection.');
        setQuote(null);
      } finally {
        setIsFetchingQuote(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [amountIn, tokenIn.code, tokenOut.code]);

  // ── Execution — unchanged engine ───────────────────────────────────────────
  async function handleExecute() {
    setExecError(null);
    setStep('signing');
    const unregister = registerPasskeySigner();
    try {
      const parsed = parseFloat(amountIn);
      const [tokenInAddr, tokenOutAddr, walletAddress] = await Promise.all([
        resolveTokenAddress(tokenIn.code),
        resolveTokenAddress(tokenOut.code),
        getWalletAddress(),
      ]);
      if (!tokenInAddr || !tokenOutAddr || !walletAddress) {
        throw new Error('Missing token addresses or wallet not configured.');
      }
      const unsignedXdr = await buildSoroswapSwapXdr({
        tokenIn: tokenInAddr,
        tokenOut: tokenOutAddr,
        amountIn: Math.round(parsed * 1e7).toString(),
        slippageBps: SLIPPAGE_BPS,
        feePayerAddress: walletAddress,
      });
      if (!unsignedXdr) throw new Error('Failed to build swap transaction.');
      const signedXdr = await signXdrPayload(unsignedXdr);

      setStep('submitting');
      const network = getNetwork();
      const rpc = new SorobanRpc.Server(network.rpcUrl);
      const signedTx = TransactionBuilder.fromXDR(signedXdr, network.networkPassphrase);
      const sendResult = await rpc.sendTransaction(signedTx);
      if (sendResult.status === 'ERROR') {
        throw new Error(`Network rejected the transaction: ${sendResult.errorResult?.toXDR('base64') ?? 'unknown'}`);
      }
      for (let i = 0; i < 30; i++) {
        await new Promise<void>((r) => setTimeout(r, 1_000));
        const poll = await rpc.getTransaction(sendResult.hash);
        if (poll.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
          if (poll.status !== SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
            throw new Error(`Transaction failed on-chain: ${poll.status}`);
          }
          setTxHash(sendResult.hash);
          setStep('done');
          return;
        }
      }
      throw new Error('Transaction timed out. Check your wallet history.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setExecError(msg === 'USER_REJECTED' ? 'Passkey authentication was declined.' : msg);
      setStep('error');
    } finally {
      unregister();
    }
  }

  function handleSelect(token: Token) {
    if (picker === 'in') {
      if (token.code === tokenOut.code) setTokenOut(tokenIn);
      setTokenIn(token);
    } else if (picker === 'out') {
      if (token.code === tokenIn.code) setTokenIn(tokenOut);
      setTokenOut(token);
    }
    setPicker(null);
    setQuote(null);
    setQuoteError(null);
  }

  function flip() {
    setTokenIn(tokenOut);
    setTokenOut(tokenIn);
    setQuote(null);
    setQuoteError(null);
  }

  const hasAmount = Number(amountIn) > 0;
  const canReview = hasAmount && !!quote && !isFetchingQuote;
  const amountOutDisplay = quote
    ? String((Number(quote.amountOut) / 1e7).toFixed(7)).replace(/\.?0+$/, '')
    : '0.00';
  const rate =
    quote && Number(amountIn) > 0 ? (Number(quote.amountOut) / 1e7 / Number(amountIn)).toFixed(4) : null;

  // ── Done / status ──────────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="swap-screen">
        <View style={styles.body}>
          <FlowHeader title="Swap" onBack={() => { setStep('form'); setTxHash(null); }} />
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Swap complete</Text>
            <Text style={styles.resultSub}>
              {amountIn} {tokenIn.code} → {amountOutDisplay} {tokenOut.code}
            </Text>
            {txHash ? <Text style={styles.resultHash}>tx {txHash.slice(0, 8)}…{txHash.slice(-6)}</Text> : null}
          </View>
          <View style={styles.spacer} />
          <Pressable style={styles.primaryBtn} onPress={() => { setStep('form'); setAmountIn(''); setTxHash(null); }}>
            <Text style={styles.primaryText}>Done</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const busy = step === 'signing' || step === 'submitting';

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']} testID="swap-screen">
      <View style={styles.body}>
        <FlowHeader title="Swap" />

        {/* Pay / receive cards with the direction toggle between them */}
        <View style={styles.pairWrap}>
          <View style={[styles.leg, styles.legTop]}>
            <View style={styles.legHead}>
              <Text style={styles.legLabel}>You pay</Text>
            </View>
            <View style={styles.legRow}>
              <TextInput
                style={styles.legAmount}
                value={amountIn}
                onChangeText={setAmountIn}
                placeholder="0"
                placeholderTextColor={colors.textFaint}
                keyboardType="decimal-pad"
                editable={!busy}
                testID="swap-amount-in"
              />
              <TokenChip token={tokenIn} onPress={() => setPicker('in')} colors={colors} />
            </View>
          </View>

          <View style={[styles.leg, styles.legBottom]}>
            <Text style={styles.legLabel}>You receive</Text>
            <View style={styles.legRow}>
              <Text style={[styles.legAmount, styles.legAmountOut]} numberOfLines={1}>
                {isFetchingQuote ? '…' : amountOutDisplay}
              </Text>
              <TokenChip token={tokenOut} onPress={() => setPicker('out')} colors={colors} accent />
            </View>
          </View>

          <Pressable onPress={flip} accessibilityRole="button" accessibilityLabel="Swap direction" style={styles.flipFab}>
            <SwapVerticalIcon size={20} color={colors.onAccent} />
          </Pressable>
        </View>

        {/* Rate / status */}
        <View style={styles.ratePanel}>
          {quoteError ? (
            <Text style={styles.rateError}>{quoteError}</Text>
          ) : (
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel}>Rate</Text>
              <Text style={styles.rateValue}>
                {rate ? `1 ${tokenIn.code} = ${rate} ${tokenOut.code}` : '—'}
              </Text>
            </View>
          )}
          <View style={styles.rateRow}>
            <Text style={styles.rateLabel}>Network fee</Text>
            <Text style={styles.rateSponsored}>Sponsored</Text>
          </View>
        </View>

        {execError ? <Text style={styles.errorBanner}>{execError}</Text> : null}

        <View style={styles.spacer} />

        {busy ? (
          <View style={styles.status}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.statusText}>{step === 'signing' ? 'Waiting for passkey…' : 'Submitting swap…'}</Text>
          </View>
        ) : canReview ? (
          <SlideToConfirm label="Slide to swap" onConfirm={handleExecute} />
        ) : (
          <View style={[styles.primaryBtn, styles.disabled]}>
            <Text style={styles.primaryText}>{hasAmount ? 'Fetching quote…' : 'Enter an amount'}</Text>
          </View>
        )}
      </View>

      {/* Token picker */}
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPicker(null)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.sheetTitle}>Select token</Text>
            {TOKENS.map((t) => (
              <Pressable key={t.code} style={styles.sheetRow} onPress={() => handleSelect(t)}>
                <TokenChip token={t} colors={colors} static />
                <Text style={styles.sheetName}>{t.name}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

/** Small pill showing a token badge + code (+ chevron unless static). */
function TokenChip({
  token,
  onPress,
  colors,
  accent = false,
  static: isStatic = false,
}: {
  token: Token;
  onPress?: () => void;
  colors: ThemeColors;
  accent?: boolean;
  static?: boolean;
}) {
  const s = chipStyles(colors, accent);
  const badgeBg = token.code === 'USDC' ? '#2775CA' : token.code === 'XLM' ? '#0F0F0F' : colors.surfaceMd;
  const content = (
    <View style={s.chip}>
      <View style={[s.badge, { backgroundColor: badgeBg }]}>
        <Text style={s.badgeText}>{token.code === 'USDC' ? '$' : token.code.slice(0, 1)}</Text>
      </View>
      <Text style={s.code}>{token.code}</Text>
      {!isStatic && <Text style={s.chev}>▾</Text>}
    </View>
  );
  if (isStatic || !onPress) return content;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Select ${token.code}`}>
      {content}
    </Pressable>
  );
}

const chipStyles = (colors: ThemeColors, accent: boolean) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: accent ? colors.positiveSurface : colors.surfaceMd,
      borderWidth: 1,
      borderColor: accent ? 'rgba(0,167,181,0.3)' : colors.border,
      borderRadius: 999,
      paddingLeft: 6,
      paddingRight: 12,
      paddingVertical: 6,
    },
    badge: {
      width: 26,
      height: 26,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    code: { color: colors.textPrimary, fontFamily: fontFamily.bodySemiBold, fontSize: 14 },
    chev: { color: colors.textFaint, fontSize: 11 },
  });

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    body: { flex: 1, paddingHorizontal: 28, paddingTop: 20, paddingBottom: 32, gap: 20 },
    pairWrap: { position: 'relative', marginTop: 6 },
    leg: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 18 },
    legTop: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, marginBottom: 4 },
    legBottom: { borderTopLeftRadius: 6, borderTopRightRadius: 6, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
    legHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    legLabel: {
      color: colors.textFaint,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: 'uppercase',
    },
    legRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 },
    legAmount: {
      flex: 1,
      color: colors.textStrong,
      fontFamily: fontFamily.heading,
      fontSize: 36,
      paddingVertical: 2,
    },
    legAmountOut: { color: colors.positive },
    flipFab: {
      position: 'absolute',
      left: '50%',
      top: '50%',
      marginLeft: -22,
      marginTop: -22,
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 5,
      borderColor: colors.background,
    },
    ratePanel: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingVertical: 6,
    },
    rateRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    rateLabel: { color: colors.textSecondary, fontFamily: fontFamily.body, fontSize: 12 },
    rateValue: { color: colors.textPrimary, fontFamily: fontFamily.address, fontSize: 12 },
    rateSponsored: { color: colors.positive, fontFamily: fontFamily.bodyMedium, fontSize: 12 },
    rateError: { color: colors.danger, fontFamily: fontFamily.body, fontSize: 13, paddingVertical: 12 },
    errorBanner: {
      color: colors.danger,
      fontFamily: fontFamily.body,
      fontSize: 13,
      backgroundColor: colors.dangerSurface,
      borderRadius: 10,
      padding: 12,
    },
    status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
    statusText: { color: colors.textSecondary, fontFamily: fontFamily.body, fontSize: 14 },
    spacer: { flex: 1 },
    primaryBtn: { backgroundColor: colors.accent, borderRadius: 999, paddingVertical: 16, alignItems: 'center' },
    disabled: { opacity: 0.4 },
    primaryText: { color: colors.onAccent, fontFamily: fontFamily.bodySemiBold, fontSize: 15 },
    resultCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 20, gap: 8, marginTop: 20 },
    resultTitle: { color: colors.textStrong, fontFamily: fontFamily.heading, fontSize: 24 },
    resultSub: { color: colors.textSecondary, fontFamily: fontFamily.body, fontSize: 15, marginTop: 4 },
    resultHash: { color: colors.textFaint, fontFamily: fontFamily.address, fontSize: 12, marginTop: 6 },
    sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: colors.surfaceMd, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, gap: 4 },
    sheetTitle: { color: colors.textFaint, fontFamily: fontFamily.bodySemiBold, fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
    sheetRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
    sheetName: { color: colors.textPrimary, fontFamily: fontFamily.body, fontSize: 15 },
  });
