import Constants from 'expo-constants';

export const DEFAULT_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile';
export const DEFAULT_UPDATE_MESSAGE = 'Đã có phiên bản mới. Vui lòng cập nhật Gì Cũng Được trên Google Play để tiếp tục sử dụng.';

const SEMVER_PATTERN = /^\s*(\d+)\.(\d+)\.(\d+)\s*$/;
const ALLOWED_UPDATE_HOSTS = new Set([
  'play.google.com',
  'market.android.com',
  'gicungduoc.vn',
  'www.gicungduoc.vn',
]);

export interface MinimumVersionPolicy {
  platform: 'android';
  minimumVersion: string;
  updateUrl: string;
  message: string;
}

export type MinimumVersionDecision =
  | {
    updateRequired: true;
    reason: 'below-minimum';
    currentVersion: string;
    minimumVersion: string;
    updateUrl: string;
    message: string;
  }
  | {
    updateRequired: false;
    reason: 'up-to-date' | 'fail-open' | 'unconfigured' | 'network-or-server-error';
    currentVersion: string;
    minimumVersion?: string;
  };

export type FetchLike = (input: string, init?: RequestInit) => Promise<{
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}>;

export interface CheckMinimumVersionOptions {
  currentVersion?: string;
  supabaseUrl?: string;
  publicKey?: string;
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Parse strict major.minor.patch numeric version tuples; return null when malformed. */
export function parseSemver(version: unknown): [number, number, number] | null {
  if (typeof version !== 'string') return null;
  const match = SEMVER_PATTERN.exec(version);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);
  if (!Number.isSafeInteger(major) || !Number.isSafeInteger(minor) || !Number.isSafeInteger(patch)) {
    return null;
  }
  return [major, minor, patch];
}

/** Compare two strict semver strings numerically (-1, 0, 1) or return null if invalid. */
export function compareSemver(current: string, minimum: string): -1 | 0 | 1 | null {
  const a = parseSemver(current);
  const b = parseSemver(minimum);
  if (!a || !b) return null;
  for (let i = 0; i < 3; i += 1) {
    if (a[i]! < b[i]!) return -1;
    if (a[i]! > b[i]!) return 1;
  }
  return 0;
}

/** Accept only HTTPS store/product URLs on allowlisted hosts. */
export function isAllowedUpdateUrl(raw: unknown): raw is string {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const parsed = new URL(raw.trim());
    return parsed.protocol === 'https:' && ALLOWED_UPDATE_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Return the installed app version declared by Expo config, falling back safely if missing. */
export function getInstalledAppVersion(): string {
  const configured = Constants.expoConfig?.version;
  return configured && parseSemver(configured) ? configured.trim() : '1.0.0';
}

/**
 * Validate raw RPC response strictly before applying any update gate.
 * Invalid, incomplete, or unsafe payloads fail closed on parsing and open the app cleanly (TC-REL-004).
 */
export function validateVersionPolicyPayload(raw: unknown): MinimumVersionPolicy | null {
  if (!isPlainRecord(raw)) return null;

  if (raw.platform !== undefined && raw.platform !== null && raw.platform !== 'android') {
    return null;
  }

  if (typeof raw.minimumVersion !== 'string' || !parseSemver(raw.minimumVersion)) {
    return null;
  }

  let updateUrl = DEFAULT_PLAY_STORE_URL;
  if (raw.updateUrl !== undefined && raw.updateUrl !== null) {
    if (typeof raw.updateUrl !== 'string' || !raw.updateUrl.trim() || !isAllowedUpdateUrl(raw.updateUrl)) {
      return null;
    }
    updateUrl = raw.updateUrl.trim();
  }

  let message = DEFAULT_UPDATE_MESSAGE;
  if (raw.message !== undefined && raw.message !== null) {
    if (typeof raw.message !== 'string') {
      return null;
    }
    if (raw.message.trim()) {
      message = raw.message.trim();
    }
  }

  return {
    platform: 'android',
    minimumVersion: raw.minimumVersion.trim(),
    updateUrl,
    message,
  };
}

/** Evaluate whether the running app version is below a validated server minimum version. */
export function evaluateMinimumVersion(currentVersion: string, rawPayload: unknown): MinimumVersionDecision {
  const normalizedCurrent = parseSemver(currentVersion) ? currentVersion.trim() : '1.0.0';
  if (!parseSemver(currentVersion)) {
    return { updateRequired: false, reason: 'fail-open', currentVersion: normalizedCurrent };
  }

  const policy = validateVersionPolicyPayload(rawPayload);
  if (!policy) {
    return { updateRequired: false, reason: 'fail-open', currentVersion: normalizedCurrent };
  }

  const order = compareSemver(normalizedCurrent, policy.minimumVersion);
  if (order === null) {
    return { updateRequired: false, reason: 'fail-open', currentVersion: normalizedCurrent };
  }

  if (order < 0) {
    return {
      updateRequired: true,
      reason: 'below-minimum',
      currentVersion: normalizedCurrent,
      minimumVersion: policy.minimumVersion,
      updateUrl: policy.updateUrl,
      message: policy.message,
    };
  }

  return {
    updateRequired: false,
    reason: 'up-to-date',
    currentVersion: normalizedCurrent,
    minimumVersion: policy.minimumVersion,
  };
}

function defaultEnv(key: 'EXPO_PUBLIC_SUPABASE_URL' | 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'): string {
  return typeof process !== 'undefined' ? (process.env?.[key]?.trim() ?? '') : '';
}

function isJwtLike(token: string): boolean {
  return token.split('.').length === 3;
}

/**
 * Fetch minimum version policy from public Supabase RPC and fail open on network/HTTP/schema errors.
 */
export async function checkMinimumVersionFromServer(options: CheckMinimumVersionOptions = {}): Promise<MinimumVersionDecision> {
  const currentVersion = options.currentVersion ?? getInstalledAppVersion();
  const supabaseUrl = (options.supabaseUrl ?? defaultEnv('EXPO_PUBLIC_SUPABASE_URL')).replace(/\/+$/, '');
  const publicKey = options.publicKey ?? defaultEnv('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  const fetchImpl = options.fetchImpl ?? (typeof fetch === 'function' ? (fetch as FetchLike) : undefined);

  if (!supabaseUrl || !publicKey || !fetchImpl) {
    return { updateRequired: false, reason: 'unconfigured', currentVersion };
  }

  const timeoutMs = options.timeoutMs ?? 4000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onParentAbort = () => controller.abort();
  options.signal?.addEventListener('abort', onParentAbort, { once: true });

  try {
    const headers: Record<string, string> = {
      apikey: publicKey,
      'Content-Type': 'application/json',
    };
    if (isJwtLike(publicKey)) {
      headers.Authorization = `Bearer ${publicKey}`;
    }

    const response = await fetchImpl(`${supabaseUrl}/rest/v1/rpc/get_app_version_policy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_platform: 'android' }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { updateRequired: false, reason: 'network-or-server-error', currentVersion };
    }

    const raw = await response.json();
    return evaluateMinimumVersion(currentVersion, raw);
  } catch {
    return { updateRequired: false, reason: 'network-or-server-error', currentVersion };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', onParentAbort);
  }
}
