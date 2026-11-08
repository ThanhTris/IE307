import { Linking } from 'react-native';
import { normalizeRoomCode, validRoomCode } from './roomEntry';
import { encodeQrCodeMatrix } from './qrEncoder';

/**
 * GM-30 — Native QR, room join links, allowlist, and deep link resolver.
 * Policy:
 * 1. Allowlist enforcement: only gi-cung-duoc://, exp:// (dev), and gicungduoc.vn domains.
 * 2. Privacy & Auth Guard: never pass tokens or passwords in share links; never auto-join
 *    or display member names before the user confirms entering the room.
 * 3. Chặng 3A Testing: supports labeled simulated AVD QR scanner adapter;
 *    physical camera hardware testing deferred to Chặng 3B (GM-33/34).
 */

const ALLOWED_WEB_HOSTS = new Set([
  'gicungduoc.vn',
  'www.gicungduoc.vn',
  'app.gicungduoc.vn',
  'share.gicungduoc.vn',
  'localhost',
]);

const ALLOWED_SCHEMES = new Set([
  'gi-cung-duoc:',
  'exp:',
  'exps:',
]);

const SUSPICIOUS_PARAM_REGEX = /(?:access_token|refresh_token|token|secret|password|bearer|auth|session|apikey|api_key)=/i;
const SUSPICIOUS_WORD_REGEX = /(?:access_token|refresh_token|token|secret|password|bearer|auth|session|apikey|api_key)/i;

export function isSuspiciousWord(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  try {
    const decoded = decodeURIComponent(str).toLowerCase().trim();
    return SUSPICIOUS_WORD_REGEX.test(decoded);
  } catch {
    return true;
  }
}

export function isSuspiciousSearchParams(params: Record<string, unknown>): boolean {
  for (const [key, val] of Object.entries(params)) {
    if (key === 'code') {
      const strVal = typeof val === 'string' ? val : Array.isArray(val) ? String(val[0] ?? '') : String(val ?? '');
      if (isSuspiciousWord(strVal)) return true;
      continue;
    }
    // Allowed dev/test query parameters for AVD simulation: ONLY in dev/QA mode!
    if (Boolean(__DEV__) && (key === 'simulatedScanner' || key === 'simulatedPlaces')) {
      continue;
    }
    if (isSuspiciousWord(key)) return true;
    const strVal = typeof val === 'string' ? val : Array.isArray(val) ? String(val[0] ?? '') : String(val ?? '');
    if (isSuspiciousWord(strVal)) return true;
    // Any unrecognized query param outside allowlist is treated as suspicious
    return true;
  }
  return false;
}

export type ParseJoinUrlResult =
  | { ok: true; code: string; rawUrl: string }
  | {
      ok: false;
      error:
        | 'DISALLOWED_SCHEME'
        | 'DISALLOWED_HOST'
        | 'INVALID_CODE'
        | 'SUSPICIOUS_PAYLOAD'
        | 'MALFORMED_URL';
      rawUrl: string;
    };

