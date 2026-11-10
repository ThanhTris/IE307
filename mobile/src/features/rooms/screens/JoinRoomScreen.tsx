import { useState } from 'react';
import { Image, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, FormField, StatusNotice } from '../../../shared/ui';
import { HomeFlowFrame } from '../../home/components/HomeFlowFrame';
import { RoomCodeField } from '../components/RoomCodeField';
import { JoinEntryProblem } from '../components/JoinEntryProblem';
import { useJoinRoomEntry } from '../hooks/useJoinRoomEntry';
import { errorCopy, validDisplayName, type CameraAction, type RequestIdFactory, type RoomEntryReceipt, type RoomEntryRepository } from '../services/roomEntry';
import type { JoinRoomPreviewPort } from '../services/joinPreview';
import type { QrScannerAdapter } from '../services/joinLinks';

export type JoinRoomEntryProps = {
  repository: Pick<RoomEntryRepository, 'joinRoom'>;
  preview?: JoinRoomPreviewPort;
  initialCode?: string;
  initialDisplayName?: string;
  onScan?: CameraAction;
  qrScannerAdapter?: QrScannerAdapter;
  onEntered: (room: RoomEntryReceipt) => void;
  onBack: () => void;
  isMock?: boolean;
  createRequestId?: RequestIdFactory;
  linkError?: string;
};

