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
  HistoryConsent,
  UpdateHistoryConsentRequest,
  ReadResult,
  WriteResult,
} from '../contracts';
import { MOCK_DEFAULT_ROOM_CODE } from './socialFixtures';
import { MockStateContext } from './mockStore';
import { mockJoinRoom } from './roomAndVotingMock';

export async function mockGetMySocialIdentity(ctx: MockStateContext): Promise<ReadResult<SocialIdentity>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };
  return {
    ok: true,
    data: {
      id: ctx.currentUser.id,
      displayName: ctx.currentUser.displayName,
      friendCode: 'MOCKFRIEND2',
      avatarSeed: ctx.currentUser.avatarSeed ?? ctx.currentUser.id,
    },
  };
}

export async function mockListFriends(ctx: MockStateContext): Promise<ReadResult<Friend[]>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  if (ctx.mode === 'empty') return { ok: true, data: [] };
  return { ok: true, data: [...ctx.friends] };
}

export async function mockInvitePartner(
  ctx: MockStateContext,
  req: InvitePartnerRequest
): Promise<WriteResult<FriendInvitation>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<FriendInvitation>(
    'invitePartner',
    requestId,
    { friendCode: req.friendCode, partnerId: req.partnerId }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const invitation: FriendInvitation = {
    id: 'inv_' + Math.random().toString(36).substring(2, 8),
    inviterUserId: ctx.currentUser.id,
    inviterName: ctx.currentUser.displayName,
    inviteeUserId: req.partnerId || 'usr_invited',
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 604800000).toISOString(),
  };
  const response: WriteResult<FriendInvitation> = { ok: true, requestId, data: invitation };
  ctx.recordIdempotency('invitePartner', requestId, signature, response);
  return response;
}

export async function mockAcceptPartner(
  ctx: MockStateContext,
  invitationId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'acceptPartner',
    requestId,
    { invitationId }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('acceptPartner', requestId, signature, response);
  return response;
}

export async function mockRejectPartner(
  ctx: MockStateContext,
  invitationId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'rejectPartner',
    requestId,
    { invitationId }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('rejectPartner', requestId, signature, response);
  return response;
}

export async function mockUnfriend(
  ctx: MockStateContext,
  partnerId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'unfriend',
    requestId,
    { partnerId }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  ctx.friends = ctx.friends.filter((f) => f.friendUserId !== partnerId);
  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('unfriend', requestId, signature, response);
  return response;
}

export async function mockInviteToRoom(
  ctx: MockStateContext,
  req: InviteToRoomRequest
): Promise<WriteResult<RoomInvitation>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<RoomInvitation>(
    'inviteToRoom',
    requestId,
    { roomId: req.roomId, partnerId: req.partnerId, expectedVersion: req.expectedVersion }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const room = ctx.rooms.get(req.roomId);
  const invitation: RoomInvitation = {
    id: 'rinv_' + Math.random().toString(36).substring(2, 8),
    roomId: req.roomId,
    roomCode: room?.code ?? MOCK_DEFAULT_ROOM_CODE,
    inviterUserId: ctx.currentUser.id,
    inviterName: ctx.currentUser.displayName,
    inviteeUserId: req.partnerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1800000).toISOString(),
  };
  const response: WriteResult<RoomInvitation> = { ok: true, requestId, data: invitation };
  ctx.recordIdempotency('inviteToRoom', requestId, signature, response);
  return response;
}

export async function mockAcceptRoomInvite(
  ctx: MockStateContext,
  req: AcceptRoomInviteRequest
): Promise<WriteResult<JoinRoomResponse>> {
  return mockJoinRoom(ctx, { code: MOCK_DEFAULT_ROOM_CODE, displayName: req.displayName, requestId: req.requestId });
}

export async function mockRejectRoomInvite(
  ctx: MockStateContext,
  invitationId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };
  const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>('rejectRoomInvite', requestId, { invitationId });
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;
  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('rejectRoomInvite', requestId, signature, response);
  return response;
}

export async function mockListPartnerInbox(
  ctx: MockStateContext,
  _cursor?: string
): Promise<ReadResult<InboxItem[]>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  if (ctx.mode === 'empty') return { ok: true, data: [] };
  return { ok: true, data: [...ctx.inbox] };
}

export async function mockRegisterPushDevice(
  ctx: MockStateContext,
  req: RegisterPushDeviceRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'registerPushDevice',
    requestId,
    { deviceId: req.deviceId, token: req.token, permission: req.permission }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('registerPushDevice', requestId, signature, response);
  return response;
}

export async function mockUnregisterPushDevice(
  ctx: MockStateContext,
  deviceId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'unregisterPushDevice',
    requestId,
    { deviceId }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('unregisterPushDevice', requestId, signature, response);
  return response;
}

export async function mockGetHistory(
  ctx: MockStateContext,
  scope: 'personal' | 'group',
  _cursor?: string
): Promise<ReadResult<HistoryItem[]>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  if (ctx.mode === 'empty') return { ok: true, data: [] };
  return { ok: true, data: ctx.history.filter((h) => h.scope === scope) };
}

export async function mockGetHistoryConsent(ctx: MockStateContext): Promise<ReadResult<HistoryConsent>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };
  return {
    ok: true,
    data: { ...(ctx.historyConsents.get(ctx.currentUser.id) ?? { personal: false, group: false }) },
  };
}

export async function mockUpdateHistoryConsent(
  ctx: MockStateContext,
  req: UpdateHistoryConsentRequest
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = req.requestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'updateHistoryConsent',
    requestId,
    { scope: req.scope, consent: req.consent }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  const current = ctx.historyConsents.get(ctx.currentUser.id) ?? { personal: false, group: false };
  ctx.historyConsents.set(ctx.currentUser.id, { ...current, [req.scope]: req.consent });
  ctx.recordIdempotency('updateHistoryConsent', requestId, signature, response);
  return response;
}

export async function mockDeleteHistory(
  ctx: MockStateContext,
  historyId: string,
  customRequestId?: string
): Promise<WriteResult<void>> {
  await ctx.wait();
  const fail = ctx.checkFailure();
  if (fail) return { ok: false, error: { messageKey: fail } };

  const requestId = customRequestId ?? ('req_' + Math.random().toString(36).substring(2, 9));
  const { cachedResponse, conflictError, signature } = ctx.checkIdempotency<void>(
    'deleteHistory',
    requestId,
    { historyId }
  );
  if (cachedResponse) return cachedResponse;
  if (conflictError) return conflictError;

  ctx.history = ctx.history.filter((h) => h.id !== historyId);
  const response: WriteResult<void> = { ok: true, requestId, data: undefined };
  ctx.recordIdempotency('deleteHistory', requestId, signature, response);
  return response;
}
