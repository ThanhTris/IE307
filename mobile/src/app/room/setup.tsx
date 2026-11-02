import { useState } from 'react';
import { useRouter } from 'expo-router';
import { DishSetupScreen } from '../../features/context/screens/DishSetupScreen';
import { initialSetupDraft } from '../../features/context/services/dishSetup';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { DishSetupFrame } from '../../features/context/components/DishSetupFrame';
import { StatusNotice } from '../../shared/ui';
import { useShellTheme } from '../../shared/lib/useShellTheme';

export default function DishSetupRoute() {
  const router = useRouter(), live = useRoomRepository(), { colors } = useShellTheme();
  const [draft, setDraft] = useState(initialSetupDraft), [notice, setNotice] = useState<string>();
  const back = () => router.canGoBack() ? router.back() : router.replace('/');
  if (live.mode === 'real') return <DishSetupFrame title="Thiết lập phòng" onBack={back} footer={null}><StatusNotice title="Chưa nhận adapter thiết lập mới" message="Màn mẫu không ghi dữ liệu vào phòng thật." colors={colors} /></DishSetupFrame>;
  return <DishSetupScreen draft={draft} onChange={patch => setDraft(value => ({ ...value, ...patch }))} onBack={back} onContinue={() => setNotice('Thiết lập mẫu được giữ; màn khẩu vị đang được cập nhật.')} notice={notice} />;
}
