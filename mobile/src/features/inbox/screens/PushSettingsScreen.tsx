import { useCallback, useEffect, useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton, AppHeader, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { RoomRepository } from '../../rooms/services/roomRepository';
import { createNativePushService } from '../services/nativePush';
import { clearPushRegistrationSecrets, getActivePushDriver, getPushDeviceId, isGm29QaPushEnabled, pushSetupIssue } from '../services/expoPushDriver';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

export function PushSettingsScreen({ repository, onHome, onInbox }: {
  repository: RoomRepository;
  onHome: () => void;
  onInbox: () => void;
}) {
  const { colors } = useShellTheme();
  const driver = getActivePushDriver();
  const qaPushEnabled = isGm29QaPushEnabled();
  const setupIssue = pushSetupIssue();
  const [permission, setPermission] = useState<'granted' | 'denied' | 'unknown'>('unknown');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  // On/off saved: green; permission refused or needs a dev build: amber; failure: red.
  const [messageTone, setMessageTone] = useState<'success' | 'warning' | 'error'>('error');
  const [qaEventId, setQaEventId] = useState('');
  const [qaBusy, setQaBusy] = useState(false);
  const [qaMessage, setQaMessage] = useState('');

  const refreshPermission = useCallback(async () => {
    try {
      const current = await driver.getPermissionStatus();
      setPermission(current === 'granted' ? 'granted' : current === 'denied' ? 'denied' : 'unknown');
    } catch {
      setPermission('unknown');
    }
  }, [driver]);

  useEffect(() => {
    let active = true;
    driver.getPermissionStatus().then(current => {
      if (active) setPermission(current === 'granted' ? 'granted' : current === 'denied' ? 'denied' : 'unknown');
    }).catch(() => { if (active) setPermission('unknown'); });
    return () => { active = false; };
  }, [driver]);

  const enable = async () => {
    if (busy) return;
    setBusy(true);
    setMessage('');
    const userId = repository.getCurrentUser()?.id;
    const identityRevision = (repository as RoomRepository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0;
    const isIdentityCurrent = () => Boolean(userId) && repository.getSessionStatus() === 'active'
      && repository.getCurrentUser()?.id === userId
      && ((repository as RoomRepository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0) === identityRevision;
    const service = createNativePushService({
      driver,
      client: repository.getApiClient(),
      identityId: userId,
      isIdentityCurrent,
      refreshInbox: async () => undefined,
    });
    try {
      const result = await service.register();
      await refreshPermission();
      setMessageTone(result.status === 'registered' ? 'success' : result.status === 'denied' || result.status === 'provisional' || result.status === 'unsupported' ? 'warning' : 'error');
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
    const userId = repository.getCurrentUser()?.id;
    const identityRevision = (repository as RoomRepository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0;
    const isIdentityCurrent = () => Boolean(userId) && repository.getSessionStatus() === 'active'
      && repository.getCurrentUser()?.id === userId
      && ((repository as RoomRepository & { getIdentityRevision?: () => number }).getIdentityRevision?.() ?? 0) === identityRevision;
    try {
      const deviceId = await getPushDeviceId();
      if (deviceId) {
        const service = createNativePushService({
          driver,
          client: repository.getApiClient(),
          identityId: userId,
          isIdentityCurrent,
          refreshInbox: async () => undefined,
        });
        const result = await service.unregister(deviceId);
        if (!result?.ok) {
          setMessage('Máy chủ chưa xác nhận tắt thông báo. Hãy thử lại khi có mạng.'); setMessageTone('error');
          return;
        }
      }
      await clearPushRegistrationSecrets();
      setMessage('Đã hủy đăng ký push cho thiết bị này. Hộp thư vẫn hoạt động.'); setMessageTone('success');
    } catch {
      setMessage('Chưa hủy đăng ký được. Hộp thư vẫn dùng được; hãy thử lại khi có mạng.'); setMessageTone('error');
    } finally {
      setBusy(false);
    }
  };

  const loadLatestQaEvent = async () => {
    if (qaBusy) return;
    setQaBusy(true);
    setQaMessage('');
    try {
      const userId = repository.getCurrentUser()?.id;
      if (!userId || repository.getSessionStatus() !== 'active') {
        setQaMessage('Cần phiên đăng nhập đang hoạt động để lấy eventId từ Inbox.');
        return;
      }
      const response = await repository.getApiClient().listPartnerInbox();
      if (!response.ok) {
        setQaMessage(`Chưa đọc được Inbox từ máy chủ (${response.error.messageKey}).`);
        return;
      }
      if (repository.getCurrentUser()?.id !== userId || repository.getSessionStatus() !== 'active') {
        setQaMessage('Tài khoản đã thay đổi; hãy tải lại trang trước khi thử tiếp.');
        return;
      }
      const eventId = response.data[0]?.eventId;
      if (!eventId) {
        setQaMessage('Inbox máy chủ hiện chưa có event để tạo thông báo kiểm thử.');
        return;
      }
      setQaEventId(eventId);
      setQaMessage('Đã lấy eventId từ Inbox máy chủ của tài khoản hiện tại.');
    } catch {
      setQaMessage('Không kết nối được để đọc Inbox máy chủ.');
    } finally {
      setQaBusy(false);
    }
  };

  const scheduleQaNotification = async () => {
    const eventId = qaEventId.trim();
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(eventId)) {
      setQaMessage('Nhập eventId UUID hợp lệ hoặc lấy event mới nhất từ máy chủ.');
      return;
    }
    setQaBusy(true);
    setQaMessage('');
    try {
      const scheduled = await driver.scheduleSimulatedNotification?.(eventId);
      setQaMessage(scheduled
        ? 'Đã tạo thông báo QA cục bộ. Chạm thông báo để kiểm luồng tải lại event từ máy chủ.'
        : 'Không thể tạo thông báo QA. Cần development build Android và quyền thông báo được cấp.');
    } finally {
      setQaBusy(false);
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
          <AppButton label={qaPushEnabled ? 'Bật thông báo QA trên thiết bị' : 'Bật thông báo'} onPress={() => void enable()} loading={busy} disabled={driver.availability() !== 'available'} colors={colors} />
          {permission === 'denied' ? <AppButton label="Mở cài đặt thiết bị" variant="secondary" onPress={() => { void Linking.openSettings(); }} colors={colors} /> : null}
          <AppButton label="Tắt thông báo trên thiết bị này" variant="danger" onPress={() => void disable()} loading={busy} colors={colors} />
          {qaPushEnabled ? <View style={[styles.qaCard, { borderColor: colors.line, backgroundColor: colors.warm }]}>
            <Text accessibilityRole="header" style={[styles.qaTitle, { color: colors.text }]}>QA · Thông báo mô phỏng trên thiết bị</Text>
            <Text style={[styles.body, { color: colors.muted }]}>Tạo thông báo cục bộ có eventId. Khi chạm, ứng dụng tra Inbox có quyền trên máy chủ; không tự chấp nhận lời mời.</Text>
            <TextInput
              accessibilityLabel="Event ID cho thông báo QA"
              value={qaEventId}
              onChangeText={setQaEventId}
              placeholder="eventId UUID từ Inbox máy chủ"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              autoCorrect={false}
              selectTextOnFocus
              style={[styles.input, { color: colors.text, borderColor: colors.line, backgroundColor: colors.surface }]}
            />
            <AppButton label="Lấy eventId mới nhất từ máy chủ" variant="secondary" onPress={() => { void loadLatestQaEvent(); }} loading={qaBusy} colors={colors} />
            <AppButton label="Tạo thông báo QA trên thiết bị" variant="secondary" onPress={() => { void scheduleQaNotification(); }} loading={qaBusy} colors={colors} />
            <AppButton label="QA · Mô phỏng chạm ngay trong app" variant="quiet" onPress={() => {
              const tapped = driver.simulateNotificationTap?.(qaEventId.trim()) ?? false;
              setQaMessage(tapped ? 'Đã gửi eventId vào luồng xử lý tap QA.' : 'Không có listener native hoặc eventId chưa hợp lệ.');
            }} colors={colors} />
            {qaMessage ? <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.text }]}>{qaMessage}</Text> : null}
          </View> : null}
          <AppButton label="Mở Hộp thư" variant="quiet" onPress={onInbox} colors={colors} />
        </View>
        {message ? <ToastNotice title={messageTone === 'success' ? 'Đã lưu cài đặt' : messageTone === 'warning' ? 'Chưa bật thông báo' : 'Chưa lưu được'} message={message} tone={messageTone} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 12 },
  qaCard: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 10 },
  qaTitle: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 14 },
  title: { fontSize: 20, lineHeight: 27, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  status: { paddingVertical: 14, fontSize: 14, lineHeight: 20 },
});
