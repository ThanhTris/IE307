import { useLocalSearchParams, useRouter } from 'expo-router';
import { DishResultEntry } from '../../bootstrap/DishResultEntry';

export default function NoConsensusRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ legacy?: string; roomId?: string }>();
  const legacy = params.legacy === '1';
  const roomId = typeof params.roomId === 'string' && params.roomId.trim() ? params.roomId.trim() : undefined;

  return (
    <DishResultEntry
      legacy={legacy}
      noConsensus
      roomId={roomId}
      onHome={() => router.dismissTo('/')}
      onNewSession={() => router.replace('/room/create-entry')}
      onLegacyNewSession={() => router.replace('/room/create')}
      onOtherScreen={() =>
        router.replace(
          legacy
            ? roomId
              ? `/room/result?legacy=1&roomId=${encodeURIComponent(roomId)}`
              : '/room/result?legacy=1'
            : roomId
              ? `/room/result?roomId=${encodeURIComponent(roomId)}`
              : '/room/result'
        )
      }
    />
  );
}
