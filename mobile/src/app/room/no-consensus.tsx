import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { DishResultEntry } from '../../features/result/screens/DishResultEntry';
import { leaveAfterFailure } from '../../features/support/leaveAfterFailure';
import type { FailureExit } from '../../shared/errors/failure';

export default function NoConsensusRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const isGuest = live.user?.isGuest === true;
  const params = useLocalSearchParams<{ roomId?: string; resultId?: string }>();
  const roomId = typeof params.roomId === 'string' && params.roomId.trim() ? params.roomId.trim() : undefined;
  const resultId = typeof params.resultId === 'string' && params.resultId.trim() ? params.resultId.trim() : undefined;

  const buildResultUrl = () => {
    const q = new URLSearchParams();
    if (roomId) q.set('roomId', roomId);
    if (resultId) q.set('resultId', resultId);
    const qs = q.toString();
    return qs ? `/room/result?${qs}` : '/room/result';
  };

  return (
    <DishResultEntry
      noConsensus
      roomId={roomId}
      resultId={resultId}
      onHome={() => router.dismissTo('/')}
      onSignIn={() => {
        void live.logout().then(() => router.replace({ pathname: '/account/[flow]', params: { flow: 'sign-in' } }));
      }}
      onExit={(exit: FailureExit) => leaveAfterFailure(router, exit, { screen: 'room/no-consensus', scope: 'result', isGuest })}
      onNewSession={() => router.replace('/room/create')}
      onOtherScreen={() => router.replace(buildResultUrl())}
    />
  );
}
