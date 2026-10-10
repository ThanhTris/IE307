import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else if (/\.tsx?$/.test(entry.name)) files.push(path);
  }
  return files;
}
let failures = 0;
for (const file of await walk(root)) {
  const path = relative(root, file).replaceAll('\\', '/');
  const source = await readFile(file, 'utf8');
  const imports = [...source.matchAll(/(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/g)].map(match => match[1]);
  const resolved = imports.map(value => value.startsWith('.') ? relative(root, resolve(dirname(file), value)).replaceAll('\\', '/') : value.replace(/^@\//, ''));
  if (path.startsWith('domain/') && (path.endsWith('.tsx') || imports.some(value => !value.startsWith('.') && !value.startsWith('@/domain/')) || resolved.some(value => /^(features|shared|data|app|bootstrap)\//.test(value)) || /\b(fetch|XMLHttpRequest|WebSocket)\s*\(/.test(source))) {
    console.error(`Domain must be pure: ${path}`); failures++;
  }
  if (path.startsWith('shared/') && resolved.some(value => /^(features|app|bootstrap)\//.test(value))) {
    console.error(`Shared must not import features/routes/bootstrap: ${path}`); failures++;
  }
  if (path.startsWith('features/') && imports.some(value => value.includes('supabase'))) {
    console.error(`Feature must use repository contracts, not Supabase SDK: ${path}`); failures++;
  }
  if (path.startsWith('app/') && !/export\s+default\b/.test(source)) {
    console.error(`Route needs default export: ${path}`); failures++;
  }
}
if (failures) process.exitCode = 1;
else console.log('Architecture boundaries OK (static guard, not a substitute for review).');
