import { useMemo } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { FriendsScreen } from '../features/friends/screens/FriendsScreen';
import { createSocialRepository } from '../features/friends/services/socialRepository';
import { createInboxRepository } from '../features/inbox/services/inboxRepository';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { GuestFeatureNotice } from '../features/auth/components/GuestFeatureNotice';
import { leaveAfterFailure } from '../features/support/leaveAfterFailure';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';

export default function FriendsRoute() {
  const router = useRouter();
  const { from, code } = useLocalSearchParams<{ from?: string; code?: string }>();
  const live = useRoomRepository();
  const repository = useMemo(() => createSocialRepository(live.repository), [live.repository]);
  const inboxRepository = useMemo(() => createInboxRepository(live.repository), [live.repository]);
  const home = () => router.replace('/');
  const signIn = () => {
    void live.logout().then(() => router.replace({ pathname: '/account/[flow]', params: { flow: 'sign-in' } }));
  };
  if (live.status === 'active' && live.user?.isGuest) {
    return <GuestFeatureNotice feature="friends" onHome={home} onNavigate={path => router.push(path as Href)}
      onBack={from === 'lobby' ? () => router.back() : undefined} />;
  }
  return <RequireActiveSession onHome={home} onSignIn={signIn}>
    <FriendsScreen
      key={`${live.user?.id ?? 'unknown'}:${code ?? ''}`}
      initialSearch={code}
      repository={repository}
      inboxRepository={inboxRepository}
      onNavigate={path => router.push(path as Href)}
      onHome={home}
      onAuthExpired={() => leaveAfterFailure(router, { code: 'AUTH_REQUIRED' }, { screen: 'friends', scope: 'social', isGuest: false })}
      onBack={from === 'lobby' ? () => router.back() : undefined}
    />
  </RequireActiveSession>;
}
