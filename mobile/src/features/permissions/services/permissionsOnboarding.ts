import * as SecureStore from 'expo-secure-store';

/** Installation-level flag. Actual grants are always read from the OS by each feature. */
const ONBOARDED_KEY = 'gcd.permissions.onboarded.v1';
let doneThisRun = false;

export async function isPermissionsOnboarded(userId?: string): Promise<boolean> {
  if (doneThisRun) return true;
  try {
    if ((await SecureStore.getItemAsync(ONBOARDED_KEY)) === 'true') {
      doneThisRun = true;
      return true;
    }
    // Promote the existing account-scoped flag the first time an upgraded app sees it.
    if (userId && (await SecureStore.getItemAsync(`${ONBOARDED_KEY}.${userId}`)) === 'true') {
      await markPermissionsOnboarded();
    }
    return doneThisRun;
  } catch { return true; }
}

export async function markPermissionsOnboarded(): Promise<void> {
  doneThisRun = true;
  try { await SecureStore.setItemAsync(ONBOARDED_KEY, 'true'); } catch { /* remembered in memory for this run */ }
}
