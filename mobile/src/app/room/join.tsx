import { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusNotice } from '../../shared/ui';
import { JoinRoomScreen } from '../../features/rooms/screens/JoinRoomScreen';
import { JoinRoomEntryScreen } from '../../features/rooms/screens/JoinRoomEntryScreen';
import { RoomEntryReceiptScreen } from '../../features/rooms/screens/RoomEntryReceiptScreen';
import { PreviewControls, previewRoomCode, rememberPreviewRoom, useRoomPreview } from '../../bootstrap/roomPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import {
  isSuspiciousSearchParams,
  NativeQrScannerAdapter,
  SimulatedQrScannerAdapter,
  subscribeToJoinLinks,
} from '../../features/rooms/services/joinLinks';

export default function JoinRoomRoute() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = isReal ? live.repository : preview.client;

  // Validate incoming search params from Expo router: if suspicious payload is detected, reject and block
  const isSuspicious = isSuspiciousSearchParams(rawParams as Record<string, unknown>) || rawParams.error === 'SUSPICIOUS_PAYLOAD';

  // Extract explicit route param code (e.g. from in-app navigation or direct route params)
  const rawParamCode = !isSuspicious
    ? (typeof rawParams.code === 'string'
        ? rawParams.code.trim().toUpperCase()
        : Array.isArray(rawParams.code)
        ? (rawParams.code[0] ?? '').trim().toUpperCase()
        : '')
    : '';

  const [linkCode, setLinkCode] = useState('');
  const [linkError, setLinkError] = useState<string | null>(isSuspicious ? 'SUSPICIOUS_PAYLOAD' : null);
  const [, setInitialResolved] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToJoinLinks({
      onJoinCode: (codeFromLink, _rawUrl, source) => {
        setInitialResolved(true);
        // Priority guard (Review Round 5 Point 2):
        // If route was mounted with an explicit param code (e.g. MNP567 from navigation),
        // a late resolving cold start launch URL (e.g. GCD234) must NEVER overwrite it!
        // Warm start events (live incoming links) DO update it.
        if (source === 'cold' && rawParamCode && rawParamCode !== codeFromLink) {
          return;
        }
        setLinkCode(codeFromLink);
        setLinkError(null);
      },
      onError: (err, _rawUrl, source) => {
        setInitialResolved(true);
        // Suspicious payloads (userinfo credentials, secret tokens) MUST ALWAYS BLOCK immediately,
        // regardless of route param or launch timing!
        if (err !== 'SUSPICIOUS_PAYLOAD' && source === 'cold' && rawParamCode) {
          return;
        }
        setLinkCode('');
        setLinkError(err);
      },
      onInitialUrlEmpty: () => {
        setInitialResolved(true);
      },
    });
    return unsubscribe;
  }, [rawParamCode]);

  // When link is blocked or has error, activeCode MUST be empty string so code is not prefilled and previewJoin is never executed automatically
  const effectiveError = isSuspicious ? 'SUSPICIOUS_PAYLOAD' : linkError;

  // Active code priority:
  // 1. If effectiveError exists -> ''
  // 2. If linkCode was set (warm link event or cold link when no rawParamCode) -> linkCode
  // 3. Fallback to rawParamCode from navigation
  const activeCode = effectiveError
    ? ''
    : (linkCode || rawParamCode);

  // Scanner configuration:
  // In real QA backend on AVD (Chặng 3A), simulation must be explicitly requested via simulatedScanner=1 or simulated=1 AND ONLY in dev/QA (__DEV__).
  // Otherwise, default to NativeQrScannerAdapter (which directs to manual code entry on camera denial/unavailability).
  const isSimulatedScanner = Boolean(__DEV__) && (rawParams.simulatedScanner === '1' || rawParams.simulated === '1');
  const qrAdapter = useMemo(() => {
    if (isSimulatedScanner) {
      return new SimulatedQrScannerAdapter('granted');
    }
    return new NativeQrScannerAdapter();
  }, [isSimulatedScanner]);

  if (isReal) {
    const entry = (
      <JoinRoomEntryScreen
        repository={live.repository}
        preview={(c: string) => live.repository.previewJoin(c)}
        qrScannerAdapter={qrAdapter}
        initialDisplayName={live.user?.displayName}
        initialCode={activeCode}
        linkError={effectiveError ?? undefined}
        isMock={false}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onEntered={room => {
          router.replace({ pathname: '/room/preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
        }}
      />
    );
    return <RequireActiveSession onHome={() => router.replace('/')}>{entry}</RequireActiveSession>;
  }

  const content = preview.active ? (
    <RoomEntryReceiptScreen
      repository={preview.client}
      receipt={preview.active}
      onBack={() => router.replace('/')}
      onPreferences={r => router.push({ pathname: '/room/preferences', params: { roomId: r.roomId } })}
      onLobby={r => router.push({ pathname: '/room/lobby', params: { roomId: r.roomId } })}
      previewControls={busy => <PreviewControls disabled={busy} />}
    />
  ) : (
    <View style={{ flex: 1 }}>
      {effectiveError ? (
        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <StatusNotice
            title="Liên kết bị chặn"
            message="Liên kết chứa tham số không an toàn hoặc không hợp lệ. Bạn có thể nhập mã phòng bằng tay để tiếp tục."
            tone="warning"
          />
        </View>
      ) : null}
      <JoinRoomScreen
        key={preview.revision}
        repository={repository}
        isLive={false}
        initialDisplayName={preview.guestName ?? undefined}
        initialCode={activeCode}
        sampleCode={previewRoomCode}
        onScan={async () => ({ status: 'denied' })}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        onEntered={room => {
          rememberPreviewRoom(room);
          router.replace({ pathname: '/room/preview', params: { roomId: room.roomId, code: room.code, role: room.role, version: String(room.version) } });
        }}
        previewControls={busy => <PreviewControls disabled={busy} />}
      />
    </View>
  );
  return content;
}
