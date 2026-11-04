import { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { AppButton, SheetDialog, StatusNotice } from '../../../shared/ui';
import { DemoFrame, useDemoColors, type DemoDestination } from '../../shared/components/MockDemo';

type Props = { onNavigate: (destination: DemoDestination) => void; onHome: () => void };
type FontSize = 100 | 120 | 150;
const fontSizes: FontSize[] = [100, 120, 150];

export function GuestSettingsScreen({ onNavigate, onHome }: Props) {
  const colors = useDemoColors();
  const [fontSize, setFontSize] = useState<FontSize>(100);
  const [preferButtons, setPreferButtons] = useState(true);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [message, setMessage] = useState('');

  return (
    <DemoFrame title="Cài đặt" subtitle="GM-14 · trợ năng và phiên khách mock" active="settings" onNavigate={onNavigate} onHome={onHome} mode="default" onModeChange={() => undefined} showModePicker={false}>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cỡ chữ</Text>
        <View style={styles.options}>
          {fontSizes.map(size => {
            const selected = fontSize === size;
            return <Pressable key={size} accessibilityRole="button" accessibilityLabel={`Cỡ chữ ${size} phần trăm`} accessibilityState={{ selected }} onPress={() => setFontSize(size)} style={[styles.option, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.line }]}>
              <Text style={[styles.optionText, { color: selected ? colors.onPrimary : colors.text }]}>{size}%</Text>
            </Pressable>;
          })}
        </View>
        <View style={[styles.preview, { backgroundColor: colors.soft }]}>
          <Text style={{ color: colors.text, fontSize: 14 * fontSize / 100, lineHeight: 21 * fontSize / 100 }}>Bản xem trước cỡ chữ · {fontSize}%</Text>
        </View>
        <Text style={[styles.helper, { color: colors.muted }]}>Cỡ chữ chỉ áp dụng cho bản xem trước mock này; chưa lưu cài đặt thiết bị.</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thao tác dễ tiếp cận</Text>
        <View style={styles.switchRow}>
          <View style={styles.switchCopy}>
            <Text style={[styles.bodyStrong, { color: colors.text }]}>Ưu tiên nút thay cho vuốt</Text>
            <Text style={[styles.helper, { color: colors.muted }]}>Các hành động chính luôn có nút chạm; lựa chọn này chỉ lưu trong preview.</Text>
          </View>
          <Switch accessibilityLabel="Ưu tiên nút thay cho vuốt" value={preferButtons} onValueChange={setPreferButtons} />
        </View>
        <AppButton label={preferButtons ? 'Nút thay thao tác vuốt đang bật' : 'Bật nút thay thao tác vuốt'} variant="secondary" onPress={() => setPreferButtons(true)} colors={colors} />
      </View>

      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Dữ liệu cá nhân</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Quản lý consent và xóa từng summary trong màn Lịch sử.</Text>
        <AppButton label="Mở lịch sử và quyền lưu" variant="secondary" onPress={() => onNavigate('history')} colors={colors} />
      </View>

      {message ? <StatusNotice title="Phiên khách mock" message={message} tone="success" colors={colors} /> : null}
      {signedOut ? <StatusNotice title="Đã đăng xuất bản xem" message="Chỉ trạng thái giao diện mock thay đổi; phiên xác thực thật không bị tác động." colors={colors} /> : <AppButton label="Đăng xuất" variant="danger" onPress={() => setConfirmLogout(true)} colors={colors} />}
      <SheetDialog visible={confirmLogout} title="Đăng xuất khỏi bản xem?" onClose={() => setConfirmLogout(false)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>Thao tác chỉ đóng trạng thái hồ sơ mock; không gọi API auth hoặc xóa phiên trên thiết bị.</Text>
        <AppButton label="Xác nhận đăng xuất mock" variant="danger" onPress={() => { setConfirmLogout(false); setSignedOut(true); setMessage('Đã đóng hồ sơ mock trên màn cài đặt.'); }} colors={colors} />
      </SheetDialog>
    </DemoFrame>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  sectionTitle: { fontSize: 17, lineHeight: 23, fontWeight: '800' },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minWidth: 64, minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  optionText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  preview: { minHeight: 64, borderRadius: 12, padding: 14, justifyContent: 'center' },
  switchRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchCopy: { flex: 1, gap: 4 },
  bodyStrong: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  body: { fontSize: 14, lineHeight: 20 },
  helper: { fontSize: 12, lineHeight: 18 },
});
