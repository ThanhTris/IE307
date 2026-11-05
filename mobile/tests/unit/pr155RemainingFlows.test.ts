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
  dishCount: 10,
  pool: Array.from({ length: 10 }, (_, i) => ({
    roundDishId: `rd-${i}`,
    dishId: `dish-${i}`,
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
    dishCount: 10,
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
  const transport: ApiTransport = {
    async invoke<T>(rpc: string, params: any) {
      calls.push({ rpc, params });
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
        snapshot.ownPreferences = params.payload.preferences;
        snapshot.version++;
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
  return { repo, calls, snapshot, gateway: createLiveDishSetupGateway(repo, snapshot.roomId) };
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
});
