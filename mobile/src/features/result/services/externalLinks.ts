import { Linking } from 'react-native';
import type {
  ResultActionReply,
  ResultActionTarget,
  ResultExternalAction,
} from './resultPresentation';

/**
 * GM-30 — External links and allowlist guard for result presentation.
 * Policy:
 * 1. Allowlist domain and scheme enforcement (strictly https: and geo:).
 * 2. Privacy guard: never embed auth tokens, user IDs, or secret keys in outgoing links.
 * 3. Search URLs are fallback search helpers, not verified venue assertions.
 */

const ALLOWED_HTTPS_HOSTS = new Set([
  'www.google.com',
  'maps.google.com',
  'google.com',
  'www.tiktok.com',
  'tiktok.com',
  'www.youtube.com',
  'youtube.com',
  'm.youtube.com',
]);

const SUSPICIOUS_PARAM_PATTERN = /(?:access_token|refresh_token|token|secret|password|bearer|auth|session|apikey|api_key)=/i;

export type ExternalActionReply = ResultActionReply & {
  url?: string;
  error?: string;
};

export function isValidExternalUrl(rawUrl: string): boolean {
  if (!rawUrl || typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (trimmed.length < 5 || trimmed.length > 2048) return false;

  // Disallow javascript / data / file / vbscript schemes
  if (/^(?:javascript|data|file|vbscript):/i.test(trimmed)) return false;

  // Check for suspicious secret/token parameters in query string
  if (SUSPICIOUS_PARAM_PATTERN.test(trimmed)) return false;

  if (trimmed.startsWith('geo:')) {
    // Android geo URI syntax: geo:latitude,longitude?q=query or geo:0,0?q=query
    return /^geo:-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?(?:\?q=[^&]*)?$/i.test(trimmed);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    const host = parsed.hostname.toLowerCase();
    return ALLOWED_HTTPS_HOSTS.has(host);
  } catch {
    return false;
  }
}

export function buildGoogleMapsUrl(target: ResultActionTarget): string {
  const place = target.place;
  if (place) {
    if (
      place.latitude !== null &&
      place.longitude !== null &&
      Number.isFinite(place.latitude) &&
      Number.isFinite(place.longitude)
    ) {
      const coords = `${place.latitude},${place.longitude}`;
      const queryPlaceId = place.id && !place.id.startsWith('mock_') ? `&query_place_id=${encodeURIComponent(place.id)}` : '';
      return `https://www.google.com/maps/search/?api=1&query=${coords}${queryPlaceId}`;
    }
    const query = [place.name, place.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query || place.name)}`;
  }
  const cleanName = (target.dishName || '').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`quán ${cleanName}`.trim())}`;
}

export function buildGoogleMapsGeoUri(target: ResultActionTarget): string | null {
  const place = target.place;
  if (
    place &&
    place.latitude !== null &&
    place.longitude !== null &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude)
  ) {
    const label = encodeURIComponent(place.name || '');
    return `geo:${place.latitude},${place.longitude}${label ? `?q=${label}` : ''}`;
  }
  return null;
}

export function buildTikTokUrl(target: ResultActionTarget): string {
  const cleanName = (target.dishName || '').trim();
  return `https://www.tiktok.com/search?q=${encodeURIComponent(cleanName)}`;
}

export function buildYouTubeUrl(target: ResultActionTarget): string {
  const cleanName = (target.dishName || '').trim();
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`món ${cleanName}`.trim())}`;
}

export function buildExternalUrl(action: ResultExternalAction, target: ResultActionTarget): string {
  switch (action) {
    case 'maps':
      return buildGoogleMapsUrl(target);
    case 'tiktok':
      return buildTikTokUrl(target);
    case 'youtube':
      return buildYouTubeUrl(target);
    default: {
      const exhaustiveCheck: never = action;
      throw new Error(`Unsupported external action: ${exhaustiveCheck}`);
    }
  }
}

export type UrlOpener = (url: string) => Promise<boolean | void>;

export async function openExternalAction(
  action: ResultExternalAction,
  target: ResultActionTarget,
  opener?: UrlOpener
): Promise<ExternalActionReply> {
  const url = buildExternalUrl(action, target);
  if (!isValidExternalUrl(url)) {
    return { ok: false, error: 'DISALLOWED_EXTERNAL_URL' };
  }

  const open = opener ?? (async (u: string) => {
    const can = await Linking.canOpenURL(u);
    if (!can) return false;
    await Linking.openURL(u);
    return true;
  });

  try {
    const result = await open(url);
    if (result === false) {
      return { ok: false, error: 'CANNOT_OPEN_URL' };
    }
    return { ok: true, url };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'FAILED_TO_OPEN_URL';
    return { ok: false, error: message };
  }
}
