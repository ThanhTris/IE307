import { useCallback, useEffect, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { isPermissionsOnboarded } from '../features/permissions/services/permissionsOnboarding';

export default function IndexRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const [roomRevision, setRoomRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRoomRevision(value => value + 1); }, []));

  // First run on this phone after sign-in: ask for permissions once (checked per phone, not per account).
  const [onboarded, setOnboarded] = useState<boolean | undefined>();
  const signedIn = live.status === 'active' && !!live.user;
  useEffect(() => {
    if (!signedIn) return;
    let active = true;
    void isPermissionsOnboarded().then(value => { if (active) setOnboarded(value); });
    return () => { active = false; };
  }, [signedIn]);
  if (signedIn && onboarded === false) return <Redirect href="/welcome-permissions" />;

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
      onDevRoundTwo={__DEV__ ? () => router.push('/dev/round-two' as never) : undefined}
      onDevFlashcard={__DEV__ ? () => router.push('/dev/flashcard' as never) : undefined}
      onDevIcons={__DEV__ ? () => router.push('/dev/icons' as never) : undefined}
      onHistory={() => router.push('/history')}
      onInbox={() => router.push('/inbox')}
      onProfile={() => router.push('/profile')}
      onTutorial={() => router.push('/tutorial')}
    />
  );
}
