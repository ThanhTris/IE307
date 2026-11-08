import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { getPlacesApiKeyFromEnv } from '../services/placesRepository';
import type { ResultMapRenderer } from '../services/nearbyPresentation';
import type { NearbyPlace } from '../services/resultPresentation';

export interface LiveResultMapViewProps {
  resultId: string;
  winnerDishId: string;
  places: readonly NearbyPlace[];
  selectedPlaceId?: string;
  onSelect: (id: string) => void;
  apiKey?: string;
}

export function LiveResultMapView({
  places,
  selectedPlaceId,
  apiKey,
}: LiveResultMapViewProps) {
  const { colors, dark } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  const selectedPlace = places.find(p => p.id === selectedPlaceId) ?? places[0];
  const effectiveKey = apiKey ?? getPlacesApiKeyFromEnv();

  const validPlaces = places.filter(
    p =>
      Number.isFinite(p.latitude) &&
      Number.isFinite(p.longitude) &&
      Math.abs(p.latitude!) <= 90 &&
      Math.abs(p.longitude!) <= 180
  );

  const hasCoords =
    selectedPlace &&
    Number.isFinite(selectedPlace.latitude) &&
    Number.isFinite(selectedPlace.longitude);

  // Construct real Google Static Map URL
  const centerLat = selectedPlace?.latitude ?? 0;
  const centerLng = selectedPlace?.longitude ?? 0;
  const markersParam = validPlaces
    .slice(0, 5)
    .map((p, idx) => {
      const isSelected = p.id === selectedPlace?.id;
      const color = isSelected ? '0xE11D48' : '0x475569';
      return `markers=color:${color}%7Clabel:${idx + 1}%7C${p.latitude},${p.longitude}`;
    })
    .join('&');

  const staticMapUrl = (effectiveKey && hasCoords && validPlaces.length > 0)
    ? `https://maps.googleapis.com/maps/api/staticmap?center=${centerLat},${centerLng}&zoom=15&size=600x360&scale=2&maptype=roadmap&${markersParam}&key=${encodeURIComponent(effectiveKey)}`
    : '';

  // Track error specifically for the current image URL:
  // When switching from Place A to Place B, staticMapUrl changes, so hasImageError is false and Place B's map is attempted
  const hasImageError = Boolean(staticMapUrl && failedUrl === staticMapUrl);

  // If real Google API key is missing or coordinates are missing or image failed to load:
  // Render the clear unavailable notice per GM-30 requirement, while preserving winner, Top 3, and external Maps button!
  if (!effectiveKey || !hasCoords || hasImageError || validPlaces.length === 0) {
    return (
      <View
        testID="live-map-unavailable"
        style={[
          styles.unavailableContainer,
          {
            backgroundColor: dark ? '#1E293B' : '#F1F5F9',
            borderColor: colors.line,
          },
        ]}
      >
        <Text style={[styles.unavailableTitle, { color: colors.text }, textStyle(600)]}>
          Bản đồ trong ứng dụng chưa khả dụng
        </Text>
        <Text style={[styles.unavailableSubtitle, { color: colors.muted }, textStyle(400)]}>
          {'Vui lòng bấm nút "Mở bản đồ" bên dưới để xem vị trí quán trên Google Maps.'}
        </Text>
      </View>
    );
  }

  return (
    <View testID="live-result-map" style={styles.mapContainer}>
      <Image
        testID="live-google-map-image"
        source={{ uri: staticMapUrl }}
        style={styles.mapImage}
        resizeMode="cover"
        onError={() => setFailedUrl(staticMapUrl)}
        accessibilityRole="image"
        accessibilityLabel={`Bản đồ Google Maps cho quán ${selectedPlace.name}`}
      />
    </View>
  );
}

export const liveResultMapRenderer: ResultMapRenderer = props => (
  <LiveResultMapView {...props} />
);

const styles = StyleSheet.create({
  mapContainer: {
    height: 180,
    width: '100%',
    overflow: 'hidden',
  },
  mapImage: {
    width: '100%',
    height: '100%',
  },
  unavailableContainer: {
    height: 180,
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  unavailableTitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  unavailableSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
});
