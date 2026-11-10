import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FinalRoundScreen } from '../../features/voting';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createDurableVoteRepository } from '../../features/voting/services/durableVoteRepository';

export default function FinalRoundRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const identityId = live.user?.id ?? 'unresolved';

  const repository = useMemo(() => {
    return createDurableVoteRepository({ roomRepository: live.repository });
  }, [live.repository]);

  return (
    <FinalRoundScreen
      key={`${identityId}:${typeof roomId === 'string' ? roomId : 'missing-room'}`}
      identityId={identityId}
      roomId={typeof roomId === 'string' ? roomId : undefined}
      repository={repository}
      onFinish={result => {
        const isNoConsensus = (result as { status?: string })?.status === 'NO_CONSENSUS'
          || result?.matchTier === 'NO_CONSENSUS'
          || result?.reasonCode === 'ALL_REMOVED'
          || result?.reasonCode === 'EMPTY_INTERSECTION';

        if (isNoConsensus) {
          router.replace(typeof roomId === 'string' ? { pathname: '/room/no-consensus', params: { roomId } } : '/room/no-consensus');
        } else {
          router.replace(typeof roomId === 'string' ? { pathname: '/room/result', params: { roomId } } : '/room/result');
        }
      }}
      onGoToResult={() => {
        router.replace(typeof roomId === 'string' ? { pathname: '/room/result', params: { roomId } } : '/room/result');
      }}
      onGoToNoConsensus={() => {
        router.replace(typeof roomId === 'string' ? { pathname: '/room/no-consensus', params: { roomId } } : '/room/no-consensus');
      }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/room/vote'))}
    />
  );
}
