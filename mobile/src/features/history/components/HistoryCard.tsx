import { Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon, SwipeToDeleteRow } from '../../../shared/ui';
import type { useShellTheme } from '../../../shared/lib/useShellTheme';

type Colors = ReturnType<typeof useShellTheme>['colors'];

/**
 * One saved meal as a card (icon, winner, when and with whom, the podium and the score line). The whole card is the
 * button: tap opens the detail (when there is one) and swiping it left past half deletes it, so it carries no buttons.
 */
export function HistoryCard({ title, meta, decided, ranks = [], footer, winnerLabel, largeText, disabled, onOpen, onDelete, colors }: {
  title: string; meta: string; decided: boolean; ranks?: string[]; footer: string; winnerLabel?: string; largeText?: boolean; disabled?: boolean;
  onOpen?: () => void; onDelete: () => void | Promise<boolean | void>; colors: Colors;
}) {
  return <SwipeToDeleteRow accessibilityLabel={`Xóa ${title}`} disabled={disabled} onDelete={onDelete} colors={colors}>
    <Pressable accessibilityRole={onOpen ? 'button' : undefined} accessibilityLabel={`${title}. ${meta}`} accessibilityHint={onOpen ? 'Mở chi tiết. Vuốt sang trái để xóa.' : 'Vuốt sang trái để xóa.'}
      disabled={disabled || !onOpen} onPress={onOpen}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.main}>
        <View style={[styles.icon, { backgroundColor: colors.warm }]}><AppIcon name={decided ? 'bowl' : 'noodles'} size={24} color={colors.text} /></View>
        <View style={styles.copy}>
          <Text numberOfLines={2} style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.caption, { color: colors.muted }]}>{meta}</Text>
        </View>
      </View>
      {ranks.length ? <View style={styles.rankList}>
        {ranks.map(line => <Text key={line} style={[styles.rankText, { color: colors.text }]}>{line}</Text>)}
      </View> : null}
      <View style={[styles.footer, largeText && styles.footerLarge, { borderTopColor: colors.line }]}>
        <Text style={[styles.score, { color: colors.text }]}>{footer}</Text>
        {winnerLabel ? <Text style={[styles.winner, { color: colors.green }]}>{winnerLabel}</Text> : null}
      </View>
    </Pressable>
  </SwipeToDeleteRow>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 15, gap: 10 },
  main: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 16 },
  icon: { width: 68, height: 68, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { fontFamily: 'InterSemiBold', fontSize: 16, lineHeight: 22 },
  caption: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  rankList: { paddingTop: 2, gap: 4 },
  rankText: { fontFamily: 'InterRegular', fontSize: 12, lineHeight: 18 },
  footer: { minHeight: 38, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  footerLarge: { flexDirection: 'column', alignItems: 'stretch' },
  score: { fontFamily: 'InterSemiBold', fontSize: 13, lineHeight: 20, flex: 1 },
  winner: { fontFamily: 'InterSemiBold', fontSize: 12, lineHeight: 18 },
});
