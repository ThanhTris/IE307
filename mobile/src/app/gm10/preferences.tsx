import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSetupPreview, SetupPreviewControls, setupCatalogue } from '../../bootstrap/roomSetupPreview';
import { PreferencesScreen } from '../../features/preferences/screens/PreferencesScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { defaultPreferenceCatalogue } from '../../features/rooms/services/roomRepository';

export default function PreferencesRoute() {
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
      <PreferencesScreen
        key={`real-${roomId}`}
        repository={live.repository}
        roomId={roomId}
        userId={live.user?.id ?? ''}
        catalogue={defaultPreferenceCatalogue}
        onBack={back}
        onHome={home}
        onContinue={room => router.push({ pathname: '/gm11/lobby', params: { roomId: room.roomId } })}
      />
    );
  }

  if (!preview.fixture) return <SetupFrame title="Khẩu vị mẫu" onBack={back} onHome={home} controls={<SetupPreviewControls />}><StatusNotice title={preview.error ? 'Chưa mở được phòng mẫu' : 'Đang mở phòng mẫu…'} colors={colors} /></SetupFrame>;
  return <PreferencesScreen key={preview.scenario} {...preview.fixture} catalogue={setupCatalogue} onBack={back} onHome={home} previewControls={busy => <SetupPreviewControls disabled={busy} />} />;
}
