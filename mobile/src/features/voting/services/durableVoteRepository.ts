/**
 * GM-31 — Durable Outbox & Session Recovery wrapper around GM-26 VoteRepository.
 * Preserves GM-26 voteRepository.ts file ownership while adding persist-before-send
 * ballot outbox, canonical ACK reconciliation, offline private snapshot cache,
 * and monotonic identity/session epoch guards.
 */

import type {
  ApiError,
  RoomSnapshot,
  SubmitBallotResponse,
  WriteResult,
} from '../../../data/api';
import { isCanonicalRoomSnapshot, isRoomSnapshot } from '../../../data/api/responseGuards';
import { getDurableOutbox, type DurableOutbox } from '../../../data/local/outbox';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { getRoundTwoEliminationCap } from './votingRules';
import {
  CANONICAL_VOTE_CONTRACT_VERSION,
  createDurableRequestId,
  createLiveVoteRepository,
  type EnterWaitingArgs,
  type EnterWaitingResponse,
  type FinalizeArgs,
  type FinalizeResponse,
  type LiveVoteRepositoryDeps,
  type SubmitBallotArgs,
  type VoteRepository,
} from './voteRepository';
import { settleWithin } from '../../../data/local/bestEffort';

const SNAPSHOT_RECONCILE_WAIT_MS = 1_500;

export type CachedReadResult<T> =
  | { ok: true; data: T; stale?: boolean; fetchedAt?: string }
  | { ok: false; error: ApiError };

export interface DurableVoteRepository extends VoteRepository {
  getSnapshot(roomId: string, options?: { allowStaleCache?: boolean }): Promise<CachedReadResult<RoomSnapshot>>;
}

export interface DurableVoteRepositoryDeps extends LiveVoteRepositoryDeps {
  outbox?: DurableOutbox;
}

export function acknowledgedRequestIds(snapshot: Pick<RoomSnapshot, 'ownBallot' | 'ownSubmission'>): string[] {
  const ballotId = !Array.isArray(snapshot.ownBallot)
    ? (snapshot.ownBallot as { requestId?: unknown } | null | undefined)?.requestId
    : undefined;
  return [snapshot.ownSubmission?.requestId, ballotId]
    .filter((requestId): requestId is string => typeof requestId === 'string' && requestId.length > 0);
}

interface CapturedIdentity {
  userId: string;
  repositoryRevision: number;
  authGeneration: number;
}

export class DurableLiveVoteRepository implements DurableVoteRepository {
  private readonly baseRepo: VoteRepository;
  private readonly roomRepo?: RoomRepository;
  private readonly nextRequestId: (prefix?: string) => string;
  private readonly outbox?: DurableOutbox;

  constructor(deps: DurableVoteRepositoryDeps = {}) {
    this.baseRepo = createLiveVoteRepository(deps);
    this.roomRepo = deps.roomRepository;
    this.nextRequestId = deps.nextRequestId ?? createDurableRequestId;
    this.outbox = deps.outbox;
  }

