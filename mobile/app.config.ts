import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Gì Cũng Được',
  slug: 'gi-cung-duoc',
  version: '0.1.0',
  icon: './assets/brand/gi-cung-duoc-icon.png',
  scheme: 'gi-cung-duoc',
  orientation: 'default',
  userInterfaceStyle: 'automatic',
  platforms: ['android'],
  android: {
    package: 'vn.gicungduoc.mobile',
    // Camera is needed for QR scanning; audio/recording is never used.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  plugins: [
    'expo-router',
    'expo-notifications',
    'expo-system-ui',
    'expo-sqlite',
    ['expo-secure-store', { configureAndroidBackup: true }],
    ['expo-camera', { cameraPermission: 'Cho phép Gì Cũng Được dùng camera để quét mã QR vào phòng.', recordAudioAndroid: false }],
    ['expo-location', { locationWhenInUsePermission: 'Cho phép Gì Cũng Được dùng vị trí khi bạn đang dùng ứng dụng.' }],
  ],
};

export default config;
