import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

let database: Promise<SQLiteDatabase> | undefined;

function getDatabase(): Promise<SQLiteDatabase> {
  if (!database) {
    database = (async () => {
      const db = await openDatabaseAsync('gm02-spike.db');
      try {
        await db.execAsync(`CREATE TABLE IF NOT EXISTS spike_counter (
          id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL DEFAULT 0
        ); INSERT OR IGNORE INTO spike_counter (id, value) VALUES (1, 0);`);
      } catch (error) {
        await db.closeAsync().catch(() => { /* preserve original initialization error */ });
        throw error;
      }
      return db;
    })().catch((error: unknown) => {
      database = undefined;
      throw error;
    });
  }
  return database;
}

export async function readCounter(): Promise<number> {
  const row = await (await getDatabase()).getFirstAsync<{ value: number }>('SELECT value FROM spike_counter WHERE id = 1');
  if (!row || !Number.isSafeInteger(row.value) || row.value < 0) throw new Error('Invalid spike counter');
  return row.value;
}

export async function incrementCounter(): Promise<number> {
  // Atomic update avoids read/modify/write races; no user data is stored.
  await (await getDatabase()).runAsync('UPDATE spike_counter SET value = value + 1 WHERE id = 1');
  return readCounter();
}

export async function resetCounter(): Promise<number> {
  await (await getDatabase()).runAsync('UPDATE spike_counter SET value = 0 WHERE id = 1');
  return readCounter();
}
