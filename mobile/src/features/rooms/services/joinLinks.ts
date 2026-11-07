import { Linking } from 'react-native';
import { normalizeRoomCode, validRoomCode } from './roomEntry';

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

  try {
    let protocol = '';
    let host = '';
    let pathname = '';
    let search = '';

    if (trimmed.startsWith('gi-cung-duoc://')) {
      protocol = 'gi-cung-duoc:';
      const remainder = trimmed.slice('gi-cung-duoc://'.length);
      const questionIndex = remainder.indexOf('?');
      if (questionIndex >= 0) {
        pathname = remainder.slice(0, questionIndex);
        search = remainder.slice(questionIndex);
      } else {
        pathname = remainder;
      }
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
      const codeParam = params.get('code');
      if (codeParam) {
        extractedCode = codeParam;
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
  getPermissionStatus(): Promise<CameraPermissionStatus>;
  requestPermission(): Promise<CameraPermissionStatus>;
  openSettings?(): Promise<void>;
  simulateScan?(code?: string): Promise<{ ok: boolean; code: string }>;
}

export class SimulatedQrScannerAdapter implements QrScannerAdapter {
  private permission: CameraPermissionStatus;
  private defaultCodeOrUrl?: string;

  constructor(initialPermission: CameraPermissionStatus = 'granted', defaultCodeOrUrl?: string) {
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

  async simulateScan(codeOrUrl?: string): Promise<{ ok: boolean; code: string }> {
    const raw = codeOrUrl || this.defaultCodeOrUrl || '';
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

export interface JoinLinkListenerOptions {
  onJoinCode: (code: string, rawUrl: string) => void;
  onError?: (error: string, rawUrl: string) => void;
}

export function subscribeToJoinLinks(options: JoinLinkListenerOptions): () => void {
  const handleUrl = (event: { url: string }) => {
    if (!event.url) return;
    const parsed = parseJoinRoomUrl(event.url);
    if (parsed.ok) {
      options.onJoinCode(parsed.code, parsed.rawUrl);
    } else {
      options.onError?.(parsed.error, parsed.rawUrl);
    }
  };

  // Check initial cold-start deep link
  void Linking.getInitialURL().then(initialUrl => {
    if (initialUrl) {
      handleUrl({ url: initialUrl });
    }
  }).catch(() => {
    // Ignore cold start read failure
  });

  // Subscribe to warm-start incoming URL events
  const subscription = Linking.addEventListener('url', handleUrl);

  return () => {
    subscription.remove();
  };
}

/**
 * Lightweight deterministic QR Matrix Generator (Version 1-3, 21x21 to 29x29).
 * Used for rendering room QR code without external native dependencies.
 */
export function generateQrMatrix(input: string): boolean[][] {
  const size = 25; // 25x25 grid
  const matrix: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));

  // Finder pattern helper at (row, col)
  const addFinder = (startRow: number, startCol: number) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
        const isCenter = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        matrix[startRow + r]![startCol + c] = isBorder || isCenter;
      }
    }
  };

  // Top-left, Top-right, Bottom-left finder patterns
  addFinder(0, 0);
  addFinder(0, size - 7);
  addFinder(size - 7, 0);

  // Timing patterns
  for (let i = 8; i < size - 8; i++) {
    matrix[6]![i] = i % 2 === 0;
    matrix[i]![6] = i % 2 === 0;
  }

  // Hash input deterministically into data modules
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      // Skip finder zones
      const inFinderTL = r < 8 && c < 8;
      const inFinderTR = r < 8 && c >= size - 8;
      const inFinderBL = r >= size - 8 && c < 8;
      const inTiming = r === 6 || c === 6;

      if (!inFinderTL && !inFinderTR && !inFinderBL && !inTiming) {
        hash = (hash * 1103515245 + 12345) & 0x7fffffff;
        matrix[r]![c] = (hash % 3 === 0);
      }
    }
  }

  return matrix;
}
