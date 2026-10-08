/* eslint-disable @typescript-eslint/no-require-imports -- isolateModules reloads the adapter to test restart/retry state */
jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

describe('SQLite spike adapter (mocked SDK)', () => {
  let store: typeof import('../src/features/bootstrap/services/counterStore');
  let open: jest.Mock;
  let value: number;
  const db = {
    execAsync: jest.fn(), closeAsync: jest.fn(), getFirstAsync: jest.fn(), runAsync: jest.fn(),
  };
  beforeEach(() => {
    value = 0;
    jest.resetAllMocks();
    db.execAsync.mockResolvedValue(undefined);
    db.closeAsync.mockResolvedValue(undefined);
    db.getFirstAsync.mockImplementation(async () => ({ value }));
    db.runAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('value + 1')) value += 1;
      else if (sql.includes('value = 0')) value = 0;
    });
    jest.isolateModules(() => {
      store = require('../src/features/bootstrap/services/counterStore');
      open = require('expo-sqlite').openDatabaseAsync;
      open.mockResolvedValue(db);
    });
  });
  test('one database, atomic increment, read and reset', async () => {
    expect(await store.readCounter()).toBe(0);
    expect(await store.incrementCounter()).toBe(1);
    expect(await store.readCounter()).toBe(1);
    expect(await store.resetCounter()).toBe(0);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('gm02-spike.db');
  });
  test('reopening adapter retains stored value', async () => {
    await store.incrementCounter();
    jest.isolateModules(() => {
      store = require('../src/features/bootstrap/services/counterStore');
      require('expo-sqlite').openDatabaseAsync.mockResolvedValue(db);
    });
    expect(await store.readCounter()).toBe(1);
  });
  test('retries failed open rather than caching rejected promise', async () => {
    open.mockRejectedValueOnce(new Error('unavailable'));
    await expect(store.readCounter()).rejects.toThrow('unavailable');
    expect(await store.readCounter()).toBe(0);
    expect(open).toHaveBeenCalledTimes(2);
  });
  test('failed initialization closes database and allows retry', async () => {
    db.execAsync.mockRejectedValueOnce(new Error('init failed'));
    await expect(store.readCounter()).rejects.toThrow('init failed');
    expect(db.closeAsync).toHaveBeenCalledTimes(1);
    expect(await store.readCounter()).toBe(0);
  });
  test.each([null, { value: -1 }, { value: 0.5 }, { value: '3' }])('does not display corrupted counter %p', async (row) => {
    db.getFirstAsync.mockResolvedValueOnce(row);
    await expect(store.readCounter()).rejects.toThrow('Invalid spike counter');
  });
  test('write failure is propagated without reporting success', async () => {
    db.runAsync.mockRejectedValueOnce(new Error('disk full'));
    await expect(store.incrementCounter()).rejects.toThrow('disk full');
    expect(await store.readCounter()).toBe(0);
  });
});
