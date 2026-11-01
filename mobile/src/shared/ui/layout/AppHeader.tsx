import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type TextStyle,
} from 'react-native';
import { radii, spacing, typography, type ThemeColors } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';

export type AppHeaderProps = ComponentThemeProps & {
  variant?: 'home' | 'back' | 'room';
  title?: string;
  roomCode?: string;
  onPressBrand?: () => void;
  onPressBack?: () => void;
  onMenu?: () => void;
  onFriends?: () => void;
  onInbox?: () => void;
  onProfile?: () => void;
  friendBadge?: number;
  inboxBadge?: number;
  showFriends?: boolean;
  showInbox?: boolean;
  showProfile?: boolean;
  brandTextStyle?: TextStyle;
  backIconSource?: ImageSourcePropType;
  allowTitleWrap?: boolean;
};

export function AppHeader({
  variant = 'home',
  title = 'Gì Cũng Được',
  roomCode,
  onPressBrand,
  onPressBack,
  onMenu,
  onFriends,
  onInbox,
  onProfile,
  friendBadge,
  inboxBadge,
  showFriends = true,
  showInbox = true,
  showProfile = true,
  brandTextStyle,
  backIconSource,
  allowTitleWrap = false,
  colors,
}: AppHeaderProps) {
  const showBrand = variant === 'home';
  return (
    <View style={[styles.header, { backgroundColor: colors?.surface, borderBottomColor: colors?.line }]}>
      {showBrand ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về trang chủ"
          onPress={onPressBrand}
          disabled={!onPressBrand}
          style={styles.brand}
        >
          <Image
            source={require('../../../../assets/brand/gcd-logo-master.png')}
            accessible={false}
            resizeMode="contain"
            style={styles.mark}
          />
          <Text numberOfLines={allowTitleWrap ? undefined : 1} style={[styles.brandText, { color: colors?.text }, brandTextStyle]}>
            {title}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.headerVariant}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quay lại"
            onPress={onPressBack}
            disabled={!onPressBack}
            style={({ pressed }) => [
              styles.headerAction,
              { backgroundColor: pressed ? colors?.soft : 'transparent', opacity: onPressBack ? 1 : 0.45 },
            ]}
          >
            {backIconSource ? <Image source={backIconSource} accessible={false} resizeMode="contain" style={[styles.headerIcon, { tintColor: colors?.text }]} /> : <Text style={[styles.backGlyph, { color: colors?.text }]}>‹</Text>}
          </Pressable>
          <View style={styles.headerVariantTitle}>
            <Text
              numberOfLines={allowTitleWrap ? undefined : 1}
              accessibilityRole="header"
              style={[styles.brandText, { color: colors?.text }, brandTextStyle]}
            >
              {title}
            </Text>
            {variant === 'room' && roomCode ? (
              <Text numberOfLines={1} style={[styles.headerRoomCode, { color: colors?.muted }]}>
                {roomCode}
              </Text>
            ) : null}
          </View>
          {variant === 'room' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tùy chọn phòng"
              accessibilityState={{ disabled: !onMenu }}
              onPress={onMenu}
              disabled={!onMenu}
              style={({ pressed }) => [
                styles.headerAction,
                styles.headerMenu,
                { backgroundColor: pressed ? colors?.soft : 'transparent', opacity: onMenu ? 1 : 0.45 },
              ]}
            >
              <Text style={[styles.headerMenuGlyph, { color: colors?.text }]}>⋯</Text>
            </Pressable>
          ) : null}
        </View>
      )}
      <View style={styles.headerActions}>
        {variant === 'home' && showFriends ? (
          <HeaderAction
            label="Bạn ăn cùng"
            iconSource={require('../../../../assets/brand/icons/friends.png')}
            badge={friendBadge}
            onPress={onFriends}
            colors={colors}
          />
        ) : null}
        {variant === 'home' && showInbox ? (
          <HeaderAction
            label="Thông báo"
            iconSource={require('../../../../assets/brand/icons/bell.png')}
            badge={inboxBadge}
            onPress={onInbox}
            colors={colors}
          />
        ) : null}
        {variant === 'home' && showProfile ? (
          <HeaderAction
            label="Hồ sơ"
            iconSource={require('../../../../assets/brand/icons/profile.png')}
            onPress={onProfile}
            colors={colors}
          />
        ) : null}
      </View>
    </View>
  );
}

function HeaderAction({
  label,
  iconSource,
  badge,
  onPress,
  colors,
}: {
  label: string;
  iconSource: ImageSourcePropType;
  badge?: number;
  onPress?: () => void;
  colors?: ThemeColors;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !onPress }}
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.headerAction,
        { backgroundColor: pressed ? colors?.soft : 'transparent', opacity: onPress ? 1 : 0.65 },
      ]}
    >
      <Image source={iconSource} accessible={false} resizeMode="contain" style={[styles.headerIcon, { tintColor: colors?.text }]} />
      {badge !== undefined && badge > 0 ? (
        <View style={[styles.badge, { backgroundColor: colors?.danger }]}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  brand: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerVariant: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerVariantTitle: { flex: 1, minWidth: 0, gap: spacing.xs },
  backGlyph: { fontSize: 32, lineHeight: 36, textAlign: 'center' },
  headerRoomCode: { ...typography.caption },
  headerMenu: { alignItems: 'center', justifyContent: 'center' },
  headerMenuGlyph: { fontSize: 28, lineHeight: 30, fontWeight: '800' },
  mark: { width: 44, height: 44 },
  brandText: { ...typography.titleMedium, lineHeight: 28, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerAction: { width: 48, height: 48, borderRadius: radii.pill, justifyContent: 'center', alignItems: 'center' },
  headerIcon: { width: 24, height: 24 },
  badge: {
    position: 'absolute',
    right: 1,
    top: 3,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
});
