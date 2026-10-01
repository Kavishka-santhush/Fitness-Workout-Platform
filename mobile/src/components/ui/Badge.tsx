import React from 'react';
import { Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, spacing } from '@/lib/theme';

type Tone = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted';

const toneMap: Record<Tone, { bg: string; fg: string }> = {
  default: { bg: colors.primarySoft, fg: colors.primary },
  success: { bg: 'rgba(34,197,94,0.15)', fg: colors.success },
  warning: { bg: 'rgba(245,158,11,0.15)', fg: colors.warning },
  danger: { bg: 'rgba(239,68,68,0.15)', fg: colors.danger },
  info: { bg: 'rgba(14,165,233,0.15)', fg: colors.info },
  muted: { bg: colors.elevated, fg: colors.muted },
};

interface BadgeProps {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

export function Badge({ label, tone = 'default', icon, style }: BadgeProps) {
  const t = toneMap[tone];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }, style]}>
      {icon ? <Ionicons name={icon} size={12} color={t.fg} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: t.fg, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4 }}>
        {label}
      </Text>
    </View>
  );
}

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}

/** Selectable filter pill used across exercise / food / trainer search. */
export function Chip({ label, selected, onPress, icon }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.chipSelected, pressed && styles.pressed]}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? colors.white : colors.muted} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: selected ? colors.white : colors.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  pressed: { opacity: 0.85 },
});
