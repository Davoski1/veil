import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';

export type BillService = {
  id: string;
  label: string;
  hint: string;
  /** Highlight in gold (used for the "More" affordance). */
  accent?: boolean;
};

/**
 * The everyday-money surface: airtime, data, bills, transfers — the things a
 * Nigerian user opens a wallet to do. Fiat on the face, USDC + sponsored fees
 * underneath. These are the destinations of the "spend / pay bills" half of the
 * product vision; the flows themselves land in a later phase, so tapping a tile
 * calls `onSelect` (a no-op today) rather than routing to a screen that does not
 * exist yet.
 */
export const BILL_SERVICES: BillService[] = [
  { id: 'airtime', label: 'Airtime', hint: 'All networks' },
  { id: 'data', label: 'Data', hint: 'Bundles' },
  { id: 'power', label: 'Power', hint: 'Prepaid' },
  { id: 'tv', label: 'TV', hint: 'DStv · GOtv' },
  { id: 'bills', label: 'Bills', hint: 'Water · waste' },
  { id: 'transfer', label: 'Transfer', hint: 'To any bank' },
  { id: 'betting', label: 'Betting', hint: 'Top up' },
  { id: 'more', label: 'More', hint: 'All services', accent: true },
];

export function PayForGrid({
  services = BILL_SERVICES,
  onSelect,
}: {
  services?: BillService[];
  onSelect?: (service: BillService) => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <Text style={styles.heading}>Pay for</Text>
      <View style={styles.grid}>
        {services.map((service, i) => (
          <Pressable
            key={service.id}
            onPress={() => onSelect?.(service)}
            accessibilityRole="button"
            accessibilityLabel={`${service.label} — ${service.hint}`}
            style={({ pressed }) => [
              styles.cell,
              i >= 4 && styles.cellTopBorder,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.cellLabel, service.accent && styles.cellLabelAccent]}>
              {service.label}
            </Text>
            <Text style={styles.cellHint} numberOfLines={1}>
              {service.hint}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 4,
    },
    heading: {
      color: colors.accent,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingVertical: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: '25%',
      paddingVertical: 12,
      gap: 3,
    },
    cellTopBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    cellLabel: {
      color: colors.textPrimary,
      fontFamily: fontFamily.bodyMedium,
      fontSize: 14,
    },
    cellLabelAccent: {
      color: colors.accent,
    },
    cellHint: {
      color: colors.textFaint,
      fontFamily: fontFamily.body,
      fontSize: 11,
    },
    pressed: {
      opacity: 0.6,
    },
  });
