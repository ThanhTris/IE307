import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ImageSourcePropType,
  type ImageStyle,
  type KeyboardTypeOptions,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useState, type ReactNode } from 'react';
import { radii, spacing, typography, type ThemeColors } from '../theme/tokens';

export type ComponentThemeProps = { colors?: ThemeColors };

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
};

export function AppHeader({ variant = 'home', title = 'Gì Cũng Được', roomCode, onPressBrand, onPressBack, onMenu, onFriends, onInbox, onProfile, friendBadge, inboxBadge, showFriends = true, showInbox = true, showProfile = true, brandTextStyle, colors }: AppHeaderProps) {
  const showBrand = variant === 'home';
  return (
    <View style={[styles.header, { backgroundColor: colors?.surface, borderBottomColor: colors?.line }]}>
      {showBrand ? <Pressable accessibilityRole="button" accessibilityLabel="Về trang chủ" onPress={onPressBrand} disabled={!onPressBrand} style={styles.brand}>
        <Image source={require('../../../assets/brand/gcd-logo-master.png')} accessible={false} resizeMode="contain" style={styles.mark} />
        <Text numberOfLines={1} style={[styles.brandText, { color: colors?.text }, brandTextStyle]}>{title}</Text>
      </Pressable> : <View style={styles.headerVariant}>
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onPressBack} disabled={!onPressBack} style={({ pressed }) => [styles.headerAction, { backgroundColor: pressed ? colors?.soft : 'transparent', opacity: onPressBack ? 1 : 0.45 }]}>
          <Text style={[styles.backGlyph, { color: colors?.text }]}>‹</Text>
        </Pressable>
        <View style={styles.headerVariantTitle}>
          <Text numberOfLines={1} accessibilityRole="header" style={[styles.brandText, { color: colors?.text }, brandTextStyle]}>{title}</Text>
          {variant === 'room' && roomCode ? <Text numberOfLines={1} style={[styles.headerRoomCode, { color: colors?.muted }]}>{roomCode}</Text> : null}
        </View>
        {variant === 'room' ? <Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn phòng" accessibilityState={{ disabled: !onMenu }} onPress={onMenu} disabled={!onMenu} style={({ pressed }) => [styles.headerAction, styles.headerMenu, { backgroundColor: pressed ? colors?.soft : 'transparent', opacity: onMenu ? 1 : 0.45 }]}><Text style={[styles.headerMenuGlyph, { color: colors?.text }]}>⋯</Text></Pressable> : null}
      </View>}
      <View style={styles.headerActions}>
        {variant === 'home' && showFriends ? <HeaderAction label="Bạn ăn cùng" iconSource={require('../../../assets/brand/icons/friends.png')} badge={friendBadge} onPress={onFriends} colors={colors} /> : null}
        {variant === 'home' && showInbox ? <HeaderAction label="Thông báo" iconSource={require('../../../assets/brand/icons/bell.png')} badge={inboxBadge} onPress={onInbox} colors={colors} /> : null}
        {variant === 'home' && showProfile ? <HeaderAction label="Hồ sơ" iconSource={require('../../../assets/brand/icons/profile.png')} onPress={onProfile} colors={colors} /> : null}
      </View>
    </View>
  );
}

function HeaderAction({ label, iconSource, badge, onPress, colors }: { label: string; iconSource: ImageSourcePropType; badge?: number; onPress?: () => void; colors?: ThemeColors }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: !onPress }} onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.headerAction, { backgroundColor: pressed ? colors?.soft : 'transparent', opacity: onPress ? 1 : 0.65 }]}>
      <Image source={iconSource} accessible={false} resizeMode="contain" style={[styles.headerIcon, { tintColor: colors?.text }]} />
      {badge !== undefined && badge > 0 ? <View style={[styles.badge, { backgroundColor: colors?.danger }]}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View> : null}
    </Pressable>
  );
}

export type AppButtonProps = ComponentThemeProps & {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
  iconSource?: ImageSourcePropType;
  iconTintColor?: string;
  iconLayout?: 'inline' | 'stacked';
  textStyle?: TextStyle;
};

