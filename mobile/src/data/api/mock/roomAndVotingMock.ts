import {
  CreateRoomRequest,
  CreateRoomResponse,
  JoinRoomRequest,
  JoinRoomResponse,
  RoomSnapshot,
  UpdatePreferencesRequest,
  UpdateContextRequest,
  SetReadyRequest,
  StartRoundRequest,
  LeaveRoomRequest,
  CancelRoomRequest,
  SubmitBallotRequest,
  SubmitBallotResponse,
  PoolDish,
  RoomResult,
  SubmissionReceipt,
  ReadResult,
  WriteResult,
} from '../contracts';
import { MOCK_ANCHORS, MOCK_DISHES } from './discoveryFixtures';
import { generateMockRoomCode } from './socialFixtures';
import { MockStateContext, SharedRoomData, cloneDto } from './mockStore';

export async function mockCreateRoom(
  ctx: MockStateContext,
  req: CreateRoomRequest
): Promise<WriteResult<CreateRoomResponse>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<CreateRoomResponse>(
    'createRoom',
    requestId,
    { displayName: req.displayName, context: req.context }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const roomId = 'room_' + Math.random().toString(36).substring(2, 9);
  const code = generateMockRoomCode();

  const anchor = MOCK_ANCHORS.find((a) => a.id === req.context.anchorId);
  const snapshot: SharedRoomData = {
    roomId,
    code,
    state: 'LOBBY',
    version: 1,
    hostUserId: ctx.currentUser.id,
    context: {
      ...req.context,
      anchorName: anchor?.name ?? 'Địa điểm đã chọn',
    },
    members: [
      {
        userId: ctx.currentUser.id,
        displayName: req.displayName || ctx.currentUser.displayName,
        isHost: true,
        ready: false,
        joinedAt: new Date().toISOString(),
      },
    ],
    round: 1,
    poolVersion: 1,
    pool: [...MOCK_DISHES],
    datasetVersion: '2026-10-11-core-01',
    eligibilityVersion: '1.0.0',
    evaluatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7200000).toISOString(),
  };

  ctx.rooms.set(roomId, snapshot);
  ctx.rooms.set(code, snapshot);

  const response: WriteResult<CreateRoomResponse> = {
    ok: true,
    requestId,
    roomId,
    version: snapshot.version,
    state: snapshot.state,
    data: {
      roomId,
      code,
      version: snapshot.version,
      expiresAt: snapshot.expiresAt,
    },
  };
  ctx.recordIdempotency('createRoom', requestId, signature, response);
  return response;
}

export async function mockJoinRoom(
  ctx: MockStateContext,
  req: JoinRoomRequest
): Promise<WriteResult<JoinRoomResponse>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<JoinRoomResponse>(
    'joinRoom',
    requestId,
    { code: req.code, displayName: req.displayName }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.code.trim().toUpperCase());
  if (!room) {
    return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND', message: 'Không tìm thấy phòng với mã này' } };
  }
  if (room.state !== 'LOBBY') {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'ROOM_LOCKED', message: 'Phòng đã bắt đầu hoặc kết thúc' } };
  }
  if (room.members.length >= 8) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'ROOM_FULL', message: 'Phòng đã đủ số lượng thành viên' } };
  }

  const existing = room.members.find((m) => m.userId === ctx.currentUser.id);
  if (!existing) {
    room.members.push({
      userId: ctx.currentUser.id,
      displayName: req.displayName || ctx.currentUser.displayName,
      isHost: false,
      ready: false,
      joinedAt: new Date().toISOString(),
    });
    room.version += 1;
  }

  const response: WriteResult<JoinRoomResponse> = {
    ok: true,
    requestId,
    roomId: room.roomId,
    version: room.version,
    data: {
      roomId: room.roomId,
      code: room.code,
      version: room.version,
      memberId: ctx.currentUser.id,
    },
  };
  ctx.recordIdempotency('joinRoom', requestId, signature, response);
  return response;
}

export async function mockGetRoomSnapshot(
  ctx: MockStateContext,
  roomId: string
): Promise<ReadResult<RoomSnapshot>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const room = ctx.rooms.get(roomId);
  if (!room) {
    return { ok: false, error: { messageKey: 'ROOM_NOT_FOUND' } };
  }

  const own = ctx.getOwnRoomData(room.roomId);
  return { ok: true, data: cloneDto({ ...room, ...own, ownSubmission: own.ownSubmission ?? null }) };
}

