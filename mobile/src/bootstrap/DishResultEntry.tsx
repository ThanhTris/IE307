import { useRoomRepository } from './RoomRepositoryProvider';
import { DishResultPreview } from './DishResultPreview';
import { ResultPreview } from './resultPreview';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { DishResultFrame } from '../features/result/components/DishResultFrame';
import { StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';

export function DishResultEntry({ noConsensus, legacy, onHome, onNewSession, onLegacyNewSession, onOtherScreen }: { noConsensus?: boolean; legacy?: boolean; onHome: () => void; onNewSession: () => void; onLegacyNewSession: () => void; onOtherScreen: () => void }) {
  const { mode } = useRoomRepository(), { colors } = useShellTheme();
  if (mode === 'real') return <RequireActiveSession onHome={onHome}><DishResultFrame onHome={onHome}><StatusNotice title="Chưa thể mở kết quả" message="Hãy quay lại trang chủ để kiểm tra trạng thái phòng của bạn." colors={colors} /></DishResultFrame></RequireActiveSession>;
  if (__DEV__ && legacy) return <ResultPreview noConsensus={noConsensus} onHome={onHome} onNewSession={onLegacyNewSession} onOtherScreen={onOtherScreen} />;
  return <DishResultPreview noConsensus={noConsensus} onHome={onHome} onNewSession={onNewSession} onOtherScreen={onOtherScreen} />;
}
