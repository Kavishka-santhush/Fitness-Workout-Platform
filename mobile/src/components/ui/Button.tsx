import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextStyle,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, spacing } from '@/lib/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label?: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  icon?: keyof typeof Ionicons.glyphMap;
  iconRight?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const containerByVariant: Record<Variant, ViewStyle> = {
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.elevated },
  outline: { backgroundColor: colors.transparent, borderWidth: 1, borderColor: colors.border },
  ghost: { backgroundColor: colors.transparent },
  danger: { backgroundColor: colors.danger },
};

const labelByVariant: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.text,
  outline: colors.text,
  ghost: colors.primary,
  danger: colors.white,
};

const sizeStyle: Record<Size, { pad: ViewStyle; text: TextStyle }> = {
  sm: { pad: { paddingVertical: 8, paddingHorizontal: 12 }, text: { fontSize: 13 } },
  md: { pad: { paddingVertical: 12, paddingHorizontal: 16 }, text: { fontSize: 15 } },
  lg: { pad: { paddingVertical: 15, paddingHorizontal: 20 }, text: { fontSize: 17 } },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  loading,
  disabled,
  fullWidth,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const sz = sizeStyle[size];
  const tint = labelByVariant[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!isDisabled, busy: !!loading }}
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.base,
        containerByVariant[variant],
        sz.pad,
        fullWidth && styles.full,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={tint} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={sz.text.fontSize! + 2} color={tint} style={styles.icon} /> : null}
          {label ? <Text style={[{ color: tint, fontWeight: '700' }, sz.text, textStyle]}>{label}</Text> : null}
          {iconRight ? (
            <Ionicons name={iconRight} size={sz.text.fontSize! + 2} color={tint} style={styles.iconRight} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

interface IconButtonProps {
  name: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  background?: boolean;
  style?: ViewStyle;
}

export function IconButton({ name, onPress, size = 22, color = colors.text, background, style }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconBtn,
        background && styles.iconBtnBg,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  full: { alignSelf: 'stretch' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
  icon: { marginRight: spacing.xs },
  iconRight: { marginLeft: spacing.xs },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnBg: { backgroundColor: colors.elevated },
});
