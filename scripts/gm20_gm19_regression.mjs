/** Run unchanged GM19 scenarios against the retained, owned GM20 fixture. */
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink, mkdir } from 'node:fs/promises';
import { randomUUID, createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const hash = s => createHash('sha256').update(s).digest('hex');
const original = await readFile(new URL('./gm19_http_check.mjs', import.meta.url), 'utf8');
let adapted = original;
function replace(from, to) {
  assert.ok(adapted.includes(from), 'Upstream bootstrap changed; review adapter');
  adapted = adapted.replaceAll(from, to);
}
replace('supabase/tests/bruno/GM-19/', 'supabase/tests/bruno/GM-20/');
replace('docs/evidence/roadmap-v2/GM-19/', 'docs/evidence/roadmap-v2/GM-20/regression-gm19/');
replace("'docs/evidence/roadmap-v2/GM-20/regression-gm19/sql-run.txt'),sql)",
  "'docs/evidence/roadmap-v2/GM-20/regression-gm19/sql-run.txt'),sql.trimEnd()+'\\n')");
replace('http://127.0.0.1:54331', 'http://127.0.0.1:54332');
replace('gm19_test_namespace', 'gm20_test_namespace');
replace("status=JSON.parse(await runCommand(process.execPath,[resolve(root,'node_modules/supabase/dist/supabase.js'),'status','--output','json','--workdir',root],{quiet:true}));",
  "status={API_URL:'http://127.0.0.1:54321',ANON_KEY:readFileSync(envFile,'utf8').match(/^  publicKey: (.*)$/m)[1].trim()};");
const scenarios = s => s.slice(s.indexOf('async function tests()'), s.indexOf('\ntry {', s.indexOf('async function tests()')));
assert.equal(scenarios(adapted), scenarios(original), 'Business assertions must remain unchanged');
const temp = new URL(`./.gm20-regression-${randomUUID()}.tmp.mjs`, import.meta.url);
const report = new URL('../docs/evidence/roadmap-v2/GM-20/regression-gm19/adapter.json', import.meta.url);
await mkdir(new URL('./', report), { recursive: true });
await writeFile(temp, adapted, { flag: 'wx', mode: 0o600 });
try {
  const code = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(temp), '--against'], {
      shell: false, stdio: 'inherit', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' },
    });
    child.once('error', reject); child.once('close', code => resolve(code ?? 1));
  });
  await writeFile(report, JSON.stringify({ fixtureOnly: true, upstream: 'scripts/gm19_http_check.mjs',
    upstreamSha256: hash(original), scenarioSha256: hash(scenarios(original)),
    scenariosUnchanged: true, adapterSha256: hash(adapted), exitCode: code,
    adaptations: ['owned GM20 runtime namespace/endpoint', 'evidence destination and trailing blank line normalization', 'existing public key bootstrap'],
  }, null, 2) + '\n');
  process.exitCode = code;
} finally {
  assert.equal(hash(await readFile(temp)), hash(adapted), 'Changed temporary adapter preserved');
  await unlink(temp);
}
