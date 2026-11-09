import { guardJoinRoomUrl, installGlobalJoinLinkGuard } from '../features/rooms/services/joinLinks';

// Enforce global join link safety guard before Expo Router evaluates incoming intents
installGlobalJoinLinkGuard();

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
