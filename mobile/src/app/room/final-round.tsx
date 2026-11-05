import { useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FinalRoundScreen } from '../../features/voting';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { createLiveVoteRepository } from '../../features/voting/services/voteRepository';

export default function FinalRoundRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const isReal = live.mode === 'real';

  const repository = useMemo(() => {
    return isReal ? createLiveVoteRepository({ roomRepository: live.repository }) : undefined;
  }, [isReal, live.repository]);

  return (
    <FinalRoundScreen
      roomId={typeof roomId === 'string' ? roomId : undefined}
      repository={repository}
      onFinish={() => {
        router.replace(typeof roomId === 'string' ? { pathname: '/room/result', params: { roomId } } : '/room/result');
      }}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/room/vote'))}
    />
  );
}
