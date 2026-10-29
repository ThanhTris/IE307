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
  titleLarge: { fontFamily: 'InterBold', fontSize: 28, lineHeight: 34, fontWeight: 'normal' as const },
  titleMedium: { fontFamily: 'InterBold', fontSize: 20, lineHeight: 26, fontWeight: 'normal' as const },
  body: { fontFamily: 'InterRegular', fontSize: 15, lineHeight: 21, fontWeight: 'normal' as const },
  bodyBold: { fontFamily: 'InterSemiBold', fontSize: 15, lineHeight: 21, fontWeight: 'normal' as const },
  caption: { fontFamily: 'InterMedium', fontSize: 12, lineHeight: 17, fontWeight: 'normal' as const },
  roomCode: { fontFamily: 'InterBold', fontSize: 28, lineHeight: 34, fontWeight: 'normal' as const, letterSpacing: 5 },
} as const;

export const lightColors = {
  bg: '#FFFCF3',
  surface: '#FFFCF3',
  soft: '#F0F4E9',
  warm: '#ECF8EB',
  primary: '#238633',
  primaryPressed: '#1B6B29',
  onPrimary: '#FFFFFF',
  text: '#043B22',
  muted: '#043B22',
  line: '#B9CB9B',
  green: '#46C34F',
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
