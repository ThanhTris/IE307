import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ReturnToRoomCard } from '../../features/rooms/components/ReturnToRoomCard';
import { resumeHref } from '../../features/home/services/resumeRoom';
import { JoinRoomScreen } from '../../features/rooms/screens/JoinRoomScreen';
import { QrCameraScanner } from '../../features/rooms/components/QrCameraScanner';
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
  const live = useRoomRepository();

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

  return <RequireActiveSession onHome={() => router.replace('/')}>
    <JoinRoomScreen
      repository={live.repository}
      preview={(c: string) => live.repository.previewJoin(c)}
      qrScannerAdapter={qrAdapter}
      renderScanner={isSimulatedScanner ? undefined : onScanned => <QrCameraScanner onScanned={onScanned} />}
      initialDisplayName={live.user?.displayName}
      initialCode={activeCode}
      linkError={effectiveError ?? undefined}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      returnToRoom={<ReturnToRoomCard repository={live.repository} userId={live.user?.id} onReturn={room => router.replace(resumeHref(room))} />}
      onEntered={room => {
        void (async () => {
          // Coming back to a room that already started (round 1) goes to its own screen, not to the preferences.
          const snapshot = await live.repository.getRoomSnapshot(room.roomId).catch(() => undefined);
          // Cannot tell whether the room started: the continue screen reads it again and picks the right screen.
          if (!snapshot?.ok) router.replace('/continue-session');
          else if (snapshot.data.state !== 'LOBBY') router.replace(resumeHref(snapshot.data));
          // Members skip room settings and go straight to their own preferences.
          else router.replace({ pathname: '/room/setup', params: { roomId: room.roomId, stage: 'preferences' } });
        })();
      }}
    />
  </RequireActiveSession>;
}
