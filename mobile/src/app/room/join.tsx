import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const isSuspicious = isSuspiciousSearchParams(rawParams as Record<string, unknown>);
  const initialParamCode = !isSuspicious
    ? (typeof rawParams.code === 'string' ? rawParams.code : Array.isArray(rawParams.code) ? rawParams.code[0] ?? '' : '')
    : '';

  const [incomingCode, setIncomingCode] = useState('');
  const [linkError, setLinkError] = useState<string | null>(isSuspicious ? 'SUSPICIOUS_PAYLOAD' : null);

  useEffect(() => {
    const unsubscribe = subscribeToJoinLinks({
      onJoinCode: (codeFromLink) => {
        setIncomingCode(codeFromLink);
        setLinkError(null);
      },
      onError: (err) => {
        setIncomingCode('');
        setLinkError(err);
      },
    });
    return unsubscribe;
  }, []);

  // When link is blocked or has error, activeCode MUST be empty string so code is not prefilled and previewJoin is never executed automatically
  const activeCode = linkError ? '' : (incomingCode || initialParamCode);

  // Scanner configuration:
  // In real QA backend on AVD (Chặng 3A), simulation must be explicitly requested via simulatedScanner=1 or simulated=1.
  // Otherwise, default to NativeQrScannerAdapter (which directs to manual code entry on camera denial/unavailability).
  const isSimulatedScanner = rawParams.simulatedScanner === '1' || rawParams.simulated === '1';
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
        linkError={linkError ?? undefined}
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
  );
  return content;
}
