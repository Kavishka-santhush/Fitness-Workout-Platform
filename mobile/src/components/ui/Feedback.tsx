import React from 'react';
import { ActivityIndicator, Animated, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, spacing } from '@/lib/theme';

// --- StatCard --------------------------------------------------------------
interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  style?: ViewStyle;
}

export function StatCard({ label, value, sublabel, icon, accent = colors.primary, style }: StatCardProps) {
  return (
    <View style={[styles.card, style]}>
      {icon ? (
        <View style={[styles.iconWrap, { backgroundColor: `${accent}22` }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
      ) : null}
      <Text variant="h2" style={{ marginTop: icon ? spacing.sm : 0 }}>
        {value}
      </Text>
      <Text variant="muted" style={{ fontSize: 13 }}>
        {label}
      </Text>
      {sublabel ? <Text variant="caption">{sublabel}</Text> : null}
    </View>
  );
}

// --- ProgressBar -----------------------------------------------------------
interface ProgressBarProps {
  value: number; // 0..1
  height?: number;
  color?: string;
  trackColor?: string;
  style?: ViewStyle;
}

export function ProgressBar({ value, height = 8, color = colors.primary, trackColor = colors.elevated, style }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color, borderRadius: radius.full }} />
    </View>
  );
}

// --- EmptyState ------------------------------------------------------------
interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  style?: ViewStyle;
}

export function EmptyState({ icon = 'sparkles-outline', title, message, style }: EmptyStateProps) {
  return (
    <View style={[styles.empty, style]}>
      <Ionicons name={icon} size={40} color={colors.faint} />
      <Text variant="title" style={{ marginTop: spacing.md, textAlign: 'center' }}>
        {title}
      </Text>
      {message ? (
        <Text variant="muted" style={{ marginTop: 4, textAlign: 'center' }}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

// --- Skeleton --------------------------------------------------------------
export function Skeleton({ width = '100%', height = 16, style }: { width?: number | string; height?: number; style?: ViewStyle }) {
  const pulse = React.useRef(new Animated.Value(0.4)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const opacity = pulse;
  return <Animated.View style={[{ width, height, borderRadius: radius.sm, backgroundColor: colors.elevated, opacity }, style]} />;
}

// --- LoadingRow ------------------------------------------------------------
export function LoadingRow({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.loadingRow}>
      <ActivityIndicator color={colors.primary} />
      <Text variant="muted" style={{ marginLeft: spacing.sm }}>
        {label}
      </Text>
    </View>
  );
}

// --- Divider ---------------------------------------------------------------
export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[styles.divider, style]} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flex: 1,
    minWidth: 140,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  track: { width: '100%', borderRadius: radius.full, overflow: 'hidden' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['3xl'], paddingHorizontal: spacing.lg },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing['2xl'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginVertical: spacing.md },
});
