import * as SecureStore from 'expo-secure-store';

/** Set once the first-run permissions screen was shown on this phone (answered or skipped). It is per phone, not per account. */
const ONBOARDED_KEY = 'gcd.permissions.onboarded.v1';

export async function isPermissionsOnboarded(): Promise<boolean> {
  try { return (await SecureStore.getItemAsync(ONBOARDED_KEY)) === 'true'; } catch { return true; }
}

export async function markPermissionsOnboarded(): Promise<void> {
  try { await SecureStore.setItemAsync(ONBOARDED_KEY, 'true'); } catch { /* the screen may show once more; harmless */ }
}
