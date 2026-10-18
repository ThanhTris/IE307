import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { StatusNotice } from '../../../shared/ui';
import { distanceLabel, priceLabel, timeLabel, type ResultAction, type ResultOffering } from '../model';

export const offeringActionLabels: Record<ResultAction, string> = {
  maps: 'Maps', review: 'Xem review', browser: 'Mở bằng trình duyệt', copy: 'Sao chép địa chỉ',
};

type Props = {
  offering: ResultOffering;
  hasPublicTarget: boolean;
  hasActionHandler: boolean;
  pending: boolean;
  feedback: string | null;
  onAction: (action: ResultAction) => void;
};

export function ResultOfferingCard({ offering, hasPublicTarget, hasActionHandler, pending, feedback, onAction }: Props) {
  const { colors } = useShellTheme();
  const { fontScale } = useWindowDimensions();
  const dish = offering.dish;
  // Keep the existing formatter's amount, currency and serving unit together.
  // The reference-price qualifier is a separate heading in this layout.
  const price = priceLabel(dish).replace(/ · Giá tham khảo$/, '');
  const availability = offering.availability === 'closed' ? 'Đóng theo lịch'
    : offering.availability === 'scheduled' ? 'Lịch dự kiến' : 'Chưa rõ phục vụ';
  const disabled = !hasPublicTarget || !hasActionHandler || pending;
  const actionButton = (action: ResultAction, prominent = false) => <Pressable
    key={action}
    accessibilityRole="button"
    accessibilityLabel={`${offeringActionLabels[action]} · ${dish.venueName ?? 'Nơi bán'}`}
    accessibilityHint="Dùng địa chỉ nơi bán công cộng, không dùng vị trí cá nhân."
    accessibilityState={{ disabled, busy: pending }}
    disabled={disabled}
    onPress={() => onAction(action)}
    style={({ pressed }) => [styles.button, {
      flexBasis: fontScale >= 1.5 ? '100%' : 124,
      backgroundColor: prominent ? colors.warm : colors.surface,
      borderColor: prominent ? colors.primary : colors.line,
      opacity: disabled ? 0.55 : pressed ? 0.7 : 1,
    }]}
  >
    <Text style={[styles.buttonLabel, { color: colors.text }]}>{offeringActionLabels[action]}</Text>
    {action === 'maps' ? <Text accessible={false} style={[styles.buttonArrow, { color: colors.text }]}>↗</Text> : null}
  </Pressable>;

  return <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
    <View style={[styles.header, { backgroundColor: colors.warm }]}>
      <View style={[styles.venueIcon, { backgroundColor: colors.surface }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text allowFontScaling={false} style={styles.icon}>🍽️</Text>
      </View>
      <View style={styles.venueIdentity}>
        <Text style={[styles.eyebrow, { color: colors.text }]}>NƠI BÁN MÓN ĐÃ CHỐT</Text>
        <Text accessibilityRole="header" style={[styles.venueName, { color: colors.text }]}>{dish.venueName ?? 'Chưa rõ tên nơi bán'}</Text>
        <View style={[styles.status, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <View style={[styles.statusDot, { backgroundColor: offering.availability === 'closed' ? colors.danger : colors.muted }]} />
          <Text style={[styles.caption, { color: colors.text }]}>{availability}</Text>
        </View>
      </View>
    </View>

    <View style={styles.body}>
      <View style={[styles.pricePanel, { backgroundColor: colors.soft }]}>
        <Text style={[styles.caption, { color: colors.text }]}>Giá tham khảo</Text>
        <Text style={[styles.price, { color: colors.text }]}>{price}</Text>
        <Text style={[styles.caption, { color: colors.text }]}>Nguồn giá: {dish.price?.sourceRef ?? 'Chưa rõ'}</Text>
      </View>

      <View style={styles.location}>
        <View style={[styles.locationMark, { backgroundColor: colors.soft }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Text allowFontScaling={false} style={[styles.locationIcon, { color: colors.text }]}>⌖</Text>
        </View>
        <View style={styles.locationText}>
          <Text style={[styles.caption, { color: colors.muted }]}>Địa chỉ nơi bán</Text>
          <Text style={[styles.address, { color: colors.text }]}>{dish.venueAddress ?? 'Chưa rõ địa chỉ'}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{distanceLabel(dish.distanceM)}</Text>
        </View>
      </View>

      <View style={[styles.schedule, { backgroundColor: colors.warm, borderColor: colors.line }]}>
        <Text style={[styles.bodyText, { color: colors.text }]}>
          <Text style={styles.scheduleLabel}>Lịch dự kiến: </Text>{offering.schedule ?? 'Chưa rõ giờ phục vụ'}
        </Text>
        <Text style={[styles.caption, { color: colors.text }]}>{offering.availability === 'closed' ? 'Đóng cửa theo lịch mới.'
          : offering.availability === 'scheduled' ? 'Dự kiến phục vụ theo lịch; chưa xác nhận còn món hoặc chỗ ngồi trực tiếp.'
            : 'Chưa rõ tình trạng phục vụ; hãy kiểm tra lại với quán.'}</Text>
      </View>

      <View style={[styles.provenance, { borderColor: colors.line }]}>
        <Text style={[styles.caption, { color: colors.muted }]}>Nguồn nơi bán: {offering.source ?? 'Chưa rõ'}{'\n'}Ngày kiểm: {timeLabel(offering.checkedAt)}</Text>
      </View>

      {!hasPublicTarget ? <StatusNotice title="Chưa đủ địa chỉ công cộng" message="Chưa thể mở Maps/review hoặc sao chép nơi bán này. Cần cập nhật thông tin." colors={colors} /> : null}
      {hasPublicTarget && !hasActionHandler ? <Text style={[styles.caption, { color: colors.muted }]}>Thao tác nơi bán chưa được kết nối.</Text> : null}

      <View style={styles.actionGroup}>
        <View style={styles.actionRow}>{actionButton('maps', true)}{actionButton('review')}</View>
        <View style={styles.actionRow}>{actionButton('browser')}{actionButton('copy')}</View>
      </View>
      {feedback ? <Text accessibilityLiveRegion="polite" style={[styles.bodyText, { color: colors.text }]}>{feedback}</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: radii.xl, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'flex-start', padding: spacing.lg, gap: spacing.md },
  venueIcon: { width: 48, height: 48, borderRadius: radii.lg, justifyContent: 'center', alignItems: 'center' },
  icon: { fontSize: 25, lineHeight: 34 },
  venueIdentity: { flex: 1, minWidth: 0, gap: spacing.sm },
  eyebrow: { ...typography.caption, fontSize: 11, letterSpacing: 0.8 },
  venueName: { ...typography.titleMedium, fontSize: 23, lineHeight: 30, fontWeight: '800' },
  status: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', flexShrink: 1, gap: spacing.sm,
    borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  statusDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  body: { padding: spacing.lg, gap: spacing.lg },
  pricePanel: { padding: spacing.lg, borderRadius: radii.lg, gap: spacing.xs },
  price: { fontSize: 22, lineHeight: 30, fontWeight: '800', flexShrink: 1 },
  location: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  locationMark: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  locationIcon: { fontSize: 23, lineHeight: 28 },
  locationText: { flex: 1, minWidth: 0, gap: spacing.xs },
  address: typography.bodyBold,
  schedule: { borderWidth: 1, borderRadius: radii.md, padding: spacing.md, gap: spacing.sm },
  scheduleLabel: { fontWeight: '700' },
  provenance: { borderTopWidth: 1, paddingTop: spacing.md },
  bodyText: typography.body,
  caption: { ...typography.caption, flexShrink: 1 },
  actionGroup: { gap: spacing.sm },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  button: { minHeight: 48, flexGrow: 1, flexShrink: 1, borderWidth: 1, borderRadius: radii.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm },
  buttonLabel: { ...typography.bodyBold, textAlign: 'center', flexShrink: 1 },
  buttonArrow: { fontSize: 18, lineHeight: 24 },
});
