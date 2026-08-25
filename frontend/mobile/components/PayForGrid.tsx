import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../hooks/useTheme';
import type { ThemeColors } from '../lib/theme';
import { fontFamily } from '../theme/typography';
import {
  AirtimeIcon,
  BankIcon,
  BettingIcon,
  BillsIcon,
  DataIcon,
  GridIcon,
  PowerIcon,
  TVIcon,
  type IconProps,
} from './icons';

export type BillService = {
  id: string;
  label: string;
  hint: string;
  Icon: (props: IconProps) => React.JSX.Element;
  /** Highlight in gold (used for the "More" affordance). */
  accent?: boolean;
};

/**
 * The everyday-money surface: airtime, data, bills, transfers — the things a
 * Nigerian user opens a wallet to do. Fiat on the face, USDC + sponsored fees
 * underneath. These are the destinations of the "spend / pay bills" half of the
 * product vision; the flows land in a later phase, so tapping a tile calls
 * `onSelect` (a no-op today) rather than routing to a screen that does not exist.
 */
export const BILL_SERVICES: BillService[] = [
  { id: 'airtime', label: 'Airtime', hint: 'All networks', Icon: AirtimeIcon },
  { id: 'data', label: 'Data', hint: 'Bundles', Icon: DataIcon },
  { id: 'power', label: 'Power', hint: 'Prepaid', Icon: PowerIcon },
  { id: 'tv', label: 'TV', hint: 'DStv · GOtv', Icon: TVIcon },
  { id: 'bills', label: 'Bills', hint: 'Water · waste', Icon: BillsIcon },
  { id: 'transfer', label: 'Transfer', hint: 'To any bank', Icon: BankIcon },
  { id: 'betting', label: 'Betting', hint: 'Top up', Icon: BettingIcon },
  { id: 'more', label: 'More', hint: 'All services', Icon: GridIcon, accent: true },
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
        {services.map((service) => (
          <Pressable
            key={service.id}
            onPress={() => onSelect?.(service)}
            accessibilityRole="button"
            accessibilityLabel={`${service.label} — ${service.hint}`}
            style={({ pressed }) => [styles.cell, pressed && styles.pressed]}
          >
            <View style={[styles.iconWrap, service.accent && styles.iconWrapAccent]}>
              <service.Icon size={20} color={service.accent ? colors.accent : colors.textPrimary} />
            </View>
            <Text style={[styles.cellLabel, service.accent && styles.cellLabelAccent]}>{service.label}</Text>
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
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
    },
    heading: {
      color: colors.accent,
      fontFamily: fontFamily.bodySemiBold,
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      paddingHorizontal: 4,
      paddingBottom: 6,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    cell: {
      width: '25%',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 12,
    },
    iconWrap: {
      width: 44,
      height: 44,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMd,
      borderWidth: 1,
      borderColor: colors.border,
    },
    iconWrapAccent: {
      backgroundColor: 'rgba(253,218,36,0.08)',
      borderColor: 'rgba(253,218,36,0.22)',
    },
    cellLabel: {
      color: colors.textPrimary,
      fontFamily: fontFamily.bodyMedium,
      fontSize: 13,
    },
    cellLabelAccent: {
      color: colors.accent,
    },
    cellHint: {
      color: colors.textFaint,
      fontFamily: fontFamily.body,
      fontSize: 10,
    },
    pressed: {
      opacity: 0.6,
    },
  });
