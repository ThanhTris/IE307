/** Prepare an ignored Bruno local environment; never emit credentials. */
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommand, validateApiUrl, validateConfig } from './backend.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
try {
  validateConfig(await readFile(resolve(root, 'supabase/config.toml'), 'utf8'));
  const status = JSON.parse(await runCommand(process.execPath,
    [resolve(root, 'node_modules/supabase/dist/supabase.js'), 'status', '--output', 'json', '--workdir', root],
    { quiet: true, timeoutMs: 15000 }));
  const baseUrl = validateApiUrl(status.API_URL);
  const publicKey = status.ANON_KEY ?? status.PUBLISHABLE_KEY;
  if (typeof publicKey !== 'string' || /[\s{}]/.test(publicKey)) throw new Error();
  if (!publicKey.startsWith('sb_publishable_')) {
    const segments = publicKey.split('.');
    if (segments.length !== 3 || JSON.parse(Buffer.from(segments[1], 'base64url')).role !== 'anon') throw new Error();
  }
  const folder = resolve(root, 'supabase/tests/bruno/GM-16/environments');
  await mkdir(folder, { recursive: true });
  await writeFile(resolve(folder, 'Local.private.bru'),
    `vars {\n  baseUrl: ${baseUrl}\n  publicKey: ${publicKey}\n}\n`, 'utf8');
  console.log('Prepared ignored Local.private environment for loopback only; key suppressed.');
} catch {
  console.error('Bruno environment not prepared: local Supabase status/key unavailable; credentials suppressed.');
  process.exitCode = 1;
}
