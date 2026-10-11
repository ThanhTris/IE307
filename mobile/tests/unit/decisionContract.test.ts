/** Synthetic cross-contract assertions, not RPC/auth/finalize evidence. */
import { MockApiClient } from '../../src/data/api/mock';
import type { BallotVoteItem, RoomResult } from '../../src/data/api/contracts';
import { isRoomSnapshot } from '../../src/data/api/responseGuards';
import { decideWithSeed } from '../../src/domain/decision';
import { mapAcceptedBallots, selectedResultFields } from '../../src/domain/decision/choiceMapping';

test('GM-07 BallotVoteItem row IDs map to immutable choices and selected result fields', () => {
  const locked=[{roundDishId:'row-a',choiceId:'choice-a'},{roundDishId:'row-b',choiceId:'choice-b'}];
  const votes: BallotVoteItem[] = [{roundDishId:'row-a',vote:'WANT'},{roundDishId:'row-b',vote:'NO'}];
  const round1=mapAcceptedBallots(['user-a','user-b'],locked,
    ['user-a','user-b'].map(memberId=>({memberId,votes})),1);
  const selected=decideWithSeed({policyVersion:'decision-v2',roster:['user-a','user-b'],pool:locked.map(c=>c.choiceId),round:1,round1,seed:'00000001'});
  const fields: Pick<RoomResult,'winnerRoundDishId'|'policyVersion'|'reasonCode'|'matchTier'>=selectedResultFields(selected,locked);
  expect(fields).toEqual({winnerRoundDishId:'row-a',policyVersion:'decision-v2',reasonCode:'UNANIMOUS_WANT',matchTier:'PERFECT'});
  expect(Object.keys(fields).sort()).toEqual(['matchTier','policyVersion','reasonCode','winnerRoundDishId']);
  expect(fields).not.toHaveProperty('winnerDish'); // Metadata comes from locked winning row.
});

async function fixture() {
  const mock=new MockApiClient({delayMs:0});
  const first=await mock.getRoomSnapshot('room_mock_001');
  if(!first.ok) throw new Error('fixture snapshot missing');
  const snapshot=first.data;
  const winner=snapshot.pool[0]!;
  const result: RoomResult={resultId:'fixture-result',roomId:snapshot.roomId,round:1,
    winnerRoundDishId:winner.roundDishId,winnerDish:winner,policyVersion:'decision-v2',reasonCode:'UNANIMOUS_WANT',matchTier:'PERFECT',finalizedAt:'2026-10-11T00:00:00Z'};
  return {mock,snapshot,result};
}

test.each([
  {policyVersion:'food-v1'}, {matchTier:'TIER_1'}, {matchTier:'TIER_2'}, {reasonCode:'HIGHEST_SCORE'},
  {reasonCode:'NO_CONSENSUS',matchTier:'TIER_NONE'}, {reasonCode:'UNANIMOUS_WANT',matchTier:'COMPROMISE'},
  {winnerRoundDishId:'another-row'}, {winnerRoundDishId:null}, {winnerDish:null},
])('GM-07 guard rejects mismatched decision convention %j',async patch=>{
  const {snapshot,result}=await fixture();
  expect(isRoomSnapshot({...snapshot,state:'DECIDED',result})).toBe(true);
  expect(isRoomSnapshot({...snapshot,state:'DECIDED',result:{...result,...patch}})).toBe(false);
});

test.each(['EMPTY_INTERSECTION','ALL_REMOVED'] as const)('no consensus %s has null winner',async reasonCode=>{
  const {snapshot}=await fixture();
  const decision=decideWithSeed({policyVersion:'decision-v2',roster:['a','b'],pool:['choice'],round:1,
    round1:{a:{choice:'NO'},b:{choice:'OK'}},seed:'00000000'});
  const fields=selectedResultFields(decision,[{roundDishId:'row',choiceId:'choice'}]);
  expect(fields.winnerRoundDishId).toBeNull();
  const result:RoomResult={...fields,reasonCode,resultId:'fixture-result',roomId:snapshot.roomId,round:1,winnerDish:null,finalizedAt:'2026-10-11T00:00:00Z'};
  expect(isRoomSnapshot({...snapshot,state:'NO_CONSENSUS',result})).toBe(true);
  expect(isRoomSnapshot({...snapshot,state:'NO_CONSENSUS',result:{...result,winnerDish:snapshot.pool[0]}})).toBe(false);
});

