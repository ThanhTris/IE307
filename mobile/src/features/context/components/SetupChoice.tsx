import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { ChoiceIconView, type ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';
import { SetupCheckboxRow } from './SetupCheckboxRow';

/** Minimum height of a stacked tile; a one-word tile is as tall as a two-line one, and tiles in a row share a height. */
export const STACKED_TILE_HEIGHT = 100;
/** Two label lines at the normal font size; grows with the system font scale. */
const LABEL_LINES_HEIGHT = 40;

export function SetupChoice({ label, selected, onPress, disabled, icon, stacked = false, checkbox = false, columns = 2, width }: {
  label: string; selected: boolean; onPress: () => void; disabled?: boolean;
  icon?: ChoiceIcon; stacked?: boolean; checkbox?: boolean; columns?: 1 | 2 | 3;
  /** Exact tile width from a ChoiceGrid; without it the tile flexes by `columns`. */
  width?: number;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), { fontScale } = useWindowDimensions();
  if (checkbox) return <SetupCheckboxRow label={label} checked={selected} onPress={onPress} disabled={disabled} icon={icon} highlight />;
  const sizing = width ? { width, flexGrow: 0, flexShrink: 0 } : { flexBasis: columns === 3 ? '28%' : columns === 1 ? '100%' : '44%' };
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    accessibilityState={{ selected, disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.choice, stacked && styles.stacked, sizing, { borderColor: selected ? colors.green : colors.line, backgroundColor: selected ? colors.warm : colors.surface, opacity: disabled ? 0.5 : pressed ? 0.7 : 1 }]}>
    {icon ? <View style={stacked ? styles.iconSlot : undefined}><ChoiceIconView icon={icon} size={24} color={selected ? colors.primary : colors.text} /></View> : null}
    {stacked
      // Two lines of label space on every tile: icons and borders line up whatever the text length.
      ? <View style={[styles.labelSlot, { minHeight: Math.ceil(LABEL_LINES_HEIGHT * Math.max(1, fontScale)) }]}><Text textBreakStrategy="balanced" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.stackedLabel, { color: colors.text }, textStyle(600)]}>{breakLabel(label)}</Text></View>
      : <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.label, { color: colors.text }, textStyle(600)]}>{label}</Text>}
  </Pressable>;
}

const NBSP = ' ';
const glue = (text: string) => text.replace(/ /g, NBSP);
/**
 * Long tile labels break at their last separator instead of wherever the width runs out, and the words of each part are
 * glued together: "Mì / Miến / Hủ tiếu" becomes "Mì / Miến" + "Hủ tiếu" (never "Hủ" + "tiếu"), "Đồ chiên & Xiên que"
 * becomes "Đồ chiên &" + "Xiên que".
 */
export function breakLabel(label: string): string {
  if (label.length <= 9) return glue(label);
  const slash = label.lastIndexOf(' / '), amp = label.lastIndexOf(' & ');
  if (slash < 0 && amp < 0) return glue(label);
  return slash > amp ? `${glue(label.slice(0, slash))}\n${glue(label.slice(slash + 3))}` : `${glue(label.slice(0, amp))}${NBSP}&\n${glue(label.slice(amp + 3))}`;
}
const styles = StyleSheet.create({
  choice: { flexGrow: 1, flexShrink: 1, flexBasis: '44%', minHeight: 52, padding: 12, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  stacked: { flexDirection: 'column', minHeight: STACKED_TILE_HEIGHT, paddingHorizontal: 4, paddingVertical: 10, gap: 4, justifyContent: 'flex-start' },
  iconSlot: { height: 30, alignItems: 'center', justifyContent: 'center' },
  labelSlot: { alignSelf: 'stretch', alignItems: 'center', justifyContent: 'flex-start' },
  label: { fontSize: 14, lineHeight: 21, flexShrink: 1, textAlign: 'center' },
  stackedLabel: { fontSize: 15, lineHeight: 19, textAlign: 'center' },
});
