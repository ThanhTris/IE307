import type { ExpoConfig } from 'expo/config';

const easProjectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID?.trim();
const appEnv = process.env.EXPO_PUBLIC_APP_ENV?.trim();
const androidCertSha1 = process.env.EXPO_PUBLIC_ANDROID_CERT_SHA1?.trim();

const extra: Record<string, unknown> = {};
if (appEnv) extra.appEnv = appEnv;
if (androidCertSha1) extra.androidCertSha1 = androidCertSha1;
if (easProjectId) extra.eas = { projectId: easProjectId };

const config: ExpoConfig = {
  name: 'Gì Cũng Được',
  slug: 'gi-cung-duoc',
  version: '1.0.0',
  icon: './assets/brand/gi-cung-duoc-icon.png',
  scheme: 'gi-cung-duoc',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'vn.gicungduoc.mobile',
    adaptiveIcon: {
      foregroundImage: './assets/brand/gi-cung-duoc-adaptive-foreground.png',
      backgroundColor: '#4DC14C',
    },
    // Expo SDK 58 defaults compileSdkVersion 37 and targetSdkVersion 36 (>= Play Store requirement).
    permissions: [
      'android.permission.CAMERA',
      'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.POST_NOTIFICATIONS',
    ],
    // Camera is needed for QR scanning and location for nearby dining; audio recording and background location are never used.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.ACCESS_BACKGROUND_LOCATION',
    ],
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-system-ui',
    'expo-sqlite',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#FFFCF3',
        image: './assets/brand/gi-cung-duoc-splash.png',
        imageWidth: 220,
        resizeMode: 'contain',
        dark: {
          backgroundColor: '#13161B',
          image: './assets/brand/gi-cung-duoc-splash.png',
        },
      },
    ],
    ['expo-secure-store', { configureAndroidBackup: true }],
    [
      'expo-camera',
      {
        cameraPermission: 'Cho phép Gì Cũng Được dùng camera để quét mã QR vào phòng.',
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Cho phép Gì Cũng Được dùng vị trí khi bạn đang dùng ứng dụng để tìm quán ăn gần bạn.',
      },
    ],
  ],
  ...(Object.keys(extra).length > 0 ? { extra } : {}),
};

export default config;