  private captureIdentity(): CapturedIdentity | undefined {
    const repository = this.roomRepo;
    const userId = repository?.getCurrentUser()?.id;
    if (!repository || !userId) return undefined;
    return {
      userId,
      repositoryRevision: (repository as RoomRepository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0,
      authGeneration: repository.getSessionApi()?.getGeneration?.() ?? 0,
    };
  }

  private identityMatches(captured: CapturedIdentity | undefined): boolean {
    if (!captured) return true;
    const current = this.captureIdentity();
    return current?.userId === captured.userId
      && current.repositoryRevision === captured.repositoryRevision
      && current.authGeneration === captured.authGeneration;
  }

  async submitBallot(args: SubmitBallotArgs): Promise<WriteResult<SubmitBallotResponse>> {
    let rid = args.requestId || this.nextRequestId('submit');
    let intent = args.intentId || `intent_${rid}`;

    if (!args.roomId) {
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
    }
    if (args.round !== 1 && args.round !== 2) {
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
    }
    if (!Array.isArray(args.votes) || args.votes.length === 0) {
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INCOMPLETE_BALLOT' } };
    }

    const wireVotes: { roundDishId: string; choice: string }[] = [];
    if (args.round === 1) {
      for (const item of args.votes) {
        const choice = (item as { choice?: string }).choice ?? item.vote;
        if (!item.roundDishId || !['WANT', 'OK', 'NO'].includes(choice)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
        }
        wireVotes.push({ roundDishId: item.roundDishId, choice });
      }
    } else {
      let removeCount = 0;
      for (const item of args.votes) {
        const choice = (item as { choice?: string }).choice ?? item.vote;
        if (!item.roundDishId || !['KEEP', 'REMOVE'].includes(choice)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'INVALID_INPUT' } };
        }
        if (choice === 'REMOVE') removeCount++;
        wireVotes.push({ roundDishId: item.roundDishId, choice });
      }
      const cap = getRoundTwoEliminationCap(wireVotes.length);
      if (removeCount > cap) {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: {
            messageKey: 'REMOVE_LIMIT',
            details: { removeCount, cap, candidatesCount: wireVotes.length },
          },
        };
      }
    }

    let expectedVersion = args.expectedVersion;
    const capturedIdentity = this.captureIdentity();
    const identityId = capturedIdentity?.userId;
    const durableOutbox = identityId ? (this.outbox ?? getDurableOutbox()) : undefined;

    if (identityId && durableOutbox) {
      try {
        const previous = await durableOutbox.findEquivalent({
          identityId,
          roomId: args.roomId,
          round: args.round,
          poolVersion: args.poolVersion,
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          expectedVersion,
          payload: { intentId: intent, votes: wireVotes },
        });
        if (!this.identityMatches(capturedIdentity)) {
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
        }
        if (previous) {
          const latest = await this.getSnapshot(args.roomId, { allowStaleCache: false });
          if (!this.identityMatches(capturedIdentity)) {
            return { ok: false, requestId: previous.requestId, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
          }
          if (!latest.ok) {
            return { ok: false, requestId: previous.requestId, roomId: args.roomId, error: latest.error };
          }
          if (acknowledgedRequestIds(latest.data).includes(previous.requestId)) {
            await durableOutbox.acknowledge(identityId, previous.requestId).catch(() => undefined);
            if (!this.identityMatches(capturedIdentity)) {
              return { ok: false, requestId: previous.requestId, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
            }
            return {
              ok: true,
              requestId: previous.requestId,
              roomId: args.roomId,
              version: latest.data.version,
              state: latest.data.state,
              data: {
                accepted: true,
                round: args.round,
                allMembersSubmitted: args.round === 1
                  ? latest.data.round > 1 || latest.data.state === 'DECIDED' || latest.data.state === 'NO_CONSENSUS'
                  : latest.data.state === 'DECIDED' || latest.data.state === 'NO_CONSENSUS',
                roomVersion: latest.data.version,
                receipt: latest.data.ownSubmission ?? undefined,
              },
            };
          }
          const activeStates = args.round === 1 ? ['ROUND_1', 'WAITING_1'] : ['ROUND_2', 'WAITING_2'];
          if (!activeStates.includes(latest.data.state)
            || latest.data.round !== args.round
            || latest.data.poolVersion !== args.poolVersion
            || previous.expectedVersion < 1
            || previous.expectedVersion > latest.data.version) {
            await durableOutbox.remove(identityId, previous.requestId).catch(() => undefined);
            return { ok: false, requestId: previous.requestId, roomId: args.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
          }
          rid = previous.requestId;
          expectedVersion = previous.expectedVersion;
          const previousPayload = previous.payload as { intentId?: string } | undefined;
          intent = previousPayload?.intentId ?? `intent_${rid}`;
        }
      } catch {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: { messageKey: 'UNKNOWN_ERROR', message: 'Chưa thể kiểm tra trạng thái lượt chọn đã lưu; chưa gửi lại.' },
        };
      }

      try {
        await durableOutbox.enqueue({
          identityId,
          roomId: args.roomId,
          round: args.round,
          poolVersion: args.poolVersion,
          contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
          requestId: rid,
          expectedVersion,
          payload: { intentId: intent, votes: wireVotes },
        });
        if (!this.identityMatches(capturedIdentity)) {
          await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
          return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
        }
      } catch {
        return {
          ok: false,
          requestId: rid,
          roomId: args.roomId,
          error: { messageKey: 'UNKNOWN_ERROR', message: 'Chưa lưu an toàn được lượt chọn trên thiết bị; chưa gửi lên máy chủ.' },
        };
      }
    }

    const acknowledgePersistedIntent = async () => {
      if (!identityId || !durableOutbox) return;
      try {
        await durableOutbox.acknowledge(identityId, rid);
      } catch {
        await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
      }
    };

    const classifyFailedIntent = async (messageKey: string) => {
      if (!identityId || !durableOutbox) return;
      if (messageKey === 'NETWORK_ERROR' || messageKey === 'TIMEOUT' || messageKey === 'UNKNOWN_ERROR' || messageKey === 'MALFORMED_RESPONSE') {
        await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
      } else {
        await durableOutbox.remove(identityId, rid).catch(() => undefined);
      }
    };

    if (!this.identityMatches(capturedIdentity)) {
      if (identityId && durableOutbox) await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
    }

    const res = await this.baseRepo.submitBallot({
      ...args,
      requestId: rid,
      intentId: intent,
      expectedVersion,
    });

    if (!this.identityMatches(capturedIdentity)) {
      if (identityId && durableOutbox) await durableOutbox.markUnknown(identityId, rid).catch(() => undefined);
      return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
    }

    if (res.ok) {
      await acknowledgePersistedIntent();
      if (!this.identityMatches(capturedIdentity)) {
        return { ok: false, requestId: rid, roomId: args.roomId, error: { messageKey: 'AUTH_REQUIRED' } };
      }
    } else {
      await classifyFailedIntent(res.error.messageKey);
    }

    return res;
  }

  async enterWaiting(args: EnterWaitingArgs): Promise<WriteResult<EnterWaitingResponse>> {
    return this.baseRepo.enterWaiting(args);
  }

  async finalize(args: FinalizeArgs): Promise<WriteResult<FinalizeResponse>> {
    return this.baseRepo.finalize(args);
  }

  async getSnapshot(roomId: string, options: { allowStaleCache?: boolean } = {}): Promise<CachedReadResult<RoomSnapshot>> {
    const capturedIdentity = this.captureIdentity();
    const result = await this.baseRepo.getSnapshot(roomId);

    if (result.ok) {
      if (!this.identityMatches(capturedIdentity)) {
        return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      }
      // B6: the server snapshot is authoritative. Local outbox bookkeeping may lag (SQLite busy),
      // so it gets a short window and then continues in the background instead of delaying the UI.
      await settleWithin(this.reconcileOutbox(result.data, capturedIdentity), undefined, SNAPSHOT_RECONCILE_WAIT_MS);
      if (!this.identityMatches(capturedIdentity)) {
        return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
      }
      return result;
    }

    if (options.allowStaleCache !== false && ['NETWORK_ERROR', 'TIMEOUT'].includes(result.error.messageKey)) {
      const cached = await this.readCachedSnapshot(roomId, capturedIdentity);
      if (cached) return cached;
    }

    return result;
  }

  private async readCachedSnapshot(
    roomId: string,
    identity: CapturedIdentity | undefined,
  ): Promise<CachedReadResult<RoomSnapshot> | undefined> {
    if (!identity || !this.identityMatches(identity)) return undefined;
    const outbox = this.outbox ?? getDurableOutbox();
    const cached = await outbox.readSnapshotCache<RoomSnapshot>(identity.userId, roomId, CANONICAL_VOTE_CONTRACT_VERSION).catch(() => undefined);
    if (!cached || !this.identityMatches(identity)
      || !(isCanonicalRoomSnapshot(cached.value) || isRoomSnapshot(cached.value))) {
      return undefined;
    }
    return {
      ok: true,
      data: cached.value,
      stale: true,
      fetchedAt: new Date(cached.fetchedAt).toISOString(),
    };
  }

  private async reconcileOutbox(snapshot: RoomSnapshot, identity: CapturedIdentity | undefined): Promise<void> {
    const identityId = identity?.userId;
    if (!identityId || !this.identityMatches(identity)) return;
    const outbox = this.outbox ?? getDurableOutbox();
    await outbox.cacheSnapshot({
      identityId,
      roomId: snapshot.roomId,
      contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
      value: snapshot,
    }).catch(() => undefined);
    if (!this.identityMatches(identity)) return;
    const ownMember = snapshot.members?.find(member => member.userId === identityId) as
      (RoomSnapshot['members'][number] & { submissionStatus?: string }) | undefined;
    await outbox.reconcileBeforeReplay(identityId, async () => ({
      roomId: snapshot.roomId,
      round: snapshot.round,
      poolVersion: snapshot.poolVersion,
      contractVersion: CANONICAL_VOTE_CONTRACT_VERSION,
      version: snapshot.version,
      active: ['ROUND_1', 'WAITING_1', 'ROUND_2', 'WAITING_2'].includes(snapshot.state),
      acknowledgedRequestIds: acknowledgedRequestIds(snapshot),
      hasCanonicalBallot: Array.isArray(snapshot.ownBallot) && snapshot.ownBallot.length > 0
        && ownMember?.submissionStatus === 'ACCEPTED',
    })).catch(() => []);
  }
}

export function createDurableVoteRepository(deps: DurableVoteRepositoryDeps = {}): DurableVoteRepository {
  return new DurableLiveVoteRepository(deps);
}
