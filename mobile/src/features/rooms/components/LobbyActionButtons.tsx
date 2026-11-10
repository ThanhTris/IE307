import type { RoomMember, RoomSnapshot } from '../../../data/api';
import { AppButton, type Palette } from '../../../shared/ui';
import type { ConfirmAction } from '../hooks/useLobby';

export interface LobbyActionButtonsProps {
  snapshot: RoomSnapshot;
  viewer?: RoomMember;
  isHost: boolean;
  busy: boolean;
  eligibilityError: string | null;
  onRefresh: () => void;
  onRunWrite: (action: 'start' | 'context' | 'leave' | 'cancel' | 'invite') => void;
  onEditSettings?: (snapshot: RoomSnapshot) => void;
  onEditPreferences?: (snapshot: RoomSnapshot) => void;
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
  onEditSettings,
  onEditPreferences,
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
      {viewer && onEditPreferences ? (
        <AppButton
          label="Sửa khẩu vị của tôi"
          variant="secondary"
          onPress={() => onEditPreferences(snapshot)}
          disabled={snapshot.state !== 'LOBBY' || busy}
          colors={colors}
        />
      ) : null}
      {isHost && onEditSettings ? (
        <AppButton
          label="Chỉnh sửa thiết lập phòng"
          variant="secondary"
          onPress={() => onEditSettings(snapshot)}
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
