import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, Chip, FormField, StatusNotice } from '../../../shared/ui';
import type { ErrorCode, JoinRoomResponse } from '../../../data/api/contracts';
import { HomeFlowFrame } from '../../home/components/HomeFlowFrame';
import { useRoomSubmission } from '../hooks/useRoomEntry';
import { errorCopy, normalizeRoomCode, validDisplayName, validRoomCode, type CameraAction, type RequestIdFactory, type RoomEntryReceipt, type RoomEntryRepository } from '../services/roomEntry';
import { validPublicPreview, type JoinRoomPreviewPort, type JoinRoomPublicPreview } from '../services/joinPreview';

export type JoinRoomEntryProps = {
  repository: Pick<RoomEntryRepository, 'joinRoom'>; preview?: JoinRoomPreviewPort;
  initialCode?: string; initialDisplayName?: string; onScan?: CameraAction;
  onEntered: (room: RoomEntryReceipt) => void; onBack: () => void; isMock?: boolean; createRequestId?: RequestIdFactory;
};
export function JoinRoomEntryScreen({ repository, preview, initialCode = '', initialDisplayName = '', onScan, onEntered, onBack, isMock = true, createRequestId }: JoinRoomEntryProps) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [code, setCode] = useState(normalizeRoomCode(initialCode)), [incoming, setIncoming] = useState(normalizeRoomCode(initialCode));
  const [name, setName] = useState(initialDisplayName), [tab, setTab] = useState<'manual' | 'camera'>('manual');
  const [summary, setSummary] = useState<JoinRoomPublicPreview>(), [validation, setValidation] = useState<string>();
  const [readError, setReadError] = useState<ErrorCode>(), [readBusy, setReadBusy] = useState(false), [cameraMessage, setCameraMessage] = useState('Bạn luôn có thể nhập mã phòng bằng tay.');
  const mounted = useRef(false), readLock = useRef(false), joinLock = useRef(false);
  const frozen = useRef<{ code: string; displayName: string } | undefined>(undefined);
  const intent = useRef(''), sequence = useRef(0);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submitted = useRoomSubmission<JoinRoomResponse>(data => onEntered({ roomId: data.roomId, code: data.code, version: data.version, role: 'member' }), createRequestId);
  const disabled = readBusy || submitted.busy || submitted.uncertain || submitted.accepted;
  const normalizedIncoming = normalizeRoomCode(initialCode);
  if (incoming !== normalizedIncoming && !disabled) {
    setIncoming(normalizedIncoming); setCode(normalizedIncoming); setSummary(undefined); setValidation(undefined); setReadError(undefined); submitted.clearError();
  }
  const clearPreview = () => { setSummary(undefined); setValidation(undefined); setReadError(undefined); submitted.clearError(); };
  const read = async () => {
    if (!preview || readLock.current || disabled) return;
    if (!validRoomCode(code)) { setValidation('Mã cần đúng 6 chữ/số, không dùng I, O, 0 hoặc 1.'); return; }
    if (!validDisplayName(name)) { setValidation('Tên cần từ 1 đến 24 ký tự.'); return; }
    const requested = normalizeRoomCode(code);
    readLock.current = true; setReadBusy(true); setReadError(undefined); setSummary(undefined); setValidation(undefined);
    try {
      const result = await preview(requested);
      if (!mounted.current) return;
      if (!result.ok) setReadError(result.error.messageKey);
      else if (!validPublicPreview(result.data, requested)) setReadError('MALFORMED_RESPONSE');
      else setSummary({ code: result.data.code, memberCount: result.data.memberCount, capacity: result.data.capacity });
    } catch { if (mounted.current) setReadError('NETWORK_ERROR'); }
    finally { readLock.current = false; if (mounted.current) setReadBusy(false); }
  };
  const join = async () => {
    if (readLock.current || joinLock.current || submitted.accepted || submitted.busy || (!submitted.uncertain && (!summary || summary.code !== normalizeRoomCode(code) || !validDisplayName(name)))) return;
    joinLock.current = true;
    if (!submitted.uncertain) {
      frozen.current = { code: normalizeRoomCode(code), displayName: name.trim() };
      intent.current = `${JSON.stringify(frozen.current)}:${++sequence.current}`;
    }
    const request = frozen.current;
    try { if (request) await submitted.run(intent.current, requestId => repository.joinRoom({ ...request, requestId })); }
    finally { joinLock.current = false; }
  };
  const scan = async () => {
    if (readLock.current || disabled) return;
    readLock.current = true; setReadBusy(true); clearPreview();
    try {
      const result = onScan ? await onScan() : { status: 'unavailable' as const };
      if (!mounted.current) return;
      if (result.status === 'scanned') { setCode(normalizeRoomCode(result.code)); setTab('manual'); setCameraMessage('Đã đọc mã. Xem trước và xác nhận để vào phòng.'); }
      else setCameraMessage(result.status === 'denied' ? 'Camera bị từ chối. Hãy nhập mã bằng tay.' : 'Camera chưa sẵn sàng. Hãy nhập mã bằng tay.');
    } catch { if (mounted.current) setCameraMessage('Chưa đọc được mã. Hãy nhập mã bằng tay.'); }
    finally { readLock.current = false; if (mounted.current) setReadBusy(false); }
  };
  return <HomeFlowFrame title="Tham gia phòng" busy={submitted.busy || submitted.uncertain || submitted.accepted} onHome={() => { if (!submitted.busy && !submitted.uncertain && !submitted.accepted && !joinLock.current) onBack(); }} isMock={isMock}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Vào phòng cùng bạn bè</Text>
    <View style={styles.tabs}><Chip label="Nhập mã" selected={tab === 'manual'} disabled={disabled} onPress={() => setTab('manual')} colors={colors} /><Chip label="Quét mã QR" selected={tab === 'camera'} disabled={disabled} onPress={() => setTab('camera')} colors={colors} /></View>
    <FormField label="Tên của bạn" value={name} onChangeText={value => { if (!disabled) { setName(value); clearPreview(); } }} editable={!disabled} autoCorrect={false} colors={colors} />
    {tab === 'manual' ? <>
      <FormField label="Mã phòng (6 ký tự)" value={code} onChangeText={value => { if (!disabled) { setCode(normalizeRoomCode(value)); clearPreview(); } }} editable={!disabled} keyboardType="default" autoCorrect={false} autoCapitalize="characters" placeholder="Ví dụ: GCD234" colors={colors} />
      {validation ? <Text accessibilityRole="alert" style={[styles.body, { color: colors.text }, textStyle(400)]}>{validation}</Text> : null}
      {!preview ? <StatusNotice title="Xem trước phòng chưa sẵn sàng" message="Vui lòng quay lại sau. Chưa có yêu cầu vào phòng nào được gửi." colors={colors} /> : null}
      {readError ? <StatusNotice title="Chưa xem trước được phòng" message={errorCopy[readError]} tone="warning" colors={colors} /> : null}
      {!summary && !submitted.uncertain && !submitted.accepted ? <AppButton label={readError ? 'Thử xem trước lại' : 'Xem trước phòng'} loading={readBusy} disabled={!preview} onPress={() => { void read(); }} colors={colors} /> : null}
    </> : <View style={styles.card}>
      <StatusNotice title="Quét QR" message={cameraMessage} colors={colors} />
      <AppButton label="Thử quét QR" loading={readBusy} disabled={submitted.busy || submitted.uncertain || submitted.accepted} onPress={() => { void scan(); }} colors={colors} />
      <AppButton label="Nhập mã bằng tay" variant="secondary" disabled={disabled} onPress={() => setTab('manual')} colors={colors} />
    </View>}
    {summary ? <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>{`Phòng #${summary.code}`}</Text>
      <Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{`${summary.memberCount}/${summary.capacity} thành viên`}</Text>
      <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Danh sách thành viên chỉ hiện sau khi bạn vào phòng. Xem trước không giữ chỗ.</Text>
      {!submitted.accepted ? <AppButton label={submitted.uncertain ? 'Thử lại cùng yêu cầu vào phòng' : 'Xác nhận vào phòng'} loading={submitted.busy} onPress={() => { void join(); }} colors={colors} /> : <StatusNotice title="Đã vào phòng" colors={colors} />}
      <AppButton label="Hủy xem trước" variant="secondary" disabled={disabled} onPress={clearPreview} colors={colors} />
    </View> : null}
    {submitted.error ? <StatusNotice title="Chưa vào được phòng" message={errorCopy[submitted.error]} tone="warning" colors={colors} /> : null}
    <View style={styles.spacer} />
  </HomeFlowFrame>;
}
const styles = StyleSheet.create({
  title: { fontSize: 27, lineHeight: 34, marginBottom: 20 }, heading: { fontSize: 20, lineHeight: 28 },
  body: { fontSize: 15, lineHeight: 22 }, tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  card: { borderRadius: 20, borderWidth: 1, padding: 20, gap: 16, marginVertical: 20 }, spacer: { minHeight: 24 },
});
