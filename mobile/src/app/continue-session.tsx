import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ContinueSessionScreen } from '../features/home/screens/ContinueSessionScreen';
import { readLastRoom } from '../features/rooms/services/lastRoomStore';
import { resumeHref } from '../features/home/services/resumeRoom';

export default function ContinueSessionRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const [roomId, setRoomId] = useState<string | undefined>();
  useEffect(() => {
    let active = true;
    if (live.user?.id) void readLastRoom(live.user.id).then(value => { if (active) setRoomId(value); });
    return () => { active = false; };
  }, [live.user?.id]);
  return <ContinueSessionScreen
    repository={live.repository}
    receipt={roomId ? { roomId } : null}
    userId={live.user?.id}
    enabled={!live.isInitializing && live.status === 'active' && live.issue === 'none'}
    isInitializing={live.isInitializing}
    onHome={() => router.replace('/')}
    onContinue={room => router.replace(resumeHref(room))}
  />;
}
