import { useEffect, useMemo, useRef } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VoteScreen } from '../../features/voting';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createDurableVoteRepository } from '../../features/voting/services/durableVoteRepository';
import { VoteSkeleton } from '../../features/voting/components/VoteSkeleton';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';
import { leaveAfterFailure } from '../../features/support/leaveAfterFailure';

export default function VoteRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const guest = useRef(live.user?.isGuest === true);
  useEffect(() => { if (live.user) guest.current = live.user.isGuest === true; }, [live.user]);
  const identityId = live.user?.id ?? 'unresolved';

  const repository = useMemo(() => {
    return createDurableVoteRepository({ roomRepository: live.repository });
  }, [live.repository]);

  return (
    <RequireActiveSession
      onHome={() => router.replace('/')}
      onSignIn={() => router.replace({ pathname: '/account/[flow]', params: { flow: 'sign-in' } })}
      loading={<VoteSkeleton />}
    >
      <VoteScreen
        key={`${identityId}:${typeof roomId === 'string' ? roomId : 'missing-room'}`}
        identityId={identityId}
        roomId={typeof roomId === 'string' ? roomId : undefined}
        repository={repository}
        initialViewMode="flashcard"
        onExit={exit => leaveAfterFailure(router, exit, { screen: 'room/vote', scope: 'room', isGuest: guest.current })}
        onGoToFinalRound={() => {
          router.replace(typeof roomId === 'string' ? { pathname: '/room/final-round', params: { roomId } } : '/room/final-round');
        }}
        onGoToResult={() => {
          router.replace(typeof roomId === 'string' ? { pathname: '/room/result', params: { roomId } } : '/room/result');
        }}
        onGoToNoConsensus={() => {
          router.replace(typeof roomId === 'string' ? { pathname: '/room/no-consensus', params: { roomId } } : '/room/no-consensus');
        }}
        onBack={() => router.replace('/')}
      />
    </RequireActiveSession>
  );
}
