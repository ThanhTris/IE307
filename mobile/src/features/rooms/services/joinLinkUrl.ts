import * as Linking from 'expo-linking';
import { createJoinRoomDeepLink } from './joinLinks';
import { normalizeRoomCode } from './roomEntry';

/**
 * Link that opens this running app on the join screen with the code filled in.
 * Expo Go → exp://<dev-server>/--/room/join?code=…; installed build → gi-cung-duoc://room/join?code=….
 * Falls back to the app scheme when no Expo manifest is available (tests, unusual hosts).
 * (The https://gicungduoc.vn web link has no live site yet, so it is not used for QR/share.)
 */
export function createJoinRoomOpenLink(code: string): string {
  const normalized = normalizeRoomCode(code);
  try {
    return Linking.createURL('/room/join', { queryParams: { code: normalized } });
  } catch {
    return createJoinRoomDeepLink(normalized);
  }
}
