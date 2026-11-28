import { useCallback, useState } from 'react';
import { Redirect, useFocusEffect, useRouter } from 'expo-router';
import { resumeHref } from '../features/home/services/resumeRoom';
import { HomeScreen } from '../features/home/screens/HomeScreen';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { isPermissionsOnboarded } from '../features/permissions/services/permissionsOnboarding';

export default function IndexRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const [roomRevision, setRoomRevision] = useState(0);
  useFocusEffect(useCallback(() => { setRoomRevision(value => value + 1); }, []));

  // Ask once on this installation. The user ID is only for migrating an old flag.
  const [onboarding, setOnboarding] = useState<{ userId: string; done: boolean }>();
  const userId = live.status === 'active' ? live.user?.id : undefined;
  useFocusEffect(useCallback(() => {
    if (!userId) return;
    let active = true;
    void isPermissionsOnboarded(userId).then(done => { if (active) setOnboarding({ userId, done }); });
    return () => { active = false; };
  }, [userId]));
  if (userId && onboarding?.userId === userId && !onboarding.done) return <Redirect href="/welcome-permissions" />;

  if (!live.isInitializing && live.status === 'empty' && live.issue === 'no-session' && !live.user) return <Redirect href="/welcome" />;

  return (
    <HomeScreen
      repository={live.repository}
      liveSession={live}
      roomRevision={roomRevision}
      onCreate={() => router.push('/room/create')}
      onJoin={() => router.push('/room/join')}
      onResume={() => router.push('/continue-session')}
      onReturnToRoom={room => router.replace(resumeHref(room))}
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
