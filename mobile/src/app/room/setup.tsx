import { useRouter } from 'expo-router';
import { DishSetupPreviewFlow } from '../../bootstrap/DishSetupPreviewFlow';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { DishSetupFrame } from '../../features/context/components/DishSetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

export default function DishSetupRoute() {
  const router = useRouter(), live = useRoomRepository(), { colors } = useShellTheme();
  const back = () => router.dismissTo('/');
  if (live.mode === 'real') return <RequireActiveSession onHome={back}><DishSetupFrame title="Thiết lập phòng" onBack={back} footer={null} isMock={false}><StatusNotice title="Chưa nhận adapter thiết lập mới" message="Màn mẫu không ghi dữ liệu vào phòng thật." colors={colors} /></DishSetupFrame></RequireActiveSession>;
  return <DishSetupPreviewFlow onExit={back} />;
}