export async function mockUpdatePreferences(
  ctx: MockStateContext,
  req: UpdatePreferencesRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'updatePreferences',
    requestId,
    { roomId: req.roomId, expectedVersion: req.expectedVersion, preferences: req.preferences }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
  if (room.version !== req.expectedVersion) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
  }

  ctx.getOwnRoomData(room.roomId).ownPreferences = cloneDto(req.preferences);
  const member = room.members.find((m) => m.userId === ctx.currentUser.id);
  if (member) member.ready = false;
  room.version += 1;

  const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, data: undefined };
  ctx.recordIdempotency('updatePreferences', requestId, signature, response);
  return response;
}

export async function mockUpdateContext(
  ctx: MockStateContext,
  req: UpdateContextRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'updateContext',
    requestId,
    { roomId: req.roomId, expectedVersion: req.expectedVersion, context: req.context }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
  if (room.version !== req.expectedVersion) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
  }

  room.context = { ...req.context };
  room.members.forEach((m) => (m.ready = false));
  room.version += 1;

  const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, data: undefined };
  ctx.recordIdempotency('updateContext', requestId, signature, response);
  return response;
}

export async function mockSetReady(
  ctx: MockStateContext,
  req: SetReadyRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'setReady',
    requestId,
    { roomId: req.roomId, expectedVersion: req.expectedVersion, ready: req.ready }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
  if (room.version !== req.expectedVersion) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
  }

  const member = room.members.find((m) => m.userId === ctx.currentUser.id);
  if (member) {
    member.ready = req.ready;
    room.version += 1;
  }

  const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, state: room.state, data: undefined };
  ctx.recordIdempotency('setReady', requestId, signature, response);
  return response;
}

export async function mockStartRound(
  ctx: MockStateContext,
  req: StartRoundRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'startRound',
    requestId,
    { roomId: req.roomId, expectedVersion: req.expectedVersion }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };
  if (room.version !== req.expectedVersion) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
  }

  room.state = 'ROUND_1';
  room.round = 1;
  room.version += 1;
  room.members.forEach((m) => (m.hasSubmitted = false));

  const response: WriteResult<void> = { ok: true, requestId, roomId: room.roomId, version: room.version, state: room.state, data: undefined };
  ctx.recordIdempotency('startRound', requestId, signature, response);
  return response;
}

export async function mockLeaveRoom(
  ctx: MockStateContext,
  req: LeaveRoomRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'leaveRoom',
    requestId,
    { roomId: req.roomId, expectedVersion: req.expectedVersion }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (room) {
    room.members = room.members.filter((m) => m.userId !== ctx.currentUser.id);
    room.version += 1;
  }

  const response: WriteResult<void> = { ok: true, requestId, roomId: req.roomId, data: undefined };
  ctx.recordIdempotency('leaveRoom', requestId, signature, response);
  return response;
}

export async function mockCancelRoom(
  ctx: MockStateContext,
  req: CancelRoomRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'cancelRoom',
    requestId,
    { roomId: req.roomId, expectedVersion: req.expectedVersion, confirmCancel: req.confirmCancel }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (room && req.confirmCancel) {
    room.state = 'CANCELLED';
    room.version += 1;
  }

  const response: WriteResult<void> = { ok: true, requestId, roomId: req.roomId, data: undefined };
  ctx.recordIdempotency('cancelRoom', requestId, signature, response);
  return response;
}

