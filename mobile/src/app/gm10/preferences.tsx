import { useRouter } from 'expo-router';
import { useSetupPreview, SetupPreviewControls, setupCatalogue } from '../../bootstrap/roomSetupPreview';
import { PreferencesScreen } from '../../features/preferences/screens/PreferencesScreen';
import { SetupFrame } from '../../features/context/components/SetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';

export default function PreferencesRoute() {
  const router = useRouter();
  const preview = useSetupPreview();
  const { colors } = useShellTheme();
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  const home = () => router.dismissTo('/');
  if (!preview.fixture) return <SetupFrame title="Khẩu vị mẫu" onBack={back} onHome={home} controls={<SetupPreviewControls />}><StatusNotice title={preview.error ? 'Chưa mở được phòng mẫu' : 'Đang mở phòng mẫu…'} colors={colors} /></SetupFrame>;
  return <PreferencesScreen key={preview.scenario} {...preview.fixture} catalogue={setupCatalogue} onBack={back} onHome={home} previewControls={busy => <SetupPreviewControls disabled={busy} />} />;
}
