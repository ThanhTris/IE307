import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PoolDish } from '../../../data/api';
import { AppButton, AppIcon, SheetDialog, type Palette } from '../../../shared/ui';
import type { FinalChoice } from '../hooks/useRoundTwoVoting';
import { RoundTwoDishRow } from './RoundTwoDishRow';

/**
 * Round 2: a list of the round-1 survivors, each with a checkbox. Ticking a dish removes it (up to the cap).
 * Header (title, help), a bar that fills as removals are used, then the list and the send button.
 */
export function RoundTwoView({ candidates, choices, cap, removed, locked, submitting, failed, allRemoved, onChoose, onKeepAll, onSubmit, colors }: {
  candidates: PoolDish[]; choices: Record<string, FinalChoice>; cap: number; removed: number;
  locked: boolean; submitting: boolean; failed: boolean; allRemoved: boolean;
  onChoose: (roundDishId: string, choice: FinalChoice) => void; onKeepAll: () => void; onSubmit: () => void; colors: Palette;
}) {
  const [help, setHelp] = useState(false);
  return <View style={styles.root}>
    <View style={styles.header}>
      <View style={styles.side} />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Vòng 2</Text>
      <View style={[styles.side, styles.actions]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Hướng dẫn" hitSlop={6} onPress={() => setHelp(true)}
          style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? colors.soft : 'transparent' }]}>
          <AppIcon name="help" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>

    <View style={styles.summary}>
      <Text style={[styles.summaryText, { color: colors.text }]}>Đã loại {removed}/{cap} món</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Bỏ chọn tất cả" accessibilityState={{ disabled: locked || removed === 0 }}
        disabled={locked || removed === 0} hitSlop={8} onPress={onKeepAll} style={{ opacity: locked || removed === 0 ? 0.35 : 1 }}>
        <Text style={[styles.link, { color: colors.danger }]}>Bỏ chọn</Text>
      </Pressable>
    </View>
    <View accessibilityLabel={`Đã loại ${removed} trên ${cap} món`} style={[styles.track, { backgroundColor: colors.soft }]}>
      <View style={[styles.fill, { width: `${cap ? Math.min(1, removed / cap) * 100 : 0}%`, backgroundColor: colors.danger }]} />
    </View>

    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
      {candidates.map(dish => <RoundTwoDishRow key={dish.roundDishId} dish={dish} choice={choices[dish.roundDishId] ?? 'KEEP'} locked={locked}
        canRemove={removed < cap} onChoose={onChoose} colors={colors} />)}
    </ScrollView>

    <View style={styles.footer}>
      {allRemoved ? <Text style={[styles.warn, { color: colors.danger }]}>Bạn đang loại hết. Nếu cả nhóm cùng loại hết, sẽ không chọn được món.</Text> : null}
      <AppButton label={failed ? 'Thử lại' : 'Gửi phiếu'} loading={submitting} disabled={locked && !failed} onPress={onSubmit} colors={colors} />
    </View>

    <SheetDialog visible={help} title="Cách chọn ở vòng 2" presentation="dialog" showHandle={false} closeLabel="Đã hiểu" onClose={() => setHelp(false)} colors={colors}>
      <Text style={[styles.helpText, { color: colors.text }]}>Hãy loại những món bạn không thích nhất trong danh sách.</Text>
    </SheetDialog>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  side: { width: 96 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: 'InterBold', fontSize: 20, lineHeight: 28 },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  summaryText: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  link: { fontFamily: 'InterSemiBold', fontSize: 14, lineHeight: 20 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  list: { gap: 12, paddingVertical: 16 },
  footer: { gap: 8, paddingTop: 8, paddingBottom: 24 },
  warn: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 18, textAlign: 'center' },
  helpText: { fontFamily: 'InterRegular', fontSize: 15, lineHeight: 22 },
});
