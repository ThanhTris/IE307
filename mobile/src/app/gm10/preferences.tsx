import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSetupPreview, SetupPreviewControls, setupCatalogue } from '../../bootstrap/roomSetupPreview';
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
  const preview = useSetupPreview();
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const home = () => router.dismissTo('/');

  if (live.mode === 'real') {
    if (!roomId) {
      return <RequireActiveSession onHome={home}>
        <SetupFrame title="Khẩu vị phòng" onBack={back} onHome={home}>
          <StatusNotice
            title="Chưa chọn phòng"
            message="Cần có phòng để thiết lập khẩu vị. Hãy tạo phòng mới hoặc vào phòng có sẵn."
            tone="warning"
            actionLabel="Tạo phòng mới"
            onAction={() => router.push('/create-room')}
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
        onContinue={room => router.push({ pathname: '/gm11/lobby', params: { roomId: room.roomId } })}
      />
    </RequireActiveSession>;
  }

  if (!preview.fixture) return <SetupFrame title="Khẩu vị mẫu" onBack={back} onHome={home} controls={<SetupPreviewControls />}><StatusNotice title={preview.error ? 'Chưa mở được phòng mẫu' : 'Đang mở phòng mẫu…'} colors={colors} /></SetupFrame>;
  return <PreferencesScreen key={preview.scenario} {...preview.fixture} catalogue={setupCatalogue} onBack={back} onHome={home} previewControls={busy => <SetupPreviewControls disabled={busy} />} />;
}
