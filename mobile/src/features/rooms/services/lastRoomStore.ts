import * as SecureStore from 'expo-secure-store';

/**
 * The room this account was last in, kept on the phone so a dropped connection or a closed app can come back to it
 * (ADR-027). Only the room id is stored; the server decides whether the person may still go back (round 1 or lobby).
 */
const keyFor = (userId: string) => `gcd.lastRoom.v1.${userId}`;
const memory = new Map<string, string | null>();

export async function saveLastRoom(userId: string, roomId: string): Promise<void> {
  memory.set(userId, roomId);
  try { await SecureStore.setItemAsync(keyFor(userId), roomId); } catch { /* kept in memory for this run */ }
}

export async function readLastRoom(userId: string): Promise<string | undefined> {
  if (memory.has(userId)) return memory.get(userId) ?? undefined;
  try { return (await SecureStore.getItemAsync(keyFor(userId))) ?? undefined; } catch { return undefined; }
}

export async function clearLastRoom(userId: string): Promise<void> {
  memory.set(userId, null);
  try { await SecureStore.deleteItemAsync(keyFor(userId)); } catch { /* the id is ignored from memory */ }
}