export function AppButton({ label, onPress, variant = 'primary', disabled, loading, accessibilityHint, style, colors, iconSource, iconTintColor, iconLayout = 'inline', textStyle }: AppButtonProps) {
  const background = variant === 'primary' ? colors?.primary : variant === 'danger' ? colors?.danger : variant === 'secondary' ? colors?.surface : colors?.soft;
  const foreground = variant === 'primary' || variant === 'danger' ? colors?.onPrimary : colors?.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed && variant === 'primary'
            ? colors?.primaryPressed
            : pressed && variant === 'secondary'
              ? colors?.soft
              : background,
          borderColor: colors?.line,
          opacity: disabled || loading ? 0.55 : pressed && variant === 'danger' ? 0.65 : 1,
        },
        variant === 'secondary' && styles.buttonSecondary,
        iconSource && iconLayout === 'stacked' ? styles.iconButtonStacked : undefined,
        style,
      ]}
    >
      {iconSource && !loading ? <Image testID="app-button-icon" source={iconSource} accessible={false} resizeMode="contain" style={[styles.buttonIcon, { tintColor: iconTintColor ?? foreground }]} /> : null}
      <Text style={[styles.buttonText, iconSource && iconLayout === 'stacked' ? styles.iconButtonText : undefined, { color: foreground }, textStyle]}>{loading ? 'Đang xử lý…' : label}</Text>
    </Pressable>
  );
}

export type HomeBottomNavigationItem = {
  id: string;
  label: string;
  iconSource: ImageSourcePropType;
  onPress: () => void;
};

export function AppBottomNavigation({ items, activeId, bottomInset = 0, labelTextStyle, colors }: ComponentThemeProps & { items: HomeBottomNavigationItem[]; activeId: string; bottomInset?: number; labelTextStyle?: TextStyle }) {
  return (
    <View style={[styles.bottomNav, { backgroundColor: colors?.surface, borderTopColor: colors?.line, paddingBottom: Math.max(bottomInset, spacing.lg) }]}>
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
            <Image source={item.iconSource} accessible={false} resizeMode="contain" style={[styles.bottomNavIcon, { tintColor: colors?.text }]} />
            <Text numberOfLines={1} style={[styles.bottomNavLabel, { color: colors?.text }, labelTextStyle]}>{item.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function BrandBanner({ title = 'Hợp gu cả nhóm,\nvui trọn bữa ăn.', titleTextStyle, colors }: ComponentThemeProps & { title?: string; titleTextStyle?: TextStyle }) {
  return (
    <View style={[styles.brandBanner, { backgroundColor: colors?.warm }]}>
      <Text accessibilityRole="summary" style={[styles.brandBannerTitle, { color: colors?.text }, titleTextStyle]}>{title}</Text>
      <Image
        testID="brand-banner-illustration"
        source={require('../../../assets/brand/friends-dining.png')}
        accessible={false}
        resizeMode="contain"
        style={styles.brandBannerImage}
      />
    </View>
  );
}

export type FormFieldProps = ComponentThemeProps & Pick<TextInputProps, 'autoCapitalize' | 'autoCorrect' | 'editable' | 'keyboardType' | 'secureTextEntry' | 'testID'> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  helperText?: string;
  error?: string;
  keyboardType?: KeyboardTypeOptions;
};

export function FormField({ label, value, onChangeText, placeholder, helperText, error, colors, ...inputProps }: FormFieldProps) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors?.text }]}>{label}</Text>
      <TextInput
        {...inputProps}
        accessibilityLabel={label}
        accessibilityHint={error || helperText}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors?.muted}
        style={[styles.input, { backgroundColor: colors?.soft, borderColor: error ? colors?.danger : colors?.line, color: colors?.text }]}
      />
      {error ? <Text accessibilityRole="alert" style={[styles.helper, { color: colors?.danger }]}>{error}</Text> : helperText ? <Text style={[styles.helper, { color: colors?.muted }]}>{helperText}</Text> : null}
    </View>
  );
}

export type ChipProps = ComponentThemeProps & { label: string; selected?: boolean; disabled?: boolean; onPress?: () => void; leadingIcon?: string };

export function Chip({ label, selected = false, disabled = false, onPress, leadingIcon, colors }: ChipProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.chip, { backgroundColor: selected ? colors?.warm : colors?.soft, borderColor: selected ? colors?.primary : colors?.line, opacity: pressed || disabled ? 0.65 : 1 }]}>
      {leadingIcon ? <Text style={styles.chipIcon}>{leadingIcon}</Text> : null}
      {selected ? <Text style={[styles.chipIcon, { color: colors?.primary }]}>✓</Text> : null}
      <Text style={[styles.chipText, { color: selected ? colors?.primary : colors?.text }]}>{label}</Text>
    </Pressable>
  );
}

