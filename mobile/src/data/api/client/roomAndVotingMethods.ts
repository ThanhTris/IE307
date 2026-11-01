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
  ReadResult,
  WriteResult,
} from '../contracts';
import {
  isCreateRoomResponse,
  isJoinRoomResponse,
  isRoomSnapshot,
  isVoidPayload,
  isSubmitBallotResponse,
  arrayOf,
  isPoolDish,
} from '../responseGuards';
import type { RpcCallerContext } from './helpers';

export async function createRoomMethod(
  ctx: RpcCallerContext,
  req: CreateRoomRequest
): Promise<WriteResult<CreateRoomResponse>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('create_room', {
      requestId,
      display_name: req.displayName,
      anchor_id: req.context.anchorId,
      radius_m: req.context.radiusM,
      desired_at: req.context.desiredAt,
      service_mode: req.context.serviceMode,
      meal_slot: req.context.mealSlot,
      time_hint: req.context.timeHint ?? null,
      budget: req.context.budget ?? null,
      avoid_recent: req.context.avoidRecent,
    });
    const norm = ctx.normalizeWriteResponse<CreateRoomResponse>(raw, requestId, isCreateRoomResponse);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: norm.data?.roomId ?? norm.roomId,
      version: norm.version ?? norm.data?.version,
      state: norm.state,
      data: norm.data,
    };
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function joinRoomMethod(
  ctx: RpcCallerContext,
  req: JoinRoomRequest
): Promise<WriteResult<JoinRoomResponse>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('join_room', {
      requestId,
      code: req.code,
      display_name: req.displayName,
    });
    const norm = ctx.normalizeWriteResponse<JoinRoomResponse>(raw, requestId, isJoinRoomResponse);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: norm.data?.roomId ?? norm.roomId,
      version: norm.version ?? norm.data?.version,
      state: norm.state,
      data: norm.data,
    };
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function getRoomSnapshotMethod(
  ctx: RpcCallerContext,
  roomId: string
): Promise<ReadResult<RoomSnapshot>> {
  try {
    const raw = await ctx.callRpc<unknown>('get_room_snapshot', {
      room_id: roomId,
    });
    return ctx.normalizeReadResponse<RoomSnapshot>(raw, isRoomSnapshot);
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function updatePreferencesMethod(
  ctx: RpcCallerContext,
  req: UpdatePreferencesRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('update_preferences', {
      requestId,
      room_id: req.roomId,
      expected_version: req.expectedVersion,
      cuisine_ids: req.preferences.cuisineIds,
      category_ids: req.preferences.categoryIds,
      temperature: req.preferences.temperature ?? null,
      flavor: req.preferences.flavor ?? null,
      history_consent: req.preferences.historyConsent,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function updateContextMethod(
  ctx: RpcCallerContext,
  req: UpdateContextRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('update_context', {
      requestId,
      room_id: req.roomId,
      expected_version: req.expectedVersion,
      anchor_id: req.context.anchorId,
      radius_m: req.context.radiusM,
      desired_at: req.context.desiredAt,
      service_mode: req.context.serviceMode,
      meal_slot: req.context.mealSlot,
      time_hint: req.context.timeHint ?? null,
      budget: req.context.budget ?? null,
      avoid_recent: req.context.avoidRecent,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function setReadyMethod(
  ctx: RpcCallerContext,
  req: SetReadyRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('set_ready', {
      requestId,
      room_id: req.roomId,
      expected_version: req.expectedVersion,
      ready: req.ready,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function startRoundMethod(
  ctx: RpcCallerContext,
  req: StartRoundRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('start_round', {
      requestId,
      room_id: req.roomId,
      expected_version: req.expectedVersion,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function leaveRoomMethod(
  ctx: RpcCallerContext,
  req: LeaveRoomRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('leave_room', {
      requestId,
      room_id: req.roomId,
      expected_version: req.expectedVersion,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function cancelRoomMethod(
  ctx: RpcCallerContext,
  req: CancelRoomRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('cancel_room', {
      requestId,
      room_id: req.roomId,
      expected_version: req.expectedVersion,
      confirm_cancel: req.confirmCancel,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function submitBallotMethod(
  ctx: RpcCallerContext,
  req: SubmitBallotRequest
): Promise<WriteResult<SubmitBallotResponse>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('submit_ballot', {
      requestId,
      room_id: req.roomId,
      round: req.round,
      pool_version: req.poolVersion,
      intent_id: req.intentId,
      expected_version: req.expectedVersion,
      votes: req.votes,
    });
    const norm = ctx.normalizeWriteResponse<SubmitBallotResponse>(raw, requestId, isSubmitBallotResponse, req.roomId);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: req.roomId,
      version: norm.version ?? norm.data?.roomVersion,
      state: norm.state,
      data: norm.data,
    };
  } catch (err) {
    return { ok: false, requestId, roomId: req.roomId, error: ctx.mapError(err) };
  }
}

export async function getResultOfferingsMethod(
  ctx: RpcCallerContext,
  roomId: string,
  resultId: string
): Promise<ReadResult<PoolDish[]>> {
  try {
    const raw = await ctx.callRpc<unknown>('get_result_offerings', {
      room_id: roomId,
      result_id: resultId,
    });
    return ctx.normalizeReadResponse<PoolDish[]>(raw, arrayOf(isPoolDish));
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}
