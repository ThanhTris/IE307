import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PoolDish } from '../../../data/api';
import { AppButton, AppIcon, SheetDialog, type Palette, type VoteValue } from '../../../shared/ui';
import { SwipeDishCard } from './SwipeDishCard';

/**
 * Round 1 as a single flashcard deck: header (title, undo and help on the right), progress bar and the card centred
 * in the remaining space. Answering the last card sends the ballot by itself; `retry` only shows when sending failed.
 */
export function FlashcardRoundView({ pool, votes, index, retry, locked, canUndo, onVote, onUndo, onRetry, colors }: {
  pool: PoolDish[]; votes: Record<string, VoteValue>; index: number; retry: boolean; locked: boolean; canUndo: boolean;
  onVote: (dish: PoolDish, vote: VoteValue) => void; onUndo: () => void; onRetry: () => void; colors: Palette;
}) {
  const [help, setHelp] = useState(false);
  const [flipNext, setFlipNext] = useState(false);
  const voted = pool.filter(dish => votes[dish.roundDishId]).length;
  const dish = pool[index];
  const iconButton = (label: string, name: 'undo' | 'help', onPress: () => void, disabled = false) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} hitSlop={6} onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: pressed ? colors.soft : 'transparent', opacity: disabled ? 0.35 : 1 }]}>
      <AppIcon name={name} size={22} color={colors.text} />
    </Pressable>
  );
  return <View style={styles.root}>
    <View style={styles.header}>
      <View style={styles.side} />
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>Vòng 1</Text>
      <View style={[styles.side, styles.actions]}>
        {iconButton('Hoàn tác', 'undo', onUndo, !canUndo || locked)}
        {iconButton('Hướng dẫn', 'help', () => setHelp(true))}
      </View>
    </View>

    <Text style={[styles.progressText, { color: colors.text }]}>{voted}/{pool.length} món</Text>
    <View style={[styles.track, { backgroundColor: colors.soft }]}>
      <View style={[styles.fill, { width: `${pool.length ? (voted / pool.length) * 100 : 0}%`, backgroundColor: colors.primary }]} />
    </View>

    <View style={styles.deck}>
      {retry || !dish ? <View style={[styles.retry, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Text style={[styles.retryTitle, { color: colors.text }]}>Chưa gửi được phiếu</Text>
        <Text style={[styles.retryBody, { color: colors.muted }]}>Phiếu của bạn đã được giữ lại, hãy thử gửi lại.</Text>
        <AppButton label="Thử lại" onPress={onRetry} loading={locked} colors={colors} style={styles.retryButton} />
      </View> : <View style={styles.stack}>
        <SwipeDishCard key={dish.roundDishId} dish={dish} currentVote={votes[dish.roundDishId]} disabled={locked} enterFlip={flipNext} onVote={vote => { setFlipNext(vote === 'WANT'); onVote(dish, vote); }} colors={colors} />
      </View>}
    </View>

    <SheetDialog visible={help} title="Cách chọn món" presentation="dialog" showHandle={false} closeLabel="Đã hiểu" onClose={() => setHelp(false)} colors={colors}>
      <View style={styles.helpList}>
        {[['Vuốt phải', 'Ăn được'], ['Vuốt trái', 'Không ăn'], ['Chạm 2 lần', 'Muốn ăn']].map(([gesture, meaning]) => (
          <View key={gesture} style={styles.helpRow}>
            <Text style={[styles.helpGesture, { color: colors.text }]}>{gesture}</Text>
            <Text style={[styles.helpMeaning, { color: colors.muted }]}>{meaning}</Text>
          </View>
        ))}
      </View>
    </SheetDialog>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 16, paddingBottom: 24 },
  header: { minHeight: 56, flexDirection: 'row', alignItems: 'center' },
  side: { width: 96 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 4 },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontFamily: 'InterBold', fontSize: 20, lineHeight: 28 },
  progressText: { fontFamily: 'InterSemiBold', fontSize: 14, marginBottom: 6 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  deck: { flex: 1, justifyContent: 'center' },
  stack: { justifyContent: 'center' },
  retry: { borderWidth: 1, borderRadius: 24, padding: 24, alignItems: 'center', gap: 10 },
  retryTitle: { fontFamily: 'InterBold', fontSize: 18, lineHeight: 26, textAlign: 'center' },
  retryBody: { fontFamily: 'InterRegular', fontSize: 14, lineHeight: 20, textAlign: 'center' },
  retryButton: { alignSelf: 'stretch', marginTop: 6 },
  helpList: { gap: 12 },
  helpRow: { flexDirection: 'row', justifyContent: 'space-between' },
  helpGesture: { fontFamily: 'InterSemiBold', fontSize: 15 },
  helpMeaning: { fontFamily: 'InterRegular', fontSize: 15 },
});
