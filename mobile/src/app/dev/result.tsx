import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { DishResultFlow } from '../../features/result/screens/DishResultFlow';
import { dishResultFixture, nearbyCaseOptions, nearbyFixture, resultCaseOptions, scoredResultFixture, type ResultCase } from '../../features/result/services/devResultCases';
import type { NearbyStatus } from '../../features/result/services/resultPresentation';

/** Development-only: open any result screen (Top 3, ties, round 2, no consensus...) without playing a room. */
export default function DevResultRoute() {
  const router = useRouter();
  const { colors } = useShellTheme();
  const [caseId, setCaseId] = useState<ResultCase>('top3');
  const [places, setPlaces] = useState<NearbyStatus>('permission');
  const [celebrate, setCelebrate] = useState(true);
  const [nonce, setNonce] = useState(0);
  if (!__DEV__) return <Redirect href="/" />;
  const fixture = dishResultFixture(caseId);
  const scored = fixture.input.capability === 'scored-v4' ? fixture.input.result : scoredResultFixture(caseId);
  const chip = (label: string, active: boolean, onPress: () => void) => (
    <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={onPress}
      style={[styles.chip, { backgroundColor: active ? colors.primary : colors.surface, borderColor: active ? colors.primary : colors.line }]}>
      <Text style={[styles.chipText, { color: active ? colors.onPrimary : colors.text }]}>{label}</Text>
    </Pressable>
  );
  return <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: colors.background }]}>
    <View style={[styles.panel, { borderBottomColor: colors.line }]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>{resultCaseOptions.map(item => chip(item.label, caseId === item.id, () => { setCaseId(item.id); setNonce(value => value + 1); }))}</ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {chip(celebrate ? 'Có hiệu ứng thắng' : 'Không hiệu ứng', celebrate, () => { setCelebrate(value => !value); setNonce(value => value + 1); })}
        {nearbyCaseOptions.map(item => chip(item.label, places === item.id, () => setPlaces(item.id)))}
      </ScrollView>
    </View>
    <View style={styles.preview}>
      <DishResultFlow key={`${caseId}-${nonce}`} {...fixture} nearby={nearbyFixture(scored, places)} celebrate={celebrate}
        onHome={() => router.replace('/')} onNewSession={() => router.replace('/room/setup')} onRetryResult={() => setNonce(value => value + 1)}
        onRetryPlaces={() => undefined} onRequestLocation={() => undefined} onOpenSettings={() => undefined} onExternalAction={async () => ({ ok: true })} />
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
