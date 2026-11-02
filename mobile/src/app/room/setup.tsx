import { useState } from 'react';
import { useRouter } from 'expo-router';
import { createDishSetupPreview } from '../../bootstrap/dishSetupPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { DishSetupFlow } from '../../features/context/screens/DishSetupFlow';
import { DishSetupFrame } from '../../features/context/components/DishSetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';

export default function DishSetupRoute() {
  const router = useRouter(), live = useRoomRepository(), { colors } = useShellTheme();
  const [gateway] = useState(() => createDishSetupPreview());
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  if (live.mode === 'real') return <DishSetupFrame title="Thiết lập phòng" onBack={back} footer={null}><StatusNotice title="Chưa nhận adapter thiết lập mới" message="Màn mẫu không ghi dữ liệu vào phòng thật." colors={colors} /></DishSetupFrame>;
  return <DishSetupFlow gateway={gateway} onExit={back} />;
}
