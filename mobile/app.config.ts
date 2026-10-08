import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Gì Cũng Được · Spike',
  slug: 'gi-cung-duoc',
  version: '0.1.0',
  scheme: 'gi-cung-duoc',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'vn.gicungduoc.sandbox',
    // QR needs camera only, never audio, storage or location.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
    ],
  },
  plugins: [
    'expo-router',
    ['expo-camera', { recordAudioAndroid: false, barcodeScannerEnabled: true }],
    'expo-sqlite',
    'expo-system-ui',
    'expo-notifications',
    ['expo-dev-client', { launchMode: 'most-recent' }],
  ],
};

export default config;
