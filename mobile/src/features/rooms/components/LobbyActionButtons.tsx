import { StyleSheet, Text } from 'react-native';
import type { RoomMember, RoomSnapshot } from '../../../data/api';
import { AppButton, type Palette } from '../../../shared/ui';
import type { ConfirmAction } from '../hooks/useLiveLobby';

export interface LobbyActionButtonsProps {
  isReal: boolean;
  snapshot: RoomSnapshot;
  viewer?: RoomMember;
  isHost: boolean;
  everyoneReady: boolean;
  busy: boolean;
  eligibilityError: string | null;
  onRefresh: () => void;
  onRunWrite: (action: 'ready' | 'start' | 'context' | 'leave' | 'cancel' | 'invite') => void;
  onEditContext?: (snapshot: RoomSnapshot) => void;
  onConfirm: (action: ConfirmAction) => void;
  colors: Palette;
}

export function LobbyActionButtons({
  isReal,
  snapshot,
  viewer,
  isHost,
  everyoneReady,
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
      {viewer ? (
        <AppButton
          label={viewer.ready ? 'Tắt sẵn sàng' : 'Tôi sẵn sàng'}
          onPress={() => onRunWrite('ready')}
          loading={busy}
          disabled={snapshot.state !== 'LOBBY'}
          colors={colors}
        />
      ) : null}
      {isHost ? (
        <AppButton
          label="Bắt đầu chọn món"
          onPress={() => onRunWrite('start')}
          disabled={!everyoneReady || snapshot.state !== 'LOBBY' || Boolean(eligibilityError)}
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
      {isHost && !onEditContext && !isReal ? (
        <AppButton
          label="Mô phỏng đổi bối cảnh · reset ready (Host)"
          variant="secondary"
          onPress={() => onRunWrite('context')}
          disabled={snapshot.state !== 'LOBBY'}
          loading={busy}
          colors={colors}
        />
      ) : null}
      {!isReal && (
        <AppButton
          label="Mời thêm bạn (mock)"
          variant="secondary"
          onPress={() => onRunWrite('invite')}
          loading={busy}
          colors={colors}
        />
      )}
      {viewer && (isHost
        ? <AppButton label="Hủy phòng" variant="danger" onPress={() => onConfirm('cancel')} disabled={snapshot.state !== 'LOBBY'} colors={colors} />
        : <AppButton label="Rời phòng" variant="danger" onPress={() => onConfirm('leave')} disabled={snapshot.state !== 'LOBBY'} colors={colors} />)}
      <Text style={[styles.helper, { color: colors.muted }]}>
        {isReal
          ? 'Ready là thao tác chủ động. Chỉ host bắt đầu khi tất cả thành viên đã sẵn sàng.'
          : 'Ready là thao tác chủ động. Chỉ host bắt đầu khi tất cả thành viên trong fixture đã sẵn sàng.'}
      </Text>
    </>
  );
}

const styles = StyleSheet.create({
  helper: { fontSize: 12, lineHeight: 18 },
});
