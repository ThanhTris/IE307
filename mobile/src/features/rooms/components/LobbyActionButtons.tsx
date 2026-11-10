import type { RoomMember, RoomSnapshot } from '../../../data/api';
import { AppButton, type Palette } from '../../../shared/ui';
import type { ConfirmAction } from '../hooks/useLiveLobby';

export interface LobbyActionButtonsProps {
  snapshot: RoomSnapshot;
  viewer?: RoomMember;
  isHost: boolean;
  busy: boolean;
  eligibilityError: string | null;
  onRefresh: () => void;
  onRunWrite: (action: 'start' | 'context' | 'leave' | 'cancel' | 'invite') => void;
  onEditContext?: (snapshot: RoomSnapshot) => void;
  onConfirm: (action: ConfirmAction) => void;
  colors: Palette;
}

export function LobbyActionButtons({
  snapshot,
  viewer,
  isHost,
  busy,
  eligibilityError,
  onRefresh,
  onRunWrite,
  onEditContext,
  onConfirm,
  colors,
}: LobbyActionButtonsProps) {
  return (
    <>
      <AppButton label="Tải lại phòng" variant="quiet" onPress={onRefresh} loading={busy} colors={colors} />
      {isHost ? (
        <AppButton
          label="Bắt đầu chọn món"
          onPress={() => onRunWrite('start')}
          disabled={snapshot.state !== 'LOBBY' || Boolean(eligibilityError)}
          loading={busy}
          colors={colors}
        />
      ) : null}
      {isHost && onEditContext ? (
        <AppButton
          label="Chỉnh sửa bối cảnh"
          variant="secondary"
          onPress={() => onEditContext(snapshot)}
          disabled={snapshot.state !== 'LOBBY' || busy}
          colors={colors}
        />
      ) : null}
      {viewer && (isHost
        ? <AppButton label="Hủy phòng" variant="danger" onPress={() => onConfirm('cancel')} disabled={busy || snapshot.state !== 'LOBBY'} colors={colors} />
        : <AppButton label="Rời phòng" variant="danger" onPress={() => onConfirm('leave')} disabled={busy || snapshot.state !== 'LOBBY'} colors={colors} />)}
    </>
  );
}
