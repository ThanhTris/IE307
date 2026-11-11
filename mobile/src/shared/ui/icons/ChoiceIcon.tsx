import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, StyleSheet, Text, type ImageSourcePropType } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';

export type FoodIconName = keyof typeof MaterialCommunityIcons.glyphMap;

/**
 * Icon for a choice tile: a UI icon (Lucide) by name, a food glyph (Material Community Icons),
 * a country flag emoji, or a bundled image.
 */
export type ChoiceIcon = AppIconName | { food: FoodIconName } | { flag: string } | ImageSourcePropType;

export function ChoiceIconView({ icon, size = 24, color }: { icon: ChoiceIcon; size?: number; color?: string }) {
  if (typeof icon === 'string') return <AppIcon name={icon} size={size} color={color} />;
  if (icon && typeof icon === 'object' && 'food' in icon) {
    return <MaterialCommunityIcons name={icon.food} size={size + 2} color={color} accessible={false} importantForAccessibility="no-hide-descendants" />;
  }
  if (icon && typeof icon === 'object' && 'flag' in icon) {
    return <Text accessible={false} importantForAccessibility="no" style={[styles.flag, { fontSize: size, lineHeight: size + 6 }]}>{icon.flag}</Text>;
  }
  return <Image source={icon as ImageSourcePropType} accessible={false} resizeMode="contain" style={[{ width: size, height: size }, color ? { tintColor: color } : null]} />;
}

const styles = StyleSheet.create({ flag: { textAlign: 'center' } });
