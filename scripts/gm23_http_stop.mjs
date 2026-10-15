import { readFile, unlink } from 'node:fs/promises';
const file = 'supabase/tests/bruno/GM-23/environments/runtime.private.json';
try {
  const runtime = JSON.parse(await readFile(file, 'utf8'));
  const response = await fetch(`${runtime.endpoint}/__stop`, { method: 'POST', headers: { 'x-gm23-control': runtime.control } });
  if (!response.ok) throw new Error(`stop gateway returned ${response.status}`);
  await unlink(file).catch(() => {});
  console.log('GM23 owned runtime stop requested; cleanup is performed by the runner.');
} catch (error) { console.error(`GM23 stop failed: ${error.message}`); process.exitCode = 1; }