export function JoinRoomScreen(props: JoinRoomEntryProps) {
  const { colors, dark } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [simulatedInput, setSimulatedInput] = useState('');
  const flow = useJoinRoomEntry(props);
  const { summary, submitted } = flow;
  const problem = flow.readError && !['ROOM_NOT_FOUND', 'INVALID_INPUT'].includes(flow.readError) ? flow.readError : undefined;

  const handleOpenSettings = async () => {
    try {
      if (props.qrScannerAdapter?.openSettings) {
        await props.qrScannerAdapter.openSettings();
      } else {
        await Linking.openSettings();
      }
    } catch {
      // Ignore settings open failure
    }
  };

  return (
    <HomeFlowFrame
      title={flow.camera ? (flow.cameraStatus === 'denied' ? 'Camera bị từ chối' : 'Quét mã QR') : summary ? 'Xác nhận phòng' : 'Tham gia phòng'}
      compact
      busy={flow.mutationLocked}
      onHome={flow.back}
      isMock={props.isMock ?? true}
    >
      {flow.camera ? (
        flow.cameraStatus === 'denied' ? (
          // Figma node 275:2088 — Vào phòng · Camera bị từ chối
          <>
            <View style={[styles.deniedContainer, { backgroundColor: colors.warm, borderColor: colors.line }]}>
              <View style={[styles.deniedBadge, { backgroundColor: dark ? colors.surface : '#FFFFFF', borderColor: colors.line }]}>
                <Text style={styles.deniedIcon}>📷⃠</Text>
              </View>
              <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>
                Camera bị từ chối
              </Text>
              <Text accessibilityLiveRegion="polite" style={[styles.deniedBody, { color: colors.muted }, textStyle(400)]}>
                Bạn chưa cấp quyền truy cập camera để quét mã QR. Bạn có thể mở Cài đặt để cấp quyền hoặc nhập mã phòng bằng tay.
              </Text>
            </View>
            <View style={styles.spacer} />
            <View style={styles.actions}>
              <AppButton label="Nhập mã bằng tay" onPress={flow.closeCamera} colors={colors} />
              <AppButton label="Mở Cài đặt" variant="secondary" onPress={handleOpenSettings} colors={colors} />
              <AppButton label="Thử lại" variant="secondary" loading={flow.readBusy} onPress={() => { void flow.scan(); }} colors={colors} />
            </View>
          </>
        ) : (
          // Figma node 268:2019 — Vào phòng · Quét QR
          <>
            <View style={[styles.camera, { backgroundColor: colors.warm, borderColor: colors.line }]}>
              {props.qrScannerAdapter?.isSimulated ? (
                <View style={[styles.simulatedBadge, { backgroundColor: dark ? colors.surface : '#FFFFFF', borderColor: colors.line }]}>
                  <Text style={[styles.simulatedLabel, { color: colors.primary }, textStyle(600)]}>
                    [Mô phỏng AVD] Camera quét QR mô phỏng cho AVD testing
                  </Text>
                </View>
              ) : null}
              <View style={[styles.viewfinder, { borderColor: colors.primary }]}>
                <Image source={require('../../../../assets/brand/entry-ui/qr.png')} accessible={false} resizeMode="contain" style={[styles.qrIcon, { tintColor: colors.text }]} />
              </View>
              <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>
                Quét mã QR
              </Text>
              <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.muted }, textStyle(400)]}>
                {flow.cameraMessage}
              </Text>
              {props.qrScannerAdapter?.isSimulated ? (
                <View style={styles.simulatedInputContainer}>
                  <FormField
                    label="Mã hoặc URL test"
                    value={simulatedInput}
                    onChangeText={setSimulatedInput}
                    placeholder="Ví dụ: GCD234 hoặc link mời"
                    colors={colors}
                  />
                </View>
              ) : null}
            </View>
            <View style={styles.spacer} />
            <View style={styles.actions}>
              <AppButton
                label="Thử quét QR"
                loading={flow.readBusy}
                onPress={() => {
                  void flow.scan(props.qrScannerAdapter?.isSimulated ? simulatedInput : undefined);
                }}
                colors={colors}
              />
              <AppButton label="Nhập mã bằng tay" variant="secondary" onPress={flow.closeCamera} colors={colors} />
            </View>
          </>
        )
      ) : summary ? (
        // Figma node 268:2081 — Vào phòng · Xác nhận
        <>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>
            {`Phòng ${summary.code}`}
          </Text>
          <View style={[styles.summary, { backgroundColor: dark ? colors.surface : '#FFFFFF', borderColor: colors.line }]}>
            <View style={[styles.row, { borderBottomColor: colors.warm, borderBottomWidth: 1 }]}>
              <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Mã phòng</Text>
              <Text selectable style={[styles.value, { color: colors.text }, textStyle(600)]}>{summary.code}</Text>
            </View>
            <View style={styles.row}>
              <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Thành viên</Text>
              <Text style={[styles.value, { color: colors.text }, textStyle(600)]}>{`${summary.memberCount}/${summary.capacity} thành viên`}</Text>
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.muted }, textStyle(400)]}>
            Xác nhận để vào phòng. Xem trước không giữ chỗ.
          </Text>
          {submitted.error ? <StatusNotice title="Chưa vào được phòng" message={errorCopy[submitted.error]} tone="warning" colors={colors} /> : null}
          <View style={styles.spacer} />
          <View style={styles.actions}>
            <AppButton label="Nhập mã khác" variant="secondary" disabled={flow.disabled} onPress={flow.edit} colors={colors} />
            <AppButton
              label={submitted.uncertain ? 'Thử lại cùng yêu cầu vào phòng' : submitted.accepted ? 'Đã vào phòng' : 'Xác nhận vào phòng'}
              loading={submitted.busy}
              disabled={submitted.accepted}
              onPress={() => { void flow.join(); }}
              colors={colors}
            />
          </View>
        </>
      ) : problem ? (
        <JoinEntryProblem code={flow.code} error={problem} busy={flow.readBusy} onRetry={() => { void flow.read(); }} onEdit={flow.edit} onHome={props.onBack} />
      ) : (
        <>
          {props.linkError ? (
            <StatusNotice
              title="Liên kết bị chặn"
              message="Liên kết chứa tham số không an toàn hoặc không hợp lệ. Bạn có thể nhập mã phòng bằng tay để tiếp tục."
              tone="warning"
              colors={colors}
            />
          ) : null}
          {!validDisplayName(props.initialDisplayName ?? '') ? (
            <FormField label="Tên của bạn" value={flow.name} onChangeText={flow.editName} editable={!flow.disabled} colors={colors} />
          ) : null}
          <RoomCodeField value={flow.code} onChange={flow.editCode} disabled={flow.disabled} error={flow.validation ?? (flow.readError ? errorCopy[flow.readError] : undefined)} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quét mã QR"
            accessibilityState={{ disabled: flow.disabled }}
            disabled={flow.disabled}
            onPress={flow.openCamera}
            style={[styles.scanCard, { borderColor: colors.line, backgroundColor: dark ? colors.surface : '#FFFFFF' }]}
          >
            <Image source={require('../../../../assets/brand/entry-ui/qr.png')} accessible={false} resizeMode="contain" style={[styles.qrIcon, { tintColor: colors.text, backgroundColor: colors.warm }]} />
            <View style={styles.scanCopy}>
              <Text style={[styles.heading, { color: colors.text }, textStyle(700)]}>Quét mã QR</Text>
              <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Dùng camera để vào phòng</Text>
            </View>
            <Text accessible={false} style={[styles.chevron, { color: colors.primary }]}>›</Text>
          </Pressable>
          <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>
            Hoặc mở liên kết mời được bạn bè gửi.
          </Text>
          {!props.preview ? (
            <StatusNotice title="Xem trước phòng chưa sẵn sàng" message="Bạn có thể quay lại trang chủ. Chưa có yêu cầu vào phòng nào được gửi." colors={colors} />
          ) : null}
          <View style={styles.spacer} />
          <AppButton label={flow.readError ? 'Thử lại' : 'Tiếp tục →'} loading={flow.readBusy} disabled={!props.preview} onPress={() => { void flow.read(); }} colors={colors} />
        </>
      )}
    </HomeFlowFrame>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 28, lineHeight: 36, marginBottom: 24 },
  heading: { fontSize: 20, lineHeight: 28 },
  body: { fontSize: 15, lineHeight: 22, textAlign: 'center' },
  hint: { fontSize: 14, lineHeight: 21, marginTop: 24 },
  value: { fontSize: 17, lineHeight: 24 },
  scanCard: { flexDirection: 'row', alignItems: 'center', gap: 20, borderWidth: 1, borderRadius: 20, padding: 20, marginTop: 40, marginBottom: 20 },
  qrIcon: { width: 64, height: 64, borderRadius: 16 },
  scanCopy: { flex: 1, gap: 8 },
  chevron: { fontSize: 32 },
  summary: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 20 },
  row: { minHeight: 72, paddingVertical: 20, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  camera: { minHeight: 380, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  viewfinder: { width: 140, height: 140, borderWidth: 2, borderRadius: 24, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  deniedContainer: { minHeight: 380, padding: 24, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  deniedBadge: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  deniedIcon: { fontSize: 36 },
  deniedBody: { fontSize: 14, lineHeight: 22, textAlign: 'center', paddingHorizontal: 16 },
  simulatedBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  simulatedLabel: { fontSize: 12, lineHeight: 16, textAlign: 'center' },
  simulatedInputContainer: { width: '100%', marginTop: 8 },
  spacer: { flexGrow: 1, minHeight: 32 },
  actions: { gap: 16 },
});
