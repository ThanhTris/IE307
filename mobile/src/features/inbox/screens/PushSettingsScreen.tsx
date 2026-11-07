import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createNativePushService } from '../services/nativePush';
import { clearPushRegistrationSecrets, expoPushDriver, getPushDeviceId, pushSetupIssue } from '../services/expoPushDriver';

export function PushSettingsScreen({ repository, onHome, onInbox }: {
  repository: RoomRepository;
  onHome: () => void;
  onInbox: () => void;
}) {
  const { colors } = useShellTheme();
  const setupIssue = pushSetupIssue();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refreshPermission = useCallback(async () => {
    try {
      const current = await expoPushDriver.getPermissionStatus();
      setPermission(current === 'granted' ? 'granted' : current === 'denied' ? 'denied' : 'unknown');
    } catch {
      setPermission('unknown');
    }
  }, []);

  useEffect(() => {
    let active = true;
    expoPushDriver.getPermissionStatus().then(current => {
      if (active) setPermission(current === 'granted' ? 'granted' : current === 'denied' ? 'denied' : 'unknown');
    }).catch(() => { if (active) setPermission('unknown'); });
    return () => { active = false; };
  }, []);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const service = createNativePushService({
      driver: expoPushDriver,
      client: repository.getApiClient(),
      refreshInbox: async () => undefined,
    });
    try {
      const result = await service.register();
      await refreshPermission();
      setMessage(result.status === 'registered'
        ? 'Thông báo đã được bật trên thiết bị này.'
        : result.status === 'denied' || result.status === 'provisional'
          ? 'Bạn vẫn có thể xem thông báo trong Hộp thư.'
          : result.status === 'unsupported'
            ? 'Push từ xa cần development build Android; Hộp thư vẫn dùng được.'
            : 'Chưa đăng ký được thiết bị. Hãy kiểm tra kết nối rồi thử lại.');
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const deviceId = await getPushDeviceId();
      if (deviceId) {
        const service = createNativePushService({
          driver: expoPushDriver,
          client: repository.getApiClient(),
          refreshInbox: async () => undefined,
        });
        const result = await service.unregister(deviceId);
        if (!result?.ok) {
          setMessage('Máy chủ chưa xác nhận tắt thông báo. Hãy thử lại khi có mạng.');
          return;
        }
      }
      await clearPushRegistrationSecrets();
      setMessage('Đã hủy đăng ký push cho thiết bị này. Hộp thư vẫn hoạt động.');
    } catch {
      setMessage('Chưa hủy đăng ký được. Hộp thư vẫn dùng được; hãy thử lại khi có mạng.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Thông báo" onPressBrand={onHome} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
          <Text style={[styles.title, { color: colors.text }]}>Thông báo trên thiết bị</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Cho phép nhận cập nhật phòng. Khi chạm thông báo, ứng dụng tải lại Hộp thư từ máy chủ trước khi mở.</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.status, { color: colors.text }]}>
            Quyền hiện tại: {permission === 'granted' ? 'Đã cho phép' : permission === 'denied' ? 'Đã từ chối' : 'Chưa xác định'}
          </Text>
          {setupIssue ? <StatusNotice
            title={setupIssue === 'android-build-required' ? 'Push từ xa cần Android development build' : 'Thiếu cấu hình EAS Project ID'}
            message={setupIssue === 'android-build-required'
              ? 'Expo Go không nhận remote push trên Android. Bạn vẫn có thể dùng Hộp thư trong ứng dụng.'
              : 'Cần EXPO_PUBLIC_EAS_PROJECT_ID hoặc extra.eas.projectId để đăng ký Expo Push Token. Hộp thư vẫn dùng được.'}
            tone="info" colors={colors}
          /> : null}
          <AppButton label="Bật thông báo" onPress={() => void enable()} loading={busy} disabled={expoPushDriver.availability() !== 'available'} colors={colors} />
          {permission === 'denied' ? <AppButton label="Mở cài đặt thiết bị" variant="secondary" onPress={() => { void Linking.openSettings(); }} colors={colors} /> : null}
          <AppButton label="Tắt thông báo trên thiết bị này" variant="danger" onPress={() => void disable()} loading={busy} colors={colors} />
          {__DEV__ ? <AppButton
            label="QA · Mô phỏng chạm thông báo"
            variant="secondary"
            onPress={() => { expoPushDriver.simulateNotificationTap?.(); }}
            colors={colors}
          /> : null}
          <AppButton label="Mở Hộp thư" variant="quiet" onPress={onInbox} colors={colors} />
        </View>
        {message ? <StatusNotice title="Trạng thái thông báo" message={message} tone={message.startsWith('Chưa') ? 'warning' : 'success'} colors={colors} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  status: { minHeight: 48, fontSize: 14, lineHeight: 20, textAlignVertical: 'center' },
});
