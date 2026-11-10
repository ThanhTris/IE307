import { useLocalSearchParams, useRouter } from 'expo-router';
import { PreferencesScreen } from '../../features/preferences/screens/PreferencesScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { defaultPreferenceCatalogue } from '../../features/rooms/services/roomRepository';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function PreferencesRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const home = () => router.dismissTo('/');
    if (!roomId) {
      return <RequireActiveSession onHome={home}>
        <SetupFrame title="Khẩu vị phòng" onBack={back} onHome={home}>
          <StatusNotice
            title="Chưa chọn phòng"
            message="Cần có phòng để thiết lập khẩu vị. Hãy tạo phòng mới hoặc vào phòng có sẵn."
            tone="warning"
            actionLabel="Tạo phòng mới"
            onAction={() => router.push('/room/create')}
            colors={colors}
          />
        </SetupFrame>
      </RequireActiveSession>;
    }
    return <RequireActiveSession onHome={home}>
      <PreferencesScreen
        key={`real-${roomId}-${live.user?.id ?? 'unknown'}`}
        repository={live.repository}
        roomId={roomId}
        userId={live.user?.id ?? ''}
        catalogue={defaultPreferenceCatalogue}
        onBack={back}
        onHome={home}
        onContinue={room => router.push({ pathname: '/room/lobby', params: { roomId: room.roomId } })}
      />
    </RequireActiveSession>;
}
