/** Ownership-scoped Bruno runtime files; ordinary/failed runs cannot erase a peer's session. */
import { createHash } from 'node:crypto';
import { lstat, open, readFile, unlink } from 'node:fs/promises';

const fingerprint = value => createHash('sha256').update(value).digest('hex');

export function createOwnedRuntimeFiles(envFile, stateFile) {
  const allowed = new Set([envFile, stateFile]);
  const owned = new Map();
  return {
    async assertAvailable() {
      for (const file of allowed) {
        try { await lstat(file); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        throw new Error('GM19 runtime files already exist; stop the owning fixture before starting another Bruno run');
      }
    },
    async write(file, text) {
      if (!allowed.has(file)) throw new Error('Unexpected runtime file');
      // Exclusive create also closes the race between preflight and publication.
      const handle = await open(file, 'wx', 0o600);
      try {
        const identity = await handle.stat({ bigint: true });
        const entry = { dev: identity.dev, ino: identity.ino, digest: null };
        owned.set(file, entry); // A partial write still belongs to this run.
        await handle.writeFile(text, 'utf8');
        entry.digest = fingerprint(text);
      } finally { await handle.close(); }
    },
    async cleanup() {
      let refused = false;
      for (const [file, entry] of owned) {
        try {
          const identity = await lstat(file, { bigint: true });
          if (!identity.isFile() || identity.dev !== entry.dev || identity.ino !== entry.ino
            || (entry.digest !== null && fingerprint(await readFile(file)) !== entry.digest)) {
            refused = true; // Do not remove a replaced/edited file or follow a symlink.
            continue;
          }
          await unlink(file);
          owned.delete(file);
        } catch (error) {
          if (error.code === 'ENOENT') owned.delete(file);
          else refused = true;
        }
      }
      if (refused) throw new Error('Runtime cleanup refused a changed or inaccessible file; it was preserved');
    },
  };
}
