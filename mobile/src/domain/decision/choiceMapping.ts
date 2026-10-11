/** Pure structural mapping of trusted server snapshots; no API/auth/DB calls. */
import type { Ballots, RoundOneVote, RoundTwoVote, SeededDecision } from './index';

export type LockedChoice = { readonly roundDishId: string; readonly choiceId: string };
export type AcceptedBallot = {
  readonly memberId: string;
  readonly votes: readonly { readonly roundDishId: string; readonly vote: string }[];
};

function choiceMap(choices: readonly LockedChoice[]): Map<string, string> {
  const result = new Map<string, string>();
  const seen = new Set<string>();
  for (const c of choices) {
    if (!c.roundDishId?.trim() || !c.choiceId?.trim()
      || result.has(c.roundDishId) || seen.has(c.choiceId)) {
      throw new RangeError('Locked round row IDs and choice IDs must be unique');
    }
    result.set(c.roundDishId, c.choiceId);
    seen.add(c.choiceId);
  }
  return result;
}

/** Caller establishes ACK/auth/room/round/poolVersion before calling this. */
export function mapAcceptedBallots(
  roster: readonly string[], choices: readonly LockedChoice[],
  accepted: readonly AcceptedBallot[], round: 1,
): Ballots<RoundOneVote>;
export function mapAcceptedBallots(
  roster: readonly string[], choices: readonly LockedChoice[],
  accepted: readonly AcceptedBallot[], round: 2,
): Ballots<RoundTwoVote>;
export function mapAcceptedBallots(
  roster: readonly string[], choices: readonly LockedChoice[],
  accepted: readonly AcceptedBallot[], round: 1 | 2,
): Ballots<RoundOneVote | RoundTwoVote> {
  if (round !== 1 && round !== 2) throw new RangeError('Only two rounds');
  if (!roster.length || roster.some(id => !id?.trim()) || new Set(roster).size !== roster.length) {
    throw new RangeError('Explicit unique locked roster required');
  }
  const ids = choiceMap(choices);
  const ballots: Record<string, Record<string, RoundOneVote | RoundTwoVote>> = Object.create(null);
  const allowed = round === 1 ? ['WANT', 'OK', 'NO'] : ['KEEP', 'REMOVE'];
  for (const b of accepted) {
    if (!roster.includes(b.memberId) || Object.hasOwn(ballots, b.memberId)) {
      throw new RangeError('Unknown or duplicate accepted member');
    }
    const votes: Record<string, RoundOneVote | RoundTwoVote> = Object.create(null);
    for (const v of b.votes) {
      const id = ids.get(v.roundDishId);
      if (!id || Object.hasOwn(votes, id) || !allowed.includes(v.vote)) {
        throw new RangeError('Unknown/duplicate round row or invalid submitted vote');
      }
      votes[id] = v.vote as RoundOneVote | RoundTwoVote;
    }
    ballots[b.memberId] = votes;
  }
  // Missing members/votes stay absent: engine must WAIT, never fill KEEP/OK.
  return ballots;
}

/** Minimal fields only. GM-20 supplies persisted result ID/time and winnerDish. */
export function selectedResultFields(result: SeededDecision, choices: readonly LockedChoice[]) {
  const ids = choiceMap(choices);
  if (result.status === 'NO_CONSENSUS') return {
    policyVersion: result.policyVersion, reasonCode: result.reasonCode,
    matchTier: result.matchTier, winnerRoundDishId: null,
  };
  if (result.status !== 'DECISION_SELECTED') throw new RangeError('No terminal decision');
  const row = [...ids].find(([, id]) => id === result.winnerId)?.[0];
  if (!row) throw new RangeError('Selected choice missing from locked result round');
  return { policyVersion: result.policyVersion, reasonCode: result.reasonCode,
    matchTier: result.matchTier, winnerRoundDishId: row };
}
