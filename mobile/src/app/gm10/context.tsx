import { useRouter } from 'expo-router';
import { useSetupPreview, SetupPreviewControls } from '../../bootstrap/roomSetupPreview';
import { ContextScreen } from '../../features/context/screens/ContextScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';

export default function ContextRoute() {
  const router = useRouter();
  const preview = useSetupPreview();
  const { colors } = useShellTheme();
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const home = () => router.dismissTo('/');
  if (!preview.fixture) return <SetupFrame title="Bối cảnh phòng mẫu" onBack={back} onHome={home} controls={<SetupPreviewControls />}><StatusNotice title={preview.error ? 'Chưa mở được phòng mẫu' : 'Đang mở phòng mẫu…'} colors={colors} /></SetupFrame>;
  return <ContextScreen key={preview.scenario} {...preview.fixture} onBack={back} onHome={home} onContinue={() => router.push('/gm10/preferences')} previewControls={busy => <SetupPreviewControls disabled={busy} />} />;
}
