import type { Friend, InboxItem, SocialIdentity } from '../../../data/api/contracts';
import type { InboxPage, InboxRepository } from '../../inbox/services/inboxRepository';
import type { SocialRepository } from '../../friends/services/socialRepository';
import type { CanonicalHistoryItem } from '../../history/services/historyTypes';
import type { HistoryRepository, HistorySnapshot } from '../../history/services/historyRepository';

const CONTRACT = 'dish-session-v4/roadmap-v2/GM-07.B-supplement' as const;
const POLICY = 'dish-decision-v4/ADR-019-30PCT-MIN1' as const;
const NOW = Date.now();
const minutesAgo = (minutes: number) => new Date(NOW - minutes * 60_000).toISOString();
const daysAgo = (days: number, hour = 12) => {
  const value = new Date(NOW);
  value.setDate(value.getDate() - days);
  value.setHours(hour, 0, 0, 0);
  return value.toISOString();
};
const UUIDS = {
  self: '10000000-0000-4000-8000-000000000001',
  an: '10000000-0000-4000-8000-000000000002',
  linh: '10000000-0000-4000-8000-000000000003',
  nam: '10000000-0000-4000-8000-000000000004',
  room: '20000000-0000-4000-8000-000000000001',
  invitationRoom: '20000000-0000-4000-8000-000000000002',
  result1: '30000000-0000-4000-8000-000000000001',
  result2: '30000000-0000-4000-8000-000000000002',
  result3: '30000000-0000-4000-8000-000000000003',
  dish1: '40000000-0000-4000-8000-000000000001',
  dish2: '40000000-0000-4000-8000-000000000002',
  roundDish1: '50000000-0000-4000-8000-000000000001',
  roundDish2: '50000000-0000-4000-8000-000000000002',
} as const;

const friendInvite: InboxItem = {
  id: '60000000-0000-4000-8000-000000000001',
  eventId: '70000000-0000-4000-8000-000000000001',
  type: 'friend_invite',
  title: 'An Nguyễn muốn kết bạn',
  body: 'GCD-AN24',
  read: false,
  metadata: { invitationId: UUIDS.an },
  createdAt: minutesAgo(15),
};

const roomInvite: InboxItem = {
  id: '60000000-0000-4000-8000-000000000002',
  eventId: '70000000-0000-4000-8000-000000000002',
  type: 'room_invite',
  title: 'Linh mời bạn vào phòng',
  body: 'Ăn trưa · 12:30',
  read: false,
  metadata: { invitationId: '80000000-0000-4000-8000-000000000001', roomId: UUIDS.invitationRoom },
  createdAt: minutesAgo(2),
};

const resultReady: InboxItem = {
  id: '60000000-0000-4000-8000-000000000003',
  eventId: '70000000-0000-4000-8000-000000000003',
  type: 'room_result',
  title: 'Phòng của Nam đã có kết quả',
  body: 'Phở bò tái nam · 5 điểm',
  read: true,
  metadata: { roomId: UUIDS.room, resultId: UUIDS.result1, status: 'DECIDED', contractVersion: CONTRACT, eventVersion: 1 },
  createdAt: daysAgo(1, 9),
};

const noConsensus: InboxItem = {
  id: '60000000-0000-4000-8000-000000000004',
  eventId: '70000000-0000-4000-8000-000000000004',
  type: 'room_result',
  title: 'Cả nhóm chưa chốt được món',
  body: 'Phòng của Mai · Đã chọn xong 2 vòng',
  read: true,
  metadata: { roomId: UUIDS.room, resultId: UUIDS.result3, status: 'NO_CONSENSUS', contractVersion: CONTRACT, eventVersion: 1 },
  createdAt: daysAgo(1, 8),
};

export const gm28FigmaFriends: Friend[] = [
  { id: UUIDS.linh, friendUserId: UUIDS.linh, displayName: 'Linh', friendCode: 'LINH000001', status: 'active', since: '2026-10-01T08:00:00.000Z' },
  { id: UUIDS.nam, friendUserId: UUIDS.nam, displayName: 'Nam', friendCode: 'NAM0000001', status: 'active', since: '2026-10-02T09:00:00.000Z' },
];

export const gm28FigmaInbox: InboxItem[] = [roomInvite, friendInvite, resultReady, noConsensus];

