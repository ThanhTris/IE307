import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { domain } from './helpers/dishV4.mjs';
const { decideDishSessionV4: decide, removalCapV4: cap, DISH_POLICY_V4: policy } = domain;
const fixtures = JSON.parse(readFileSync(new URL('../../tests/fixtures/decision-v4/cases.json', import.meta.url)));
const pool = Array.from({ length: 10 }, (_, i) => `d${String(i + 1).padStart(2, '0')}`);
const ballot = (ids, v) => Object.fromEntries(ids.map(id => [id, v]));
const snapshot = () => ({ policyVersion: policy, roster: ['a', 'b'], pool, round: 1,
  round1: { a: ballot(pool, 'OK') }, round2: {}, seed: '00000000' });
function freeze(value) { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; }
for (const row of fixtures.cases) test(`independent vector: ${row.id}`, () => {
  const input = freeze(structuredClone(row.input));
  if (row.expected.error) assert.throws(() => decide(input), RangeError);
  else assert.deepEqual(decide(input), row.expected);
});
test('accepts exactly roster2..20, not1/21, and initial pool10..20', () => {
  for (let n = 2; n <= 20; n++) {
    const input = { ...snapshot(), roster: Array.from({ length: n }, (_, i) => `u${i}`), round1: { u0: ballot(pool, 'OK') } };
    assert.equal(decide(input).status, 'ROUND_2');
  }
  for (const n of [0, 1, 21]) assert.throws(() => decide({ ...snapshot(), roster: Array.from({ length: n }, (_, i) => `u${i}`) }), RangeError);
  for (const n of [9, 21]) assert.throws(() => decide({ ...snapshot(), pool: Array.from({ length: n }, (_, i) => `x${i}`) }), RangeError);
  for (const n of [-1, 21, 1.5, NaN, Infinity, '1', null]) assert.throws(() => cap(n), RangeError);
  assert.equal(cap(0), 0);
});
test('bad shapes/IDs and incomplete acknowledged ballots never decide', () => {
  const sparse = [...pool]; delete sparse[2];
  const broken = [null, [], {}, { ...snapshot(), roster: ['a', 'a'] }, { ...snapshot(), roster: ['a', ' '] },
    { ...snapshot(), pool: [...pool.slice(0, 9), pool[0]] }, { ...snapshot(), pool: sparse },
    { ...snapshot(), round1: null }, { ...snapshot(), round1: [] }, { ...snapshot(), round2: null },
    { ...snapshot(), round1: { a: { ...ballot(pool, 'OK'), unknown: 'OK' } } },
    { ...snapshot(), round1: { a: { ...ballot(pool, 'OK'), d01: 'KEEP' } } },
    Object.create(snapshot())];
  for (const input of broken) assert.throws(() => decide(input), RangeError);
  const inherited = Object.create({ a: ballot(pool, 'OK') });
  assert.throws(() => decide({ ...snapshot(), round1: inherited }), RangeError);
  let read = false;
  const accessor = { ...snapshot() }; Object.defineProperty(accessor, 'seed', { enumerable: true, get() { read = true; return '00000000'; } });
  assert.throws(() => decide(accessor), RangeError); assert.equal(read, false);
});
test('R2 rejects vetoed/unknown dishes, invalid choices and partial ballots', () => {
  const r1 = { a: { ...ballot(pool, 'NO'), d01: 'OK', d02: 'OK' } };
  for (const votes of [{ d01: 'KEEP' }, { d01: 'KEEP', d02: 'UNSET' }, { d01: 'KEEP', d02: 'NO' },
    { d01: 'KEEP', d02: 'KEEP', d03: 'KEEP' }]) {
    assert.throws(() => decide({ ...snapshot(), round: 2, round1: r1, round2: { b: votes } }), RangeError);
  }
});
test('tier uses actual R1 cohort, not roster or R2 submission count', () => {
  for (const [n, wants, expected] of [[2, 1, 'COMPROMISE'], [3, 2, 'CONSENSUS'], [4, 2, 'COMPROMISE'], [5, 3, 'CONSENSUS']]) {
    const roster = Array.from({ length: n }, (_, i) => `u${i}`);
    const round1 = Object.fromEntries(roster.map((u, i) => [u, { ...ballot(pool, 'OK'), d01: i < wants ? 'WANT' : 'OK' }]));
    const r = decide({ ...snapshot(), roster, round: 2, round1, round2: { u0: ballot(pool, 'KEEP') } });
    assert.equal(r.round1BallotCount, n); assert.equal(r.matchTier, expected);
    assert.equal(r.topDishes[0].score, n + wants);
  }
});
test('permutations/retries are stable; no mutation or shared output references', () => {
  const input = fixtures.cases.find(c => c.id === 'r2-dense-tie-half-tier').input;
  const original = structuredClone(input); const out = decide(freeze(input));
  const reverseMap = obj => Object.fromEntries(Object.entries(obj).reverse().map(([u, b]) => [u, Object.fromEntries(Object.entries(b).reverse())]));
  const reversed = { ...input, roster: [...input.roster].reverse(), pool: [...input.pool].reverse(), round1: reverseMap(input.round1), round2: reverseMap(input.round2) };
  assert.deepEqual(decide(reversed), out); assert.deepEqual(input, original); assert.deepEqual(decide(input), out);
  out.topDishes[0].score = 999; assert.notEqual(decide(input).topDishes[0].score, 999);
});
test('cutoff ties always include the seeded winner; NO/REMOVE never rank', () => {
  for (let seed = 0; seed < 128; seed++) {
    const input = { ...snapshot(), round: 2, round1: { a: { ...ballot(pool, 'OK'), d10: 'NO' } },
      round2: { b: { ...ballot(pool.slice(0, 9), 'KEEP'), d09: 'REMOVE' } }, seed: seed.toString(16).padStart(8, '0') };
    const r = decide(input);
    assert.equal(r.status, 'DECIDED'); assert.equal(r.topDishes.length, 3);
    assert.equal(r.topDishes.filter(d => d.isWinner).length, 1);
    assert(r.topDishes.some(d => d.isWinner && d.dishId === r.winnerId));
    assert(r.topDishes.every(d => !['d09', 'd10'].includes(d.dishId) && d.score === 1 && d.rank === 1));
    assert(r.topDishes.every(d => d.score <= 2 * r.round1BallotCount));
  }
});
test('preferences/host weight are outside the closed ballot contract', () => {
  assert.throws(() => decide({ ...snapshot(), preferences: { a: { weight: 100 } } }), RangeError);
  const base = decide(snapshot());
  assert.equal(base.round1BallotCount, 1); assert.equal(base.status, 'ROUND_2');
});
