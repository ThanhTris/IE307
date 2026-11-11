import {
  ErrorCode,
  SessionUser,
  RoomSnapshot,
  Friend,
  InboxItem,
  HistoryItem,
  HistoryConsent,
  WriteResult,
} from '../../../../src/data/api/contracts';
import { MOCK_DISHES } from './discoveryFixtures';
import { MOCK_DEFAULT_ROOM_CODE } from './socialFixtures';

export type MockMode = 'default' | 'loading' | 'empty' | 'error' | 'expired' | 'stale';
export type MockConsensusScenario = 'unanimous' | 'no_consensus' | 'round_two';

export interface MockConfig {
  mode?: MockMode;
  scenario?: MockConsensusScenario;
  delayMs?: number;
  simulatedErrorCode?: ErrorCode;
  currentUser?: SessionUser;
}

export type OwnRoomData = Pick<RoomSnapshot, 'ownPreferences' | 'ownVotes' | 'ownSubmission'>;
export type SharedRoomData = Omit<RoomSnapshot, keyof OwnRoomData>;

export function cloneDto<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface MockStateContext {
  mode: MockMode;
  scenario: MockConsensusScenario;
  delayMs: number;
  simulatedErrorCode: ErrorCode;
  currentUser: SessionUser;
  rooms: Map<string, SharedRoomData>;
  ownRoomData: Map<string, Map<string, OwnRoomData>>;
  friends: Friend[];
  inbox: InboxItem[];
  history: HistoryItem[];
  historyConsents: Map<string, HistoryConsent>;
  idempotencyMap: Map<string, { payloadSignature: string; response: WriteResult<any> }>;
  wait(): Promise<void>;
  checkFailure(): ErrorCode | null;
  getOwnRoomData(roomId: string): OwnRoomData;
  checkIdempotency<T>(
    operation: string,
    requestId: string,
    payload: unknown
  ): { cachedResponse?: WriteResult<T>; conflictError?: WriteResult<T>; signature: string };
  recordIdempotency<T>(
    operation: string,
    requestId: string,
    signature: string,
    response: WriteResult<T>
  ): void;
}

export function buildDefaultRoom(currentUser: SessionUser): SharedRoomData {
  return {
    roomId: 'room_mock_001',
    code: MOCK_DEFAULT_ROOM_CODE,
    state: 'LOBBY',
    version: 1,
    hostUserId: currentUser.id,
    context: {
      anchorId: 'anc_ho_con_rua',
      anchorName: 'Hồ Con Rùa',
      radiusM: 1500,
      desiredAt: '2026-10-11T12:00:00Z',
      serviceMode: 'dine_in',
      mealSlot: 'lunch',
      budget: 70000,
      avoidRecent: true,
    },
    members: [
      {
        userId: currentUser.id,
        displayName: currentUser.displayName,
        isHost: true,
        ready: false,
        joinedAt: '2026-10-11T11:00:00Z',
      },
      {
        userId: 'usr_tuan_002',
        displayName: 'Tuấn',
        isHost: false,
        ready: true,
        joinedAt: '2026-10-11T11:05:00Z',
      },
    ],
    round: 1,
    poolVersion: 1,
    pool: [...MOCK_DISHES],
    datasetVersion: '2026-10-11-core-01',
    eligibilityVersion: '1.0.0',
    evaluatedAt: '2026-10-11T12:00:00Z',
    expiresAt: '2026-10-11T13:00:00Z',
  };
}
