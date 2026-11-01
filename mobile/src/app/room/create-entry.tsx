import { useRouter } from 'expo-router';
import { useRoomPreview } from '../../bootstrap/roomPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { CreateRoomEntryScreen } from '../../features/rooms/screens/CreateRoomEntryScreen';

export default function CreateRoomEntryRoute() {
  const router = useRouter(), live = useRoomRepository(), preview = useRoomPreview();
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  // GM-10.1 is a location-based legacy form. Do not present it as dish-only setup.
  const entry = <CreateRoomEntryScreen displayName={live.mode === 'real' ? live.user?.displayName : preview.guestName ?? undefined} onBack={back} isMock={live.mode !== 'real'} />;
  return live.mode === 'real' ? <RequireActiveSession onHome={() => router.replace('/')}>{entry}</RequireActiveSession> : entry;
}
