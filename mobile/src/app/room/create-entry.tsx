import { useRouter } from 'expo-router';
import { useRoomPreview } from '../../bootstrap/roomPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { CreateRoomEntryScreen } from '../../features/rooms/screens/CreateRoomEntryScreen';

export default function CreateRoomEntryRoute() {
  const router = useRouter(), live = useRoomRepository(), preview = useRoomPreview();
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const entry = <CreateRoomEntryScreen displayName={live.mode === 'real' ? live.user?.displayName : preview.guestName ?? undefined} onBack={back} isMock={live.mode !== 'real'} onOpenSetup={live.mode === 'real' ? undefined : async () => { router.push('/room/setup'); return true; }} />;
  return live.mode === 'real' ? <RequireActiveSession onHome={() => router.replace('/')}>{entry}</RequireActiveSession> : entry;
}
