import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { ResultMapRenderer } from '../services/nearbyPresentation';
import type { NearbyPlace } from '../services/resultPresentation';

export interface DefaultResultMapViewProps {
  resultId: string;
  winnerDishId: string;
  places: readonly NearbyPlace[];
  selectedPlaceId?: string;
  onSelect: (id: string) => void;
}

export function DefaultResultMapView({
  places,
  selectedPlaceId,
  onSelect,
}: DefaultResultMapViewProps) {
  const { colors, dark } = useShellTheme();
  const { textStyle } = useAppFonts();

  const validPlaces = useMemo(() => {
    return places.filter(
      p =>
        Number.isFinite(p.latitude) &&
        Number.isFinite(p.longitude) &&
        Math.abs(p.latitude!) <= 90 &&
        Math.abs(p.longitude!) <= 180
    );
  }, [places]);

  const isSimulated = useMemo(() => {
    return places.some(p => p.attribution?.includes('Mô phỏng') || p.attribution?.includes('AVD'));
  }, [places]);

  const markerPositions = useMemo(() => {
    const list: { place: NearbyPlace; leftPercent: number; topPercent: number }[] = [];
    if (validPlaces.length === 0) return list;
    const firstPlace = validPlaces[0];
    if (validPlaces.length === 1 && firstPlace) {
      list.push({ place: firstPlace, leftPercent: 50, topPercent: 50 });
      return list;
    }

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const p of validPlaces) {
      if (p.latitude! < minLat) minLat = p.latitude!;
      if (p.latitude! > maxLat) maxLat = p.latitude!;
      if (p.longitude! < minLng) minLng = p.longitude!;
      if (p.longitude! > maxLng) maxLng = p.longitude!;
    }

    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    for (let idx = 0; idx < validPlaces.length; idx++) {
      const place = validPlaces[idx];
      if (!place) continue;
      let leftPercent = 50;
      let topPercent = 50;

      if (lngSpan > 0.00001) {
        leftPercent = 15 + ((place.longitude! - minLng) / lngSpan) * 70;
      } else {
        leftPercent = 25 + ((idx % 3) * 25);
      }

      if (latSpan > 0.00001) {
        topPercent = 80 - ((place.latitude! - minLat) / latSpan) * 60;
      } else {
        topPercent = 35 + ((idx % 3) * 20);
      }

      list.push({ place, leftPercent, topPercent });
    }

    return list;
  }, [validPlaces]);

  return (
    <View
      testID="result-map-canvas"
      accessibilityRole="image"
      accessibilityLabel="Sơ đồ vị trí các quán"
      style={[
        styles.canvas,
        {
          backgroundColor: dark ? '#1E293B' : '#E2E8F0',
          borderColor: colors.line,
        },
      ]}
    >
      {/* Decorative road grids */}
      <View style={styles.gridOverlay}>
        <View style={[styles.roadHorizontal, { backgroundColor: dark ? '#334155' : '#CBD5E1' }]} />
        <View style={[styles.roadVertical, { backgroundColor: dark ? '#334155' : '#CBD5E1' }]} />
      </View>

      {/* AVD Simulation badge */}
      {isSimulated ? (
        <View
          testID="avd-simulation-badge"
          style={[
            styles.simBadge,
            {
              backgroundColor: dark ? 'rgba(15, 23, 42, 0.85)' : 'rgba(255, 255, 255, 0.9)',
              borderColor: colors.line,
            },
          ]}
        >
          <Text style={[styles.simBadgeText, { color: colors.primary }, textStyle(600)]}>
            [Mô phỏng AVD]
          </Text>
        </View>
      ) : null}

      {/* Place Markers */}
      {markerPositions.map(({ place, leftPercent, topPercent }, index) => {
        const isSelected = place.id === selectedPlaceId;
        const markerNumber = index + 1;
        return (
          <Pressable
            key={place.id}
            testID={`result-map-marker-${place.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Ghim vị trí: ${place.name}${isSelected ? ' (Đang chọn)' : ''}`}
            accessibilityState={{ selected: isSelected }}
            onPress={() => onSelect(place.id)}
            style={[
              styles.markerWrapper,
              {
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                zIndex: isSelected ? 10 : 2,
              },
            ]}
          >
            <View
              style={[
                styles.pinBody,
                {
                  backgroundColor: isSelected ? colors.primary : (dark ? '#475569' : '#FFFFFF'),
                  borderColor: isSelected ? '#FFFFFF' : colors.line,
                  transform: [{ scale: isSelected ? 1.25 : 1 }],
                },
              ]}
            >
              <Text
                style={[
                  styles.pinText,
                  {
                    color: isSelected ? '#FFFFFF' : (dark ? '#F8FAFC' : '#1E293B'),
                  },
                  textStyle(700),
                ]}
              >
                {markerNumber}
              </Text>
            </View>
            <View
              style={[
                styles.pinArrow,
                {
                  borderTopColor: isSelected ? colors.primary : (dark ? '#475569' : '#FFFFFF'),
                },
              ]}
            />
          </Pressable>
        );
      })}

      {validPlaces.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.muted }, textStyle(400)]}>
            Chưa có tọa độ bản đồ hiển thị
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export const defaultResultMapRenderer: ResultMapRenderer = props => (
  <DefaultResultMapView {...props} />
);

const styles = StyleSheet.create({
  canvas: {
    height: 180,
    width: '100%',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  roadHorizontal: {
    position: 'absolute',
    top: '48%',
    left: 0,
    right: 0,
    height: 8,
  },
  roadVertical: {
    position: 'absolute',
    left: '52%',
    top: 0,
    bottom: 0,
    width: 8,
  },
  simBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    zIndex: 20,
  },
  simBadgeText: {
    fontSize: 10,
    lineHeight: 14,
  },
  markerWrapper: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -14,
    marginTop: -28,
    minWidth: 28,
    minHeight: 32,
  },
  pinBody: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinText: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
  pinArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderTopWidth: 5,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -1,
  },
  emptyContainer: {
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
