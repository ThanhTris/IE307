import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ImageSourcePropType,
  type ImageStyle,
  type KeyboardTypeOptions,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useState, type ReactNode } from 'react';
import { radii, spacing, typography, type ThemeColors } from '../theme/tokens';

export type ComponentThemeProps = { colors?: ThemeColors };

export type AppHeaderProps = ComponentThemeProps & {
  title?: string;
  onPressBrand?: () => void;
  onFriends?: () => void;
  onInbox?: () => void;
  onProfile?: () => void;
  friendBadge?: number;
  inboxBadge?: number;
};

export function AppHeader({ title = 'Gì Cũng Được', onPressBrand, onFriends, onInbox, onProfile, friendBadge, inboxBadge, colors }: AppHeaderProps) {
  return (
    <View style={[styles.header, { backgroundColor: colors?.surface, borderBottomColor: colors?.line }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Về trang chủ"
        onPress={onPressBrand}
        disabled={!onPressBrand}
        style={styles.brand}
      >
        <View style={[styles.mark, { backgroundColor: colors?.primary }]}><Text style={{ color: colors?.onPrimary }}>🍜</Text></View>
        <Text numberOfLines={1} style={[styles.brandText, { color: colors?.text }]}>{title}</Text>
      </Pressable>
      <View style={styles.headerActions}>
        <HeaderAction label="Bạn ăn cùng" icon="👥" badge={friendBadge} onPress={onFriends} colors={colors} />
        <HeaderAction label="Thông báo" icon="🔔" badge={inboxBadge} onPress={onInbox} colors={colors} />
        <HeaderAction label="Hồ sơ" icon="🙂" onPress={onProfile} colors={colors} />
      </View>
    </View>
  );
}

function HeaderAction({ label, icon, badge, onPress, colors }: { label: string; icon: string; badge?: number; onPress?: () => void; colors?: ThemeColors }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} disabled={!onPress} style={styles.headerAction}>
      <Text style={styles.headerIcon}>{icon}</Text>
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
  style?: ViewStyle;
};

export function AppButton({ label, onPress, variant = 'primary', disabled, loading, accessibilityHint, style, colors }: AppButtonProps) {
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
      style={({ pressed }) => [styles.button, { backgroundColor: background, borderColor: colors?.line, opacity: pressed || disabled || loading ? 0.65 : 1 }, variant === 'secondary' && styles.buttonSecondary, style]}
    >
      <Text style={[styles.buttonText, { color: foreground }]}>{loading ? 'Đang xử lý…' : label}</Text>
    </Pressable>
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
          {dish.priceLabel || dish.venueLabel ? <Text style={[styles.dishMeta, { color: colors?.muted }]}>{[dish.priceLabel, dish.venueLabel].filter(Boolean).join(' · ')}</Text> : null}
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
export function AvatarRow({ items, onAdd, colors }: ComponentThemeProps & { items: AvatarItem[]; onAdd?: () => void }) {
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.avatarRow} accessibilityLabel="Danh sách bạn ăn cùng">
    {items.map(item => <View key={item.id} style={styles.avatarItem}><View style={[styles.avatar, { backgroundColor: colors?.warm, borderColor: colors?.line }]}>{item.imageSource ? <Image source={item.imageSource} style={styles.avatarImage as ImageStyle} /> : <Text style={[styles.avatarInitial, { color: colors?.primary }]}>{item.initial ?? item.label.slice(0, 1).toUpperCase()}</Text>}{item.status && item.status !== 'offline' ? <View style={[styles.statusDot, { backgroundColor: item.status === 'online' ? colors?.green : colors?.warning }]} /> : null}</View><Text numberOfLines={1} style={[styles.avatarLabel, { color: colors?.text }]}>{item.label}</Text></View>)}
    {onAdd ? <Pressable accessibilityRole="button" accessibilityLabel="Thêm bạn" onPress={onAdd} style={[styles.addAvatar, { borderColor: colors?.primary }]}><Text style={[styles.addAvatarText, { color: colors?.primary }]}>＋</Text><Text style={[styles.avatarLabel, { color: colors?.primary }]}>Thêm</Text></Pressable> : null}
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

const styles = StyleSheet.create({
  header: { minHeight: 64, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth },
  brand: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  mark: { width: 36, height: 36, borderRadius: radii.md, justifyContent: 'center', alignItems: 'center' },
  brandText: { ...typography.bodyBold, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  headerAction: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  headerIcon: { fontSize: 19 },
  badge: { position: 'absolute', right: 1, top: 3, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  button: { minHeight: 48, borderRadius: radii.md, paddingHorizontal: spacing.lg, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  buttonSecondary: { borderWidth: 1 },
  buttonText: { ...typography.bodyBold },
  field: { gap: spacing.xs }, fieldLabel: { ...typography.bodyBold },
  input: { minHeight: 48, borderRadius: radii.md, borderWidth: 1, paddingHorizontal: spacing.md, ...typography.body },
  helper: { ...typography.caption },
  chip: { minHeight: 48, borderRadius: radii.pill, paddingHorizontal: spacing.md, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  chipIcon: { fontSize: 14, fontWeight: '700' }, chipText: { ...typography.caption },
  dishCard: { borderRadius: radii.xl, borderWidth: 1, overflow: 'hidden' },
  dishImage: { width: '100%', height: 160, backgroundColor: '#E2E8F0' }, dishFallback: { width: '100%', height: 160, justifyContent: 'center', alignItems: 'center' }, dishEmoji: { fontSize: 52 },
  dishBody: { padding: spacing.lg, gap: spacing.sm }, dishName: { ...typography.titleMedium }, dishDescription: { ...typography.body }, tagRow: { gap: spacing.sm }, dishMeta: { ...typography.caption },
  voteRow: { padding: spacing.md, gap: spacing.sm, flexDirection: 'row' }, voteButton: { flex: 1, minHeight: 48, borderRadius: radii.md, borderWidth: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: spacing.xs },
  avatarRow: { gap: spacing.md, paddingVertical: spacing.xs }, avatarItem: { width: 64, alignItems: 'center', gap: spacing.xs }, avatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }, avatarImage: { width: 46, height: 46, borderRadius: 23 }, avatarInitial: { fontSize: 18, fontWeight: '800' }, statusDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, right: -1, bottom: 1, borderWidth: 2, borderColor: '#FFFFFF' }, avatarLabel: { ...typography.caption, textAlign: 'center' }, addAvatar: { width: 64, height: 64, borderRadius: radii.md, borderWidth: 1, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' }, addAvatarText: { fontSize: 22, lineHeight: 24 },
  roomCodeCard: { padding: spacing.xl, borderRadius: radii.xl, borderWidth: 1, alignItems: 'center', gap: spacing.md }, roomCode: { ...typography.roomCode }, caption: { ...typography.caption },
  contextCard: { padding: spacing.lg, borderRadius: radii.xl, borderWidth: 1, gap: spacing.sm }, contextTitle: { ...typography.titleMedium }, contextGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg }, contextValue: { minWidth: 84, gap: spacing.xs }, contextValueText: { ...typography.bodyBold },
  notice: { padding: spacing.lg, borderRadius: radii.lg, borderLeftWidth: 4, gap: spacing.sm }, noticeTitle: { ...typography.bodyBold }, body: { ...typography.body },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }, sheet: { padding: spacing.xl, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, gap: spacing.lg }, sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#94A3B8', alignSelf: 'center' },
});
