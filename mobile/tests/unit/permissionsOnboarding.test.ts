const mockDeviceStorage = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: async (key: string) => mockDeviceStorage.get(key) ?? null,
  setItemAsync: async (key: string, value: string) => { mockDeviceStorage.set(key, value); },
}));

function startApp() {
  let onboarding!: typeof import('../../src/features/permissions/services/permissionsOnboarding');
  jest.isolateModules(() => {
    onboarding = jest.requireActual('../../src/features/permissions/services/permissionsOnboarding');
  });
  return onboarding;
}

beforeEach(() => mockDeviceStorage.clear());

test('onboarding stays complete after switching accounts and restarting the app', async () => {
  const first = startApp();
  await expect(first.isPermissionsOnboarded('first-user')).resolves.toBe(false);
  await first.markPermissionsOnboarded();
  await expect(first.isPermissionsOnboarded('second-user')).resolves.toBe(true);
  await expect(startApp().isPermissionsOnboarded('second-user')).resolves.toBe(true);

  mockDeviceStorage.clear();
  await expect(startApp().isPermissionsOnboarded('first-user')).resolves.toBe(false);
});

test('an answer from a legacy account is promoted to the installation flag', async () => {
  mockDeviceStorage.set('gcd.permissions.onboarded.v1.first-user', 'true');
  await expect(startApp().isPermissionsOnboarded('first-user')).resolves.toBe(true);
  await expect(startApp().isPermissionsOnboarded('second-user')).resolves.toBe(true);
});

test('an explicit installation reset is not restored from an older account flag', async () => {
  mockDeviceStorage.set('gcd.permissions.onboarded.v1', 'false');
  mockDeviceStorage.set('gcd.permissions.onboarded.v1.first-user', 'true');
  const app = startApp();
  await expect(app.isPermissionsOnboarded('first-user')).resolves.toBe(false);
  await app.markPermissionsOnboarded();
  await expect(startApp().isPermissionsOnboarded('second-user')).resolves.toBe(true);
});
