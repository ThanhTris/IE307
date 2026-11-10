import { useRoomRepository } from '../../../bootstrap/RoomRepositoryProvider';
import { RequireActiveSession } from '../../auth/components/RequireActiveSession';
import { DishResultFrame } from '../components/DishResultFrame';
import { StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { LiveDishResultScreen } from './LiveDishResultScreen';
import type { ResultRepository } from '../services/resultRepository';
import type { PlacesConfig } from '../services/placesRepository';
import type { ResultMapRenderer } from '../services/nearbyPresentation';

export interface DishResultEntryProps {
  roomId?: string;
  resultId?: string;
  noConsensus?: boolean;
  repository?: ResultRepository;
  placesConfig?: PlacesConfig;
  renderMap?: ResultMapRenderer;
  onHome: () => void;
  onNewSession: () => void;
  onOtherScreen: () => void;
}

export function DishResultEntry({
  roomId,
  resultId,
  repository,
  placesConfig,
  renderMap,
  onHome,
  onNewSession,
  onOtherScreen,
}: DishResultEntryProps) {
  const { user } = useRoomRepository();
  const { colors } = useShellTheme();
  const identity = user?.id ?? 'anonymous';

  if (roomId) {
    return (
      <RequireActiveSession onHome={onHome}>
        <LiveDishResultScreen
          key={`${identity}:${roomId}:${resultId ?? ''}`}
          roomId={roomId}
          resultId={resultId}
          repository={repository}
          placesConfig={placesConfig}
          renderMap={renderMap}
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
