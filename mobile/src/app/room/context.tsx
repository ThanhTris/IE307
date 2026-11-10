import { useLocalSearchParams, useRouter } from 'expo-router';
import { ContextScreen } from '../../features/context/screens/ContextScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function ContextRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const home = () => router.dismissTo('/');
    if (!roomId) {
      return <RequireActiveSession onHome={home}>
        <SetupFrame title="Bối cảnh phòng" onBack={back} onHome={home}>
          <StatusNotice
            title="Chưa chọn phòng"
            message="Cần có phòng để thiết lập bối cảnh. Hãy tạo phòng mới hoặc vào phòng có sẵn."
            tone="warning"
            actionLabel="Tạo phòng mới"
            onAction={() => router.push('/room/create')}
            colors={colors}
          />
        </SetupFrame>
      </RequireActiveSession>;
    }
    return <RequireActiveSession onHome={home}>
      <ContextScreen
        key={`real-${roomId}-${live.user?.id ?? 'unknown'}`}
        repository={live.repository}
        roomId={roomId}
        userId={live.user?.id ?? ''}
        onBack={back}
        onHome={home}
        onContinue={room => router.push({ pathname: '/room/preferences', params: { roomId: room.roomId } })}
      />
    </RequireActiveSession>;
}
