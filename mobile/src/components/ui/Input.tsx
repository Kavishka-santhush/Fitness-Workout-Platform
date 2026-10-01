import React from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from './Text';
import { colors, radius, spacing } from '@/lib/theme';

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

interface InputProps extends FieldProps, Omit<TextInputProps, 'style'> {
  multiline?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Input({ label, error, hint, icon, multiline, containerStyle, ...rest }: InputProps) {
  return (
    <View style={[styles.field, containerStyle]}>
      {label ? <Text variant="label" style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrap, multiline && styles.multiline, error ? styles.inputError : null]}>
        {icon && !multiline ? <Ionicons name={icon} size={18} color={colors.faint} style={styles.inputIcon} /> : null}
        <TextInput
          multiline={multiline}
          placeholderTextColor={colors.faint}
          style={[
            styles.input,
            multiline ? { textAlignVertical: 'top', minHeight: 96, paddingTop: spacing.md } : null,
          ]}
          {...rest}
        />
      </View>
      {error ? <Text variant="caption" color="danger">{error}</Text> : null}
      {hint && !error ? <Text variant="caption">{hint}</Text> : null}
    </View>
  );
}

interface SearchInputProps extends Omit<TextInputProps, 'style'> {
  containerStyle?: ViewStyle;
}

export function SearchInput({ containerStyle, ...rest }: SearchInputProps) {
  return (
    <View style={[styles.search, containerStyle]}>
      <Ionicons name="search" size={18} color={colors.faint} style={styles.inputIcon} />
      <TextInput
        placeholder="Search…"
        placeholderTextColor={colors.faint}
        autoCorrect={false}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: spacing.md },
  label: { marginBottom: 6, textTransform: 'uppercase', fontSize: 11 },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
  },
  multiline: { alignItems: 'flex-start' },
  inputError: { borderColor: colors.danger },
  input: { flex: 1, color: colors.text, fontSize: 15, paddingVertical: 12 },
  inputIcon: { marginRight: spacing.sm },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
});