export function parseJoinRoomUrl(rawUrl: string): ParseJoinUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { ok: false, error: 'MALFORMED_URL', rawUrl: String(rawUrl) };
  }

  const trimmed = rawUrl.trim();
  if (trimmed.length < 6 || trimmed.length > 2048) {
    return { ok: false, error: 'MALFORMED_URL', rawUrl };
  }

  // Reject dangerous schemes
  if (/^(?:javascript|data|file|vbscript):/i.test(trimmed)) {
    return { ok: false, error: 'DISALLOWED_SCHEME', rawUrl };
  }

  // Reject suspicious tokens or credentials in URL
  if (SUSPICIOUS_PARAM_REGEX.test(trimmed)) {
    return { ok: false, error: 'SUSPICIOUS_PAYLOAD', rawUrl };
  }

  // Also check decoded raw string for obfuscated suspicious words (e.g., %74oken=)
  try {
    const decodedRaw = decodeURIComponent(trimmed);
    if (SUSPICIOUS_PARAM_REGEX.test(decodedRaw)) {
      return { ok: false, error: 'SUSPICIOUS_PAYLOAD', rawUrl };
    }
  } catch {
    return { ok: false, error: 'MALFORMED_URL', rawUrl };
  }

  try {
    let protocol = '';
    let host = '';
    let pathname = '';
    let search = '';

    if (trimmed.startsWith('gi-cung-duoc://')) {
      protocol = 'gi-cung-duoc:';
      const remainder = trimmed.slice('gi-cung-duoc://'.length);
      // Strictly reject any userinfo credentials (e.g. qa-user:qa-value@room/join)
      if (remainder.includes('@')) {
        return { ok: false, error: 'SUSPICIOUS_PAYLOAD', rawUrl };
      }

      const questionIndex = remainder.indexOf('?');
      let pathAndAuthority = remainder;
      if (questionIndex >= 0) {
        pathAndAuthority = remainder.slice(0, questionIndex);
        search = remainder.slice(questionIndex);
      }

      // Validate authority of custom scheme before path
      const slashIndex = pathAndAuthority.indexOf('/');
      const authority = (slashIndex >= 0 ? pathAndAuthority.slice(0, slashIndex) : pathAndAuthority).toLowerCase().trim();
      // Valid authorities for gi-cung-duoc:// are 'room', 'join', 'r', or empty
      if (authority && !['room', 'join', 'r'].includes(authority)) {
        return { ok: false, error: 'DISALLOWED_HOST', rawUrl };
      }

      pathname = slashIndex >= 0 ? pathAndAuthority.slice(slashIndex) : (authority ? `/${authority}` : '/');
    } else {
      const parsed = new URL(trimmed);
      protocol = parsed.protocol.toLowerCase();
      host = parsed.hostname.toLowerCase();
      pathname = parsed.pathname;
      search = parsed.search;

      if (parsed.username || parsed.password) {
        return { ok: false, error: 'SUSPICIOUS_PAYLOAD', rawUrl };
      }
    }

    if (protocol === 'https:' || protocol === 'http:') {
      if (!ALLOWED_WEB_HOSTS.has(host)) {
        return { ok: false, error: 'DISALLOWED_HOST', rawUrl };
      }
    } else if (!ALLOWED_SCHEMES.has(protocol)) {
      return { ok: false, error: 'DISALLOWED_SCHEME', rawUrl };
    }

    // Extract room code from search params (?code=XXXXXX) or path (/join/XXXXXX, /room/join/XXXXXX, /r/XXXXXX)
    let extractedCode: string | null = null;

    if (search) {
      const params = new URLSearchParams(search);
      for (const [key, value] of params.entries()) {
        let decodedKey = key;
        let decodedVal = value;
        try {
          decodedKey = decodeURIComponent(key).toLowerCase().trim();
          decodedVal = decodeURIComponent(value).trim();
        } catch {
          return { ok: false, error: 'MALFORMED_URL', rawUrl };
        }

        if (SUSPICIOUS_PARAM_REGEX.test(decodedKey) || SUSPICIOUS_PARAM_REGEX.test(decodedVal)) {
          return { ok: false, error: 'SUSPICIOUS_PAYLOAD', rawUrl };
        }

        // Only 'code' query param is allowed
        if (decodedKey !== 'code') {
          return { ok: false, error: 'SUSPICIOUS_PAYLOAD', rawUrl };
        }
      }

      const codeParam = params.get('code');
      if (codeParam) {
        extractedCode = codeParam.trim();
      }
    }

    if (!extractedCode && pathname) {
      const segments = pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (segments.length >= 1 && lastSegment) {
        const potential = lastSegment.toUpperCase();
        if (validRoomCode(potential)) {
          extractedCode = potential;
        }
      }
    }

    if (!extractedCode) {
      return { ok: false, error: 'INVALID_CODE', rawUrl };
    }

    const normalized = normalizeRoomCode(extractedCode);
    if (!validRoomCode(normalized)) {
      return { ok: false, error: 'INVALID_CODE', rawUrl };
    }

    return { ok: true, code: normalized, rawUrl };
  } catch {
    return { ok: false, error: 'MALFORMED_URL', rawUrl };
  }
}

export function createJoinRoomDeepLink(code: string): string {
  const normalized = normalizeRoomCode(code);
  return `gi-cung-duoc://room/join?code=${normalized}`;
}

export function createJoinRoomWebLink(code: string): string {
  const normalized = normalizeRoomCode(code);
  return `https://gicungduoc.vn/join/${normalized}`;
}

export function createJoinRoomShareMessage(code: string): string {
  const normalized = normalizeRoomCode(code);
  return `Vào phòng chọn món trên Gì Cũng Được!\nMã phòng: ${normalized}\nLiên kết: https://gicungduoc.vn/join/${normalized}`;
}

export type CameraPermissionStatus =
  | 'undetermined'
  | 'granted'
  | 'denied'
  | 'unavailable'
  | 'blocked';

export interface QrScannerAdapter {
  readonly isSimulated?: boolean;
  getPermissionStatus(): Promise<CameraPermissionStatus>;
  requestPermission(): Promise<CameraPermissionStatus>;
  openSettings?(): Promise<void>;
  simulateScan?(code?: string): Promise<{ ok: boolean; code: string }>;
}

export class SimulatedQrScannerAdapter implements QrScannerAdapter {
  readonly isSimulated = true;
  private permission: CameraPermissionStatus;
  private defaultCodeOrUrl: string;

