import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '@/lib/theme';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  keyboard?: boolean;
  header?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  /** Extra bottom padding so content clears the tab bar / FAB. */
  bottomGap?: number;
}

/**
 * App-wide page scaffold: safe-area top bar, optional scroll + keyboard
 * avoidance, consistent background and horizontal padding.
 */
export function Screen({
  children,
  scroll = true,
  padded = true,
  keyboard = false,
  header,
  style,
  contentStyle,
  bottomGap = spacing['2xl'],
}: ScreenProps) {
  const body = scroll ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={[padded ? styles.padded : null, { paddingBottom: bottomGap }, contentStyle]}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[padded ? styles.padded : null, styles.fill, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.root, style]}>
      {header ? <View style={styles.header}>{header}</View> : null}
      {keyboard ? (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {body}
        </KeyboardAvoidingView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  padded: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
