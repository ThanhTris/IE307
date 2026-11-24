import { useColorScheme } from 'react-native';
import { getThemeColors } from '../theme/tokens';
import { useAppPreferences } from './AppPreferences';

export function useShellTheme() {
  const system = useColorScheme();
  const { appearance } = useAppPreferences();
  const dark = (appearance === 'system' ? system : appearance) === 'dark';
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
