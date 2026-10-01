import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, TextStyle } from 'react-native';
import { colors, fontSize } from '@/lib/theme';

type Variant = 'h1' | 'h2' | 'h3' | 'title' | 'body' | 'muted' | 'label' | 'caption';
type Color = keyof typeof colors | 'default';

interface Props extends RNTextProps {
  variant?: Variant;
  color?: Color;
  center?: boolean;
  bold?: boolean;
  style?: TextStyle | TextStyle[];
}

const variantStyle: Record<Variant, TextStyle> = {
  h1: { fontSize: fontSize['3xl'], fontWeight: '800', color: colors.text },
  h2: { fontSize: fontSize['2xl'], fontWeight: '700', color: colors.text },
  h3: { fontSize: fontSize.xl, fontWeight: '700', color: colors.text },
  title: { fontSize: fontSize.lg, fontWeight: '600', color: colors.text },
  body: { fontSize: fontSize.md, fontWeight: '400', color: colors.text },
  muted: { fontSize: fontSize.md, fontWeight: '400', color: colors.muted },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.muted, letterSpacing: 0.3 },
  caption: { fontSize: fontSize.xs, fontWeight: '500', color: colors.faint },
};

export function Text({ variant = 'body', color = 'default', center, bold, style, children, ...rest }: Props) {
  const resolvedColor = color === 'default' ? undefined : (colors as any)[color];
  return (
    <RNText
      {...rest}
      style={[
        variantStyle[variant],
        resolvedColor ? { color: resolvedColor } : null,
        center ? styles.center : null,
        bold ? styles.bold : null,
        style,
      ]}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  bold: { fontWeight: '800' },
});
