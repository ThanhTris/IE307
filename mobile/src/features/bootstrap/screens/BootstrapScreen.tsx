import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, StyleSheet, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import type * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import { parseJoinLink, parseManualCode } from '../../../domain/bootstrap/joinLink';
import { SpikeButton, SpikeCard, SpikePage, SpikeText, useSpikeColors } from '../components/SpikePage';
import { incrementCounter, readCounter, resetCounter } from '../services/counterStore';
import { configureLocalNotifications, scheduleLocalNotification } from '../services/localNotifications';

async function loadNotifications(): Promise<typeof import('expo-notifications')> {
  // Expo Go Android must not evaluate expo-notifications at startup.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('expo-notifications') as typeof import('expo-notifications');
}

export function BootstrapScreen() {
  const colors = useSpikeColors();
  const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
  const [code, setCode] = useState('');
  const [linkStatus, setLinkStatus] = useState('Chưa quét QR hoặc nhập mã.');
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const scanned = useRef(false);
  const [counter, setCounter] = useState<number | null>(null);
  const [dbStatus, setDbStatus] = useState('Đang mở SQLite…');
  const [dbBusy, setDbBusy] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState(
    isExpoGo
      ? 'Expo Go Android không nạp module notifications ở SDK 57. Dùng development build để thử mục này.'
      : 'Chưa xin quyền. Chỉ thử thông báo cục bộ.',
  );
  const [notificationBusy, setNotificationBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    let removeNotificationListener: (() => void) | undefined;
    readCounter().then((value) => {
      if (alive) { setCounter(value); setDbStatus('Đã đọc bộ đếm vô danh từ SQLite.'); }
    }).catch(() => { if (alive) setDbStatus('Không mở được SQLite. Bấm Đọc lại để thử lại.'); });
    if (!isExpoGo) {
      void Promise.resolve(configureLocalNotifications()).catch(() => {
        if (alive) setNotificationStatus('Không tải được module thông báo. Dùng development build và thử lại.');
      });
      void (async () => {
        try {
          const Notifications = await loadNotifications();
          if (!alive) return;
          const onResponse = (response: Notifications.NotificationResponse) => {
            if (response.notification.request.identifier === 'gm02-local-spike' && response.notification.request.content.data?.spike === 'gm02-local') {
              setNotificationStatus('Đã nhận thao tác chạm thông báo cục bộ. Chưa kiểm remote push.');
              void Notifications.clearLastNotificationResponseAsync().catch(() => { /* safe to retry on next launch */ });
            }
          };
          const subscription = Notifications.addNotificationResponseReceivedListener(onResponse);
          removeNotificationListener = () => subscription.remove();
          void Notifications.getLastNotificationResponseAsync().then((response) => {
            if (alive && response) onResponse(response);
          }).catch(() => { if (alive) setNotificationStatus('Không đọc được thao tác thông báo. Có thể thử gửi lại.'); });
        } catch {
          if (alive) setNotificationStatus('Không tải được module thông báo. Dùng development build và thử lại.');
        }
      })();
    }
    // A background camera must be unmounted; permission is never requested on launch.
    const appState = AppState.addEventListener('change', (state) => { if (state !== 'active') setScanning(false); });
    return () => { alive = false; removeNotificationListener?.(); appState.remove(); };
  }, [isExpoGo]);

  useFocusEffect(useCallback(() => () => setScanning(false), []));

  async function openCamera() {
    try {
      const result = await requestPermission();
      if (result.granted) { scanned.current = false; setScanning(true); setLinkStatus('Hướng camera vào QR link mẫu.'); }
      else setLinkStatus('Camera chưa được cấp quyền. Bạn vẫn nhập mã thủ công được.');
    } catch { setLinkStatus('Không mở được camera. Hãy nhập mã thủ công.'); }
  }

  function openCode(value: string | null) {
    setScanning(false);
    if (value) router.push({ pathname: '/join', params: { code: value } });
    else setLinkStatus('QR/mã không hợp lệ. Chỉ nhận scheme và mã mẫu được cho phép.');
  }

  async function changeCounter(action: () => Promise<number>) {
    setDbBusy(true);
    try { setCounter(await action()); setDbStatus('Đã đọc/ghi SQLite. Đóng rồi mở app để kiểm tra lưu bền.'); }
    catch { setDbStatus('SQLite gặp lỗi. Giá trị trên màn hình chưa được xác nhận mới; hãy Đọc lại.'); }
    finally { setDbBusy(false); }
  }

  async function sendLocalNotification() {
    if (isExpoGo) {
      setNotificationStatus('Expo Go Android không hỗ trợ module notifications này. Dùng development build để thử thông báo.');
      return;
    }
    setNotificationBusy(true);
    try {
      const result = await scheduleLocalNotification();
      setNotificationStatus(result === 'scheduled'
        ? 'Đã lên lịch sau 3 giây. Chuyển app ra nền rồi chạm thông báo để kiểm tra.'
        : 'Quyền thông báo bị từ chối. Các phép thử khác vẫn hoạt động; bật lại trong Cài đặt nếu muốn.');
    } catch { setNotificationStatus('Không lên lịch được thông báo. Kiểm quyền và dùng Android development build.'); }
    finally { setNotificationBusy(false); }
  }

  return <SpikePage>
    <SpikeCard title="Bản kiểm tra nền GM-02">
      <SpikeText>Thử nghiệm kỹ thuật trên sanbox. Chưa có chọn món, tài khoản, phòng nhóm hoặc API.</SpikeText>
      <SpikeText>{isExpoGo ? 'Expo Go: chưa đủ để nghiệm thu native/push.' : 'Dùng development build để thử native.'} {Device.isDevice ? 'Thiết bị thật.' : 'Giả lập: cần máy thật để kiểm QR/push.'}</SpikeText>
    </SpikeCard>
    <SpikeCard title="1 · QR, link và mã thủ công">
      <SpikeText>Link mẫu: gi-cung-duoc://join?code=ABC234. Chỉ mở màn kiểm tra; không tự tham gia phòng.</SpikeText>
      <TextInput accessibilityLabel="Mã phòng thử nghiệm" value={code} onChangeText={(value) => setCode(value.toUpperCase())} autoCapitalize="characters" autoCorrect={false}
        maxLength={6} placeholder="ABC234" placeholderTextColor={colors.muted}
        style={[styles.input, { color: colors.text, borderColor: colors.muted }]} />
      <SpikeButton title="Kiểm tra mã" onPress={() => openCode(parseManualCode(code))} />
      <SpikeButton title={scanning ? 'Đóng camera' : 'Mở camera quét QR'} onPress={() => scanning ? setScanning(false) : void openCamera()} />
      {permission && !permission.granted && !permission.canAskAgain && <SpikeButton title="Mở Cài đặt quyền camera" onPress={() => {
        void Linking.openSettings().catch(() => setLinkStatus('Không mở được Cài đặt. Hãy mở quyền ứng dụng từ hệ thống.'));
      }} />}
      {scanning && permission?.granted && <View style={styles.camera}>
        <CameraView accessibilityLabel="Camera quét QR thử nghiệm" style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            if (scanned.current) return;
            scanned.current = true;
            openCode(parseJoinLink(data));
          }}
          onMountError={() => { setScanning(false); setLinkStatus('Camera lỗi. Dùng mã thủ công hoặc thử lại.'); }} />
      </View>}
      <SpikeText status>{linkStatus}</SpikeText>
    </SpikeCard>
    <SpikeCard title="2 · SQLite qua lần mở lại">
      <SpikeText status>Bộ đếm: {counter ?? 'chưa đọc được'}. {dbStatus}</SpikeText>
      <SpikeButton title="Tăng bộ đếm" disabled={dbBusy || counter === null} onPress={() => void changeCounter(incrementCounter)} />
      <SpikeButton title="Đọc lại" disabled={dbBusy} onPress={() => void changeCounter(readCounter)} />
      <SpikeButton title="Đặt lại về 0" disabled={dbBusy || counter === null} onPress={() => void changeCounter(resetCounter)} />
      <SpikeText>Chỉ lưu một số vô danh trong gm02-spike.db. Chưa là cache/outbox/session của sản phẩm.</SpikeText>
    </SpikeCard>
    <SpikeCard title="3 · Đường thông báo">
      <SpikeButton title="Xin quyền và thử thông báo cục bộ" disabled={notificationBusy} onPress={() => void sendLocalNotification()} />
      <SpikeText status>{notificationStatus}</SpikeText>
      <SpikeText>Remote push: chưa cấu hình project/FCM hoặc server sender. Không lấy/log push token, không gửi dữ liệu ra server. GM-18 sẽ kiểm push và inbox thật.</SpikeText>
    </SpikeCard>
  </SpikePage>;
}

const styles = StyleSheet.create({
  input: { minHeight: 48, borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 18 },
  camera: { height: 240, overflow: 'hidden', borderRadius: 12 },
});
