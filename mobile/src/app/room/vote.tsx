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
  const identityId = live.user?.id ?? (isReal ? 'unresolved' : 'mock');

  const repository = useMemo(() => {
    return isReal ? createLiveVoteRepository({ roomRepository: live.repository }) : undefined;
  }, [isReal, live.repository]);

  return (
    <VoteScreen
      key={`${identityId}:${typeof roomId === 'string' ? roomId : 'missing-room'}`}
      identityId={identityId}
      roomId={typeof roomId === 'string' ? roomId : undefined}
      repository={repository}
      showScenarioPicker={!isReal}
      initialViewMode="flashcard"
      onGoToFinalRound={() => {
        router.push(typeof roomId === 'string' ? { pathname: '/room/final-round', params: { roomId } } : '/room/final-round');
      }}
      onGoToResult={() => {
        router.replace(typeof roomId === 'string' ? { pathname: '/room/result', params: { roomId } } : '/room/result');
      }}
      onGoToNoConsensus={() => {
        router.replace(typeof roomId === 'string' ? { pathname: '/room/no-consensus', params: { roomId } } : '/room/no-consensus');
      }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
    />
  );
}
