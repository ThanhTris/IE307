import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { DishResultFrame } from '../components/DishResultFrame';
import { ResultDishArtwork } from '../../../shared/ui/result/ResultDishArtwork';

/** A received winner-only result is never upgraded to a fabricated scored podium. */
export function LegacyDishResultScreen({ name, onHome, onNewSession, isMock, tools }: { name: string; onHome: () => void; onNewSession: () => void; isMock?: boolean; tools?: React.ReactNode }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  return <DishResultFrame onHome={onHome} onNewSession={onNewSession} isMock={isMock} tools={tools}><View style={styles.body}>
    <ResultDishArtwork label={name} size={160} colors={colors} winner />
    <Text style={[styles.caption, { color: colors.muted }, textStyle(500)]}>Món đã chọn của phiên trước</Text>
    <Text accessibilityRole="header" style={[styles.name, { color: colors.text }, textStyle(700)]}>{name}</Text>
    <Text style={[styles.caption, { color: colors.muted }, textStyle(400)]}>Phiên cũ không có dữ liệu điểm và bảng xếp hạng.</Text>
  </View></DishResultFrame>;
}
const styles = StyleSheet.create({ body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 32 }, name: { fontSize: 28, lineHeight: 36, textAlign: 'center' }, caption: { fontSize: 14, lineHeight: 22, textAlign: 'center' } });
