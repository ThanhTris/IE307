import type { SQLiteDatabase } from 'expo-sqlite';

export const PRIVATE_DATABASE_NAME = 'gcd-private-v1.db';
export const PRIVATE_DATABASE_SCHEMA_VERSION = 4;

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
      CREATE TABLE IF NOT EXISTS gm31_pending_private_deletion (
        record_id TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS gm31_pending_identity_cleanup (
        identity_hash TEXT PRIMARY KEY NOT NULL,
        created_at INTEGER NOT NULL
      );
      PRAGMA user_version = ${PRIVATE_DATABASE_SCHEMA_VERSION};
      COMMIT;
    `);
    return;
  }

  // Version 2 briefly stored raw identity IDs in this table. Preserve those
  // legacy markers for one-time cleanup, then use only identity fingerprints.
  const cleanupColumns = await database.getAllAsync<{ name: string }>('PRAGMA table_info(gm31_pending_identity_cleanup)');
  if (cleanupColumns.length > 0 && !cleanupColumns.some(column => column.name === 'identity_hash')) {
    await database.execAsync('ALTER TABLE gm31_pending_identity_cleanup RENAME TO gm31_pending_identity_cleanup_legacy;');
  }

  // Versions 1-3 already have the entries table and may have cleanup markers.
  await database.execAsync(`
    BEGIN IMMEDIATE;
    CREATE TABLE IF NOT EXISTS gm31_pending_private_deletion (
      record_id TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gm31_pending_identity_cleanup (
      identity_hash TEXT PRIMARY KEY NOT NULL,
      created_at INTEGER NOT NULL
    );
    PRAGMA user_version = ${PRIVATE_DATABASE_SCHEMA_VERSION};
    COMMIT;
  `);
}
