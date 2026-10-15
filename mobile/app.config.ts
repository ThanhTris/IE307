import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Gì Cũng Được',
  slug: 'gi-cung-duoc',
  version: '0.1.0',
  scheme: 'gi-cung-duoc',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'vn.gicungduoc.mobile',
    blockedPermissions: [
      'android.permission.CAMERA',
      'android.permission.RECORD_AUDIO',
      'android.permission.POST_NOTIFICATIONS',
    ],
  },
  plugins: [
    'expo-router',
    'expo-system-ui',
    ['expo-secure-store', { configureAndroidBackup: true }],
    ['expo-location', { locationWhenInUsePermission: 'Cho phép Gì Cũng Được dùng vị trí khi bạn đang dùng ứng dụng.' }],
  ],
};

export default config;
