import * as SecureStore from 'expo-secure-store';

/** Set once the first-run permissions screen was shown to this account on this phone (answered or skipped). */
const ONBOARDED_KEY = 'gcd.permissions.onboarded.v1';
/** Remembered in memory too, so a failed SecureStore write cannot send the person back to the screen on every visit. */
const doneThisRun = new Set<string>();
const keyFor = (userId?: string) => userId ? `${ONBOARDED_KEY}.${userId}` : ONBOARDED_KEY;

export async function isPermissionsOnboarded(userId?: string): Promise<boolean> {
  if (doneThisRun.has(keyFor(userId))) return true;
  try {
    if ((await SecureStore.getItemAsync(keyFor(userId))) === 'true') return true;
    // Before accounts had their own flag it was one per phone: someone who already answered is not asked again.
    return userId ? (await SecureStore.getItemAsync(ONBOARDED_KEY)) === 'true' : false;
  } catch { return true; }
}

export async function markPermissionsOnboarded(userId?: string): Promise<void> {
  doneThisRun.add(keyFor(userId));
  try { await SecureStore.setItemAsync(keyFor(userId), 'true'); } catch { /* remembered in memory for this run */ }
}