export type DishCardData = { id: string; name: string; description?: string; imageUrl?: string; imageSource?: ImageSourcePropType; tags?: string[]; priceLabel?: string; venueLabel?: string };
export type VoteValue = 'WANT' | 'OK' | 'NO';
export type DishCardProps = ComponentThemeProps & {
  dish: DishCardData;
  selectedVote?: VoteValue;
  onVote?: (vote: VoteValue) => void;
  onPress?: () => void;
  disabled?: boolean;
  delayPressIn?: number;
};

export function DishCard({ dish, selectedVote, onVote, onPress, colors, disabled, delayPressIn }: DishCardProps) {
  const imageKey = dish.imageSource ?? dish.imageUrl;
  const [failedImageKey, setFailedImageKey] = useState<typeof imageKey>(undefined);
  const imageFailed = failedImageKey === imageKey;
  const source = dish.imageSource ?? (dish.imageUrl ? { uri: dish.imageUrl } : undefined);
  return (
    <View style={[styles.dishCard, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Mở món ${dish.name}`}
        onPress={onPress}
        disabled={disabled || !onPress}
        unstable_pressDelay={delayPressIn ?? 100}
      >
        {source && !imageFailed ? <Image accessibilityLabel={`Ảnh ${dish.name}`} source={source} onError={() => setFailedImageKey(imageKey)} style={styles.dishImage as ImageStyle} /> : <View accessibilityLabel={`Ảnh dự phòng ${dish.name}`} style={[styles.dishFallback, { backgroundColor: colors?.warm }]}><Text style={styles.dishEmoji}>🍜</Text></View>}
        <View style={styles.dishBody}>
          <Text style={[styles.dishName, { color: colors?.text }]}>{dish.name}</Text>
          {dish.description ? <Text style={[styles.dishDescription, { color: colors?.muted }]}>{dish.description}</Text> : null}
          {dish.tags?.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>{dish.tags.map(tag => <Chip key={tag} label={tag} colors={colors} />)}</ScrollView> : null}
          <Text style={[styles.dishMeta, { color: colors?.muted }]}>{[dish.priceLabel ?? 'Giá chưa rõ', dish.venueLabel].filter(Boolean).join(' · ')}</Text>
        </View>
      </Pressable>
      {onVote ? <View style={styles.voteRow}>
        <VoteButton label="Muốn ăn" vote="WANT" selectedVote={selectedVote} onPress={onVote} colors={colors} disabled={disabled} />
        <VoteButton label="Ăn được" vote="OK" selectedVote={selectedVote} onPress={onVote} colors={colors} disabled={disabled} />
        <VoteButton label="Không ăn" vote="NO" selectedVote={selectedVote} onPress={onVote} colors={colors} disabled={disabled} />
      </View> : null}
    </View>
  );
}

function VoteButton({ label, vote, selectedVote, onPress, colors, disabled }: { label: string; vote: VoteValue; selectedVote?: VoteValue; onPress: (vote: VoteValue) => void; colors?: ThemeColors; disabled?: boolean }) {
  const selected = selectedVote === vote;
  const color = vote === 'WANT' ? colors?.primary : vote === 'OK' ? colors?.green : colors?.danger;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled: !!disabled }}
      onPress={() => onPress(vote)}
      disabled={disabled}
      style={[
        styles.voteButton,
        {
          borderColor: color,
          backgroundColor: selected ? color : colors?.surface,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <Text style={{ color: selected ? colors?.onPrimary : color, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

export type AvatarItem = { id: string; label: string; initial?: string; imageSource?: ImageSourcePropType; status?: 'online' | 'idle' | 'offline' };
export function AvatarRow({ items, onAdd, showStatus = false, labelTextStyle, colors }: ComponentThemeProps & { items: AvatarItem[]; onAdd?: () => void; showStatus?: boolean; labelTextStyle?: TextStyle }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow} accessibilityLabel="Danh sách bạn ăn cùng">
    {items.map(item => <View key={item.id} style={styles.avatarItem}><View style={[styles.avatar, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>{item.imageSource ? <Image source={item.imageSource} style={styles.avatarImage as ImageStyle} /> : <Text style={[styles.avatarInitial, { color: colors?.text }]}>{item.initial ?? item.label.slice(0, 1).toUpperCase()}</Text>}{showStatus && item.status && item.status !== 'offline' ? <View accessibilityLabel={item.status === 'online' ? 'Đang hoạt động' : 'Không hoạt động'} style={[styles.statusDot, { backgroundColor: item.status === 'online' ? colors?.green : colors?.warning }]} /> : null}</View><Text numberOfLines={1} style={[styles.avatarLabel, { color: colors?.text }, labelTextStyle]}>{item.label}</Text></View>)}
    {onAdd ? <Pressable accessibilityRole="button" accessibilityLabel="Thêm bạn" onPress={onAdd} style={({ pressed }) => [styles.avatarItem, { opacity: pressed ? 0.6 : 1 }]}><View style={[styles.addAvatar, { borderColor: colors?.line }]}><Image source={require('../../../assets/brand/icons/plus.png')} accessible={false} resizeMode="contain" style={[styles.addAvatarIcon, { tintColor: colors?.text }]} /></View><Text style={[styles.avatarLabel, { color: colors?.text }, labelTextStyle]}>Thêm</Text></Pressable> : null}
  </ScrollView>;
}

export function RoomCode({ code, onCopy, colors }: ComponentThemeProps & { code: string; onCopy?: () => void }) {
  return <View style={[styles.roomCodeCard, { backgroundColor: colors?.warm, borderColor: colors?.line }]}><Text style={[styles.caption, { color: colors?.muted }]}>MÃ PHÒNG</Text><Text accessibilityLabel={`Mã phòng ${code}`} style={[styles.roomCode, { color: colors?.primary }]}>{code.trim().toUpperCase()}</Text><AppButton label="Sao chép mã" variant="secondary" onPress={onCopy} colors={colors} /></View>;
}

export type ContextSummaryProps = ComponentThemeProps & { anchorName: string; mealLabel: string; desiredAtLabel: string; radiusLabel: string; serviceModeLabel?: string };
export function ContextSummary({ anchorName, mealLabel, desiredAtLabel, radiusLabel, serviceModeLabel, colors }: ContextSummaryProps) {
  return <View style={[styles.contextCard, { backgroundColor: colors?.surface, borderColor: colors?.line }]}><Text style={[styles.caption, { color: colors?.muted }]}>BỐI CẢNH PHÒNG</Text><Text style={[styles.contextTitle, { color: colors?.text }]}>{anchorName}</Text><View style={styles.contextGrid}><ContextValue label="Bữa" value={mealLabel} colors={colors} /><ContextValue label="Thời gian" value={desiredAtLabel} colors={colors} /><ContextValue label="Bán kính" value={radiusLabel} colors={colors} />{serviceModeLabel ? <ContextValue label="Hình thức" value={serviceModeLabel} colors={colors} /> : null}</View></View>;
}

function ContextValue({ label, value, colors }: { label: string; value: string; colors?: ThemeColors }) {
  return <View style={styles.contextValue}><Text style={[styles.helper, { color: colors?.muted }]}>{label}</Text><Text style={[styles.contextValueText, { color: colors?.text }]}>{value}</Text></View>;
}

export function StatusNotice({ title, message, tone = 'info', actionLabel, onAction, colors }: ComponentThemeProps & { title: string; message?: string; tone?: 'info' | 'success' | 'warning' | 'error'; actionLabel?: string; onAction?: () => void }) {
  const toneColor = tone === 'success' ? colors?.green : tone === 'warning' ? colors?.warning : tone === 'error' ? colors?.danger : colors?.primary;
  return <View accessibilityRole="summary" style={[styles.notice, { backgroundColor: colors?.soft, borderColor: toneColor }]}><Text style={[styles.noticeTitle, { color: toneColor }]}>{title}</Text>{message ? <Text style={[styles.body, { color: colors?.text }]}>{message}</Text> : null}{actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null}</View>;
}

export function SheetDialog({ visible, title, children, onClose, colors }: ComponentThemeProps & { visible: boolean; title: string; children: ReactNode; onClose: () => void }) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.modalBackdrop}><View style={[styles.sheet, { backgroundColor: colors?.surface }]}><View style={styles.sheetHandle} /><Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>{title}</Text>{children}<AppButton label="Đóng" variant="quiet" onPress={onClose} colors={colors} /></View></View></Modal>;
}

export type DishCountProps = ComponentThemeProps & { value: number; onChange: (next: number) => void; min?: number; max?: number; disabled?: boolean };
export function DishCount({ value, onChange, min = 10, max = 20, disabled = false, colors }: DishCountProps) {
  const count = Math.min(max, Math.max(min, value));
  return <View accessibilityRole="summary" style={[styles.dishCount, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
    <Text style={[styles.dishCountLabel, { color: colors?.muted }]}>SỐ MÓN</Text>
    <View style={styles.dishCountControls}>
      <Pressable accessibilityRole="button" accessibilityLabel="Giảm số món" accessibilityState={{ disabled: disabled || count <= min }} disabled={disabled || count <= min} onPress={() => onChange(Math.max(min, count - 1))} style={({ pressed }) => [styles.countButton, { borderColor: colors?.line, backgroundColor: pressed ? colors?.soft : colors?.surface, opacity: disabled || count <= min ? 0.45 : 1 }]}><Text style={[styles.countButtonText, { color: colors?.text }]}>−</Text></Pressable>
      <Text accessibilityLabel={`${count} món`} accessibilityRole="text" style={[styles.dishCountValue, { color: colors?.text }]}>{count}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Tăng số món" accessibilityState={{ disabled: disabled || count >= max }} disabled={disabled || count >= max} onPress={() => onChange(Math.min(max, count + 1))} style={({ pressed }) => [styles.countButton, { borderColor: colors?.line, backgroundColor: pressed ? colors?.soft : colors?.surface, opacity: disabled || count >= max ? 0.45 : 1 }]}><Text style={[styles.countButtonText, { color: colors?.text }]}>+</Text></Pressable>
    </View>
    <Text style={[styles.helper, { color: colors?.muted }]}>Chọn từ {min} đến {max} món</Text>
  </View>;
}

export type PreferenceChoiceOption = { id: string; label: string; unknown?: boolean };
export function PreferenceChoice({ options, selectedId, onSelect, disabled = false, colors }: ComponentThemeProps & { options: PreferenceChoiceOption[]; selectedId?: string; onSelect: (id: string) => void; disabled?: boolean }) {
  return <View accessibilityRole="radiogroup" style={styles.preferenceChoice}>
    {options.map(option => {
      const selected = option.id === selectedId;
      const unavailable = disabled || option.unknown === true;
      return <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.label} accessibilityState={{ checked: selected, disabled: unavailable }} disabled={unavailable} onPress={() => onSelect(option.id)} style={({ pressed }) => [styles.preferenceOption, { backgroundColor: selected ? colors?.warm : colors?.surface, borderColor: selected ? colors?.primary : colors?.line, opacity: unavailable && !option.unknown ? 0.5 : pressed ? 0.72 : 1 }]}>
        <Text style={[styles.preferenceOptionText, { color: option.unknown ? colors?.muted : selected ? colors?.primary : colors?.text }]}>{option.label}</Text>
        {selected ? <Text accessibilityLabel="Đã chọn" style={[styles.preferenceCheck, { color: colors?.primary }]}>✓</Text> : null}
        {option.unknown ? <Text style={[styles.helper, { color: colors?.muted }]}>Chưa rõ</Text> : null}
      </Pressable>;
    })}
  </View>;
}

export function WaitingSummary({ acknowledged, total, deadlineLabel, statusLabel, colors }: ComponentThemeProps & { acknowledged: number; total: number; deadlineLabel: string; statusLabel?: string }) {
  const safeTotal = Math.max(total, 0);
  const safeAcknowledged = Math.min(safeTotal, Math.max(0, acknowledged));
  const progress = safeTotal ? Math.round((safeAcknowledged / safeTotal) * 100) : 0;
  return <View accessibilityRole="summary" style={[styles.waitingSummary, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
    <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>Đang chờ nhóm</Text>
    <Text style={[styles.body, { color: colors?.text }]}>{statusLabel ?? `${safeAcknowledged}/${safeTotal} thành viên đã gửi`}</Text>
    <View accessibilityRole="progressbar" accessibilityLabel="Tiến độ thành viên đã gửi" accessibilityValue={{ min: 0, max: 100, now: progress }} style={[styles.progressTrack, { backgroundColor: colors?.soft }]}><View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: colors?.primary }]} /></View>
    <Text style={[styles.helper, { color: colors?.muted }]}>Hạn gửi: {deadlineLabel}</Text>
  </View>;
}

export type PodiumDish = { id: string; name: string; rank: 1 | 2 | 3; scoreLabel?: string; winner?: boolean };
export function ResultPodium({ dishes, colors }: ComponentThemeProps & { dishes: PodiumDish[] }) {
  const podium = dishes.filter(dish => dish.rank >= 1 && dish.rank <= 3);
  return <ScrollView horizontal accessibilityRole="summary" accessibilityLabel="Bảng xếp hạng món ăn" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.podium}>
    {podium.map(dish => <View key={dish.id} style={[styles.podiumColumn, styles[`podiumRank${dish.rank}`], { backgroundColor: colors?.surface, borderColor: dish.winner ? colors?.primary : colors?.line }]}>
      <Text style={[styles.podiumRank, { color: colors?.primary }]}>{dish.rank}</Text>
      <Text numberOfLines={3} style={[styles.podiumName, { color: colors?.text }]}>{dish.name}</Text>
      {dish.scoreLabel ? <Text style={[styles.helper, { color: colors?.muted }]}>{dish.scoreLabel}</Text> : null}
      {dish.winner ? <Text style={[styles.winnerBadge, { color: colors?.primary }]}>Chiến thắng</Text> : null}
    </View>)}
  </ScrollView>;
}

export type ProcessStateKind = 'loading' | 'submitting' | 'unknown' | 'finalizing' | 'error' | 'success' | 'closed';
export function ProcessState({ state, title, message, retryLabel, onRetry, colors }: ComponentThemeProps & { state: ProcessStateKind; title: string; message?: string; retryLabel?: string; onRetry?: () => void }) {
  const busy = state === 'loading' || state === 'submitting' || state === 'unknown' || state === 'finalizing';
  const tone = state === 'error' ? 'error' : state === 'closed' ? 'warning' : state === 'success' ? 'success' : 'info';
  return <View accessibilityLiveRegion="polite" style={styles.processState}>
    {busy ? <ActivityIndicator accessibilityLabel={title} color={colors?.primary} /> : null}
    <StatusNotice title={title} message={message} tone={tone} actionLabel={retryLabel} onAction={onRetry} colors={colors} />
  </View>;
}

export type CollectionStateKind = 'loading' | 'empty' | 'error' | 'unavailable';
export function CollectionState({ state, title, message, iconSource, actionLabel, onAction, colors }: ComponentThemeProps & { state: CollectionStateKind; title: string; message?: string; iconSource?: ImageSourcePropType; actionLabel?: string; onAction?: () => void }) {
  return <View accessibilityRole="summary" accessibilityLiveRegion={state === 'loading' ? 'polite' : 'none'} style={[styles.collectionState, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
    {state === 'loading' ? <ActivityIndicator accessibilityLabel={title} color={colors?.primary} /> : iconSource ? <Image source={iconSource} accessible={false} resizeMode="contain" style={styles.collectionIcon} /> : null}
    <Text accessibilityRole="header" style={[styles.noticeTitle, { color: colors?.text }]}>{title}</Text>
    {message ? <Text style={[styles.body, { color: colors?.muted }]}>{message}</Text> : null}
    {actionLabel ? <AppButton label={actionLabel} variant="secondary" onPress={onAction} colors={colors} /> : null}
  </View>;
}

export function SearchSkeletonRow({ label = 'Đang tải danh sách', colors }: ComponentThemeProps & { label?: string }) {
  return <View accessibilityRole="progressbar" accessibilityLabel={label} style={[styles.skeletonRow, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
    <View style={[styles.skeletonAvatar, { backgroundColor: colors?.soft }]} />
    <View style={styles.skeletonCopy}><View style={[styles.skeletonLine, styles.skeletonLineWide, { backgroundColor: colors?.soft }]} /><View style={[styles.skeletonLine, styles.skeletonLineShort, { backgroundColor: colors?.soft }]} /></View>
    <View style={[styles.skeletonAction, { backgroundColor: colors?.soft }]} />
  </View>;
}

export type RequestBannerState = 'offline' | 'stale' | 'error' | 'info';
export function RequestBanner({ state, title, message, fetchedAtLabel, actionLabel, onAction, colors }: ComponentThemeProps & { state: RequestBannerState; title: string; message?: string; fetchedAtLabel?: string; actionLabel?: string; onAction?: () => void }) {
  const tone = state === 'error' ? 'error' : state === 'offline' ? 'warning' : 'info';
  return <View style={styles.requestBanner}>
    <StatusNotice title={title} message={message} tone={tone} actionLabel={actionLabel} onAction={onAction} colors={colors} />
    {state === 'stale' && fetchedAtLabel ? <Text style={[styles.helper, { color: colors?.muted }]}>Bản lưu lúc {fetchedAtLabel} · có thể đã cũ</Text> : null}
  </View>;
}

export function InsufficientDishes({ mode, count, minimum = 10, onReduce, onEdit, onBack, disabled = false, colors }: ComponentThemeProps & { mode: 'can-reduce' | 'below-minimum'; count: number; minimum?: number; onReduce?: () => void; onEdit: () => void; onBack: () => void; disabled?: boolean }) {
  const belowMinimum = mode === 'below-minimum';
  return <View accessibilityRole="summary" style={[styles.shortage, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
    <Text accessibilityRole="header" style={[styles.contextTitle, { color: colors?.text }]}>{belowMinimum ? 'Chưa đủ món' : 'Có thể giảm số món'}</Text>
    <Text style={[styles.body, { color: colors?.muted }]}>{belowMinimum ? `Hiện có ${count} món. Cần ít nhất ${minimum} món để tạo phòng.` : `Hiện có ${count} món. Bạn có thể giảm, nhưng không thấp hơn ${minimum} món.`}</Text>
    {!belowMinimum && onReduce ? <AppButton label="Giảm số món" variant="secondary" onPress={onReduce} disabled={disabled || count <= minimum} colors={colors} /> : null}
    <AppButton label="Sửa thiết lập" onPress={onEdit} disabled={disabled} colors={colors} />
    <AppButton label="Quay lại" variant="quiet" onPress={onBack} disabled={disabled} colors={colors} />
  </View>;
}

const tutorialGestures = [
  { id: 'tap', label: 'Chạm', icon: '☝' },
  { id: 'swipe-left', label: 'Vuốt trái', icon: '☝  ←' },
  { id: 'swipe-right', label: 'Vuốt phải', icon: '☝  →' },
  { id: 'double-tap', label: 'Nhấn đúp', icon: '☝  ×2' },
] as const;

export function TutorialGesture({ title, instruction, buttonLabel = 'Thử bằng nút', onPress, colors }: ComponentThemeProps & { title: string; instruction: string; buttonLabel?: string; onPress: () => void }) {
  return <View accessibilityRole="summary" style={[styles.tutorialCard, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
    <Text accessibilityRole="header" style={[styles.noticeTitle, { color: colors?.text }]}>{title}</Text>
    <Text style={[styles.body, { color: colors?.muted }]}>{instruction}</Text>
    {(['dark', 'light'] as const).map(tone => <ScrollView key={tone} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gestureRow} accessibilityLabel={tone === 'dark' ? 'Thao tác nền đậm' : 'Thao tác nền sáng'}>
      {tutorialGestures.map(gesture => {
        const darkTone = tone === 'dark';
        const tileBackground = darkTone ? colors?.text : colors?.warm;
        const foreground = darkTone ? colors?.surface : colors?.text;
        return <View key={`${tone}-${gesture.id}`} accessibilityLabel={`${gesture.label}, ${tone === 'dark' ? 'nền đậm' : 'nền sáng'}`} style={[styles.gestureTile, { backgroundColor: tileBackground }]}>
          <Text accessible={false} style={[styles.gestureIcon, { color: foreground }]}>{gesture.icon}</Text>
          <Text style={[styles.gestureLabel, { color: foreground }]}>{gesture.label}</Text>
        </View>;
      })}
    </ScrollView>)}
    <AppButton label={buttonLabel} variant="secondary" onPress={onPress} colors={colors} />
  </View>;
}

const styles = StyleSheet.create({
  header: { minHeight: 72, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
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
  badge: { position: 'absolute', right: 1, top: 3, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  button: { minHeight: 52, borderRadius: radii.md, justifyContent: 'center', alignItems: 'stretch', borderWidth: 1 },
  buttonSecondary: { borderWidth: 1 },
  buttonText: { ...typography.bodyBold, minHeight: 52, paddingHorizontal: spacing.lg, textAlign: 'center', textAlignVertical: 'center' },
  buttonIcon: { width: 24, height: 24 },
  iconButtonStacked: { alignItems: 'center', gap: spacing.md },
  iconButtonText: { minHeight: 0, paddingHorizontal: 0, paddingVertical: 0 },
  bottomNav: { minHeight: 88, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, paddingTop: spacing.xs },
  bottomNavItem: { flex: 1, minWidth: 0, minHeight: 64, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  bottomNavIcon: { width: 24, height: 24 },
  bottomNavLabel: { ...typography.caption, fontSize: 12, lineHeight: 18, fontWeight: '500' },
  brandBanner: { minHeight: 116, borderRadius: radii.xl, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingLeft: spacing.xl },
  brandBannerTitle: { flex: 1, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  brandBannerImage: { width: '46%', height: 116, alignSelf: 'center' },
  field: { gap: spacing.xs }, fieldLabel: { ...typography.bodyBold },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, ...typography.body },
  helper: { ...typography.caption },
  chip: { minHeight: 48, borderRadius: radii.pill, paddingHorizontal: spacing.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chipIcon: { fontSize: 14, fontWeight: '700' }, chipText: { ...typography.caption },
  dishCard: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  dishImage: { width: '100%', height: 160, backgroundColor: '#E2E8F0' }, dishFallback: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' }, dishEmoji: { fontSize: 52 },
  dishBody: { padding: spacing.lg, gap: spacing.sm }, dishName: { ...typography.titleMedium }, dishDescription: { ...typography.body }, tagRow: { gap: spacing.sm }, dishMeta: { ...typography.caption },
  voteRow: { padding: spacing.md, gap: spacing.sm, flexDirection: 'row' }, voteButton: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs },
  avatarRow: { gap: spacing.md, paddingVertical: spacing.xs }, avatarItem: { width: 64, alignItems: 'center', gap: spacing.xs }, avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }, avatarImage: { width: 46, height: 46, borderRadius: 23 }, avatarInitial: { fontSize: 18, fontWeight: '800' }, statusDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, right: -1, bottom: 1, borderWidth: 2, borderColor: '#FFFFFF' }, avatarLabel: { ...typography.caption, textAlign: 'center' }, addAvatar: { width: 48, height: 48, borderRadius: radii.pill, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }, addAvatarIcon: { width: 24, height: 24 },
  roomCodeCard: { padding: spacing.xl, borderRadius: radii.xl, borderWidth: 1, alignItems: 'center', gap: spacing.md }, roomCode: { ...typography.roomCode }, caption: { ...typography.caption },
  contextCard: { padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm }, contextTitle: { ...typography.titleMedium }, contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, contextValue: { minWidth: 84, gap: spacing.xs }, contextValueText: { ...typography.bodyBold },
  notice: { padding: spacing.lg, borderRadius: radii.lg, borderLeftWidth: 4, gap: spacing.sm }, noticeTitle: { ...typography.bodyBold }, body: { ...typography.body },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }, sheet: { padding: spacing.xl, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, gap: spacing.lg }, sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', alignSelf: 'center' },
  dishCount: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, alignItems: 'center' }, dishCountLabel: { ...typography.caption }, dishCountControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl }, countButton: { width: 48, height: 48, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, countButtonText: { fontSize: 24, lineHeight: 28, fontWeight: '700' }, dishCountValue: { ...typography.titleLarge, minWidth: 56, textAlign: 'center' },
  preferenceChoice: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, preferenceOption: { minHeight: 48, minWidth: 72, borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, preferenceOptionText: { ...typography.bodyBold }, preferenceCheck: { fontSize: 16, fontWeight: '800' },
  waitingSummary: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md }, progressTrack: { height: 8, borderRadius: radii.pill, overflow: 'hidden' }, progressFill: { height: 8, borderRadius: radii.pill },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.xs }, podiumColumn: { width: 144, flexShrink: 0, padding: spacing.sm, borderWidth: 1, borderTopLeftRadius: radii.lg, borderTopRightRadius: radii.lg, alignItems: 'center', justifyContent: 'flex-end', gap: spacing.xs }, podiumRank1: { minHeight: 192 }, podiumRank2: { minHeight: 160 }, podiumRank3: { minHeight: 128 }, podiumRank: { ...typography.titleLarge }, podiumName: { ...typography.bodyBold, textAlign: 'center', flexShrink: 1 }, winnerBadge: { ...typography.caption, textAlign: 'center' },
  processState: { gap: spacing.sm }, collectionState: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', gap: spacing.md }, collectionIcon: { width: 40, height: 40 },
  skeletonRow: { minHeight: 72, borderWidth: 1, borderRadius: radii.lg, padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md }, skeletonAvatar: { width: 44, height: 44, borderRadius: radii.pill }, skeletonCopy: { flex: 1, gap: spacing.sm }, skeletonLine: { height: 10, borderRadius: radii.pill }, skeletonLineWide: { width: '76%' }, skeletonLineShort: { width: '48%' }, skeletonAction: { width: 56, height: 36, borderRadius: radii.md },
  requestBanner: { gap: spacing.xs }, shortage: { borderWidth: 1, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md }, tutorialCard: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.md }, gestureRow: { gap: spacing.sm }, gestureTile: { width: 112, minHeight: 88, borderRadius: radii.md, padding: spacing.sm, alignItems: 'center', justifyContent: 'center', gap: spacing.xs }, gestureIcon: { fontSize: 24, lineHeight: 30, fontWeight: '700' }, gestureLabel: { ...typography.caption, textAlign: 'center' },
});
