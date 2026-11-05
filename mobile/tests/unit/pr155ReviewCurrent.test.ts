/** Reviewer-only probes of PR 155 3b53d20. Synthetic transport, no DB/device evidence. */
import { ApiClientImpl, type ApiTransport } from '../../src/data/api/client';
import { createRoomRepository } from '../../src/features/rooms/services/roomRepository';
import { createLiveDishSetupGateway } from '../../src/bootstrap/liveDishSetupGateway';
import { emptyPreferences, type SetupDraft } from '../../src/features/context/services/dishSetup';
import { FetchTransport } from '../../src/data/api/client/transport';

const user = { id: '11111111-1111-4111-8111-111111111111', displayName: 'Review Host', isGuest: true, createdAt: '2026-11-05T00:00:00Z' };
const roomId = '22222222-2222-4222-8222-222222222222';
const draft: SetupDraft = { mealSlot: 'lunch', dishCount: 20, timeMode: 'now', desiredAt: null, budget: '50to100', avoidRecent: true, inviteeIds: [] };
const captured: { rpc: string; params: Record<string, unknown> }[] = [];
async function harness(handler: (rpc: string, p: any) => unknown) {
  const calls: typeof captured = [];
  const transport: ApiTransport = {
    async invoke<T>(rpc: string, params: Record<string, unknown>) {
      const c = { rpc, params };
      calls.push(c);
      captured.push(c);
      return handler(rpc, params) as T;
    },
  };
  const client = new ApiClientImpl({ transport });
  jest.spyOn(client, 'restoreSession').mockResolvedValue({ ok: true, data: user });
  const repo = createRoomRepository({ client });
  await repo.restoreSession();
  return { repo, calls, gateway: createLiveDishSetupGateway(repo) };
}

describe('PR155 active wire and consumer probes', () => {
  it('preserves the nested v4 error and shortage details through the real FetchTransport', async () => {
    const fetchFn = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({ ok: false, error: { messageKey: 'INSUFFICIENT_DISHES', details: { available: 7, requested: 20 } } }),
    });
    const client = new ApiClientImpl({ transport: new FetchTransport('http://127.0.0.1:54361', fetchFn) });
    jest.spyOn(client, 'restoreSession').mockResolvedValue({ ok: true, data: user });
    const repo = createRoomRepository({ client });
    await repo.restoreSession();
    const reply = await createLiveDishSetupGateway(repo).write({ kind: 'settings', requestId: 'review-http-shortage', draft });
    expect(reply).toMatchObject({ ok: false, code: 'SHORTAGE', available: 7, requested: 20 });
  });

  it('does not add requestId to a snapshot read', async () => {
    const h = await harness(() => ({ ok: false, error: { messageKey: 'UNSUPPORTED_FIELD' } }));
    await h.repo.getRoomSnapshot(roomId);
    expect((h.calls[0]!.params as any).payload).not.toHaveProperty('requestId');
  });

  it('does not add requestId to getDefaultPreferences', async () => {
    const h = await harness(() => ({ ok: false, error: { messageKey: 'UNSUPPORTED_FIELD' } }));
    await h.repo.getDefaultPreferences();
    expect((h.calls[0]!.params as any).payload).not.toHaveProperty('requestId');
  });

  it('does not replace a failed account-default read with fabricated success', async () => {
    const h = await harness(() => ({ ok: false, error: { messageKey: 'UNSUPPORTED_FIELD' } }));
    expect((await h.repo.getDefaultPreferences()).ok).toBe(false);
  });

  it('maps the actual Skip preferences model to the canonical six-field wire object', async () => {
    const h = await harness(() => ({ ok: false, error: { messageKey: 'INVALID_INPUT' } }));
    await h.gateway.write({ kind: 'preferences', requestId: 'review-preferences', room: { id: roomId, code: 'GCD234', version: 1, state: 'LOBBY' }, preferences: emptyPreferences(false) });
    const p = ((h.calls[0]!.params as any).payload as any).preferences;
    expect(p).toEqual({ cuisineIds: [], categoryIds: [], temperature: null, flavor: null, budget: null, avoidRecent: false });
  });

  it('preserves a selected setup budget rather than sending unlimited', async () => {
    const h = await harness(() => ({ ok: false, error: { messageKey: 'INSUFFICIENT_DISHES', details: { available: 7, requested: 20 } } }));
    await h.gateway.write({ kind: 'settings', requestId: 'review-budget', draft });
    expect(((h.calls[0]!.params as any).payload as any).preferences.budget).not.toBeNull();
  });

  it('rejects malformed create ACK instead of advancing with undefined room fields', async () => {
    const h = await harness(() => ({ ok: true, data: {} }));
    const reply = await h.gateway.write({ kind: 'settings', requestId: 'review-malformed-create', draft });
    expect(reply.ok).toBe(false);
  });

  it('does not cast a modern snapshot without context into the legacy lobby DTO', async () => {
    const h = await harness(() => ({ ok: true, data: { roomId, code: 'GCD234', state: 'LOBBY', version: 1, hostUserId: user.id, settings: { mealSlot: 'lunch', dishCount: 20, desiredAt: null }, members: [{ userId: user.id, displayName: 'Review Host', role: 'HOST', submissionStatus: 'NOT_SUBMITTED' }], pool: [] } }));
    const reply = await h.repo.getRoomSnapshot(roomId);
    expect(reply.ok && !(reply as any).data?.context).toBe(false);
  });

  it('does not retry a canonical CONTRACT_MISMATCH through legacy join_room', async () => {
    const h = await harness((rpc) => (rpc === 'dish_session' ? { ok: false, error: { messageKey: 'CONTRACT_MISMATCH' } } : { ok: false, error: { messageKey: 'INVALID_INPUT' } }));
    await h.repo.joinRoom({ code: 'GCD234', displayName: 'Review Member', requestId: 'review-contract' });
    expect(h.calls.map((c) => c.rpc)).toEqual(['dish_session']);
  });

  it('keeps create count and null Now time deterministic across same-intent retry', async () => {
    const h = await harness(() => ({ ok: false, error: { messageKey: 'TIMEOUT' } }));
    const intent = { kind: 'settings' as const, requestId: 'review-retry', draft };
    await h.gateway.write(intent);
    await h.gateway.write(intent);
    expect(h.calls[0]!.params).toEqual(h.calls[1]!.params);
    expect(h.calls[0]!.params).toMatchObject({ command: 'create', payload: { settings: { dishCount: 20, desiredAt: null } } });
  });
});
