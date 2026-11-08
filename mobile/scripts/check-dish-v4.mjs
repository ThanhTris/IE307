/** Fixed synthetic vectors only. No live ballots, network, seed generation or DB. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { domain } from '../tests/helpers/dishV4.mjs';
const root = fileURLToPath(new URL('../../', import.meta.url));
const args = process.argv.slice(2);
assert(args.length === 0 || (args.length === 2 && args[0] === '--report'), 'Usage: check-dish-v4.mjs [--report path]');
const path = 'tests/fixtures/decision-v4/cases.json';
const fixture = JSON.parse(readFileSync(resolve(root, path), 'utf8'));
assert.equal(fixture.fixtureOnly, true);
assert.equal(fixture.policyVersion, domain.DISH_POLICY_V4);
assert.equal(new Set(fixture.cases.map(c => c.id)).size, fixture.cases.length);
const cases = fixture.cases.map(row => {
  let actual;
  try { actual = domain.decideDishSessionV4(row.input); }
  catch (error) { if (!(error instanceof RangeError)) throw error; actual = { error: 'INVALID_INPUT' }; }
  assert.deepEqual(actual, row.expected, row.id);
  return { id: row.id, spec: row.spec, input: row.input, expected: row.expected, actual, result: 'Pass' };
});
const sha256 = name => createHash('sha256').update(readFileSync(resolve(root, name))).digest('hex');
const files = [path, 'mobile/src/domain/decision/dishPolicyV4.ts', 'mobile/src/domain/decision/index.ts',
  'mobile/src/domain/decision/dishPolicy.ts', 'mobile/tests/dishPolicyV4.test.mjs',
  'mobile/tests/helpers/dishV4.mjs', 'mobile/scripts/check-dish-v4.mjs', 'scripts/evaluate_dish_policy_v4.mjs'];
const report = { fixtureOnly: true, scope: 'GM15.3 pure domain, not SQL/persist/Android',
  policyVersion: fixture.policyVersion, evaluatorVersion: fixture.evaluatorVersion,
  testedHeadBeforePatchCommit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  sourceSha256: Object.fromEntries(files.map(p => [p, sha256(p)])), result: 'Pass', cases };
if (args.length) {
  const destination = resolve(args[1]);
  assert(!files.some(p => resolve(root, p) === destination), 'Report must not overwrite source/fixtures');
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ result: 'Pass', vectors: cases.length, fixtureOnly: true, sqlParity: 'Not run' }));
