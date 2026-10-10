import { useColorScheme } from 'react-native';

// Minimal shell palette from DESIGN_SYSTEM; full shared tokens/components belong to GM-05.
const palettes = {
  light: { background: '#F7F3EC', surface: '#FFFFFF', text: '#222D27', muted: '#58665D', primary: '#A83D25', onPrimary: '#FFFFFF', border: '#D8DED6' },
  dark: { background: '#191D1A', surface: '#242B26', text: '#F4F2EC', muted: '#B7C2B9', primary: '#F7A78D', onPrimary: '#191D1A', border: '#516057' },
};

export function useShellTheme() {
  const dark = useColorScheme() === 'dark';
  return { colors: palettes[dark ? 'dark' : 'light'], dark };
}
