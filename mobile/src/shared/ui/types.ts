import type { ThemeColors } from '../theme/tokens';

export type Palette = ThemeColors & {
  background: string;
  border: string;
};

export type ComponentThemeProps = { colors?: ThemeColors };
