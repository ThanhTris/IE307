import { useRoomRepository } from './RoomRepositoryProvider';
import { DishResultPreview } from './DishResultPreview';
import { ResultPreview } from './resultPreview';
import { RequireActiveSession } from '../features/auth/components/RequireActiveSession';
import { DishResultFrame } from '../features/result/components/DishResultFrame';
import { StatusNotice } from '../shared/ui';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { LiveDishResultScreen } from '../features/result/screens/LiveDishResultScreen';
import type { ResultRepository } from '../features/result/services/resultRepository';
import type { PlacesConfig } from '../features/result/services/placesRepository';
import type { ResultMapRenderer } from '../features/result/services/nearbyPresentation';

export interface DishResultEntryProps {
  roomId?: string;
  resultId?: string;
  noConsensus?: boolean;
  legacy?: boolean;
  repository?: ResultRepository;
  placesConfig?: PlacesConfig;
  renderMap?: ResultMapRenderer;
  onHome: () => void;
  onNewSession: () => void;
  onLegacyNewSession: () => void;
  onOtherScreen: () => void;
}

export function DishResultEntry({
  roomId,
  resultId,
  noConsensus,
  legacy,
  repository,
  placesConfig,
  renderMap,
  onHome,
  onNewSession,
  onLegacyNewSession,
  onOtherScreen,
}: DishResultEntryProps) {
  const { mode, user } = useRoomRepository();
  const { colors } = useShellTheme();
  const identity = user?.id ?? 'anonymous';

  if (mode === 'real') {
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
