import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { previewSessionToken, useRoomPreview } from '../bootstrap/roomPreview';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function IndexRoute() {
  const router = useRouter();
  const preview = useRoomPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';
  const [roomRevision, setRoomRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRoomRevision(value => value + 1); }, []));

  const repository = isReal ? live.repository : preview.client;
  const sessionToken = isReal ? undefined : previewSessionToken;

  const needsGuestEntry = isReal
    ? !live.isInitializing && live.status === 'empty' && live.issue === 'no-session' && !live.user
    : !preview.guestName && !preview.active;
  if (needsGuestEntry) return <Redirect href="/welcome" />;
  if (!isReal && preview.guestName && !preview.active && !preview.tutorialSeen) return <Redirect href="/tutorial" />;

  return (
    <HomeScreen
      key={isReal ? 'live-home' : preview.revision}
      repository={repository}
      sessionToken={sessionToken}
      liveSession={isReal ? live : undefined}
      activeRoom={isReal ? undefined : preview.active}
      roomRevision={roomRevision}
      onCreate={() => router.push(isReal ? '/room/create' : '/room/create-entry')}
      onJoin={() => router.push(isReal ? '/room/join' : '/room/join-entry')}
      onResume={() => router.push('/continue-session')}
      onFriends={() => router.push('/friends')}
      onHistory={() => router.push('/history')}
      onInbox={() => router.push('/inbox')}
      onTutorial={() => router.push('/tutorial')}
    />
  );
}
