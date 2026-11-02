import { Image, StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { DishResultFrame } from '../components/DishResultFrame';

export function DishNoConsensusScreen({ reason, onHome, onNewSession, isMock, tools }: { reason: 'EMPTY_INTERSECTION' | 'ALL_REMOVED'; onHome: () => void; onNewSession: () => void; isMock?: boolean; tools?: React.ReactNode }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), first = reason === 'EMPTY_INTERSECTION';
  return <DishResultFrame onHome={onHome} onNewSession={onNewSession} isMock={isMock} tools={tools}>
    <View style={styles.body}>
      <Image source={require('../../../../assets/brand/result/empty-bowl.png')} accessible={false} resizeMode="contain" style={styles.image} />
      <Text style={[styles.round, { color: colors.text }, textStyle(600)]}>{first ? 'VÒNG 2 KHÔNG MỞ' : 'KẾT THÚC VÒNG 2'}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>{first ? 'Không thể chốt được món ăn' : 'Chưa chọn được món'}</Text>
      <Text style={[styles.description, { color: colors.muted }, textStyle(400)]}>{first ? 'Không còn món phù hợp sau lượt chọn Vòng 1.' : 'Không còn món phù hợp sau Vòng 2.'}</Text>
    </View>
  </DishResultFrame>;
}
const styles = StyleSheet.create({ body: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 20, paddingVertical: 24 }, image: { width: 220, maxWidth: '100%', height: 220, borderRadius: 36 }, round: { fontSize: 12, lineHeight: 18, textAlign: 'center' }, title: { fontSize: 28, lineHeight: 36, textAlign: 'center' }, description: { fontSize: 16, lineHeight: 25, textAlign: 'center' } });
