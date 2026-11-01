import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { HomeFlowFrame } from '../../home/components/HomeFlowFrame';

/** Presentation received from the setup owner; no duplicate settings form here. */
export type CreateEntrySummary = { meal: string; dishCount: number; time?: string; budget?: string };
export function CreateRoomEntryScreen({ displayName, summary, onOpenSetup, onBack, isMock = true }: {
  displayName?: string; summary?: CreateEntrySummary; onOpenSetup?: () => Promise<boolean>; onBack: () => void; isMock?: boolean;
}) {
  const { colors } = useShellTheme();
  const { textStyle } = useAppFonts();
  const [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const lock = useRef(false), mounted = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const open = async () => {
    if (!onOpenSetup || lock.current) return;
    lock.current = true; setBusy(true); setError(false);
    let ready = false;
    try { ready = await onOpenSetup(); } catch { /* Keep the entry retryable; do not create a room. */ }
    lock.current = false;
    if (mounted.current) { setBusy(false); setError(!ready); }
  };
  return <HomeFlowFrame title="Tạo phòng" onHome={() => { if (!lock.current) onBack(); }} isMock={isMock}>
    <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Cùng chọn món cho cả nhóm</Text>
    <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Chọn 10–20 món để bắt đầu. Mỗi người tự chọn khẩu vị; không cần chia sẻ vị trí.</Text>
    {displayName ? <Text style={[styles.body, { color: colors.text }, textStyle(500)]}>{`Chủ phòng: ${displayName}`}</Text> : null}
    <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>Thiết lập phòng</Text>
      {summary ? <Text style={[styles.body, { color: colors.text }, textStyle(400)]}>{`${summary.meal} · ${summary.dishCount} món${summary.time ? `\n${summary.time}` : ''}${summary.budget ? `\n${summary.budget}` : ''}`}</Text> : <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Buổi ăn, số món và ưu tiên sẽ được chọn ở bước thiết lập.</Text>}
    </View>
    {!onOpenSetup ? <StatusNotice title="Thiết lập phòng đang được cập nhật" message="Bạn vẫn có thể quay lại trang chủ hoặc tham gia phòng đã có." colors={colors} /> : null}
    {error ? <StatusNotice title="Chưa mở được thiết lập" message="Thông tin của bạn vẫn được giữ. Hãy thử lại." tone="error" colors={colors} /> : null}
    <View style={styles.spacer} />
    <AppButton label={error ? 'Thử mở lại thiết lập' : 'Tiếp tục thiết lập'} loading={busy} disabled={!onOpenSetup} onPress={() => { void open(); }} colors={colors} textStyle={textStyle(600)} />
  </HomeFlowFrame>;
}
const styles = StyleSheet.create({
  title: { fontSize: 27, lineHeight: 34, marginBottom: 16 },
  heading: { fontSize: 20, lineHeight: 28 }, body: { fontSize: 16, lineHeight: 24, marginBottom: 20 },
  card: { padding: 20, borderWidth: 1, borderRadius: 20, gap: 12, marginBottom: 20 },
  spacer: { flexGrow: 1, minHeight: 32 },
});
