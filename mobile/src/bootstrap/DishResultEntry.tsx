import { useRoomRepository } from './RoomRepositoryProvider';
import { DishResultPreview } from './DishResultPreview';
import { ResultPreview } from './resultPreview';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { DishResultFrame } from '../features/result/components/DishResultFrame';
import { StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { LiveCanonicalResultScreen } from '../features/result/screens/LiveCanonicalResultScreen';

export function DishResultEntry({ noConsensus, legacy, roomId, resultId, onHome, onNewSession, onLegacyNewSession, onOtherScreen }: { noConsensus?: boolean; legacy?: boolean; roomId?: string; resultId?: string; onHome: () => void; onNewSession: () => void; onLegacyNewSession: () => void; onOtherScreen: () => void }) {
  const session = useRoomRepository(), { colors } = useShellTheme();
  if (session.mode === 'real') return <RequireActiveSession onHome={onHome}><>
    {roomId ? <LiveCanonicalResultScreen repository={session.repository} roomId={roomId} expectedResultId={resultId} onHome={onHome} onNewSession={onNewSession} /> : <DishResultFrame onHome={onHome}><StatusNotice title="Chưa thể mở kết quả" message="Mở kết quả từ một phòng đã được máy chủ xác thực." colors={colors} /></DishResultFrame>}
  </></RequireActiveSession>;
  if (__DEV__ && legacy) return <ResultPreview noConsensus={noConsensus} onHome={onHome} onNewSession={onLegacyNewSession} onOtherScreen={onOtherScreen} />;
  return <DishResultPreview noConsensus={noConsensus} onHome={onHome} onNewSession={onNewSession} onOtherScreen={onOtherScreen} />;
}
