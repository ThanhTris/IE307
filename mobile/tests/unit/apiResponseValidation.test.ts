import {
  ApiClient, ApiClientImpl, ApiTransport, WriteResult, createApiClient, MockApiClient,
  CreateRoomRequest, SubmitBallotRequest,
} from '../../src/data/api';

const timestamp = '2026-10-11T12:00:00Z';
const roomRequest: CreateRoomRequest = {
  displayName: 'Review', requestId: 'req_fixed',
  context: { anchorId: 'anchor_fixture', radiusM: 1000, desiredAt: timestamp,
    serviceMode: 'dine_in', mealSlot: 'lunch', avoidRecent: false },
};
const ballotRequest: SubmitBallotRequest = {
  roomId: 'room_fixture', round: 1, poolVersion: 1, intentId: 'intent_fixture',
  expectedVersion: 1, votes: [], requestId: 'req_fixed',
};
const room = { roomId: 'room_fixture', code: 'GCD1', version: 2, expiresAt: timestamp };
const join = { roomId: 'room_fixture', code: 'GCD1', version: 2, memberId: 'member_fixture' };
const session = { token: 'fixture_token', expiresAt: timestamp,
  user: { id: 'user_fixture', displayName: 'Review', isGuest: true, createdAt: timestamp } };
const ballot = { accepted: true, round: 1, allMembersSubmitted: false, roomVersion: 2 };
const invitation = { id: 'invite_fixture', inviterUserId: 'host_fixture', inviterName: 'Host',
  inviteeUserId: 'user_fixture', status: 'pending', createdAt: timestamp, expiresAt: timestamp };

type Call = (client: ApiClient) => Promise<WriteResult<unknown>>;
const writes: { name: string; call: Call; data: Record<string, unknown>; required: string; wrong: unknown }[] = [
  { name: 'createRoom', call: c => c.createRoom(roomRequest), data: room, required: 'roomId', wrong: 42 },
  { name: 'joinRoom', call: c => c.joinRoom({ code: 'GCD1', displayName: 'Review', requestId: 'req_fixed' }),
    data: join, required: 'memberId', wrong: 42 },
  { name: 'acceptRoomInvite', call: c => c.acceptRoomInvite({ invitationId: 'invite_fixture', displayName: 'Review', requestId: 'req_fixed' }),
    data: join, required: 'memberId', wrong: 42 },
  { name: 'createGuestSession', call: c => c.createGuestSession({ displayName: 'Review', requestId: 'req_fixed' }),
    data: session, required: 'user', wrong: [] },
  { name: 'submitBallot', call: c => c.submitBallot(ballotRequest), data: ballot, required: 'accepted', wrong: 'true' },
  { name: 'invitePartner', call: c => c.invitePartner({ friendCode: 'FIXTURE', requestId: 'req_fixed' }),
    data: invitation, required: 'status', wrong: 'invalid_status' },
  { name: 'inviteToRoom', call: c => c.inviteToRoom({ roomId: 'room_fixture', partnerId: 'user_fixture', expectedVersion: 1, requestId: 'req_fixed' }),
    data: { ...invitation, roomId: 'room_fixture', roomCode: 'GCD1' }, required: 'roomCode', wrong: 42 },
];

function clientFor(response: unknown): ApiClient {
  const transport: ApiTransport = { async invoke<T>() { return response as T; } };
  return createApiClient('real', { transport });
}