export async function mockSubmitBallot(
  ctx: MockStateContext,
  req: SubmitBallotRequest
): Promise<WriteResult<SubmitBallotResponse>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId || ('req_' + req.intentId);

  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<SubmitBallotResponse>(
    'submitBallot',
    requestId,
    {
      roomId: req.roomId,
      round: req.round,
      poolVersion: req.poolVersion,
      intentId: req.intentId,
      expectedVersion: req.expectedVersion,
      votes: req.votes,
    }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  if (!room) return { ok: false, requestId, error: { messageKey: 'ROOM_NOT_FOUND' } };

  if (room.state !== 'ROUND_1' && room.state !== 'ROUND_2' && room.state !== 'VOTING') {
    return {
      ok: false,
      requestId,
      roomId: room.roomId,
      error: {
        messageKey: 'INVALID_ROOM_STATE',
        message: 'Chỉ có thể nộp phiếu khi phòng ở trạng thái bình chọn (ROUND_1 / ROUND_2 / VOTING)',
      },
    };
  }

  if (room.version !== req.expectedVersion) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'VERSION_CONFLICT' } };
  }
  if (req.votes.length !== room.pool.length) {
    return { ok: false, requestId, roomId: room.roomId, error: { messageKey: 'INCOMPLETE_BALLOT', message: 'Chưa bình chọn đủ tất cả các món' } };
  }

  const voteMap: Record<string, typeof req.votes[0]['vote']> = {};
  req.votes.forEach((v) => (voteMap[v.roundDishId] = v.vote));
  ctx.getOwnRoomData(room.roomId).ownVotes = voteMap;

  room.members.forEach((m) => (m.hasSubmitted = true));
  const allSubmitted = true;

  if (allSubmitted) {
    // Consensus rule: NO KHÔNG THỂ THÀNH WINNER!
    const candidateMap = new Map<string, { wantCount: number; okCount: number; hasNo: boolean; dish: PoolDish }>();
    for (const d of room.pool) {
      candidateMap.set(d.roundDishId, { wantCount: 0, okCount: 0, hasNo: false, dish: d });
    }

    for (const v of req.votes) {
      const item = candidateMap.get(v.roundDishId);
      if (item) {
        if (v.vote === 'NO' || v.vote === 'REMOVE') item.hasNo = true;
        else if (v.vote === 'WANT') item.wantCount += 1;
        else if (v.vote === 'OK' || v.vote === 'KEEP') item.okCount += 1;
      }
    }

    if (ctx.scenario === 'no_consensus') {
      for (const item of candidateMap.values()) {
        item.hasNo = true;
      }
    } else if (ctx.scenario === 'round_two' && req.round === 1) {
      for (const item of candidateMap.values()) {
        item.hasNo = true;
      }
    } else {
      const nonNoCandidates = Array.from(candidateMap.values()).filter((c) => !c.hasNo);
      if (nonNoCandidates.length > 0 && nonNoCandidates[0]) {
        nonNoCandidates[0].wantCount = room.members.length;
      }
    }

    const viable = Array.from(candidateMap.values())
      .filter((c) => !c.hasNo)
      .sort((a, b) => (b.wantCount * 2 + b.okCount) - (a.wantCount * 2 + a.okCount));

    if (viable.length === 0) {
      if (req.round === 1 && ctx.scenario === 'round_two') {
        room.round = 2;
        room.state = 'ROUND_2';
        room.pool = room.pool.slice(0, Math.max(2, Math.floor(room.pool.length / 2)));
        room.members.forEach((m) => (m.hasSubmitted = false));
      } else {
        room.state = 'NO_CONSENSUS';
        room.result = {
          resultId: 'res_' + Math.random().toString(36).substring(2, 9),
          roomId: room.roomId,
          round: req.round,
          winnerRoundDishId: null,
          winnerDish: null,
          reasonCode: req.round === 1 ? 'EMPTY_INTERSECTION' : 'ALL_REMOVED',
          matchTier: 'NO_CONSENSUS',
          finalizedAt: new Date().toISOString(),
          policyVersion: 'decision-v2',
        };
      }
    } else {
      const top = viable[0]!;
      const isUnanimous = top.wantCount === room.members.length;
      const winner = top.dish;
      const result: RoomResult = {
        resultId: 'res_' + Math.random().toString(36).substring(2, 9),
        roomId: room.roomId,
        round: req.round,
        winnerRoundDishId: winner.roundDishId,
        winnerDish: winner,
        reasonCode: isUnanimous ? 'UNANIMOUS_WANT' : 'ACCEPTABLE_FINAL',
        matchTier: isUnanimous ? 'PERFECT'
          : top.wantCount > room.members.length / 2 ? 'CONSENSUS' : 'COMPROMISE',
        finalizedAt: new Date().toISOString(),
        policyVersion: 'decision-v2',
      };
      room.result = result;
      room.state = 'DECIDED';
    }
  }

  room.version += 1;

  const receipt: SubmissionReceipt = {
    round: req.round,
    intentId: req.intentId,
    requestId,
    submittedAt: new Date().toISOString(),
    voteCount: req.votes.length,
    votesSummary: req.votes.map((v) => ({ roundDishId: v.roundDishId, vote: v.vote })),
  };
  ctx.getOwnRoomData(room.roomId).ownSubmission = cloneDto(receipt);

  const response: WriteResult<SubmitBallotResponse> = {
    ok: true,
    requestId,
    roomId: room.roomId,
    version: room.version,
    state: room.state,
    data: {
      accepted: true,
      round: req.round,
      allMembersSubmitted: allSubmitted,
      roomVersion: room.version,
      requestId,
      receipt,
    },
  };

  ctx.recordIdempotency('submitBallot', requestId, signature, response);
  return response;
}

export async function mockGetResultOfferings(
  ctx: MockStateContext,
  roomId: string,
  _resultId: string
): Promise<ReadResult<PoolDish[]>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  if (ctx.mode === 'empty') return { ok: true, data: [] };

  const room = ctx.rooms.get(roomId);
  if (!room || !room.result) {
    return { ok: false, error: { messageKey: 'ROOM_NOT_FOUND' } };
  }
  return { ok: true, data: room.result.winnerDish ? [room.result.winnerDish] : [] };
}
