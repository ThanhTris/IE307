export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const typography = {
  titleLarge: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const },
  titleMedium: { fontSize: 20, lineHeight: 26, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 21, fontWeight: '500' as const },
  bodyBold: { fontSize: 15, lineHeight: 21, fontWeight: '700' as const },
  caption: { fontSize: 12, lineHeight: 17, fontWeight: '600' as const },
  roomCode: { fontSize: 28, lineHeight: 34, fontWeight: '800' as const, letterSpacing: 5 },
} as const;

export const lightColors = {
  bg: '#F8F6F2',
  surface: '#FFFFFF',
  soft: '#F1EFE9',
  warm: '#FFF5ED',
  primary: '#FF5A36',
  primaryPressed: '#E04724',
  onPrimary: '#FFFFFF',
  text: '#1A202C',
  muted: '#64748B',
  line: '#E2E8F0',
  green: '#10B981',
  danger: '#EF4444',
  warning: '#D97706',
} as const;

export const darkColors = {
  bg: '#13161B',
  surface: '#1C212B',
  soft: '#252C38',
  warm: '#2D231E',
  primary: '#FF6F4E',
  primaryPressed: '#FF8568',
  onPrimary: '#FFFFFF',
  text: '#F0F4F8',
  muted: '#94A3B8',
  line: '#2D3748',
  green: '#34D399',
  danger: '#F87171',
  warning: '#FBBF24',
} as const;

export type ThemeColors = Record<keyof typeof lightColors, string>;
export type ThemeMode = 'light' | 'dark';

export function getThemeColors(mode: ThemeMode): ThemeColors {
  return mode === 'dark' ? darkColors : lightColors;
}

export const designTokens = { spacing, radii, typography, lightColors, darkColors } as const;
