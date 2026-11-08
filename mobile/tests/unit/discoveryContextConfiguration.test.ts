import { act, renderHook } from '@testing-library/react-native';
import { useDiscoveryContext } from '../../src/features/context/hooks/useDiscoveryContext';

describe('discovery preview environment configuration', () => {
  const originalFetch = globalThis.fetch;
  const original = {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL,
    publishable: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    anon: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };

  afterEach(() => {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({
      EXPO_PUBLIC_SUPABASE_URL: original.url,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: original.publishable,
      EXPO_PUBLIC_SUPABASE_ANON_KEY: original.anon,
    })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });

  it.each([
    { name: 'the current publishable key alone', publishable: 'publishable-fixture', anon: undefined, expected: 'publishable-fixture' },
    { name: 'the legacy anon key when publishable is absent', publishable: undefined, anon: 'anon-fixture', expected: 'anon-fixture' },
    { name: 'the publishable key when both names exist', publishable: 'publishable-fixture', anon: 'anon-fixture', expected: 'publishable-fixture' },
  ])('uses $name for the default preview transport', async ({ publishable, anon, expected }) => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54361';
    if (publishable === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = publishable;
    if (anon === undefined) delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    else process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = anon;

    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 409,
      text: async () => JSON.stringify({
        ok: false,
        error: { messageKey: 'INSUFFICIENT_DISHES', details: { available: 7, requested: 15 } },
      }),
    } as Response);
    globalThis.fetch = fetchMock;

    const { result } = await renderHook(() => useDiscoveryContext({ initialEnvironmentMode: 'real_api' }));
    await act(async () => result.current.setLiveAuthToken('session-fixture'));
    await act(async () => result.current.loadPreview());

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://127.0.0.1:54361/rest/v1/rpc/preview_dish_pool',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ apikey: expected, Authorization: 'Bearer session-fixture' }),
      }),
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      payload: { contractVersion: 'dish-catalogue/roadmap-v2/GM-18.2', mealSlot: 'lunch', dishCount: 15 },
    });
    expect(result.current.shortage).toEqual({ available: 7, requested: 15 });
    expect(result.current.preview).toBeNull();
    expect(result.current.confirmed).toBe(false);
  });
});