function scoredResult(resultId: string, dishId: string, roundDishId: string, name: string, score: number, finalizedAt: string) {
  const dish = { dishId, roundDishId, name, description: null, artwork: null, priceReference: null };
  return {
    resultId,
    contractVersion: CONTRACT,
    policyVersion: POLICY,
    status: 'DECIDED' as const,
    round: 1 as const,
    winner: dish,
    reasonCode: 'UNANIMOUS_WANT' as const,
    finalizedAt,
    scoreVersion: 'want2-ok1-round1-v1' as const,
    rankingVersion: 'score-desc-dense-rank-v1' as const,
    round1BallotCount: 4,
    topDishes: [{ dish, score, rank: 1, isWinner: true }],
  };
}

export const gm28FigmaHistory: CanonicalHistoryItem[] = [
  {
    historyId: '90000000-0000-4000-8000-000000000001', roomId: UUIDS.room, resultId: UUIDS.result1,
    scope: 'group', createdAt: daysAgo(1, 12), expiresAt: new Date(NOW + 29 * 86_400_000).toISOString(),
    desiredAt: daysAgo(1, 12), finalizedAt: daysAgo(1, 12), memberCount: 4,
    participants: [{ displayName: 'Linh', role: 'MEMBER' }, { displayName: 'Nam', role: 'MEMBER' }],
    result: scoredResult(UUIDS.result1, UUIDS.dish1, UUIDS.roundDish1, 'Phở bò tái nam', 8, daysAgo(1, 12)),
  },
  {
    historyId: '90000000-0000-4000-8000-000000000002', roomId: UUIDS.invitationRoom, resultId: UUIDS.result2,
    scope: 'personal', createdAt: '2026-10-18T11:00:00.000Z', expiresAt: '2026-11-17T11:00:00.000Z',
    desiredAt: '2026-10-18T11:30:00.000Z', finalizedAt: '2026-10-18T11:45:00.000Z', memberCount: 2,
    participants: [{ displayName: 'Linh', role: 'MEMBER' }],
    result: scoredResult(UUIDS.result2, UUIDS.dish2, UUIDS.roundDish2, 'Cơm tấm', 7, '2026-10-18T11:45:00.000Z'),
  },
  {
    historyId: '90000000-0000-4000-8000-000000000003', roomId: UUIDS.room, resultId: UUIDS.result3,
    scope: 'group', createdAt: '2026-10-15T11:00:00.000Z', expiresAt: '2026-11-14T11:00:00.000Z',
    desiredAt: '2026-10-15T11:30:00.000Z', finalizedAt: '2026-10-15T12:31:00.000Z', memberCount: 3,
    participants: [{ displayName: 'Linh', role: 'MEMBER' }],
    result: {
      resultId: UUIDS.result3, contractVersion: CONTRACT, policyVersion: POLICY, status: 'NO_CONSENSUS', round: 2,
      winner: null, reasonCode: 'ALL_REMOVED', finalizedAt: '2026-10-15T12:31:00.000Z',
      scoreVersion: null, rankingVersion: null, round1BallotCount: 2, topDishes: [],
    },
  },
];

export function createGm28FigmaSocialRepository(): SocialRepository {
  const identity: SocialIdentity = { id: UUIDS.self, displayName: 'Minh', friendCode: 'GCD-MINH89', avatarSeed: UUIDS.self };
  return {
    getIdentity: async () => ({ ok: true, data: identity }),
    listFriends: async () => ({ ok: true, data: gm28FigmaFriends }),
    invite: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    accept: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    reject: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    removeFriend: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
  };
}

export function createGm28FigmaInboxRepository(): InboxRepository {
  const page: InboxPage = { items: gm28FigmaInbox, fetchedAt: '2026-11-08T08:41:00.000Z' };
  return {
    list: async () => ({ ok: true, data: page }),
    markAllRead: async requestId => ({ ok: false, requestId, error: { messageKey: 'NOT_READY' } }),
    markHandled() {},
    acceptFriend: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    rejectFriend: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    acceptRoom: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    rejectRoom: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    resolveAcceptedRoom: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    resolveRoomResult: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
  };
}

export function createGm28FigmaHistoryRepository(): HistoryRepository {
  const snapshot: HistorySnapshot = { items: gm28FigmaHistory, fetchedAt: '2026-11-08T08:41:00.000Z' };
  return {
    cached: () => undefined,
    cachedDurable: async () => undefined,
    fetch: async () => ({ ok: true, data: snapshot }),
    updateConsent: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    delete: async () => ({ ok: false, error: { messageKey: 'NOT_READY' } }),
    invalidate() {},
  };
}
