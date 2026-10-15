import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { AppButton, Chip, FormField, SheetDialog, StatusNotice } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import type { JoinRoomResponse } from '../../../data/api/contracts';
import { EntryError, EntrySection, entryStyles, RoomEntryFrame, type PreviewControlsProps } from '../components/RoomEntryFrame';
import { useRoomSubmission } from '../hooks/useRoomEntry';
import { normalizeRoomCode, validDisplayName, validRoomCode, type CameraAction, type RoomEntryReceipt, type RoomEntryRepository } from '../services/roomEntry';

type Props = PreviewControlsProps & {
  repository: RoomEntryRepository; onBack: () => void; onEntered: (room: RoomEntryReceipt) => void;
  sampleCode?: string; initialCode?: string; onScan?: CameraAction;
};

export function JoinRoomScreen({ repository, onBack, onEntered, sampleCode, initialCode = '', onScan, previewControls }: Props) {
  const { colors } = useShellTheme();
  const [name, setName] = useState('');
  const [code, setCode] = useState(normalizeRoomCode(initialCode));
  const [tab, setTab] = useState<'manual' | 'camera'>('manual');
  const [validation, setValidation] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [cameraMessage, setCameraMessage] = useState('Camera chưa được triển khai ở GM-09. Bạn luôn có thể nhập mã bằng tay.');
  const [scanBusy, setScanBusy] = useState(false);
  const scanLock = useRef(false);
  const mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const submitted = useRoomSubmission<JoinRoomResponse>(data => onEntered({ roomId: data.roomId, code: data.code, version: data.version, role: 'member' }));
  const busy = submitted.busy || scanBusy;
  const disabled = busy || submitted.uncertain;
  const requestJoin = () => {
    if (!validDisplayName(name)) { setValidation('Tên của bạn cần từ 1 đến 24 ký tự.'); return; }
    if (!validRoomCode(code)) { setValidation('Mã cần đúng 6 chữ/số, không dùng I, O, 0 hoặc 1.'); return; }
    setValidation(undefined);
    setConfirm(true);
  };
  const join = () => {
    setConfirm(false);
    const request = { code: normalizeRoomCode(code), displayName: name.trim() };
    void submitted.run(JSON.stringify(request), requestId => repository.joinRoom({ ...request, requestId }));
  };
  const scan = async () => {
    if (scanLock.current) return;
    scanLock.current = true;
    setScanBusy(true);
    try {
      const result = onScan ? await onScan() : { status: 'unavailable' as const };
      if (!mounted.current) return;
      if (result.status === 'scanned') { setCode(normalizeRoomCode(result.code)); setTab('manual'); setCameraMessage('Đã đọc mã. Kiểm tra và xác nhận trước khi vào phòng.'); }
      else setCameraMessage(result.status === 'denied' ? 'Camera bị từ chối · mô phỏng. Hãy nhập mã bằng tay.' : 'Camera chưa được triển khai ở GM-09. Hãy nhập mã bằng tay.');
    } catch { if (mounted.current) setCameraMessage('Chưa thể đọc mã. Hãy nhập mã bằng tay.'); }
    finally { scanLock.current = false; if (mounted.current) setScanBusy(false); }
  };
  return <RoomEntryFrame title="Vào kèo ăn" subtitle="Có mã từ bạn bè? Cùng vào một kèo ăn." onBack={onBack} busy={busy} previewControls={previewControls}>
    <View style={entryStyles.row}>
      <Chip label="Nhập mã" leadingIcon="⌨" selected={tab === 'manual'} disabled={disabled} onPress={() => setTab('manual')} colors={colors} />
      <Chip label="Quét mã QR" leadingIcon="▣" selected={tab === 'camera'} disabled={disabled} onPress={() => setTab('camera')} colors={colors} />
    </View>
    <FormField label="Tên của bạn" value={name} onChangeText={value => { setName(value); setValidation(undefined); }} editable={!disabled} placeholder="Mọi người gọi bạn là…" helperText="Tên hiển thị trong phòng · 1–24 ký tự" colors={colors} />
    {tab === 'manual' ? <EntrySection title="Mã từ chủ phòng" description="Nhập mã bạn nhận được để cùng chọn món.">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={entryStyles.codeRow}>
        {Array.from({ length: 6 }, (_, index) => <View key={index} style={[entryStyles.codeCell, { borderColor: code[index] ? colors.primary : colors.border, backgroundColor: code[index] ? colors.warm : colors.soft }]}>
          <Text style={[entryStyles.codeLetter, { color: colors.text }]}>{code[index] ?? '·'}</Text>
        </View>)}
      </View>
      <FormField label="Mã phòng (6 ký tự)" value={code} onChangeText={value => { setCode(normalizeRoomCode(value)); setValidation(undefined); submitted.clearError(); }} editable={!disabled} keyboardType="default" autoCapitalize="characters" autoCorrect={false} placeholder="Ví dụ: GCD234" helperText="6 chữ/số · không dùng I, O, 0 hoặc 1" colors={colors} />
      {sampleCode ? <AppButton label={`Điền mã mẫu ${sampleCode}`} variant="quiet" disabled={disabled} onPress={() => { setCode(sampleCode); setValidation(undefined); submitted.clearError(); }} colors={colors} /> : null}
      {validation ? <Text accessibilityRole="alert" style={[entryStyles.body, { color: colors.danger }]}>{validation}</Text> : null}
      {submitted.error ? <EntryError code={submitted.error} /> : null}
      <AppButton label={submitted.uncertain ? 'Thử lại cùng yêu cầu vào phòng' : 'Vào phòng →'} loading={submitted.busy} onPress={submitted.uncertain ? join : requestJoin} colors={colors} />
      <Text style={[entryStyles.caption, { color: colors.muted }]}>Bạn sẽ xác nhận tên và mã trước khi vào phòng.</Text>
    </EntrySection> : <EntrySection title="Quét mã từ chủ phòng">
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[entryStyles.scanner, { backgroundColor: colors.soft, borderColor: colors.border }]}>
        <Text allowFontScaling={false} style={entryStyles.foodEmoji}>📷</Text>
        <Text style={[entryStyles.body, { color: colors.muted }]}>Khung quét minh họa</Text>
      </View>
      <StatusNotice title="Quét QR · chưa kết nối camera" message={cameraMessage} colors={colors} />
      <AppButton label="Thử quét QR" loading={scanBusy} onPress={() => { void scan(); }} colors={colors} />
      <AppButton label="Nhập mã bằng tay" variant="secondary" onPress={() => setTab('manual')} disabled={busy} colors={colors} />
    </EntrySection>}
    <SheetDialog visible={confirm} title="Xác nhận vào phòng" onClose={() => setConfirm(false)} colors={colors}>
      <Text style={[entryStyles.body, { color: colors.text }]}>Vào phòng #{normalizeRoomCode(code)} với tên {name.trim()}? Đây là thao tác mô phỏng.</Text>
      <AppButton label="Xác nhận vào phòng mô phỏng" onPress={join} colors={colors} />
    </SheetDialog>
  </RoomEntryFrame>;
}
