import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  POLICY_VERSION, ENGINE_CONTRACT_VERSION, evaluateDecision, classifyTier, scoreVotes,
} from '../src/domain/decision/index.ts';

const readFixture = name => JSON.parse(readFileSync(
  new URL(`../../tests/fixtures/${name}`, import.meta.url), 'utf8',
));
const fixtures = readFixture('decision-v2/cases.json');
const rosterFixtures = readFixture('decision-v2/roster-cases.json');
const parityMap = readFixture('decision-v2/parity-map.json');

function deepFreeze(value) {
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function reversedRecord(record) {
  return Object.fromEntries(Object.entries(record).reverse().map(([key, value]) => [key,
    value && typeof value === 'object' && !Array.isArray(value) ? reversedRecord(value) : value,
  ]));
}

test('fixture contract, simulation marker and unique case IDs', () => {
  assert.equal(fixtures.fixtureOnly, true);
  assert.equal(fixtures.policyVersion, POLICY_VERSION);
  assert.equal(fixtures.engineContractVersion, ENGINE_CONTRACT_VERSION);
  assert.equal(new Set(fixtures.cases.map(c => c.id)).size, fixtures.cases.length);
  assert.equal(fixtures.cases.length, 53);
  for (const c of fixtures.cases) {
    assert.ok(c.description && c.specRefs.length);
    assert.equal(c.expected.policyVersion, POLICY_VERSION);
  }
});

test('2–8 roster fixtures and SQL handoff mapping are complete and simulated', () => {
  assert.equal(rosterFixtures.fixtureOnly, true);
  assert.equal(rosterFixtures.policyVersion, POLICY_VERSION);
  assert.equal(rosterFixtures.engineContractVersion, ENGINE_CONTRACT_VERSION);
  assert.equal(rosterFixtures.cases.length, 28);
  assert.deepEqual([...new Set(rosterFixtures.cases.map(c => c.input.roster.length))], [2, 3, 4, 5, 6, 7, 8]);
  assert.equal(new Set([...fixtures.cases, ...rosterFixtures.cases].map(c => c.id)).size, 81);
  assert.equal(parityMap.fixtureOnly, true);
  for (const suite of parityMap.directSuites) {
    assert.deepEqual(readFixture(suite.path.replace('tests/fixtures/', '')).cases.map(c => c.id), suite.caseIds);
  }
  assert.deepEqual(readFixture('decision-cases.json').cases.map(c => c.id),
    parityMap.historical.cases.map(c => c.sourceCaseId));
});

for (const c of [...fixtures.cases, ...rosterFixtures.cases]) {
  test(`golden ${c.id}: ${c.description}`, () => {
    const input = deepFreeze(structuredClone(c.input));
    const before = JSON.stringify(input);
    assert.deepEqual(evaluateDecision(input), c.expected);
    assert.deepEqual(evaluateDecision(input), c.expected, 'repeat evaluation is deterministic');
    assert.equal(JSON.stringify(input), before, 'engine never mutates input');
    if (input && typeof input === 'object') {
      const reordered = reversedRecord(input);
      if (Array.isArray(input.roster)) reordered.roster = [...input.roster].reverse();
      if (Array.isArray(input.pool)) reordered.pool = [...input.pool].reverse();
      assert.deepEqual(evaluateDecision(reordered), c.expected, 'source order is immaterial');
    }
  });
}

// Explicit locked roster/pool adapter for six historical specification examples.
// DECIDED in these examples means decision candidates, not a persisted result.
const legacyPools = {
  unanimous: ['pho', 'bun'], fallback: ['pho', 'bun'], empty: ['pho', 'bun'],
  'all-removed': ['pho'], tie: ['pho', 'bun'], incomplete: ['pho'],
};
for (const c of readFixture('decision-cases.json').cases) {
  test(`historical decision fixture ${c.id}`, () => {
    const input = {
      policyVersion: POLICY_VERSION, roster: ['a', 'b'], pool: legacyPools[c.id],
      round: c.round2 ? 2 : 1, round1: c.round1,
      ...(c.round2 ? { round2: c.round2 } : {}),
    };
    const result = evaluateDecision(input);
    assert.equal(result.status, c.expected.state === 'DECIDED' ? 'DECISION_READY' : c.expected.state);
    assert.deepEqual(result.candidateIds, [...c.expected.candidateIds].sort());
  });
}

for (const c of readFixture('consensus-tier-cases.json').cases) {
  test(`historical tier fixture ${c.id}`, () => {
    assert.equal(classifyTier(c.n, c.want, c.eligible), c.expectedTier);
  });
}

test('2W+OK equals n+W; even/odd tier boundaries across 2–8 members', () => {
  for (let n = 2; n <= 8; n++) {
    for (let want = 0; want <= n; want++) {
      assert.equal(scoreVotes(want, n - want), n + want);
      const expected = want === n ? 'PERFECT' : 2 * want > n ? 'CONSENSUS' : 'COMPROMISE';
      assert.equal(classifyTier(n, want, true), expected);
      assert.equal(classifyTier(n, want, false), 'NO_CONSENSUS');
    }
  }
});

test('tally/tier helpers reject impossible counts instead of coercing values', () => {
  for (const bad of [-1, 0.5, NaN, Infinity, '2', null, undefined, Number.MAX_SAFE_INTEGER + 1]) {
    assert.throws(() => scoreVotes(bad, 0), RangeError);
    assert.throws(() => scoreVotes(0, bad), RangeError);
    assert.throws(() => classifyTier(bad, 0, true), RangeError);
    assert.throws(() => classifyTier(2, bad, true), RangeError);
  }
  assert.throws(() => scoreVotes(Number.MAX_SAFE_INTEGER, 0), RangeError);
  assert.throws(() => classifyTier(0, 0, true), RangeError);
  assert.throws(() => classifyTier(2, 3, true), RangeError);
  assert.throws(() => classifyTier(2, 1, 'true'), RangeError);
});

test('all complete 2-member/2-choice ballots: veto, tie completeness and max WANT', () => {
  const values = ['WANT', 'OK', 'NO'];
  const roster = ['a', 'b'];
  const pool = ['pho', 'bun'];
  let round1Count = 0;
  let round2Count = 0;
  for (let encoding = 0; encoding < 81; encoding++) {
    let remaining = encoding;
    const round1 = { a: {}, b: {} };
    for (const member of roster) for (const dish of pool) {
      round1[member][dish] = values[remaining % 3];
      remaining = Math.floor(remaining / 3);
    }
    const input = { policyVersion: POLICY_VERSION, roster, pool, round: 1, round1 };
    const first = evaluateDecision(input);
    round1Count++;
    assert.ok(['ROUND_2', 'DECISION_READY', 'NO_CONSENSUS'].includes(first.status));
    for (const dish of first.candidateIds) {
      assert.ok(roster.every(m => round1[m][dish] !== 'NO'));
      if (first.status === 'DECISION_READY') assert.ok(roster.every(m => round1[m][dish] === 'WANT'));
    }
    if (first.status !== 'ROUND_2') continue;
    const acceptable = pool.filter(d => roster.every(m => round1[m][d] !== 'NO')).sort();
    assert.deepEqual(first.candidateIds, acceptable);
    // Enumerate every KEEP/REMOVE matrix over A; independent veto and max-W assertions.
    for (let mask = 0; mask < 2 ** (2 * acceptable.length); mask++) {
      const round2 = { a: {}, b: {} };
      let bit = 0;
      for (const member of roster) for (const dish of acceptable) {
        round2[member][dish] = mask & (1 << bit++) ? 'REMOVE' : 'KEEP';
      }
      const result = evaluateDecision({ ...input, round: 2, round2 });
      round2Count++;
      const survivors = acceptable.filter(d => roster.every(m => round2[m][d] === 'KEEP'));
      if (survivors.length === 0) {
        assert.equal(result.status, 'NO_CONSENSUS');
        assert.equal(result.reasonCode, 'ALL_REMOVED');
        assert.deepEqual(result.candidateIds, []);
      } else {
        assert.equal(result.status, 'DECISION_READY');
        const wantCounts = new Map(survivors.map(d => [d,
          roster.reduce((n, m) => n + Number(round1[m][d] === 'WANT'), 0),
        ]));
        const maxWant = Math.max(...wantCounts.values());
        const expectedTie = survivors.filter(d => wantCounts.get(d) === maxWant).sort();
        assert.deepEqual(result.candidateIds, expectedTie);
        for (const dish of result.candidateIds) {
          assert.ok(roster.every(m => round1[m][dish] !== 'NO' && round2[m][dish] === 'KEEP'));
        }
      }
    }
  }
  assert.equal(round1Count, 81);
  assert.ok(round2Count > 0);
});

test('runtime validation: malformed structures and sparse ID arrays cannot finalize', () => {
  const base = fixtures.cases.find(c => c.id === 'single-fallback').input;
  for (const input of [undefined, true, 2, 'input', [], new Map(), new Date(),
    { ...base, roster: new Array(1) }, { ...base, pool: new Array(1) },
    { ...base, round1: { a: [], b: { pho: 'OK' } } },
    { ...base, round1: { a: undefined, b: { pho: 'OK' } } },
    { ...base, round1: { a: { pho: false }, b: { pho: 'OK' } } },
    { ...base, round: 2, round2: { outsider: { pho: 'KEEP' } } },
  ]) {
    assert.equal(evaluateDecision(input).status, 'INVALID_INPUT');
  }
});

test('prototype-like IDs are own keys; inherited ballots cannot impersonate members', () => {
  const input = JSON.parse(`{
    "policyVersion":"decision-v2", "roster":["__proto__","constructor"],
    "pool":["toString"], "round":1,
    "round1":{"__proto__":{"toString":"WANT"},"constructor":{"toString":"WANT"}}
  }`);
  assert.equal(evaluateDecision(input).status, 'DECISION_READY');
  const incomplete = { ...input, round1: {} };
  assert.equal(evaluateDecision(incomplete).status, 'WAITING');
  const inherited = Object.create({ __proto__: { toString: 'WANT' } });
  assert.equal(evaluateDecision({ ...input, round1: inherited }).status, 'INVALID_INPUT');
  const nullPrototype = Object.assign(Object.create(null), input.round1);
  assert.equal(evaluateDecision({ ...input, round1: nullPrototype }).status, 'DECISION_READY');
});

test('validation paths are escaped and diagnostics order is deterministic', () => {
  const base = fixtures.cases.find(c => c.id === 'single-fallback').input;
  const result = evaluateDecision({ ...base, round1: { 'z/~': { 'x/~': 'LIKE' }, a: [] } });
  assert.equal(result.status, 'INVALID_INPUT');
  assert.deepEqual(result.issues, [
    { code: 'INVALID_INPUT', path: '/round1/a' },
    { code: 'NOT_MEMBER', path: '/round1/z~1~0' },
    { code: 'INVALID_DISH', path: '/round1/z~1~0/x~1~0' },
    { code: 'INVALID_INPUT', path: '/round1/z~1~0/x~1~0' },
  ]);
});

test('internal evaluation contains no vote matrix, counts, score or persisted winner', () => {
  const allowed = new Set(['policyVersion', 'status', 'candidateIds', 'issues',
    'waitingRound', 'reasonCode', 'matchTier']);
  for (const c of fixtures.cases) {
    const result = evaluateDecision(c.input);
    assert.ok(Object.keys(result).every(key => allowed.has(key)));
    assert.ok(!('winnerId' in result) && !('resultId' in result) && !('finalizedAt' in result));
  }
});

test('engine never consults RNG, wall clock or console', () => {
  const savedRandom = Math.random;
  const savedNow = Date.now;
  const savedLog = console.log;
  const forbidden = () => { throw new Error('Unexpected side effect'); };
  try {
    Math.random = forbidden;
    Date.now = forbidden;
    console.log = forbidden;
    for (const c of fixtures.cases) assert.deepEqual(evaluateDecision(c.input), c.expected);
  } finally {
    Math.random = savedRandom;
    Date.now = savedNow;
    console.log = savedLog;
  }
});
