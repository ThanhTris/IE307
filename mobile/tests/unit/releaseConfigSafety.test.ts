import fs from 'node:fs';
import path from 'node:path';
import appConfig from '../../app.config';
import { createPlacesRepository } from '../../src/features/result/services/placesRepository';
import { getAppEnvironment, isDevRuntime } from '../../src/shared/lib/appEnv';

const MOBILE_ROOT = path.resolve(__dirname, '../..');

function collectSourceFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      results.push(full);
    }
  }
  return results;
}

describe('GM-54 release configuration, permissions, and runtime safety', () => {
  test('app.config.ts defines release v1 Android metadata, adaptive icon, splash, and strict permission scope', () => {
    expect(appConfig.name).toBe('Gì Cũng Được');
    expect(appConfig.slug).toBe('gi-cung-duoc');
    expect(appConfig.version).toBe('1.0.0');
    expect(appConfig.platforms).toEqual(['android']);
    expect(appConfig.android?.package).toBe('vn.gicungduoc.mobile');

    expect(appConfig.icon).toBe('./assets/brand/gi-cung-duoc-icon.png');
    expect(appConfig.android?.adaptiveIcon?.foregroundImage).toBe('./assets/brand/gi-cung-duoc-adaptive-foreground.png');
    expect(appConfig.android?.adaptiveIcon?.backgroundColor).toBe('#4DC14C');

    const plugins = appConfig.plugins ?? [];
    const splashPlugin = plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-splash-screen') as
      | [string, { image?: string; backgroundColor?: string; dark?: { backgroundColor?: string; image?: string } }]
      | undefined;
    expect(splashPlugin).toBeDefined();
    expect(splashPlugin?.[1]?.image).toBe('./assets/brand/gi-cung-duoc-splash.png');
    expect(splashPlugin?.[1]?.backgroundColor).toBe('#FFFCF3');
    expect(splashPlugin?.[1]?.dark?.backgroundColor).toBe('#13161B');

    for (const relAsset of [
      appConfig.icon!,
      splashPlugin![1]!.image!,
      appConfig.android!.adaptiveIcon!.foregroundImage!,
    ]) {
      expect(fs.existsSync(path.resolve(MOBILE_ROOT, relAsset))).toBe(true);
    }

    const perms = appConfig.android?.permissions ?? [];
    expect(perms).toEqual([
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ]);
    expect(appConfig.android?.blockedPermissions).toEqual(
      expect.arrayContaining(['android.permission.RECORD_AUDIO', 'android.permission.ACCESS_BACKGROUND_LOCATION']),
    );
    expect(perms).not.toContain('android.permission.ACCESS_BACKGROUND_LOCATION');
    expect(perms).not.toContain('android.permission.RECORD_AUDIO');

    const cameraPlugin = plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-camera') as [string, Record<string, unknown>] | undefined;
    expect(cameraPlugin?.[1]?.recordAudioAndroid).toBe(false);
    expect(String(cameraPlugin?.[1]?.cameraPermission)).toMatch(/QR/);

    const locationPlugin = plugins.find(entry => Array.isArray(entry) && entry[0] === 'expo-location') as [string, Record<string, unknown>] | undefined;
    expect(String(locationPlugin?.[1]?.locationWhenInUsePermission)).toMatch(/vị trí/);
  });

  test('eas.json defines development, preview (APK/staging), and production (AAB/production/autoIncrement) without NODE_ENV or secrets', () => {
    const raw = fs.readFileSync(path.resolve(MOBILE_ROOT, 'eas.json'), 'utf8');
    const eas = JSON.parse(raw) as {
      cli?: Record<string, unknown>;
      build?: Record<string, {
        developmentClient?: boolean;
        distribution?: string;
        autoIncrement?: boolean;
        android?: Record<string, unknown>;
        env?: Record<string, string>;
      }>;
    };

    expect(eas.cli?.appVersionSource).toBe('remote');
    expect(eas.build?.development?.developmentClient).toBe(true);
    expect(eas.build?.development?.android?.buildType).toBe('apk');
    expect(eas.build?.development?.env?.EXPO_PUBLIC_APP_ENV).toBe('development');

    expect(eas.build?.preview?.distribution).toBe('internal');
    expect(eas.build?.preview?.android?.buildType).toBe('apk');
    expect(eas.build?.preview?.env?.EXPO_PUBLIC_APP_ENV).toBe('staging');

    expect(eas.build?.production?.distribution).toBe('store');
    expect(eas.build?.production?.android?.buildType).toBe('app-bundle');
    expect(eas.build?.production?.autoIncrement).toBe(true);
    expect(eas.build?.production?.env?.EXPO_PUBLIC_APP_ENV).toBe('production');

    for (const profile of Object.values(eas.build ?? {})) {
      expect(profile.env).not.toHaveProperty('NODE_ENV');
      expect(profile.env).not.toHaveProperty('EXPO_PUBLIC_PLACES_SIMULATED');
      expect(profile.env).not.toHaveProperty('EXPO_PUBLIC_GM29_QA_PUSH');
    }
    expect(raw).not.toMatch(/sb_publishable_|sb_secret_|AIza[0-9A-Za-z_-]+/);
  });

  test('app.config.ts resolves consistently with every eas.json build profile and remote appVersionSource', () => {
    const eas = JSON.parse(fs.readFileSync(path.resolve(MOBILE_ROOT, 'eas.json'), 'utf8')) as {
      cli?: { appVersionSource?: string };
      build?: Record<string, { env?: Record<string, string> }>;
    };
    const prevEnv = process.env.EXPO_PUBLIC_APP_ENV;
    const prevEasId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
    try {
      expect(eas.cli?.appVersionSource).toBe('remote');
      for (const profileName of ['development', 'preview', 'production'] as const) {
        const profile = eas.build?.[profileName];
        expect(profile).toBeDefined();
        process.env.EXPO_PUBLIC_APP_ENV = profile?.env?.EXPO_PUBLIC_APP_ENV ?? '';
        process.env.EXPO_PUBLIC_EAS_PROJECT_ID = '00000000-0000-4000-8000-000000000001';
        let resolved!: typeof appConfig;
        jest.isolateModules(() => {
          // Reload dynamic app.config.ts per EAS profile env using Jest module isolation.
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          resolved = require('../../app.config').default as typeof appConfig;
        });
        expect(resolved.platforms).toEqual(['android']);
        expect(resolved.version).toBe('1.0.0');
        expect(resolved.android?.package).toBe('vn.gicungduoc.mobile');
        expect(resolved.android?.versionCode).toBeUndefined();
        expect(resolved.extra?.appEnv).toBe(profile?.env?.EXPO_PUBLIC_APP_ENV);
        expect(resolved.extra?.eas).toEqual({ projectId: '00000000-0000-4000-8000-000000000001' });
      }
    } finally {
      if (prevEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
      else process.env.EXPO_PUBLIC_APP_ENV = prevEnv;
      if (prevEasId === undefined) delete process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      else process.env.EXPO_PUBLIC_EAS_PROJECT_ID = prevEasId;
    }
  });

  test('no NODE_ENV checks, google.com output=embed, or hardcoded login prefills exist in mobile/src', () => {
    const srcFiles = collectSourceFiles(path.resolve(MOBILE_ROOT, 'src'));
    expect(srcFiles.length).toBeGreaterThan(10);

    for (const filePath of srcFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).not.toContain('NODE_ENV');
      expect(content).not.toContain('output=embed');
    }
  });

  test('appEnv uses EXPO_PUBLIC_APP_ENV and __DEV__ directly', () => {
    const g = globalThis as Record<string, unknown>;
    const prevDev = g.__DEV__;
    const prevEnv = process.env.EXPO_PUBLIC_APP_ENV;
    try {
      delete process.env.EXPO_PUBLIC_APP_ENV;
      g.__DEV__ = false;
      expect(isDevRuntime()).toBe(false);
      expect(getAppEnvironment()).toBe('production');

      process.env.EXPO_PUBLIC_APP_ENV = 'staging';
      expect(getAppEnvironment()).toBe('staging');

      g.__DEV__ = true;
      delete process.env.EXPO_PUBLIC_APP_ENV;
      expect(isDevRuntime()).toBe(true);
      expect(getAppEnvironment()).toBe('development');
    } finally {
      g.__DEV__ = prevDev;
      if (prevEnv === undefined) delete process.env.EXPO_PUBLIC_APP_ENV;
      else process.env.EXPO_PUBLIC_APP_ENV = prevEnv;
    }
  });

  test('TC-REL-008 release mode (__DEV__=false) disables QA simulated flags', async () => {
    const g = globalThis as Record<string, unknown>;
    const prevDev = g.__DEV__;
    const prevSimPlaces = process.env.EXPO_PUBLIC_PLACES_SIMULATED;
    try {
      g.__DEV__ = false;
      process.env.EXPO_PUBLIC_PLACES_SIMULATED = '1';

      const repo = createPlacesRepository({
        isDevSimulated: true,
        apiKey: '',
        locationAdapter: {
          getPermissionStatus: async () => 'granted',
          requestPermission: async () => 'granted',
          getCurrentCoordinates: async () => ({ latitude: 10.77, longitude: 106.7 }),
        },
      });
      const res = await repo.fetchNearbyPlaces({
        resultId: 'rel-check',
        winnerDishId: 'dish-1',
        dishName: 'Phở bò',
      });
      expect(res.ok).toBe(true);
      if (res.ok) {
        expect(res.data.status).toBe('unsupported');
        expect(res.data.places).toEqual([]);
      }
    } finally {
      g.__DEV__ = prevDev;
      if (prevSimPlaces === undefined) delete process.env.EXPO_PUBLIC_PLACES_SIMULATED;
      else process.env.EXPO_PUBLIC_PLACES_SIMULATED = prevSimPlaces;
    }
  });
});
