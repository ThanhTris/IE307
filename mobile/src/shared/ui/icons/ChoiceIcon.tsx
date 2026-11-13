import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { MaterialSymbol, type MaterialSymbolName } from './MaterialSymbol';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, StyleSheet, Text, type ImageSourcePropType } from 'react-native';
import { AppIcon, type AppIconName } from './AppIcon';

export type FoodIconName = keyof typeof MaterialCommunityIcons.glyphMap;
export type FaIconName = keyof typeof FontAwesome6.glyphMap;
export type IonIconName = keyof typeof Ionicons.glyphMap;
export type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

/**
 * Icon for a choice tile: a UI icon (Lucide) by name, a food glyph (Material Community Icons), a solid
 * FontAwesome 6 glyph (dishes MCI lacks, e.g. shrimp, bowl of rice), an Ionicons glyph, a flag emoji, or a bundled image.
 * All sets come from the approved @expo/vector-icons and lucide-react-native packages.
 */
export type ChoiceIcon = AppIconName | { food: FoodIconName } | { fa: FaIconName } | { ion: IonIconName } | { mi: MaterialIconName } | { symbol: MaterialSymbolName } | { flag: string } | ImageSourcePropType;

export function ChoiceIconView({ icon, size = 24, color }: { icon: ChoiceIcon; size?: number; color?: string }) {
  if (typeof icon === 'string') return <AppIcon name={icon} size={size} color={color} />;
  if (icon && typeof icon === 'object' && 'food' in icon) {
    return <MaterialCommunityIcons name={icon.food} size={size + 2} color={color} accessible={false} importantForAccessibility="no-hide-descendants" />;
  }
  if (icon && typeof icon === 'object' && 'fa' in icon) {
    return <FontAwesome6 name={icon.fa} solid size={size - 2} color={color} accessible={false} importantForAccessibility="no-hide-descendants" />;
  }
  if (icon && typeof icon === 'object' && 'symbol' in icon) {
    return <MaterialSymbol name={icon.symbol} size={size + 4} color={color} />;
  }
  if (icon && typeof icon === 'object' && 'mi' in icon) {
    return <MaterialIcons name={icon.mi} size={size + 2} color={color} accessible={false} importantForAccessibility="no-hide-descendants" />;
  }
  if (icon && typeof icon === 'object' && 'ion' in icon) {
    return <Ionicons name={icon.ion} size={size} color={color} accessible={false} importantForAccessibility="no-hide-descendants" />;
  }
  if (icon && typeof icon === 'object' && 'flag' in icon) {
    return <Text accessible={false} importantForAccessibility="no" style={[styles.flag, { fontSize: size, lineHeight: size + 6 }]}>{icon.flag}</Text>;
  }
  return <Image source={icon as ImageSourcePropType} accessible={false} resizeMode="contain" style={[{ width: size, height: size }, color ? { tintColor: color } : null]} />;
}

const styles = StyleSheet.create({ flag: { textAlign: 'center' } });
