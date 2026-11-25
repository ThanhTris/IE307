import { useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { LobbyScreen } from '../../features/rooms/screens/LobbyScreen';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createDurableRequestId } from '../../features/rooms/services/roomRepository';
import { createLiveDishSetupGateway } from '../../features/context/services/liveDishSetupGateway';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { leaveAfterFailure } from '../../features/support/leaveAfterFailure';

export default function LobbyRoute() {
  const router = useRouter();
  const { roomId, invite } = useLocalSearchParams<{ roomId?: string; invite?: string }>();
  const autoInvite = useMemo(() => typeof invite === 'string' && invite ? invite.split(',') : [], [invite]);
  const live = useRoomRepository();
  // Kept after the session is lost, when `live.user` is already gone.
  const guest = useRef(live.user?.isGuest === true);
  useEffect(() => { if (live.user) guest.current = live.user.isGuest === true; }, [live.user]);
  const id = typeof roomId === 'string' ? roomId : undefined;
  const settingsGateway = useMemo(() => createLiveDishSetupGateway(live.repository, id), [live.repository, id]);
  return <RequireActiveSession onHome={() => router.replace('/')}>
    <LobbyScreen
      key={`${roomId ?? 'missing'}-${live.user?.id ?? 'unknown'}`}
      onNavigate={path => router.push(path as Href)}
      onHome={() => router.replace('/')}
      onExit={exit => leaveAfterFailure(router, exit, { screen: 'room/lobby', scope: 'room', isGuest: guest.current })}
      repository={live.repository}
      roomId={typeof roomId === 'string' ? roomId : undefined}
      currentUserId={live.user?.id}
      createRequestId={action => createDurableRequestId(`lobby_${action}`)}
      onStartRound={snapshot => router.replace({ pathname: '/room/vote', params: { roomId: snapshot.roomId } })}
      settingsGateway={settingsGateway}
      autoInvite={live.user?.isGuest ? undefined : autoInvite}
      canInviteFriends={!live.user?.isGuest}
      onEditPreferences={snapshot => router.push({ pathname: '/room/setup', params: { roomId: snapshot.roomId, stage: 'preferences' } })}
    />
  </RequireActiveSession>;
}