describe('GM-07 endpoint response validation', () => {
  describe.each(writes)('$name via public factory', ({ call, data, required, wrong }) => {
    it.each(['nested', 'flat'])('accepts a complete %s payload', async shape => {
      const response = shape === 'nested' ? { ok: true, data } : { ok: true, ...data };
      const result = await call(clientFor(response));
      expect(result.ok).toBe(true);
      expect(result.requestId).toBe('req_fixed');
      if (result.ok) expect(result.data).toMatchObject(data);
    });

    it.each([
      ['missing data', { ok: true }], ['empty data', { ok: true, data: {} }],
      ['null data', { ok: true, data: null }], ['array data', { ok: true, data: [] }],
      ['string data', { ok: true, data: 'invalid' }],
    ])('rejects %s', async (_label, response) => {
      expect(await call(clientFor(response))).toMatchObject({
        ok: false, requestId: 'req_fixed', error: { messageKey: 'MALFORMED_RESPONSE' },
      });
    });

    it('rejects missing required fields and wrong field types in flat and nested responses', async () => {
      const missing = { ...data };
      delete missing[required];
      for (const payload of [missing, { ...data, [required]: wrong }]) {
        for (const response of [{ ok: true, data: payload }, { ok: true, ...payload }]) {
          expect(await call(clientFor(response))).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
        }
      }
    });

    it('keeps business errors as errors', async () => {
      expect(await call(clientFor({ ok: false, requestId: 'req_fixed', error: { messageKey: 'VERSION_CONFLICT' } })))
        .toMatchObject({ ok: false, requestId: 'req_fixed', error: { messageKey: 'VERSION_CONFLICT' } });
    });
  });

  it.each([
    { ...room, roomId: 42 }, { ...room, code: 9 }, { ...room, version: 'bad' },
    { ...room, version: NaN }, { ...room, version: Infinity }, { ...room, version: 1.5 },
    { ...room, version: 0 }, { ...room, version: -1 },
    { ...room, expiresAt: undefined }, { ...room, expiresAt: 'tomorrow' },
    { ...room, expiresAt: '2026-02-30T12:00:00Z' },
  ])('rejects invalid createRoom fields: %j', async data => {
    expect(await clientFor({ ok: true, data }).createRoom(roomRequest))
      .toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  });

  it.each([
    { requestId: 42 }, { requestId: '' }, { roomId: 42 }, { roomId: 'different_room' },
    { version: 'bad' }, { version: NaN }, { version: Infinity }, { version: 1.5 },
    { version: 3 }, { state: 'UNKNOWN_STATE' }, { state: null },
  ])('rejects malformed or conflicting metadata: %j', async metadata => {
    expect(await clientFor({ ok: true, data: room, ...metadata }).createRoom(roomRequest))
      .toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  });

  it('preserves valid envelope metadata and unwraps data once', async () => {
    const result = await clientFor({ ok: true, requestId: 'req_server', roomId: room.roomId,
      version: room.version, state: 'LOBBY', data: room }).createRoom(roomRequest);
    expect(result).toEqual({ ok: true, requestId: 'req_server', roomId: room.roomId,
      version: room.version, state: 'LOBBY', data: room });
  });

  it('does not use valid flat fields to hide invalid explicit data', async () => {
    expect(await clientFor({ ok: true, ...room, data: null }).createRoom(roomRequest))
      .toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  });

  it.each([
    { ...ballot, round: 3 }, { ...ballot, allMembersSubmitted: 1 }, { ...ballot, roomVersion: '2' },
    { ...ballot, requestId: 7 }, { ...ballot, receipt: null }, { ...ballot, receipt: {} },
    { ...ballot, receipt: { round: 1, intentId: 'intent', requestId: 'req_fixed', submittedAt: timestamp, voteCount: -1 } },
    { ...ballot, receipt: { round: 2, intentId: 'intent', requestId: 'req_fixed', submittedAt: timestamp, voteCount: 1 } },
    { ...ballot, receipt: { round: 1, intentId: 'intent', requestId: 'different_request', submittedAt: timestamp, voteCount: 1 } },
    { ...ballot, receipt: { round: 1, intentId: 'intent', requestId: 'req_fixed', submittedAt: 'tomorrow', voteCount: 1 } },
    { ...ballot, receipt: { round: 1, intentId: 'intent', requestId: 'req_fixed', submittedAt: timestamp, voteCount: 1,
      votesSummary: [{ roundDishId: 'dish_fixture', vote: 'INVALID' }] } },
  ])('rejects invalid ballot payload or optional receipt: %j', async data => {
    expect(await clientFor({ ok: true, data }).submitBallot(ballotRequest))
      .toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
  });

  it('accepts a valid ballot receipt and preserves server version/state', async () => {
    const data = { ...ballot, requestId: 'req_fixed', receipt: {
      round: 1, intentId: 'intent_fixture', requestId: 'req_fixed', submittedAt: timestamp,
      voteCount: 1, votesSummary: [{ roundDishId: 'dish_fixture', vote: 'WANT' }],
    } };
    expect(await clientFor({ ok: true, requestId: 'req_fixed', version: 2, state: 'ROUND_1', data }).submitBallot(ballotRequest))
      .toMatchObject({ ok: true, requestId: 'req_fixed', version: 2, state: 'ROUND_1', data });
  });

  it('does not change the session token on malformed success', async () => {
    const transport: ApiTransport = { async invoke<T>() { return { ok: true, data: { token: 'invalid_new_token' } } as T; } };
    const client = new ApiClientImpl({ transport, initialToken: 'original_fixture_token' });
    expect(await client.createGuestSession({ displayName: 'Review' })).toMatchObject({ ok: false });
    expect(client.getAuthToken()).toBe('original_fixture_token');
  });

  const voidWrites: { name: string; call: Call }[] = [
    { name: 'logout', call: c => c.logout('req_fixed') },
    { name: 'updatePreferences', call: c => c.updatePreferences({ roomId: room.roomId, expectedVersion: 1, preferences: { cuisineIds: [], categoryIds: [], historyConsent: false }, requestId: 'req_fixed' }) },
    { name: 'updateContext', call: c => c.updateContext({ roomId: room.roomId, expectedVersion: 1, context: roomRequest.context, requestId: 'req_fixed' }) },
    { name: 'setReady', call: c => c.setReady({ roomId: room.roomId, expectedVersion: 1, ready: true, requestId: 'req_fixed' }) },
    { name: 'startRound', call: c => c.startRound({ roomId: room.roomId, expectedVersion: 1, requestId: 'req_fixed' }) },
    { name: 'leaveRoom', call: c => c.leaveRoom({ roomId: room.roomId, expectedVersion: 1, requestId: 'req_fixed' }) },
    { name: 'cancelRoom', call: c => c.cancelRoom({ roomId: room.roomId, expectedVersion: 1, confirmCancel: true, requestId: 'req_fixed' }) },
    { name: 'acceptPartner', call: c => c.acceptPartner('invite_fixture', 'req_fixed') },
    { name: 'rejectPartner', call: c => c.rejectPartner('invite_fixture', 'req_fixed') },
    { name: 'unfriend', call: c => c.unfriend('partner_fixture', 'req_fixed') },
    { name: 'registerPushDevice', call: c => c.registerPushDevice({ deviceId: 'device_fixture', token: 'push_fixture', permission: 'granted', requestId: 'req_fixed' }) },
    { name: 'unregisterPushDevice', call: c => c.unregisterPushDevice('device_fixture', 'req_fixed') },
    { name: 'updateHistoryConsent', call: c => c.updateHistoryConsent({ scope: 'personal', consent: true, requestId: 'req_fixed' }) },
    { name: 'deleteHistory', call: c => c.deleteHistory('history_fixture', 'req_fixed') },
  ];
  it.each(voidWrites)('accepts void ACK and rejects malformed metadata for $name', async ({ call }) => {
    for (const response of [{ ok: true }, { ok: true, data: null }, { ok: true, data: undefined }]) {
      expect(await call(clientFor(response))).toMatchObject({ ok: true, requestId: 'req_fixed', data: undefined });
    }
    const metadata = { roomId: room.roomId, version: 2, state: 'LOBBY' };
    expect(await call(clientFor({ ok: true, data: null, ...metadata })))
      .toMatchObject({ ok: true, requestId: 'req_fixed', data: undefined, ...metadata });
    for (const response of [{ ok: true, version: 'bad' }, { ok: true, state: 42 }, { ok: true, data: {} }]) {
      expect(await call(clientFor(response))).toMatchObject({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
    }
  });
});

describe('GM-07 join regression', () => {
  it.each(['joinRoom', 'acceptRoomInvite'] as const)('%s joins once and replays ACK without mutation', async method => {
    const mock = new MockApiClient({ delayMs: 0 });
    mock.setCurrentUser({ id: 'new_member_fixture', displayName: 'Review', isGuest: true, createdAt: timestamp });
    const joinCall = (displayName: string) => method === 'joinRoom'
      ? mock.joinRoom({ code: 'GCD1', displayName, requestId: 'req_join_fixed' })
      : mock.acceptRoomInvite({ invitationId: 'invite_fixture', displayName, requestId: 'req_join_fixed' });
    const first = await joinCall('Review');
    expect(first).toMatchObject({ ok: true, requestId: 'req_join_fixed', roomId: 'room_mock_001', version: 2,
      data: { roomId: 'room_mock_001', code: 'GCD1', version: 2, memberId: 'new_member_fixture' } });
    expect(await joinCall('Review')).toEqual(first);
    expect(await joinCall('Changed')).toMatchObject({ ok: false, error: { messageKey: 'REQUEST_ID_REUSED' } });
    const snapshot = await mock.getRoomSnapshot('room_mock_001');
    expect(snapshot.ok).toBe(true);
    if (snapshot.ok) {
      expect(snapshot.data.version).toBe(2);
      expect(snapshot.data.members.filter(member => member.userId === 'new_member_fixture')).toHaveLength(1);
      expect(snapshot.data.members).toHaveLength(3);
    }
  });

  it('uses the public factory with configured URL and retries the same body after timeout', async () => {
    const calls: { url: string; body: string | undefined }[] = [];
    const fetchFn: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), body: typeof init?.body === 'string' ? init.body : undefined });
      if (calls.length === 1) throw { name: 'AbortError', message: 'TIMEOUT' };
      return new Response(JSON.stringify({ ok: true, requestId: 'req_fixed', version: 2, state: 'ROUND_1', data: ballot }));
    };
    const client = createApiClient('real', { baseUrl: 'https://configured.example', defaultTimeoutMs: 15000,
      initialToken: 'fixture_token', fetchFn });
    expect(await client.submitBallot(ballotRequest)).toMatchObject({ ok: false, requestId: 'req_fixed', error: { messageKey: 'TIMEOUT' } });
    expect(await client.submitBallot(ballotRequest)).toMatchObject({ ok: true, requestId: 'req_fixed', version: 2, state: 'ROUND_1', data: ballot });
    expect(calls).toHaveLength(2);
    expect(calls[0]).toEqual(calls[1]);
    expect(calls[1]?.url).toBe('https://configured.example/rest/v1/rpc/submit_ballot');
    expect(JSON.parse(calls[1]?.body ?? '{}')).toMatchObject({ requestId: 'req_fixed', intent_id: 'intent_fixture', expected_version: 1 });
  });
});