test.each(['normal','no_consensus','round_two'] as const)('actual mock %s matches decision vocabulary without pretending multi-user finalize',async scenario=>{
  const mock=new MockApiClient({delayMs:0,...(scenario==='normal'?{}:{scenario})});
  let current=await mock.getRoomSnapshot('room_mock_001');if(!current.ok) throw new Error('fixture');
  const roomId=current.data.roomId;
  await mock.setReady({roomId,expectedVersion:current.data.version,ready:true});
  current=await mock.getRoomSnapshot(roomId);if(!current.ok) throw new Error('fixture');
  await mock.startRound({roomId,expectedVersion:current.data.version});
  current=await mock.getRoomSnapshot(roomId);if(!current.ok) throw new Error('fixture');
  const first=current.data;
  expect((await mock.submitBallot({roomId,round:1,poolVersion:first.poolVersion,expectedVersion:first.version,
    intentId:'fixture-first',requestId:'fixture-first',votes:first.pool.map(d=>({roundDishId:d.roundDishId,vote:'WANT' as const}))})).ok).toBe(true);
  current=await mock.getRoomSnapshot(roomId);if(!current.ok) throw new Error('fixture');
  if(scenario==='round_two') {
    const second=current.data;
    expect((await mock.submitBallot({roomId,round:2,poolVersion:second.poolVersion,expectedVersion:second.version,
      intentId:'fixture-second',requestId:'fixture-second',votes:second.pool.map(d=>({roundDishId:d.roundDishId,vote:'REMOVE' as const}))})).ok).toBe(true);
    current=await mock.getRoomSnapshot(roomId);if(!current.ok) throw new Error('fixture');
  }
  expect(current.data.result).toMatchObject({policyVersion:'decision-v2',
    reasonCode:scenario==='normal'?'UNANIMOUS_WANT':scenario==='round_two'?'ALL_REMOVED':'EMPTY_INTERSECTION',
    matchTier:scenario==='normal'?'PERFECT':'NO_CONSENSUS'});
  expect(isRoomSnapshot(current.data)).toBe(true);
  expect(current.data.result).not.toHaveProperty('candidateIds');
  expect(current.data.result).not.toHaveProperty('round1');expect(current.data.result).not.toHaveProperty('scores');
});

test('same dishId at two venues remains two locked choices and uses only selected row metadata',async()=>{
  const {snapshot}=await fixture();
  const template=snapshot.pool[0]!;
  const choices=[{...template,roundDishId:'row-a',choiceId:'choice-a',venueId:'venue-a',priceMin:10000},
    {...template,roundDishId:'row-b',choiceId:'choice-b',venueId:'venue-b',priceMin:50000}];
  const selected=decideWithSeed({policyVersion:'decision-v2',roster:['a','b'],pool:choices.map(d=>d.choiceId),round:1,
    round1:mapAcceptedBallots(['a','b'],choices,['a','b'].map(memberId=>({memberId,votes:choices.map(d=>({roundDishId:d.roundDishId,vote:'WANT'}))})),1),seed:'00000001'});
  const fields=selectedResultFields(selected,choices);
  const winnerDish=choices.find(d=>d.roundDishId===fields.winnerRoundDishId)!;
  expect(winnerDish).toMatchObject({dishId:template.dishId,venueId:'venue-b',priceMin:50000});
  expect(selected.candidateIds).toEqual(['choice-a','choice-b']);
  expect(winnerDish).not.toEqual(choices[0]);
});
