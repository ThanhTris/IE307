import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){
  return next(specifier==='./index'&&context.parentURL?.endsWith('/dishPolicy.ts')?'./index.ts':specifier,context);
}});
const { removalCap, validDishCount, decideDishSession } = await import('../src/domain/decision/dishPolicy.ts');
hooks.deregister();
const votes = (pool, vote) => Object.fromEntries(pool.map(id => [id, vote]));
test('host controls every integer 10–20; no silent fallback', () => {
  for (let n=10;n<=20;n++) assert.equal(validDishCount(n),true);
  for (const n of [9,21,10.5,null,'10',NaN]) assert.equal(validDishCount(n),false);
});
test('removal cap follows the actual round-two pool', () => {
  assert.deepEqual(Array.from({length:21},(_,n)=>removalCap(n)),[0,0,0,1,1,2,2,3,3,3,3,3,3,3,3,3,3,3,3,3,3]);
});
test('missing member is not an OK voter; a single complete ballot may finalize', () => {
  const r=decideDishSession({roster:['a','b'],pool:['x','y'],round:1,round1:{a:{x:'WANT',y:'NO'}},round2:{},seed:'12345678'});
  assert.equal(r.winnerId,'x');assert.equal(r.tier,'PERFECT');
});
test('all vetoed retains no consensus', () => {
  assert.equal(decideDishSession({roster:['a'],pool:['x'],round:1,round1:{a:{x:'NO'}},round2:{},seed:'12345678'}).status,'NO_CONSENSUS');
});
test('a reconnecting member with no round-one ballot can participate in round two', () => {
  const r=decideDishSession({roster:['a','b'],pool:['x','y','z'],round:2,
    round1:{a:{x:'WANT',y:'OK',z:'NO'}},round2:{b:{x:'KEEP',y:'KEEP'}},seed:'12345678'});
  assert.equal(r.winnerId,'x');
});
test('newcomer cannot revive a round-one NO or send to a stale pool', () => {
  assert.throws(()=>decideDishSession({roster:['a','b'],pool:['x','y','z'],round:2,
    round1:{a:{x:'WANT',y:'OK',z:'NO'}},round2:{b:{x:'KEEP',y:'KEEP',z:'KEEP'}},seed:'12345678'}));
});
test('one person cannot remove three of four candidates', () => {
  const pool=['a','b','c','d'];
  assert.throws(()=>decideDishSession({roster:['u'],pool,round:2,round1:{u:votes(pool,'OK')},round2:{u:{a:'REMOVE',b:'REMOVE',c:'REMOVE',d:'KEEP'}},seed:'12345678'}));
});
test('multiple permitted removals can still produce no consensus', () => {
  const pool=['x','y','z'];const r=decideDishSession({roster:['a','b','c'],pool,round:2,round1:{a:votes(pool,'OK')},
    round2:{a:{x:'REMOVE',y:'KEEP',z:'KEEP'},b:{x:'KEEP',y:'REMOVE',z:'KEEP'},c:{x:'KEEP',y:'KEEP',z:'REMOVE'}},seed:'12345678'});
  assert.equal(r.status,'NO_CONSENSUS');
});
test('one remaining candidate skips the removal phase', () => {
  const r=decideDishSession({roster:['a'],pool:['x','y'],round:1,round1:{a:{x:'OK',y:'NO'}},round2:{},seed:'12345678'});
  assert.equal(r.status,'DECIDED');assert.equal(r.winnerId,'x');
});
test('a missing round-two ballot waits rather than inventing KEEP', () => {
  assert.equal(decideDishSession({roster:['a','b'],pool:['x','y'],round:2,round1:{a:{x:'OK',y:'OK'}},round2:{},seed:'12345678'}).status,'WAITING');
});

