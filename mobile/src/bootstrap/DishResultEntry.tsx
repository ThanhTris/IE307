import { useRoomRepository } from './RoomRepositoryProvider';
import { DishResultPreview } from './DishResultPreview';
import { ResultPreview } from './resultPreview';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { DishResultFrame } from '../features/result/components/DishResultFrame';
import { StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { LiveDishResultScreen } from '../features/result/screens/LiveDishResultScreen';
import type { ResultRepository } from '../features/result/services/resultRepository';

export interface DishResultEntryProps {
  roomId?: string;
  noConsensus?: boolean;
  legacy?: boolean;
  repository?: ResultRepository;
  onHome: () => void;
  onNewSession: () => void;
  onLegacyNewSession: () => void;
  onOtherScreen: () => void;
}

export function DishResultEntry({
  roomId,
  noConsensus,
  legacy,
  repository,
  onHome,
  onNewSession,
  onLegacyNewSession,
  onOtherScreen,
}: DishResultEntryProps) {
  const { mode } = useRoomRepository();
  const { colors } = useShellTheme();

  if (mode === 'real') {
    if (roomId) {
      return (
        <RequireActiveSession onHome={onHome}>
          <LiveDishResultScreen
            roomId={roomId}
            repository={repository}
            onHome={onHome}
            onNewSession={onNewSession}
            onOtherScreen={onOtherScreen}
          />
        </RequireActiveSession>
      );
    }
    return (
      <RequireActiveSession onHome={onHome}>
        <DishResultFrame onHome={onHome}>
          <StatusNotice
            title="Chưa thể mở kết quả"
            message="Hãy quay lại trang chủ để kiểm tra trạng thái phòng của bạn."
            colors={colors}
          />
        </DishResultFrame>
      </RequireActiveSession>
    );
  }

  if (__DEV__ && legacy) {
    return (
      <ResultPreview
        noConsensus={noConsensus}
        onHome={onHome}
        onNewSession={onLegacyNewSession}
        onOtherScreen={onOtherScreen}
      />
    );
  }

  return (
    <DishResultPreview
      noConsensus={noConsensus}
      onHome={onHome}
      onNewSession={onNewSession}
      onOtherScreen={onOtherScreen}
    />
  );
}
