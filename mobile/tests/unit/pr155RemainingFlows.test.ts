import { ApiClientImpl, type ApiTransport } from '../../src/data/api/client';
import { createRoomRepository } from '../../src/features/rooms/services/roomRepository';
import { createLiveDishSetupGateway } from '../../src/bootstrap/liveDishSetupGateway';
import { emptyPreferences, type SetupDraft } from '../../src/features/context/services/dishSetup';

// Canonical snapshot fixture matching dish-session-v4/roadmap-v2/GM-07.B-supplement
const canonicalFixture = {
  contractVersion: 'dish-session-v4/roadmap-v2/GM-07.B-supplement',
  policyVersion: 'dish-decision-v4/ADR-019-30PCT-MIN1',
  catalogueVersion: 'review-synthetic-v1',
  catalogueSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  roomId: '5d35a05a-8678-5380-beb1-fe2cdc587151',
  code: 'GCD234',
  state: 'LOBBY',
  version: 1,
  round: 1,
  poolVersion: 1,
  dishCount: 20,
  pool: Array.from({ length: 20 }, (_, i) => ({
    roundDishId: `10000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    dishId: `20000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    name: `Synthetic dish ${i}`,
    description: null,
    mealSlots: ['lunch'],
    cuisineIds: [],
    cuisineLabels: [],
    categoryIds: [],
    categoryLabels: [],
    temperature: null,
    flavor: null,
    artwork: null,
    priceReference: null,
  })),
  members: [
    {
      userId: 'cff99380-b3c8-5dd8-9e91-5eeda3aee1d3',
      displayName: 'Review Host',
      role: 'HOST',
      submissionStatus: 'NOT_SUBMITTED',
    },
  ],
  submittedCount: 0,
  memberCount: 1,
  ownBallot: null,
  ownWaiting: false,
  waitingStartedAt: null,
  deadline: null,
  serverTime: '2026-11-05T06:00:00Z',
  result: null,
  hostUserId: 'cff99380-b3c8-5dd8-9e91-5eeda3aee1d3',
  settings: {
    dishCount: 20,
    mealSlot: 'lunch',
    desiredAt: null,
  },
  ownPreferences: {
    cuisineIds: [],
    categoryIds: [],
    temperature: null,
    flavor: null,
    budget: {
      maximum: 100000,
      currency: 'VND',
      unit: 'person',
    },
    avoidRecent: true,
  },
  ownPreferenceRevision: 1,
  preferenceRanking: 'UNSUPPORTED',
  removalCap: null,
  expiresAt: '2026-11-05T07:00:00Z',
  canEndWaiting: false,
};

async function harness(snapshot = JSON.parse(JSON.stringify(canonicalFixture))) {
  const calls: { rpc: string; params: any }[] = [];
  const consent = { personal: false, group: false };
  const preferenceAcks = new Map<string, number>();
  const transport: ApiTransport = {
    async invoke<T>(rpc: string, params: any) {
      calls.push({ rpc, params });
      if (rpc === 'get_history_consent') return { ok: true, data: { ...consent } } as T;
      if (rpc === 'update_history_consent') {
        consent[params.scope as 'personal' | 'group'] = params.consent;
        return { ok: true, data: undefined } as T;
      }
      const command = params.command;
      if (command === 'getDefaultPreferences') {
        return { ok: true, data: { revision: 1, preferences: snapshot.ownPreferences } } as T;
      }
      if (command === 'snapshot') {
        return { ok: true, data: snapshot } as T;
      }
      if (command === 'updateSettings') {
        snapshot.settings = params.payload.settings;
        snapshot.version++;
        return { ok: true, data: { accepted: true, version: snapshot.version } } as T;
      }
      if (command === 'updatePreferences') {
        const requestId = String(params.payload.requestId ?? '');
        const priorAckVersion = preferenceAcks.get(requestId);
        if (priorAckVersion !== undefined) return { ok: true, data: { accepted: true, version: priorAckVersion } } as T;
        snapshot.ownPreferences = params.payload.preferences;
        snapshot.version++;
        preferenceAcks.set(requestId, snapshot.version);
        return { ok: true, data: { accepted: true, version: snapshot.version } } as T;
      }
      return { ok: true, data: [] } as T;
    },
  };
  const client = new ApiClientImpl({ transport });
  jest.spyOn(client, 'restoreSession').mockResolvedValue({
    ok: true,
    data: {
      id: snapshot.hostUserId,
      displayName: 'Review Host',
      isGuest: true,
      createdAt: '2026-11-05T00:00:00Z',
    },
  });
  const repo = createRoomRepository({ client });
  await repo.restoreSession();
  return { repo, calls, snapshot, consent, preferenceAcks, gateway: createLiveDishSetupGateway(repo, snapshot.roomId) };
}

