import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PreviewFoodPoolResponse, RoomContext } from '../../../data/api/contracts';
import { AppButton, StatusNotice, type Palette } from '../../../shared/ui';
import type { LocationResolution, TimeResolution } from '../services/location';

export interface ContextPreviewAndPrivacyCardProps {
  loading: boolean;
  serverError: string | null;
  preview: PreviewFoodPoolResponse | null;
  previewLoading: boolean;
  previewError: string | null;
  confirmed: boolean;
  draftInputError: string | null;
  canSaveContext: boolean;
  locationState: LocationResolution;
  sanitizedContext: RoomContext | null;
  timeState: TimeResolution;
  liveDesiredAtPast: boolean;
  hasSaveCallback: boolean;
  onConfirmDraft: () => void;
  onPreview: () => void;
  onSaveContext: () => void;
  colors?: Palette;
}

export function ContextPreviewAndPrivacyCard({
  loading,
  serverError,
  preview,
  previewLoading,
  previewError,
  confirmed,
  draftInputError,
  canSaveContext,
  locationState,
  sanitizedContext,
  timeState,
  liveDesiredAtPast,
  hasSaveCallback,
  onConfirmDraft,
  onPreview,
  onSaveContext,
  colors,
}: ContextPreviewAndPrivacyCardProps) {
  return (
    <>
      {locationState.selectedAnchor && (
        <View style={{ gap: 8, marginTop: 4 }}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityLabel="Tôi xác nhận điểm công cộng, buổi và giờ ăn"
            accessibilityState={{ checked: confirmed, disabled: loading || !!serverError || !preview?.pool.length }}
            disabled={loading || !!serverError || !preview?.pool.length}
            onPress={onConfirmDraft}
            style={[
              styles.confirmation,
              {
                backgroundColor: confirmed ? colors?.surface : colors?.soft,
                borderColor: confirmed ? colors?.green : colors?.primary,
              },
            ]}
          >
            <Text style={{ color: colors?.text }}>{confirmed ? '✓ ' : ''}Tôi xác nhận điểm công cộng, buổi và giờ ăn</Text>
          </Pressable>
          <AppButton
            label="Xem món mẫu theo bối cảnh"
            loading={previewLoading}
            disabled={loading || !!serverError || !canSaveContext}
            onPress={onPreview}
            colors={colors}
          />
          {draftInputError ? <StatusNotice title="Cần sửa bối cảnh" message={draftInputError} tone="error" colors={colors} /> : null}
          {previewError ? <StatusNotice title="Chưa thể xem bản nháp" message={previewError} tone="error" colors={colors} /> : null}
          {preview ? (
            <View style={[styles.card, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
              <Text style={[styles.sectionTitle, { color: colors?.text }]}>Bản nháp món theo bối cảnh</Text>
              {preview.pool.length
                ? preview.pool.slice(0, 8).map(dish => (
                    <Text key={dish.roundDishId} style={[styles.bodySmall, { color: colors?.text }]}>
                      {dish.name}
                    </Text>
                  ))
                : <Text style={[styles.caption, { color: colors?.muted }]}>Chưa có món phù hợp cho bối cảnh này.</Text>}
              {confirmed ? <StatusNotice title="Bản nháp đã xác nhận" message="Bản nháp đã xác nhận, chưa lưu vào phòng." colors={colors} /> : null}
            </View>
          ) : null}
        </View>
      )}

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors?.surface ?? '#FFFFFF',
            borderColor: colors?.green ?? '#10B981',
            borderWidth: 1.5,
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors?.green ?? '#10B981' }]}
        >
          🛡️ BẢO MẬT & QUYỀN RIÊNG TƯ (AUDIT)
        </Text>
        <Text style={[styles.bodySmall, { color: colors?.text ?? '#1A202C' }]}>
          • Vị trí GPS thiết bị:{' '}
          <Text style={{ fontWeight: '700' }}>
            {locationState.coords
              ? `Được giữ cục bộ (${locationState.coords.latitude.toFixed(4)}, ${locationState.coords.longitude.toFixed(4)})`
              : 'Không lưu'}
          </Text>
        </Text>
        <Text style={[styles.bodySmall, { color: colors?.text ?? '#1A202C' }]}>
          • Payload gửi server:{' '}
          <Text style={{ fontWeight: '700', color: colors?.primary ?? '#FF5A36' }}>
            {sanitizedContext
              ? JSON.stringify({
                  anchorId: sanitizedContext.anchorId,
                  radiusM: sanitizedContext.radiusM,
                  desiredAt: sanitizedContext.desiredAt,
                  mealSlot: sanitizedContext.mealSlot,
                  serviceMode: sanitizedContext.serviceMode,
                })
              : 'N/A'}
          </Text>
        </Text>
        <Text style={[styles.caption, { color: colors?.green ?? '#10B981', marginTop: 4 }]}>
          ✓ Bảo đảm quyền riêng tư: Payload gửi máy chủ chỉ chứa anchorId, không chứa tọa độ GPS thô (0 tọa độ GPS thô trong request payload và client log).
        </Text>
      </View>

      {hasSaveCallback && sanitizedContext && (
        <View style={{ gap: 6, marginTop: 4 }}>
          <AppButton
            label="Xác nhận bối cảnh phòng"
            variant="primary"
            disabled={!canSaveContext}
            onPress={onSaveContext}
            colors={colors}
          />
          {!canSaveContext && (
            <Text style={[styles.caption, { color: colors?.danger ?? '#EF4444', textAlign: 'center' }]}>
              {!locationState.selectedAnchor
                ? 'Vui lòng chọn một điểm hẹn công cộng.'
                : timeState.isPast || liveDesiredAtPast
                ? 'Không thể lưu: thời gian ăn đang ở quá khứ (DESIRED_TIME_PASSED).'
                : timeState.isTooFarFuture
                ? 'Không thể lưu: thời gian ăn vượt quá 7 ngày.'
                : timeState.requiresConfirmation
                ? 'Vui lòng xác nhận hoặc điều chỉnh thời gian ăn.'
                : 'Vui lòng hoàn tất cấu hình bối cảnh hợp lệ.'}
            </Text>
          )}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  confirmation: { padding: 14, borderRadius: 12, borderWidth: 1.5 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18 },
  bodySmall: { fontSize: 13, lineHeight: 18 },
});
