import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AppButton, SheetDialog, ApiFeatureFrame } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';

type Props = {
  onNavigate: (path: string) => void;
  onBack: () => void;
  onLogout: () => void | Promise<void>;
};

export function SettingsScreen({ onNavigate, onBack, onLogout }: Props) {
  const { colors } = useShellTheme();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [busy, setBusy] = useState(false);
  const logout = async () => {
    setBusy(true);
    try { await onLogout(); } finally { setBusy(false); setConfirmLogout(false); }
  };
  return (
    <ApiFeatureFrame active="settings" title="Cài đặt" onNavigate={onNavigate} onHome={onBack}>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Thông báo</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Nhận lời mời vào phòng và kết quả khi app đang đóng.</Text>
        <AppButton label="Quản lý thông báo" variant="secondary" onPress={() => onNavigate('/push-settings')} colors={colors} />
      </View>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Dữ liệu cá nhân</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Bật hoặc tắt lưu lịch sử và xóa từng bữa đã chốt trong màn Lịch sử.</Text>
        <AppButton label="Mở lịch sử và quyền lưu" variant="secondary" onPress={() => onNavigate('/history')} colors={colors} />
      </View>
      <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Cỡ chữ</Text>
        <Text style={[styles.body, { color: colors.muted }]}>App dùng cỡ chữ theo cài đặt hệ thống của điện thoại, hỗ trợ đến 200%.</Text>
      </View>
      <AppButton label="Thoát phiên khách" variant="danger" onPress={() => setConfirmLogout(true)} disabled={busy} colors={colors} />
      <SheetDialog visible={confirmLogout} title="Thoát phiên khách?" onClose={() => setConfirmLogout(false)} colors={colors}>
        <Text style={[styles.body, { color: colors.text }]}>Bạn sẽ cần nhập lại tên để tiếp tục. Lịch sử và bạn bè của phiên này không còn truy cập được trên thiết bị.</Text>
        <AppButton label="Thoát phiên" variant="danger" onPress={() => { void logout(); }} loading={busy} disabled={busy} colors={colors} />
      </SheetDialog>
    </ApiFeatureFrame>
  );
}

const styles = StyleSheet.create({
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 12 },
  sectionTitle: { fontFamily: 'InterBold', fontSize: 17, lineHeight: 23 },
  body: { fontFamily: 'InterRegular', fontSize: 14, lineHeight: 20 },
});
