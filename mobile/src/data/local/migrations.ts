import type { SQLiteDatabase } from 'expo-sqlite';

export const PRIVATE_DATABASE_NAME = 'gcd-private-v1.db';
export const PRIVATE_DATABASE_SCHEMA_VERSION = 2;

export async function migratePrivateDatabase(database: SQLiteDatabase): Promise<void> {
  const current = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const version = current?.user_version ?? 0;
  if (version > PRIVATE_DATABASE_SCHEMA_VERSION) {
    throw new Error('LOCAL_DATABASE_NEWER_THAN_APP');
  }
  if (version === PRIVATE_DATABASE_SCHEMA_VERSION) return;

  if (version === 0) {
    await database.execAsync(`
      BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS gm31_private_entries (
        record_id TEXT PRIMARY KEY NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('outbox', 'cache')),
        state TEXT NOT NULL CHECK (state IN ('pending', 'unknown', 'acked', 'cached')),
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS gm31_private_entries_ttl
        ON gm31_private_entries (expires_at);
      CREATE TABLE IF NOT EXISTS gm31_pending_identity_cleanup (
        identity_id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL
      );
      PRAGMA user_version = ${PRIVATE_DATABASE_SCHEMA_VERSION};
      COMMIT;
    `);
    return;
  }

  // Version 1 already has the entries table; add durable logout cleanup marks.
  await database.execAsync(`
    BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS gm31_pending_identity_cleanup (
      identity_id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL
    );
    PRAGMA user_version = ${PRIVATE_DATABASE_SCHEMA_VERSION};
    COMMIT;
  `);
}
