import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideWithSeed, selectWinner, SELECTION_CONTRACT_VERSION, SELECTION_ALGORITHM } from '../src/domain/decision/index.ts';
import { mapAcceptedBallots, selectedResultFields } from '../src/domain/decision/choiceMapping.ts';
const fixture = JSON.parse(readFileSync(new URL('../../tests/fixtures/decision-v2/seeded-cases.json', import.meta.url), 'utf8'));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const reverse = value => Array.isArray(value) ? [...value].reverse() : value && typeof value === 'object'
  ? Object.fromEntries(Object.entries(value).reverse().map(([k,v]) => [k,reverse(v)])) : value;
test('seeded fixtures have independent expected, version and simulation marker', () => {
  assert.equal(fixture.fixtureOnly, true);
  assert.equal(fixture.selectionContractVersion, SELECTION_CONTRACT_VERSION);
  assert.equal(fixture.selectionAlgorithm, SELECTION_ALGORITHM);
  assert.equal(new Set(fixture.cases.map(c => c.id)).size, fixture.cases.length);
});
for (const c of fixture.cases) test(c.id, () => {
  const input=freeze(structuredClone(c.input)); const before=JSON.stringify(input);
  assert.deepEqual(decideWithSeed(input), c.expected);
  assert.deepEqual(decideWithSeed(input), c.expected);
  assert.deepEqual(decideWithSeed(reverse(input)), c.expected);
  assert.equal(JSON.stringify(input), before);
});
test('selector is pure with no ambient entropy, clock or logging', () => {
  const saved=[Math.random,Date.now,console.log];
  const fail=()=>{throw new Error('Unexpected side effect');};
  try { Math.random=fail;Date.now=fail;console.log=fail;
    for(const c of fixture.cases) assert.deepEqual(decideWithSeed(c.input),c.expected);
  } finally { [Math.random,Date.now,console.log]=saved; }
});
test('selector rejects malformed candidates/seed; never mutates candidate order', () => {
  for(const ids of [[],['x','x'],[''],new Array(2),null]) assert.throws(()=>selectWinner(ids,'00000000'),RangeError);
  const ids=Object.freeze(['b','a']); assert.equal(selectWinner(ids,'00000001'),'b');assert.deepEqual(ids,['b','a']);
});
test('choice identity mapping keeps same dish at different offering/variant distinct', () => {
  const choices=[{roundDishId:'row-beef',choiceId:'choice-beef'},{roundDishId:'row-chicken',choiceId:'choice-chicken'}];
  const accepted=[{memberId:'a',votes:[{roundDishId:'row-beef',vote:'WANT'},{roundDishId:'row-chicken',vote:'WANT'}]},
    {memberId:'b',votes:[{roundDishId:'row-beef',vote:'NO'},{roundDishId:'row-chicken',vote:'OK'}]}];
  const round1=mapAcceptedBallots(['a','b'],choices,accepted,1);
  const input={policyVersion:'decision-v2',roster:['a','b'],pool:choices.map(c=>c.choiceId),round:2,round1,
    round2:mapAcceptedBallots(['a','b'],[choices[1]],['a','b'].map(memberId=>({memberId,votes:[{roundDishId:'row-chicken',vote:'KEEP'}]})),2),seed:'00000001'};
  const selected=decideWithSeed(freeze(input));assert.equal(selected.winnerId,'choice-chicken');
  const resultRows=[{roundDishId:'round2-row-chicken',choiceId:'choice-chicken'}];
  assert.deepEqual(selectedResultFields(selected,resultRows),{policyVersion:'decision-v2',reasonCode:'ACCEPTABLE_FINAL',matchTier:'COMPROMISE',winnerRoundDishId:'round2-row-chicken'});
  assert.throws(()=>selectedResultFields(selected,[choices[0]]),RangeError);
});
test('accepted mapping rejects UI UNSET, duplicate rows/members, outsider, wrong round; missing stays waiting', () => {
  const choices=[{roundDishId:'row',choiceId:'choice'}];
  const ballot=vote=>[{memberId:'a',votes:[{roundDishId:'row',vote}]}];
  for(const v of ['UNSET','KEEP','REMOVE','LIKE']) assert.throws(()=>mapAcceptedBallots(['a','b'],choices,ballot(v),1),RangeError);
  assert.throws(()=>mapAcceptedBallots(['a'],choices,[...ballot('WANT'),...ballot('WANT')],1),RangeError);
  assert.throws(()=>mapAcceptedBallots(['b'],choices,ballot('WANT'),1),RangeError);
  assert.throws(()=>mapAcceptedBallots(['a'],choices,[{memberId:'a',votes:[{roundDishId:'dish-id',vote:'WANT'}]}],1),RangeError);
  assert.throws(()=>mapAcceptedBallots(['a'],[...choices,...choices],ballot('WANT'),1),RangeError);
  assert.throws(()=>mapAcceptedBallots(['a'],choices,[{memberId:'a',votes:[...ballot('WANT')[0].votes,...ballot('WANT')[0].votes]}],1),RangeError);
  const round1=mapAcceptedBallots(['a','b'],choices,ballot('WANT'),1);
  const wait=decideWithSeed({policyVersion:'decision-v2',roster:['a','b'],pool:['choice'],round:1,round1,seed:'00000000'});
  assert.equal(wait.status,'WAITING');assert.ok(!('winnerId' in wait));assert.throws(()=>selectedResultFields(wait,choices),RangeError);
});
test('seed sweep over veto/REMOVE choices never selects vetoed choice', () => {
  for(const id of ['seeded-removed-high-score','seeded-single-confirmed']) {
    const c=fixture.cases.find(c=>c.id===id);
    for(let i=0;i<512;i++) assert.equal(decideWithSeed({...c.input,seed:i.toString(16).padStart(8,'0')}).winnerId,c.expected.winnerId);
  }
});
