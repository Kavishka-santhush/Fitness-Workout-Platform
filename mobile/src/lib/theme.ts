/**
 * Design tokens. Mirrors the web app's Tailwind theme (green primary) so the
 * three surfaces feel like one product. Colors are plain hex for React Native;
 * consumers combine them with `StyleSheet` in components.
 */
export const colors = {
  // Brand
  primary: '#16A34A', // green-600
  primaryDark: '#15803D', // green-700
  primarySoft: 'rgba(22, 163, 74, 0.12)',

  // Backgrounds & surfaces
  background: '#0B0F14',
  surface: '#141A21',
  elevated: '#1C242E',
  border: '#26313C',

  // Text
  text: '#F5F7FA',
  muted: '#94A3B8',
  faint: '#64748B',

  // Status
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#0EA5E9',

  // Macro chart palette
  protein: '#38BDF8',
  carbs: '#F59E0B',
  fat: '#A78BFA',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 38,
} as const;

/** Category accent colors used by exercise/food/class chips. */
export const accents = [
  '#16A34A',
  '#0EA5E9',
  '#A78BFA',
  '#F59E0B',
  '#EF4444',
  '#22D3EE',
  '#F472B6',
] as const;

export const theme = { colors, spacing, radius, fontSize, accents } as const;
export type Theme = typeof theme;
