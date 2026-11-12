import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function IndexRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const [roomRevision, setRoomRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRoomRevision(value => value + 1); }, []));

  if (!live.isInitializing && live.status === 'empty' && live.issue === 'no-session' && !live.user) return <Redirect href="/welcome" />;

  return (
    <HomeScreen
      repository={live.repository}
      liveSession={live}
      roomRevision={roomRevision}
      onCreate={() => router.push('/room/create')}
      onJoin={() => router.push('/room/join')}
      onResume={() => router.push('/continue-session')}
      onFriends={() => router.push('/friends')}
      onQuickInvite={friendUserId => router.push({ pathname: '/room/setup', params: { invite: friendUserId } })}
      onDevResult={__DEV__ ? () => router.push('/dev/result' as never) : undefined}
      onHistory={() => router.push('/history')}
      onInbox={() => router.push('/inbox')}
      onProfile={() => router.push('/profile')}
      onTutorial={() => router.push('/tutorial')}
    />
  );
}
