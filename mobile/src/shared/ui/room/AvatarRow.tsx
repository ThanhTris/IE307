import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type TextStyle,
} from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type AvatarItem = {
  id: string;
  label: string;
  initial?: string;
  imageSource?: ImageSourcePropType;
  status?: 'online' | 'idle' | 'offline';
};

export function AvatarRow({
  items,
  onAdd,
  showStatus = false,
  labelTextStyle,
  colors,
}: ComponentThemeProps & {
  items: AvatarItem[];
  onAdd?: () => void;
  showStatus?: boolean;
  labelTextStyle?: TextStyle;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.avatarRow}
      accessibilityLabel="Danh sách bạn ăn cùng"
    >
      {items.map(item => (
        <View key={item.id} style={styles.avatarItem}>
          <View style={[styles.avatar, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
            {item.imageSource ? (
              <Image source={item.imageSource} style={styles.avatarImage as ImageStyle} />
            ) : (
              <Text style={[styles.avatarInitial, { color: colors?.text }]}>
                {item.initial ?? item.label.slice(0, 1).toUpperCase()}
              </Text>
            )}
            {showStatus && item.status && item.status !== 'offline' ? (
              <View
                accessibilityLabel={item.status === 'online' ? 'Đang hoạt động' : 'Không hoạt động'}
                style={[styles.statusDot, { backgroundColor: item.status === 'online' ? colors?.green : colors?.warning }]}
              />
            ) : null}
          </View>
          <Text numberOfLines={1} style={[styles.avatarLabel, { color: colors?.text }, labelTextStyle]}>
            {item.label}
          </Text>
        </View>
      ))}
      {onAdd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Thêm bạn"
          onPress={onAdd}
          style={({ pressed }) => [styles.avatarItem, { opacity: pressed ? 0.6 : 1 }]}
        >
          <View style={[styles.addAvatar, { borderColor: colors?.line }]}>
            <Image
              source={require('../../../../assets/brand/icons/plus.png')}
              accessible={false}
              resizeMode="contain"
              style={[styles.addAvatarIcon, { tintColor: colors?.text }]}
            />
          </View>
          <Text style={[styles.avatarLabel, { color: colors?.text }, labelTextStyle]}>Thêm</Text>
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  avatarRow: { gap: spacing.md, paddingVertical: spacing.xs },
  avatarItem: { width: 64, alignItems: 'center', gap: spacing.xs },
  avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 46, height: 46, borderRadius: 23 },
  avatarInitial: { fontSize: 18, fontWeight: '800' },
  statusDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    right: -1,
    bottom: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLabel: { ...typography.caption, textAlign: 'center' },
  addAvatar: {
    width: 48,
    height: 48,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addAvatarIcon: { width: 24, height: 24 },
});
