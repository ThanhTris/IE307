import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSetupPreview, SetupPreviewControls } from '../../bootstrap/roomSetupPreview';
import { ContextScreen } from '../../features/context/screens/ContextScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';

export default function ContextRoute() {
  const router = useRouter();
  const { roomId } = useLocalSearchParams<{ roomId?: string }>();
  const preview = useSetupPreview();
  const live = useRoomRepository();
  const isReal = live.mode === 'real' && Boolean(roomId);
  const { colors } = useShellTheme();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const home = () => router.dismissTo('/');

  if (isReal && typeof roomId === 'string') {
    return (
      <ContextScreen
        key={`real-${roomId}`}
        repository={live.repository}
        roomId={roomId}
        userId={live.user?.id ?? ''}
        onBack={back}
        onHome={home}
        onContinue={room => router.push({ pathname: '/gm10/preferences', params: { roomId: room.roomId } })}
      />
    );
  }

  if (!preview.fixture) return <SetupFrame title="Bối cảnh phòng mẫu" onBack={back} onHome={home} controls={<SetupPreviewControls />}><StatusNotice title={preview.error ? 'Chưa mở được phòng mẫu' : 'Đang mở phòng mẫu…'} colors={colors} /></SetupFrame>;
  return <ContextScreen key={preview.scenario} {...preview.fixture} onBack={back} onHome={home} onContinue={() => router.push('/gm10/preferences')} previewControls={busy => <SetupPreviewControls disabled={busy} />} />;
}
