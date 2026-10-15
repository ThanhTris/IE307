import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import { runExpoCheck, validateInstalledLock } from './check-expo.mjs';

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'gm02-expo-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const save = (path, value) => writeFileSync(join(root, path), JSON.stringify(value));
  mkdirSync(join(root, 'node_modules/expo/bin'), { recursive: true });
  mkdirSync(join(root, 'node_modules/expo-router'), { recursive: true });
  const pkg = { dependencies: { expo: '~57.0.30', 'expo-router': '~57.0.28' } };
  save('package.json', pkg);
  save('package-lock.json', { lockfileVersion: 3, packages: {
    '': pkg,
    'node_modules/expo': { version: '57.0.30' },
    'node_modules/expo-router': { version: '57.0.28' },
  } });
  save('node_modules/expo/package.json', { version: '57.0.30' });
  save('node_modules/expo-router/package.json', { version: '57.0.28' });
  return { root, save };
}

test('the checked-out manifest and installed dependencies match their lock', t => {
  const { root } = fixture(t);
  assert.equal(validateInstalledLock(root), '57.0.30');
});

test('a stale manifest or another branch node_modules fails instead of reporting Pass', t => {
  const { root, save } = fixture(t);
  save('node_modules/expo-router/package.json', { version: '57.0.27' });
  assert.throws(() => validateInstalledLock(root), /expo-router: installed 57.0.27, lockfile 57.0.28/);
  save('node_modules/expo-router/package.json', { version: '57.0.28' });
  save('package.json', { dependencies: { expo: '~57.0.30', 'expo-router': '~57.0.27' } });
  assert.throws(() => validateInstalledLock(root), /differs from package-lock/);
});

test('missing installs and excluded compatibility checks are rejected', t => {
  const { root, save } = fixture(t);
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  save('package.json', { ...pkg, expo: { install: { exclude: ['expo-router'] } } });
  assert.throws(() => validateInstalledLock(root), /would skip compatibility/);
  save('package.json', pkg);
  rmSync(join(root, 'node_modules/expo-router/package.json'));
  assert.throws(() => validateInstalledLock(root), /ENOENT/);
});

test('Expo compatibility failure is propagated, with validation enabled and no prompts', t => {
  const { root } = fixture(t);
  writeFileSync(join(root, 'node_modules/expo/bin/cli'), `
    if (process.argv.slice(2).join(' ') !== 'install --check') process.exit(91);
    if (process.env.EXPO_OFFLINE !== '1' || process.env.CI !== '1' || process.env.EXPO_NO_DEPENDENCY_VALIDATION !== '0') process.exit(92);
    process.exit(7);
  `);
  assert.equal(runExpoCheck(root), 7);
});

test('real installed Expo rejects an incompatible Router even when manifest, lock and install agree', t => {
  const { root, save } = fixture(t);
  const mobileRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const expoRoot = join(mobileRoot, 'node_modules/expo');
  const expoVersion = JSON.parse(readFileSync(join(expoRoot, 'package.json'), 'utf8')).version;
  // Only replace the fake Expo directory inside this test's disposable fixture.
  // The real SDK is linked read-only; its dependency map must detect the mismatch.
  rmSync(join(root, 'node_modules/expo'), { recursive: true, force: true });
  symlinkSync(expoRoot, join(root, 'node_modules/expo'), process.platform === 'win32' ? 'junction' : 'dir');
  const pkg = { dependencies: { expo: expoVersion, 'expo-router': '1.0.0' } };
  save('package.json', pkg);
  save('package-lock.json', { lockfileVersion: 3, packages: {
    '': pkg,
    'node_modules/expo': { version: expoVersion },
    'node_modules/expo-router': { version: '1.0.0' },
  } });
  save('node_modules/expo-router/package.json', { version: '1.0.0' });
  assert.equal(validateInstalledLock(root), expoVersion);
  assert.equal(runExpoCheck(root), 1);
});
