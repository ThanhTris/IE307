import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { FinalRoundScreen } from '../../features/voting';
import { roundTwoCandidates, type FinalScreenScenario } from '../../features/voting/fixtures';

const SIZES = [3, 6, 10] as const;
const OUTCOMES: { id: FinalScreenScenario; label: string }[] = [
  { id: 'consensus', label: 'Gửi thành công' },
  { id: 'waiting', label: 'Chờ cả nhóm' },
  { id: 'error', label: 'Lỗi gửi phiếu' },
  { id: 'all_removed', label: 'Cả nhóm loại hết' },
];

/** Development-only: open the round-2 screen with 3, 6 or 10 dishes and pick what sending the ballot does. */
export default function DevRoundTwoRoute() {
  const router = useRouter();
  const { colors } = useShellTheme();
  const [size, setSize] = useState<(typeof SIZES)[number]>(6);
  const [outcome, setOutcome] = useState<FinalScreenScenario>('waiting');
  const [host, setHost] = useState(true);
  const [nonce, setNonce] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;
  const restart = () => setNonce(value => value + 1);
  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => { onPress(); restart(); }}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.line }]}>
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
  return <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={[styles.panel, { borderBottomColor: colors.line }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {SIZES.map(item => chip(`${item} món`, size === item, () => setSize(item)))}
        {chip(host ? 'Chủ phòng' : 'Thành viên', host, () => setHost(value => !value))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {OUTCOMES.map(item => chip(item.label, outcome === item.id, () => setOutcome(item.id)))}
      </ScrollView>
    </View>
    <View style={styles.preview}>
      <FinalRoundScreen key={`${size}-${outcome}-${host}-${nonce}`} candidates={roundTwoCandidates(size)} initialScenario={outcome}
        initialIsHost={host} showScenarioPicker={false} simulateDelayMs={600}
        onFinish={() => router.replace('/')} onBack={() => router.replace('/')} />
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  panel: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 6, gap: 6 },
  row: { gap: 8, paddingHorizontal: 12 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { fontFamily: 'InterMedium', fontSize: 12, lineHeight: 16 },
  preview: { flex: 1 },
});
