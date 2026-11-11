import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type TextStyle,
} from 'react-native';
import { radii, spacing, typography, type ThemeColors } from '../../theme/tokens';
import type { ComponentThemeProps } from '../types';
import { AppIcon, type AppIconName } from '../icons/AppIcon';
import { BrandLogo } from './BrandLogo';

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
  allowTitleWrap?: boolean;
  centeredTitle?: boolean;
  hideDivider?: boolean;
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
  allowTitleWrap = false,
  centeredTitle = false,
  hideDivider = false,
  colors,
}: AppHeaderProps) {
  const showBrand = variant === 'home';
  return (
    <View style={[styles.header, { backgroundColor: colors?.surface, borderBottomColor: colors?.line }, hideDivider && { borderBottomWidth: 0 }]}>
      {showBrand ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Về trang chủ"
          onPress={onPressBrand}
          disabled={!onPressBrand}
          style={styles.brand}
        >
          <BrandLogo size={44} />
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
            <AppIcon name="back" size={28} color={colors?.text} />
          </Pressable>
          <View style={styles.headerVariantTitle}>
            <Text
              numberOfLines={allowTitleWrap ? undefined : 1}
              accessibilityRole="header"
              style={[styles.brandText, { color: colors?.text }, centeredTitle && { textAlign: 'center' }, brandTextStyle]}
            >
              {title}
            </Text>
            {variant === 'room' && roomCode ? (
              <Text numberOfLines={1} style={[styles.headerRoomCode, { color: colors?.muted }]}>
                {roomCode}
              </Text>
            ) : null}
          </View>
          {centeredTitle && variant === 'back' ? <View style={styles.headerAction} /> : null}
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
            icon="friends"
            badge={friendBadge}
            onPress={onFriends}
            colors={colors}
          />
        ) : null}
        {variant === 'home' && showInbox ? (
          <HeaderAction
            label="Thông báo"
            icon="bell"
            badge={inboxBadge}
            onPress={onInbox}
            colors={colors}
          />
        ) : null}
        {variant === 'home' && showProfile ? (
          <HeaderAction
            label="Hồ sơ"
            icon="profile"
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
  icon,
  badge,
  onPress,
  colors,
}: {
  label: string;
  icon: AppIconName;
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
      <AppIcon name={icon} size={24} color={colors?.text} />
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
  headerRoomCode: { ...typography.caption },
  headerMenu: { alignItems: 'center', justifyContent: 'center' },
  headerMenuGlyph: { fontSize: 28, lineHeight: 30, fontWeight: '800' },
  mark: { width: 44, height: 44 },
  brandText: { ...typography.titleMedium, lineHeight: 28, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerAction: { width: 48, height: 48, borderRadius: radii.pill, justifyContent: 'center', alignItems: 'center' },
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
