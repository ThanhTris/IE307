import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VoteScreen } from '../../features/voting';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createLiveVoteRepository } from '../../features/voting/services/voteRepository';

export default function VoteRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = useMemo(() => {
    return isReal ? createLiveVoteRepository({ roomRepository: live.repository }) : undefined;
  }, [isReal, live.repository]);

  return (
    <VoteScreen
      roomId={typeof roomId === 'string' ? roomId : undefined}
      repository={repository}
      initialViewMode="flashcard"
      onGoToFinalRound={() => {
        router.push(typeof roomId === 'string' ? { pathname: '/room/final-round', params: { roomId } } : '/room/final-round');
      }}
      onGoToResult={() => {
        router.push(typeof roomId === 'string' ? { pathname: '/room/result', params: { roomId } } : '/room/result');
      }}
      onGoToNoConsensus={() => {
        router.push(typeof roomId === 'string' ? { pathname: '/room/no-consensus', params: { roomId } } : '/room/no-consensus');
      }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
