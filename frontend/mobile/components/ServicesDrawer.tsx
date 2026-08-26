import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import { VeilLogo } from './VeilLogo';
import { BILL_SERVICES, type BillService } from './PayForGrid';

const PANEL_WIDTH = Math.min(320, Dimensions.get('window').width * 0.84);

/**
 * The services drawer, opened from the drape mark in the dashboard header.
 *
 * Everything Veil intends to offer but has not shipped lives here behind a
 * "coming soon" badge, so the Pay-for grid on the dashboard only ever shows
 * things that actually work. A tile that does nothing when tapped is worse
 * than one the user was told is not ready yet.
 *
 * Services move between the two surfaces by flipping `status` in
 * BILL_SERVICES — there is no second list to keep in sync.
 */
export function ServicesDrawer({
  visible,
  onClose,
  services = BILL_SERVICES,
}: {
  visible: boolean;
  onClose: () => void;
  services?: BillService[];
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const slide = useRef(new Animated.Value(-PANEL_WIDTH)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: visible ? 0 : -PANEL_WIDTH,
        duration: visible ? 240 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: visible ? 1 : 0,
        duration: visible ? 240 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, slide, fade]);

  const live = services.filter((s) => s.status === 'live');
  const soon = services.filter((s) => s.status !== 'live');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { opacity: fade }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close services menu"
          />
        </Animated.View>

        <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}>
          <View style={styles.header}>
            <View style={styles.brand}>
              <VeilLogo size={22} color={colors.accent} />
              <Text style={styles.wordmark}>VEIL</Text>
            </View>
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              style={({ pressed }) => [styles.close, pressed && styles.pressed]}
            >
              <Text style={styles.closeGlyph}>×</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            {live.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Available</Text>
                {live.map((s) => (
                  <Row key={s.id} service={s} colors={colors} styles={styles} />
                ))}
              </>
            ) : null}

            <Text style={[styles.sectionLabel, live.length > 0 && styles.sectionLabelSpaced]}>
              Coming soon
            </Text>
            {soon.map((s) => (
              <Row key={s.id} service={s} colors={colors} styles={styles} soon />
            ))}

            <Text style={styles.footnote}>
              These arrive as each provider goes live. Nothing here is chargeable yet.
            </Text>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

function Row({
  service,
  colors,
  styles,
  soon = false,
}: {
  service: BillService;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  soon?: boolean;
}) {
  return (
    <View style={styles.row} accessibilityLabel={`${service.label}${soon ? ', coming soon' : ''}`}>
      <View style={[styles.rowIcon, soon && styles.rowIconSoon]}>
        <service.Icon size={18} color={soon ? colors.textMuted : colors.textPrimary} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, soon && styles.rowLabelSoon]}>{service.label}</Text>
        <Text style={styles.rowHint} numberOfLines={1}>
          {service.hint}
        </Text>
      </View>
      {soon ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SOON</Text>
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    root: { flex: 1, flexDirection: 'row' },
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
    panel: {
      width: PANEL_WIDTH,
      height: '100%',
      backgroundColor: colors.background,
      borderRightWidth: 1,
      borderRightColor: colors.border,
      paddingTop: 56,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingBottom: 18,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    brand: { flexDirection: 'row', alignItems: 'center' },
    wordmark: {
      fontFamily: fontFamily.accent,
      fontSize: 19,
      letterSpacing: 1.5,
      color: colors.accent,
      marginLeft: 8,
    },
    close: {
      width: 32,
      height: 32,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    closeGlyph: { fontSize: 22, lineHeight: 24, color: colors.textSecondary },
    pressed: { opacity: 0.6 },
    body: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 40 },
    sectionLabel: {
      fontFamily: fontFamily.accent,
      fontSize: 11,
      letterSpacing: 1.6,
      textTransform: 'uppercase',
      color: colors.textFaint,
      marginBottom: 10,
      marginLeft: 4,
    },
    sectionLabelSpaced: { marginTop: 22 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 11,
      paddingHorizontal: 4,
    },
    rowIcon: {
      width: 38,
      height: 38,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMd,
    },
    rowIconSoon: { backgroundColor: colors.surface },
    rowText: { flex: 1, marginLeft: 12 },
    rowLabel: {
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 15,
      color: colors.textStrong,
    },
    rowLabelSoon: { color: colors.textSecondary },
    rowHint: {
      fontFamily: fontFamily.body,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: 2,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    badgeText: {
      fontFamily: fontFamily.address,
      fontSize: 9.5,
      letterSpacing: 1,
      color: colors.textFaint,
    },
    footnote: {
      fontFamily: fontFamily.body,
      fontSize: 11.5,
      lineHeight: 17,
      color: colors.textFaint,
      marginTop: 26,
      marginHorizontal: 4,
    },
  });