  constructor(initialPermission: CameraPermissionStatus = 'granted', defaultCodeOrUrl: string = '') {
    this.permission = initialPermission;
    this.defaultCodeOrUrl = defaultCodeOrUrl;
  }

  async getPermissionStatus(): Promise<CameraPermissionStatus> {
    return this.permission;
  }

  async requestPermission(): Promise<CameraPermissionStatus> {
    this.permission = 'granted';
    return this.permission;
  }

  async openSettings(): Promise<void> {
    // Simulated no-op
  }

  setPermissionStatus(status: CameraPermissionStatus): void {
    this.permission = status;
  }

  setScannedCodeOrUrl(codeOrUrl: string): void {
    this.defaultCodeOrUrl = codeOrUrl;
  }

  async simulateScan(codeOrUrl?: string): Promise<{ ok: boolean; code: string }> {
    const raw = (codeOrUrl ?? this.defaultCodeOrUrl).trim();
    if (!raw) {
      return { ok: false, code: '' };
    }
    const parsed = parseJoinRoomUrl(raw);
    if (parsed.ok) {
      return { ok: true, code: parsed.code };
    }
    const normalized = normalizeRoomCode(raw);
    if (!validRoomCode(normalized)) {
      return { ok: false, code: normalized };
    }
    return { ok: true, code: normalized };
  }
}

export class NativeQrScannerAdapter implements QrScannerAdapter {
  readonly isSimulated = false;

  async getPermissionStatus(): Promise<CameraPermissionStatus> {
    // In our Expo config, CAMERA is blocked in blockedPermissions.
    // Hence native returns 'denied' or 'unavailable', leading to manual fallback.
    return 'denied';
  }

  async requestPermission(): Promise<CameraPermissionStatus> {
    return 'denied';
  }

  async openSettings(): Promise<void> {
    try {
      await Linking.openSettings();
    } catch {
      // Ignored
    }
  }
}

let appLaunchUrlConsumed = false;
let appLaunchUrlPromise: Promise<string | null> | null = null;

/**
 * Consumes the initial cold-start launch URL exactly once per app session.
 * Guaranteed to only query Linking.getInitialURL() once across the app lifecycle.
 * Subsequent calls immediately resolve to null.
 */
export async function consumeInitialUrl(): Promise<string | null> {
  if (appLaunchUrlConsumed) {
    return null;
  }
  appLaunchUrlConsumed = true;

  if (!appLaunchUrlPromise) {
    appLaunchUrlPromise = Linking.getInitialURL().then(url => url ?? null).catch(() => null);
  }

  return appLaunchUrlPromise;
}

export function resetConsumedInitialUrlForTesting(): void {
  appLaunchUrlConsumed = false;
  appLaunchUrlPromise = null;
}

export interface JoinLinkListenerOptions {
  onJoinCode: (code: string, rawUrl: string) => void;
  onError?: (error: string, rawUrl: string) => void;
  onInitialUrlEmpty?: () => void;
  skipInitialUrl?: boolean;
}

export function subscribeToJoinLinks(options: JoinLinkListenerOptions): () => void {
  let active = true;
  let latestSeq = 0;

  const emit = (seq: number, rawUrl: string) => {
    if (!active || seq < latestSeq) {
      return;
    }
    latestSeq = seq;
    const parsed = parseJoinRoomUrl(rawUrl);
    if (parsed.ok) {
      options.onJoinCode(parsed.code, parsed.rawUrl);
    } else {
      options.onError?.(parsed.error, parsed.rawUrl);
    }
  };

  // Warm start incoming URL events: increment sequence for every event
  const subscription = Linking.addEventListener('url', (event: { url: string }) => {
    if (!active || !event?.url) return;
    latestSeq++;
    emit(latestSeq, event.url);
  });

  // Cold start deep link: sequence 0
  // Consumed once per app session via consumeInitialUrl()
  if (!appLaunchUrlConsumed) {
    const coldSeq = 0;
    void consumeInitialUrl()
      .then(initialUrl => {
        if (!active) return;
        if (!initialUrl) {
          options.onInitialUrlEmpty?.();
          return;
        }
        if (latestSeq > coldSeq) {
          return;
        }
        emit(coldSeq, initialUrl);
      })
      .catch(() => {
        if (active) {
          options.onInitialUrlEmpty?.();
        }
      });
  } else {
    options.onInitialUrlEmpty?.();
  }

  return () => {
    active = false;
    subscription.remove();
  };
}

/**
 * Standard ISO/IEC 18004 QR Code Model 2 2D Matrix Generator.
 * Used for rendering room QR code without external native dependencies.
 */
export function generateQrMatrix(input: string): boolean[][] {
  return encodeQrCodeMatrix(input);
}
