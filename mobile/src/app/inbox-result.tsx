import { useLocalSearchParams, useRouter } from 'expo-router';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { LegacyInboxResultScreen } from '../features/inbox/screens/LegacyInboxResultScreen';

export default function InboxResultRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ roomId?: string; resultId?: string }>();
  const roomId = typeof params.roomId === 'string' ? params.roomId : undefined;
  const resultId = typeof params.resultId === 'string' ? params.resultId : undefined;
  return <RequireActiveSession onHome={() => router.replace('/')}>
    <LegacyInboxResultScreen
      roomId={roomId}
      resultId={resultId}
      onHome={() => router.replace('/')}
      onNewSession={() => router.replace('/room/create-entry')}
    />
  </RequireActiveSession>;
}
