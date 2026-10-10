/** Offline assertions over synthetic fixtures only; never accepts live ballots. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateDecision, classifyTier, POLICY_VERSION, ENGINE_CONTRACT_VERSION } from '../src/domain/decision/index.ts';

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--report'),
  'Usage: node mobile/scripts/check-decision.mjs [--report path]');
const mapping = read('tests/fixtures/decision-v2/parity-map.json');
assert.equal(mapping.fixtureOnly, true);
assert.equal(mapping.policyVersion, POLICY_VERSION);
assert.equal(mapping.engineContractVersion, ENGINE_CONTRACT_VERSION);
const vectors = [];
for (const suite of mapping.directSuites) {
  const bundle = read(suite.path);
  assert.equal(bundle.fixtureOnly, true);
  assert.equal(bundle.policyVersion, POLICY_VERSION);
  assert.equal(bundle.engineContractVersion, ENGINE_CONTRACT_VERSION);
  assert.deepEqual(bundle.cases.map(c => c.id), suite.caseIds, 'mapping must cover every case in order');
  for (const c of bundle.cases) vectors.push({ ...c, source: suite.path, projection: 'full' });
}
const legacy = read(mapping.historical.path);
assert.deepEqual(legacy.cases.map(c => c.id), mapping.historical.cases.map(c => c.sourceCaseId));
for (const m of mapping.historical.cases) {
  const c = legacy.cases.find(c => c.id === m.sourceCaseId);
  vectors.push({
    id: `historical-${c.id}`, source: mapping.historical.path, projection: 'status-and-candidates',
    description: 'Historical specification example, explicit locked roster/pool adapter',
    input: { policyVersion: POLICY_VERSION, roster: m.roster, pool: m.pool,
      round: c.round2 ? 2 : 1, round1: c.round1, ...(c.round2 ? { round2: c.round2 } : {}) },
    expected: { status: c.expected.state === 'DECIDED' ? 'DECISION_READY' : c.expected.state,
      candidateIds: [...c.expected.candidateIds].sort() },
  });
}
assert.equal(new Set(vectors.map(c => c.id)).size, vectors.length, 'unique vector IDs');

const reverse = value => Array.isArray(value) ? [...value].reverse() :
  value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).reverse()
    .map(([key, nested]) => [key, reverse(nested)])) : value;
const freeze = value => {
  if (value && typeof value === 'object') {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
const results = vectors.map(c => {
  const input = freeze(structuredClone(c.input));
  const before = JSON.stringify(input);
  const actual = evaluateDecision(input);
  const projected = c.projection === 'full' ? actual :
    { status: actual.status, candidateIds: actual.candidateIds };
  const assertions = {};
  const check = (name, assertion) => {
    try { assertion(); assertions[name] = true; } catch { assertions[name] = false; }
  };
  check('expectedMatchesActual', () => assert.deepEqual(projected, c.expected));
  check('repeat', () => assert.deepEqual(evaluateDecision(input), actual));
  check('permutation', () => assert.deepEqual(evaluateDecision(reverse(input)), actual));
  check('inputUnchanged', () => assert.equal(JSON.stringify(input), before));
  return { id: c.id, source: c.source, projection: c.projection, input: c.input,
    expected: c.expected, actual, assertions, passed: Object.values(assertions).every(Boolean) };
});
const paths = ['mobile/src/domain/decision/index.ts', 'mobile/tests/decision.test.mjs',
  'mobile/scripts/check-decision.mjs', 'tests/fixtures/decision-cases.json',
  'tests/fixtures/consensus-tier-cases.json', 'tests/fixtures/decision-v2/cases.json',
  'tests/fixtures/decision-v2/roster-cases.json', 'tests/fixtures/decision-v2/parity-map.json',
  '.github/workflows/decision.yml'];
const tiers = read(mapping.tierHelpers.path);
assert.deepEqual(tiers.cases.map(c => c.id), mapping.tierHelpers.caseIds);
const helperResults = tiers.cases.map(c => {
  const actual = classifyTier(c.n, c.want, c.eligible);
  return { id: c.id, source: mapping.tierHelpers.path, input: { n: c.n, want: c.want, eligible: c.eligible },
    expected: c.expectedTier, actual, passed: actual === c.expectedTier };
});
const allResults = [...results, ...helperResults];
const report = {
  fixtureOnly: true, policyVersion: POLICY_VERSION, engineContractVersion: ENGINE_CONTRACT_VERSION,
  sourceRevision: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
  node: process.version,
  artifactSha256: Object.fromEntries(paths.map(path => [path,
    createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')])),
  summary: { evaluations: results.length, tierChecks: helperResults.length, total: allResults.length,
    passed: allResults.filter(c => c.passed).length, failed: allResults.filter(c => !c.passed).length },
  boundary: 'Candidate-only synthetic domain vectors; no SQL, winner selection, RPC or persisted retry assertions.',
  cases: results,
  helperCases: helperResults,
};
if (args.length) {
  const output = resolve(args[1]);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
}
console.log(JSON.stringify(report.summary));
if (report.summary.failed) process.exitCode = 1;
