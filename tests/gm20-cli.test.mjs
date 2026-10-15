import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cliArgs, runCommand } from '../scripts/backend.mjs';

test('GM20 launches the installed Supabase CLI through the foundation entrypoint', async () => {
  // This is a real executable launch on each CI OS, without Docker, auth or an API.
  const [entrypoint] = cliArgs('status');
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  const actual = (await runCommand(process.execPath, [entrypoint, '--version'], { quiet: true })).trim();
  assert.equal(actual, pkg.devDependencies.supabase);
  console.log(`CLI launch Pass: ${process.platform}/${process.arch}, Supabase ${actual}; API cases=0 (not exercised)`);
});
