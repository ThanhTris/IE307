import {
  Friend,
  SocialIdentity,
  InvitePartnerRequest,
  FriendInvitation,
  InviteToRoomRequest,
  RoomInvitation,
  AcceptRoomInviteRequest,
  JoinRoomResponse,
  InboxItem,
  RegisterPushDeviceRequest,
  HistoryItem,
  UpdateHistoryConsentRequest,
  ReadResult,
  WriteResult,
} from '../contracts';
import {
  isSocialIdentity,
  arrayOf,
  isFriend,
  isFriendInvitation,
  isVoidPayload,
  isRoomInvitation,
  isJoinRoomResponse,
  isInboxItem,
  isHistoryItem,
} from '../responseGuards';
import type { RpcCallerContext } from './helpers';

export async function getMySocialIdentityMethod(ctx: RpcCallerContext): Promise<ReadResult<SocialIdentity>> {
  try {
    const raw = await ctx.callRpc<unknown>('get_my_social_identity', {});
    return ctx.normalizeReadResponse<SocialIdentity>(raw, isSocialIdentity);
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function listFriendsMethod(ctx: RpcCallerContext): Promise<ReadResult<Friend[]>> {
  try {
    const raw = await ctx.callRpc<unknown>('list_friends', {});
    return ctx.normalizeReadResponse<Friend[]>(raw, arrayOf(isFriend));
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function invitePartnerMethod(
  ctx: RpcCallerContext,
  req: InvitePartnerRequest
): Promise<WriteResult<FriendInvitation>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('invite_partner', {
      requestId,
      friend_code: req.friendCode ?? null,
      partner_id: req.partnerId ?? null,
    });
    const norm = ctx.normalizeWriteResponse<FriendInvitation>(raw, requestId, isFriendInvitation);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function acceptPartnerMethod(
  ctx: RpcCallerContext,
  invitationId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('accept_partner', {
      requestId,
      invitation_id: invitationId,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function rejectPartnerMethod(
  ctx: RpcCallerContext,
  invitationId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('reject_partner', {
      requestId,
      invitation_id: invitationId,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function unfriendMethod(
  ctx: RpcCallerContext,
  partnerId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('unfriend', {
      requestId,
      partner_id: partnerId,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function inviteToRoomMethod(
  ctx: RpcCallerContext,
  req: InviteToRoomRequest
): Promise<WriteResult<RoomInvitation>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('invite_to_room', {
      requestId,
      room_id: req.roomId,
      partner_id: req.partnerId,
      expected_version: req.expectedVersion,
    });
    const norm = ctx.normalizeWriteResponse<RoomInvitation>(raw, requestId, isRoomInvitation, req.roomId);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function acceptRoomInviteMethod(
  ctx: RpcCallerContext,
  req: AcceptRoomInviteRequest
): Promise<WriteResult<JoinRoomResponse>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('accept_room_invite', {
      requestId,
      invitation_id: req.invitationId,
      display_name: req.displayName,
    });
    const norm = ctx.normalizeWriteResponse<JoinRoomResponse>(raw, requestId, isJoinRoomResponse);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: norm.data.roomId,
      version: norm.version ?? norm.data.version,
      state: norm.state,
      data: norm.data,
    };
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function rejectRoomInviteMethod(
  ctx: RpcCallerContext,
  invitationId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('reject_room_invite', {
      requestId,
      invitation_id: invitationId,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return {
      ok: true,
      requestId: norm.requestId,
      roomId: norm.roomId,
      version: norm.version,
      state: norm.state,
      data: undefined,
    };
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function listPartnerInboxMethod(
  ctx: RpcCallerContext,
  cursor?: string
): Promise<ReadResult<InboxItem[]>> {
  try {
    const raw = await ctx.callRpc<unknown>('list_partner_inbox', {
      cursor: cursor ?? null,
    });
    return ctx.normalizeReadResponse<InboxItem[]>(raw, arrayOf(isInboxItem));
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function registerPushDeviceMethod(
  ctx: RpcCallerContext,
  req: RegisterPushDeviceRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('register_push_device', {
      requestId,
      device_id: req.deviceId,
      token: req.token,
      permission: req.permission,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function unregisterPushDeviceMethod(
  ctx: RpcCallerContext,
  deviceId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('unregister_push_device', {
      requestId,
      device_id: deviceId,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function getHistoryMethod(
  ctx: RpcCallerContext,
  scope: 'personal' | 'group',
  cursor?: string
): Promise<ReadResult<HistoryItem[]>> {
  try {
    const raw = await ctx.callRpc<unknown>('get_history', {
      scope,
      cursor: cursor ?? null,
    });
    return ctx.normalizeReadResponse<HistoryItem[]>(raw, arrayOf(isHistoryItem));
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function updateHistoryConsentMethod(
  ctx: RpcCallerContext,
  req: UpdateHistoryConsentRequest
): Promise<WriteResult<void>> {
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('update_history_consent', {
      requestId,
      scope: req.scope,
      consent: req.consent,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function deleteHistoryMethod(
  ctx: RpcCallerContext,
  historyId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('delete_history', {
      requestId,
      history_id: historyId,
    });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}
