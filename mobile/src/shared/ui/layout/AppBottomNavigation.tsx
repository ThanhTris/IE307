import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type TextStyle,
} from 'react-native';
import { spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type HomeBottomNavigationItem = {
  id: string;
  label: string;
  iconSource: ImageSourcePropType;
  onPress: () => void;
};

export function AppBottomNavigation({
  items,
  activeId,
  bottomInset = 0,
  labelTextStyle,
  colors,
}: ComponentThemeProps & {
  items: HomeBottomNavigationItem[];
  activeId: string;
  bottomInset?: number;
  labelTextStyle?: TextStyle;
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
            <Image
              source={item.iconSource}
              accessible={false}
              resizeMode="contain"
              style={[styles.bottomNavIcon, { tintColor: colors?.text }]}
            />
            <Text numberOfLines={1} style={[styles.bottomNavLabel, { color: colors?.text }, labelTextStyle]}>
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
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingTop: spacing.xs,
  },
  bottomNavItem: { flex: 1, minWidth: 0, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  bottomNavIcon: { width: 24, height: 24 },
  bottomNavLabel: { ...typography.caption, fontSize: 12, lineHeight: 18, fontWeight: '500' },
});
