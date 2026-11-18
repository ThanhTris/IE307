import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { ContinueSessionScreen } from '../features/home/screens/ContinueSessionScreen';
import { useActiveRoom } from '../features/rooms/hooks/useActiveRoom';
import { resumeHref } from '../features/home/services/resumeRoom';

export default function ContinueSessionRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const [revision, setRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRevision(value => value + 1); }, []));
  const enabled = !live.isInitializing && live.status === 'active' && live.issue === 'none';
  const lookup = useActiveRoom(live.repository, live.user?.id, enabled, revision);
  return <ContinueSessionScreen
    repository={live.repository}
    receipt={lookup.data}
    lookup={lookup}
    userId={live.user?.id}
    enabled={enabled}
    isInitializing={live.isInitializing}
    onHome={() => router.replace('/')}
    onContinue={room => router.replace(resumeHref(room))}
  />;
}
