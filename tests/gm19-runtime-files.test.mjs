import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, writeFile, access, rename, unlink, rmdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createOwnedRuntimeFiles } from '../scripts/gm19_runtime_files.mjs';

async function setup(t) {
  const dir = await mkdtemp(join(tmpdir(), 'gm19-runtime-test-'));
  const env = join(dir, 'environment.bru'), state = join(dir, 'state.json');
  t.after(async () => {
    // Exact synthetic paths created by this test, no recursive deletion.
    for (const file of [env, state, join(dir, 'old-environment.bru')]) {
      await unlink(file).catch(error => { if (error.code !== 'ENOENT') throw error; });
    }
    await rmdir(dir);
  });
  return { env, state, files: createOwnedRuntimeFiles(env, state) };
}
const exists = async file => { try { await access(file); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

test('ordinary/no-write cleanup preserves another run\'s environment and state', async t => {
  const { env, state, files } = await setup(t);
  await writeFile(env, 'synthetic existing environment'); await writeFile(state, 'synthetic existing state');
  await files.cleanup();
  assert.equal(await readFile(env, 'utf8'), 'synthetic existing environment');
  assert.equal(await readFile(state, 'utf8'), 'synthetic existing state');
});
for (const existing of ['env', 'state']) test(`Bruno preflight refuses existing ${existing} without changing it`, async t => {
  const fixture = await setup(t); await writeFile(fixture[existing], 'synthetic peer');
  await assert.rejects(fixture.files.assertAvailable(), /already exist/);
  await fixture.files.cleanup(); assert.equal(await readFile(fixture[existing], 'utf8'), 'synthetic peer');
});
test('exclusive creation cannot overwrite a file appearing after preflight', async t => {
  const { env, files } = await setup(t); await files.assertAvailable();
  await writeFile(env, 'synthetic peer');
  await assert.rejects(files.write(env, 'synthetic own'), { code: 'EEXIST' });
  await files.cleanup(); assert.equal(await readFile(env, 'utf8'), 'synthetic peer');
});
test('state creation conflict only cleans the environment this run created', async t => {
  const { env, state, files } = await setup(t);
  await files.write(env, 'synthetic own'); await writeFile(state, 'synthetic peer');
  await assert.rejects(files.write(state, 'synthetic own state'), { code: 'EEXIST' });
  await files.cleanup(); assert.equal(await exists(env), false);
  assert.equal(await readFile(state, 'utf8'), 'synthetic peer');
});
test('successful cleanup removes only owned files and is repeatable', async t => {
  const { env, state, files } = await setup(t); await files.assertAvailable();
  await files.write(env, 'synthetic own'); await files.write(state, 'synthetic state');
  await files.cleanup(); await files.cleanup();
  assert.equal(await exists(env), false); assert.equal(await exists(state), false);
});
test('cleanup preserves edited file, reports failure and still cleans unchanged owned state', async t => {
  const { env, state, files } = await setup(t);
  await files.write(env, 'synthetic own'); await files.write(state, 'synthetic state');
  await writeFile(env, 'synthetic replacement');
  await assert.rejects(files.cleanup(), /preserved/);
  assert.equal(await readFile(env, 'utf8'), 'synthetic replacement'); assert.equal(await exists(state), false);
});
test('cleanup rejects a replacement inode even if its contents are identical', async t => {
  const { env, files } = await setup(t); await files.write(env, 'synthetic own');
  await rename(env, join(env, '..', 'old-environment.bru')); await writeFile(env, 'synthetic own');
  await assert.rejects(files.cleanup(), /preserved/); assert.equal(await readFile(env, 'utf8'), 'synthetic own');
});
test('already removed owned files do not fail cleanup', async t => {
  const { env, files } = await setup(t); await files.write(env, 'synthetic own'); await unlink(env);
  await files.cleanup();
});
test('writes outside the declared runtime paths are refused', async t => {
  const { env, files } = await setup(t);
  await assert.rejects(files.write(env + '.unexpected', 'synthetic'), /Unexpected runtime/);
});
test('HTTP runner wires ownership preflight, exclusive publication and cleanup', async () => {
  const source = await readFile(new URL('../scripts/gm19_http_check.mjs', import.meta.url), 'utf8');
  assert.match(source, /if \(keep && !reuse\) await runtimeFiles\.assertAvailable\(\)/);
  assert.match(source, /runtimeFiles\.write\(envFile/); assert.match(source, /runtimeFiles\.write\(stateFile/);
  assert.match(source, /runtimeFiles\.cleanup\(\)\.catch/);
  assert.doesNotMatch(source, /\brm\((?:envFile|stateFile)/);
});
