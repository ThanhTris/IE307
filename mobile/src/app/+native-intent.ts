import { guardJoinRoomUrl } from '../features/rooms/services/joinLinks';

/**
 * Expo Router Native Intent Interceptor.
 * Guards incoming cold and warm system deep links before Expo Router
 * parses route segments or search parameters.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  const guarded = guardJoinRoomUrl(path);
  if (guarded && guarded.includes('error=SUSPICIOUS_PAYLOAD')) {
    return '/room/join?error=SUSPICIOUS_PAYLOAD';
  }
  return path;
}
