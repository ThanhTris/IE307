import type { ReactNode } from 'react';
import type { NearbyPlace, NearbyState } from './resultPresentation';

export type ResultMapRenderer = (props: { resultId: string; winnerDishId: string; places: readonly NearbyPlace[]; selectedPlaceId?: string; onSelect: (id: string) => void }) => ReactNode;
/** Only expose public place fields; invalid/missing coordinates never become 0,0. */
export function nearbyPlaces(state: NearbyState): NearbyPlace[] {
  if (state.status !== 'ready' && !(state.cached && ['loading', 'error', 'offline'].includes(state.status))) return [];
  const seen = new Set<string>();
  return state.places.flatMap(place => {
    if (!place.id?.trim() || !place.name?.trim() || seen.has(place.id)) return [];
    seen.add(place.id);
    const coordinates = Number.isFinite(place.latitude) && Number.isFinite(place.longitude) && Math.abs(place.latitude!) <= 90 && Math.abs(place.longitude!) <= 180;
    return [{ id: place.id, name: place.name, address: place.address, distanceM: Number.isFinite(place.distanceM) && place.distanceM! >= 0 ? place.distanceM : null, latitude: coordinates ? place.latitude : null, longitude: coordinates ? place.longitude : null, attribution: place.attribution }];
  });
}
export function nearbyDistance(distance: number | null) {
  if (distance === null || !Number.isFinite(distance) || distance < 0) return null;
  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} km`;
}
