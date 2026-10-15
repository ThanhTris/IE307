import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

// Fail before running Expo if a checkout uses another branch's node_modules or
// if its manifest/lock disagree. Every direct dependency is checked, not only Expo.
export function validateInstalledLock(root) {
  const pkg = readJson(resolve(root, 'package.json'));
  const lock = readJson(resolve(root, 'package-lock.json'));
  if (pkg.expo?.install?.exclude?.length) throw new Error('expo.install.exclude would skip compatibility checks; review the dependency instead.');
  if (lock.lockfileVersion !== 3 || !lock.packages?.['']) throw new Error('Expected npm lockfile v3; run npm install and review the lockfile.');
  for (const section of ['dependencies', 'devDependencies']) {
    const declared = pkg[section] ?? {};
    const locked = lock.packages[''][section] ?? {};
    if (JSON.stringify(Object.entries(declared).sort()) !== JSON.stringify(Object.entries(locked).sort())) {
      throw new Error(`package.json ${section} differs from package-lock.json; regenerate and review the lockfile.`);
    }
    for (const name of Object.keys(declared)) {
      const expected = lock.packages[`node_modules/${name}`]?.version;
      const actual = readJson(resolve(root, 'node_modules', name, 'package.json')).version;
      if (!expected || actual !== expected) throw new Error(`${name}: installed ${actual}, lockfile ${expected ?? 'missing'}; run npm ci in mobile.`);
    }
  }
  return readJson(resolve(root, 'node_modules/expo/package.json')).version;
}

export function runExpoCheck(root = projectRoot) {
  const version = validateInstalledLock(root);
  console.log(`Expo ${version}: installed dependencies match the lockfile. Checking SDK bundled compatibility.`);
  // `expo install --check` still checks bundledNativeModules.json in offline
  // mode. Remote recommendations belong to the explicit check:expo:latest step.
  // Do not use EXPO_NO_DEPENDENCY_VALIDATION or expo.install.exclude to bypass it.
  const result = spawnSync(process.execPath, [resolve(root, 'node_modules/expo/bin/cli'), 'install', '--check'], {
    cwd: root,
    env: { ...process.env, CI: '1', EXPO_OFFLINE: '1', EXPO_NO_DEPENDENCY_VALIDATION: '0' },
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  return result.status ?? 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try { process.exitCode = runExpoCheck(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
