import { StyleSheet, Text, View } from 'react-native';
import type { PublicAnchor } from '../../../data/api/contracts';
import { AppButton, Chip, type Palette } from '../../../shared/ui';
import type { LocationResolution } from '../services/location';

export interface AnchorPickerSectionProps {
  loading: boolean;
  anchors: PublicAnchor[];
  locationState: LocationResolution;
  onRefreshGps: () => void;
  onSelectAnchor: (anchorId: string) => void;
  colors?: Palette;
}

export function AnchorPickerSection({
  loading,
  anchors,
  locationState,
  onRefreshGps,
  onSelectAnchor,
  colors,
}: AnchorPickerSectionProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors?.surface ?? '#FFFFFF',
          borderColor: colors?.line ?? '#E2E8F0',
        },
      ]}
    >
      <View style={styles.cardHeader}>
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors?.text ?? '#1A202C' }]}
        >
          📍 Điểm hẹn công cộng
        </Text>
        <AppButton
          label={loading ? 'Đang định vị…' : 'Định vị lại'}
          variant="quiet"
          disabled={loading}
          onPress={onRefreshGps}
          colors={colors}
        />
      </View>

      {locationState.selectedAnchor ? (
        <View
          style={[
            styles.anchorBanner,
            {
              backgroundColor: colors?.warm ?? '#FFF5ED',
              borderColor: colors?.primary ?? '#FF5A36',
            },
          ]}
        >
          <Text
            style={[styles.anchorName, { color: colors?.primary ?? '#FF5A36' }]}
          >
            {locationState.selectedAnchor.name}
          </Text>
          <Text style={[styles.anchorAddress, { color: colors?.muted ?? '#64748B' }]}>
            {locationState.selectedAnchor.address}
          </Text>
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.tagBadge,
                { backgroundColor: colors?.surface ?? '#FFFFFF' },
              ]}
            >
              <Text style={{ fontSize: 12, fontWeight: '700' }}>
                {locationState.mode === 'gps' && locationState.distanceM !== null
                  ? `🎯 Cách bạn ~${locationState.distanceM} m`
                  : '✍️ Chọn thủ công'}
              </Text>
            </View>
            {locationState.isOutsideCoverage && (
              <View
                style={[
                  styles.tagBadge,
                  { backgroundColor: colors?.danger ?? '#EF4444' },
                ]}
              >
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                  Ngoài vùng phủ sóng
                </Text>
              </View>
            )}
          </View>
        </View>
      ) : (
        <Text style={{ color: colors?.muted ?? '#64748B' }}>
          Chưa có điểm hẹn công cộng nào được chọn.
        </Text>
      )}

      <Text
        style={[
          styles.fieldLabel,
          { color: colors?.muted ?? '#64748B', marginTop: 12 },
        ]}
      >
        Danh sách điểm hẹn sẵn có ({anchors.length}):
      </Text>
      <View style={styles.chipGrid}>
        {anchors.map((anchor) => (
          <Chip
            key={anchor.id}
            label={anchor.name}
            selected={locationState.selectedAnchor?.id === anchor.id}
            disabled={loading}
            onPress={() => onSelectAnchor(anchor.id)}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  anchorBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  anchorName: { fontSize: 17, fontWeight: '700' },
  anchorAddress: { fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
});