describe('PR155 complete consumer paths after fff8b88', () => {
  it('lets the current real lobby repository load a schema-valid canonical room', async () => {
    const h = await harness();
    const response = await h.repo.getRoomSnapshot(h.snapshot.roomId);
    expect(response.ok).toBe(true);
  });

  it('retains an edited budget after successful settings ACK and the authoritative read', async () => {
    const h = await harness();
    const before = await h.gateway.read();
    const draft: SetupDraft = { ...before.settings!, budget: '100to200' };
    const reply = await h.gateway.write({ kind: 'settings', requestId: 'review-edit-budget', room: before.room, draft });
    expect(reply.ok).toBe(true);
    expect((await h.gateway.read()).settings?.budget).toBe('100to200');
  });

  it('does not report consent enabled as saved without sending a consent write', async () => {
    const h = await harness();
    const before = await h.gateway.read();
    const reply = await h.gateway.write({
      kind: 'preferences',
      requestId: 'review-consent',
      room: before.room!,
      preferences: emptyPreferences(true),
      changedFields: [],
    });
    expect(reply.ok).toBe(true);
    expect(h.calls.some((c) => c.rpc === 'update_history_consent' || c.params.payload?.historyConsent === true)).toBe(true);
  });

  it('does not label a USD-per-portion budget as the VND-per-person under-50K choice', async () => {
    const data = JSON.parse(JSON.stringify(canonicalFixture));
    data.ownPreferences.budget = { maximum: 20, currency: 'USD', unit: 'portion' };
    const h = await harness(data);
    expect((await h.gateway.read()).settings?.budget).not.toBe('under50');
  });

  it.each(Array.from({ length: 20 }, (_, index) => index + 1))('accepts canonical R2 snapshots with %i remaining dish(es)', async count => {
    const snapshot = JSON.parse(JSON.stringify(canonicalFixture));
    snapshot.state = 'ROUND_2'; snapshot.round = 2; snapshot.removalCap = Math.max(1, Math.floor(count * 0.3));
    snapshot.pool = snapshot.pool.slice(0, count);
    const h = await harness(snapshot);
    expect((await h.repo.getRoomSnapshot(snapshot.roomId)).ok).toBe(true);
  });

  it('rejects an empty R2 but accepts an empty R1 intersection as a valid terminal result', async () => {
    const emptyR2 = JSON.parse(JSON.stringify(canonicalFixture));
    emptyR2.state = 'ROUND_2'; emptyR2.round = 2; emptyR2.pool = []; emptyR2.removalCap = 1;
    expect((await (await harness(emptyR2)).repo.getRoomSnapshot(emptyR2.roomId)).ok).toBe(false);

    const emptyR1 = JSON.parse(JSON.stringify(canonicalFixture));
    emptyR1.state = 'NO_CONSENSUS'; emptyR1.round = 1; emptyR1.pool = [];
    emptyR1.result = {
      resultId: '30000000-0000-4000-8000-000000000001',
      contractVersion: canonicalFixture.contractVersion,
      policyVersion: canonicalFixture.policyVersion,
      status: 'NO_CONSENSUS', round: 1, winner: null, reasonCode: 'EMPTY_INTERSECTION',
      finalizedAt: '2026-11-05T06:30:00Z', scoreVersion: null, rankingVersion: null,
      topDishes: [], round1BallotCount: 1,
    };
    expect((await (await harness(emptyR1)).repo.getRoomSnapshot(emptyR1.roomId)).ok).toBe(true);
  });

  it('keeps an ACKed settings step and retries only the same pending preference request after timeout', async () => {
    const h = await harness();
    const before = await h.gateway.read();
    const intent = { kind: 'settings' as const, requestId: 'review-partial-settings', room: before.room!, draft: { ...before.settings!, budget: '100to200' as const } };
    const dispatch = h.repo.dispatchDishSession.bind(h.repo);
    let preferenceAttempts = 0;
    const preferencePayloads: unknown[] = [];
    jest.spyOn(h.repo, 'dispatchDishSession').mockImplementation(async (command, payload, version) => {
      if (command === 'updatePreferences') preferencePayloads.push(payload);
      if (command === 'updatePreferences' && preferenceAttempts++ === 0) {
        const request = payload as { requestId: string; preferences: unknown };
        h.snapshot.ownPreferences = request.preferences;
        h.snapshot.version++;
        h.preferenceAcks.set(request.requestId, h.snapshot.version);
        return { ok: false, error: { messageKey: 'TIMEOUT' } };
      }
      return dispatch(command, payload, version);
    });

    const first = await h.gateway.write(intent);
    expect(first).toMatchObject({ ok: false, code: 'PARTIAL', completed: 'settings', pendingStep: 'preferences' });
    const second = await h.gateway.write(intent);
    expect(second.ok).toBe(true);
    const updates = h.calls.filter(call => call.params.command === 'updateSettings');
    expect(updates).toHaveLength(1);
    expect(preferenceAttempts).toBe(2);
    expect(preferencePayloads[1]).toEqual(preferencePayloads[0]);
    expect(h.snapshot.version).toBe(3);
  });

  it('refetches the actual version after a settings conflict and retries only that step', async () => {
    const h = await harness();
    const before = await h.gateway.read();
    const intent = {
      kind: 'settings' as const,
      requestId: 'review-settings-conflict',
      room: before.room!,
      draft: { ...before.settings!, timeMode: 'scheduled' as const, desiredAt: '2026-11-06T06:00:00Z' },
    };
    const dispatch = h.repo.dispatchDishSession.bind(h.repo);
    const settingsRequests: Record<string, unknown>[] = [];
    jest.spyOn(h.repo, 'dispatchDishSession').mockImplementation(async (command, payload, version) => {
      if (command === 'updateSettings') {
        settingsRequests.push(payload);
        if (settingsRequests.length === 1) {
          h.snapshot.version += 1;
          return { ok: false, error: { messageKey: 'VERSION_CONFLICT' } };
        }
      }
      return dispatch(command, payload, version);
    });

    const reply = await h.gateway.write(intent);
    expect(reply.ok).toBe(true);
    expect(settingsRequests).toHaveLength(2);
    expect(settingsRequests[0]).toMatchObject({ requestId: intent.requestId, expectedVersion: 1 });
    expect(settingsRequests[1]).toMatchObject({ requestId: 'review-settings-conflict_settings1', expectedVersion: 2 });
    expect(settingsRequests[1]!.settings).toEqual(settingsRequests[0]!.settings);
  });

  it('replays the same consent write after a lost response without repeating acknowledged preferences', async () => {
    const h = await harness();
    const before = await h.gateway.read();
    const intent = {
      kind: 'preferences' as const,
      requestId: 'review-consent-timeout',
      room: before.room!,
      preferences: { ...emptyPreferences(true), cuisineIds: ['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b'] },
      changedFields: ['cuisineIds'] as ('cuisineIds' | 'categoryIds' | 'temperature' | 'flavor')[],
    };
    const writeConsent = h.repo.updateHistoryConsent.bind(h.repo);
    const consentRequestIds: (string | undefined)[] = [];
    jest.spyOn(h.repo, 'updateHistoryConsent').mockImplementation(async (scope, value, requestId) => {
      consentRequestIds.push(requestId);
      if (consentRequestIds.length === 1) {
        h.consent[scope] = value;
        return { ok: false, requestId, error: { messageKey: 'TIMEOUT' } };
      }
      return writeConsent(scope, value, requestId);
    });

    const first = await h.gateway.write(intent);
    expect(first).toMatchObject({ ok: false, code: 'PARTIAL', completed: 'preferences', pendingStep: 'consent' });
    expect((await h.gateway.write(intent)).ok).toBe(true);
    expect(consentRequestIds).toHaveLength(2);
    expect(consentRequestIds[1]).toBe(consentRequestIds[0]);
    expect(h.calls.filter(call => call.params.command === 'updatePreferences')).toHaveLength(1);
    expect(h.consent).toEqual({ personal: true, group: false });
  });

  it('restores account consent from the API when the setup gateway is reopened', async () => {
    const h = await harness();
    await h.repo.updateHistoryConsent('personal', true, 'review-account-personal-consent');
    await h.repo.updateHistoryConsent('group', false, 'review-account-group-consent');

    const reopened = createLiveDishSetupGateway(h.repo, h.snapshot.roomId);
    const read = await reopened.read();
    expect(read.historyConsent).toEqual({ personal: true, group: false });
    expect(read.ownRoomPreferences?.historyConsent).toBe(true);
  });

  it('does not report consent success after a rejected account write and retries consent without duplicating preferences', async () => {
    const h = await harness();
    const before = await h.gateway.read();
    const intent = {
      kind: 'preferences' as const, requestId: 'review-partial-consent', room: before.room!,
      preferences: { ...emptyPreferences(true), cuisineIds: ['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b'] },
      changedFields: ['cuisineIds'] as ('cuisineIds' | 'categoryIds' | 'temperature' | 'flavor')[],
    };
    const updateConsent = h.repo.updateHistoryConsent.bind(h.repo);
    let consentAttempts = 0;
    jest.spyOn(h.repo, 'updateHistoryConsent').mockImplementation(async (scope, value, requestId) => {
      if (consentAttempts++ === 0) return { ok: false, requestId, error: { messageKey: 'RATE_LIMITED' } };
      return updateConsent(scope, value, requestId);
    });
    const first = await h.gateway.write(intent);
    expect(first).toMatchObject({ ok: false, code: 'PARTIAL', completed: 'preferences', pendingStep: 'consent' });
    const second = await h.gateway.write(intent);
    expect(second.ok).toBe(true);
    expect(h.calls.filter(call => call.params.command === 'updatePreferences')).toHaveLength(1);
    expect(consentAttempts).toBe(2);
    expect(h.consent).toEqual({ personal: true, group: false });
  });

  it('preserves the caller cuisine/flavor when only room time changes', async () => {
    const snapshot = JSON.parse(JSON.stringify(canonicalFixture));
    snapshot.ownPreferences.cuisineIds = ['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b'];
    snapshot.ownPreferences.categoryIds = ['e69b5f45-580d-5ee3-9e43-360650b4c650'];
    snapshot.ownPreferences.flavor = {
      spicy: { present: true, intensity: 'medium' },
      salty: { present: null, intensity: 'unknown' },
      sweet: { present: null, intensity: 'unknown' },
      sour: { present: null, intensity: 'unknown' },
    };
    const h = await harness(snapshot);
    const before = await h.gateway.read();
    const reply = await h.gateway.write({
      kind: 'settings', requestId: 'review-time-only', room: before.room,
      draft: { ...before.settings!, timeMode: 'scheduled', desiredAt: '2026-11-06T06:00:00Z' },
    });
    expect(reply.ok).toBe(true);
    expect(h.snapshot.ownPreferences.cuisineIds).toEqual(['d7bf6ad7-596c-5ee0-bf45-ccedfcf6460b']);
    expect(h.snapshot.ownPreferences.categoryIds).toEqual(['e69b5f45-580d-5ee3-9e43-360650b4c650']);
    expect(h.snapshot.ownPreferences.flavor).toEqual({
      spicy: { present: true, intensity: 'medium' },
      salty: { present: null, intensity: 'unknown' },
      sweet: { present: null, intensity: 'unknown' },
      sour: { present: null, intensity: 'unknown' },
    });
    expect(h.calls.some(call => call.params.command === 'updatePreferences')).toBe(false);
  });
});
