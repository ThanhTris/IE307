import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import { AppIcon, type AppIconName } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';

export type HomeBottomNavigationItem = {
  id: string;
  label: string;
  icon: AppIconName;
  onPress: () => void;
};

export function AppBottomNavigation({
  items,
  activeId,
  bottomInset = 0,
  labelTextStyle,
  allowLabelWrap = false,
  colors,
}: ComponentThemeProps & {
  items: HomeBottomNavigationItem[];
  activeId: string;
  bottomInset?: number;
  labelTextStyle?: TextStyle;
  allowLabelWrap?: boolean;
}) {
  return (
    <View
      style={[
        styles.bottomNav,
        {
          backgroundColor: colors?.surface,
          borderTopColor: colors?.line,
          paddingBottom: Math.max(bottomInset, spacing.lg),
        },
      ]}
    >
      {items.map(item => {
        const selected = item.id === activeId;
        return (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
            accessibilityState={{ selected }}
            onPress={item.onPress}
            style={({ pressed }) => [styles.bottomNavItem, { opacity: pressed ? 0.42 : selected ? 1 : 0.6 }]}
          >
            <AppIcon name={item.icon} size={24} color={colors?.text} strokeWidth={selected ? 2.4 : 2} />
            <Text numberOfLines={allowLabelWrap ? undefined : 1} style={[styles.bottomNavLabel, allowLabelWrap && styles.bottomNavLabelWrapped, { color: colors?.text }, labelTextStyle]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    minHeight: 88,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  bottomNavItem: { flex: 1, minWidth: 0, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  bottomNavLabel: { ...typography.caption, width: '100%', maxWidth: '100%', minWidth: 0, fontSize: 12, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  bottomNavLabelWrapped: { alignSelf: 'stretch', flexShrink: 1, flexWrap: 'wrap' },
});
