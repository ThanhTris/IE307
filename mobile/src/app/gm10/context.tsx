import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSetupPreview, SetupPreviewControls } from '../../bootstrap/roomSetupPreview';
import { ContextScreen } from '../../features/context/screens/ContextScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function ContextRoute() {
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
        <SetupFrame title="Bối cảnh phòng" onBack={back} onHome={home}>
          <StatusNotice
            title="Chưa chọn phòng"
            message="Cần có phòng để thiết lập bối cảnh. Hãy tạo phòng mới hoặc vào phòng có sẵn."
            tone="warning"
            actionLabel="Tạo phòng mới"
            onAction={() => router.push('/create-room')}
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
        onContinue={room => router.push({ pathname: '/gm10/preferences', params: { roomId: room.roomId } })}
      />
    </RequireActiveSession>;
  }

  if (!preview.fixture) return <SetupFrame title="Bối cảnh phòng mẫu" onBack={back} onHome={home} controls={<SetupPreviewControls />}><StatusNotice title={preview.error ? 'Chưa mở được phòng mẫu' : 'Đang mở phòng mẫu…'} colors={colors} /></SetupFrame>;
  return <ContextScreen key={preview.scenario} {...preview.fixture} onBack={back} onHome={home} onContinue={() => router.push('/gm10/preferences')} previewControls={busy => <SetupPreviewControls disabled={busy} />} />;
}
