import { createPermissionService, type PermissionDriver, type PermissionDrivers, type RawPermission } from '../../src/features/permissions/services/appPermissions';

function driver(initial: RawPermission, afterRequest: RawPermission): PermissionDriver & { asked: number } {
  const state = { current: initial, asked: 0 };
  return {
    get asked() { return state.asked; },
    status: async () => state.current,
    request: async () => { state.asked += 1; state.current = afterRequest; return afterRequest; },
  };
}
const drivers = (camera: PermissionDriver): PermissionDrivers => ({ camera, location: driver('granted', 'granted'), notifications: driver('granted', 'granted') });

test('an allowed permission is granted without asking', async () => {
  const camera = driver('granted', 'granted');
  expect(await createPermissionService(drivers(camera)).ensure('camera')).toBe('granted');
  expect(camera.asked).toBe(0);
});

test('a first request that is allowed is granted', async () => {
  const camera = driver('undetermined', 'granted');
  expect(await createPermissionService(drivers(camera)).ensure('camera')).toBe('granted');
  expect(camera.asked).toBe(1);
});

test('a first refusal is denied, and the feature asks again next time it is used', async () => {
  const camera = driver('undetermined', 'denied');
  const service = createPermissionService(drivers(camera));
  expect(await service.ensure('camera')).toBe('denied');
  // The phone still reports "undetermined" when it can ask again; here it now reports denied, so the next refusal is final.
  expect(await service.ensure('camera')).toBe('blocked');
  expect(camera.asked).toBe(2);
});

test('a refusal after an earlier refusal is blocked: only Settings can allow it', async () => {
  const camera = driver('denied', 'denied');
  expect(await createPermissionService(drivers(camera)).ensure('camera')).toBe('blocked');
});

test('a permission this build cannot give is unavailable and never asked', async () => {
  const notifications = driver('unavailable', 'unavailable');
  const service = createPermissionService({ camera: driver('granted', 'granted'), location: driver('granted', 'granted'), notifications });
  expect(await service.ensure('notifications')).toBe('unavailable');
  expect(notifications.asked).toBe(0);
});

test('a driver that throws is treated as unavailable instead of crashing the screen', async () => {
  const broken: PermissionDriver = { status: async () => { throw new Error('native module missing'); }, request: async () => 'granted' };
  const service = createPermissionService(drivers(broken));
  expect(await service.status('camera')).toBe('unavailable');
  expect(await service.ensure('camera')).toBe('unavailable');
});

test('Settings opens through the injected opener', async () => {
  const open = jest.fn(async () => undefined);
  await createPermissionService(drivers(driver('granted', 'granted')), open).openSettings();
  expect(open).toHaveBeenCalledTimes(1);
});
