import { useColorScheme } from 'react-native';
import { getThemeColors } from '../theme/tokens';

export function useShellTheme() {
  const dark = useColorScheme() === 'dark';
  const tokens = getThemeColors(dark ? 'dark' : 'light');
  return {
    colors: {
      ...tokens,
      background: tokens.bg,
      border: tokens.line,
    },
    dark,
  };
}
