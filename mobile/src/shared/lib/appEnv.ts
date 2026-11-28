export type AppEnvironment = 'development' | 'staging' | 'production';

/**
 * Runtime dev flag using Metro/RN's compile-time `__DEV__`.
 * Returns false outside dev runtimes so release bundles strip dev/QA fallbacks cleanly.
 */
export function isDevRuntime(): boolean {
  return typeof __DEV__ !== 'undefined' && Boolean(__DEV__);
}

/**
 * Explicit environment identifier injected via EAS profiles (`EXPO_PUBLIC_APP_ENV`).
 */
export function getAppEnvironment(): AppEnvironment {
  const raw = typeof process !== 'undefined' ? process.env?.EXPO_PUBLIC_APP_ENV?.trim().toLowerCase() : undefined;
  if (raw === 'development' || raw === 'staging' || raw === 'production') {
    return raw;
  }
  return isDevRuntime() ? 'development' : 'production';
}
