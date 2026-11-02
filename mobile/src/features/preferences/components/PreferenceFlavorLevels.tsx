import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { FlavorProfile } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { flavorDetailLevels, flavorDetailSelection, setFlavorDetail } from '../services/dishPreferences';

const kinds = [{ key: 'spicy', label: 'Cay' }, { key: 'salty', label: 'Mặn' }, { key: 'sweet', label: 'Ngọt' }, { key: 'sour', label: 'Chua' }] as const;
export function PreferenceFlavorLevels({ value, disabled, onChange }: { value?: FlavorProfile; disabled?: boolean; onChange: (value: FlavorProfile) => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [active, setActive] = useState<keyof FlavorProfile | null>(null);
  return <View style={styles.group}>
    <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(600)]}>Hương vị chi tiết</Text>
    {kinds.map(kind => {
      const selection = flavorDetailSelection(value?.[kind.key]);
      return <View key={kind.key} style={[styles.section, { borderColor: colors.line }]}>
        <Pressable accessibilityRole="button" accessibilityLabel={`Chỉnh vị ${kind.label.toLocaleLowerCase('vi')}`} accessibilityState={{ expanded: active === kind.key, disabled }} disabled={disabled} onPress={() => setActive(previous => previous === kind.key ? null : kind.key)} style={styles.header}>
          <Text style={[styles.label, { color: colors.text }, textStyle(600)]}>{kind.label}</Text><Text style={[styles.summary, { color: colors.muted }, textStyle(400)]}>{flavorDetailLevels.find(item => item.id === selection)?.label ?? 'Chưa rõ'} {active === kind.key ? '−' : '+'}</Text>
        </Pressable>
        {active === kind.key ? <View accessibilityRole="radiogroup" style={styles.options}>{flavorDetailLevels.map(level => <Pressable key={level.id} accessibilityRole="radio" accessibilityLabel={`${kind.label}: ${level.label}`} accessibilityState={{ checked: selection === level.id, disabled }} disabled={disabled} onPress={() => onChange(setFlavorDetail(value, kind.key, level.id))} style={[styles.option, { backgroundColor: selection === level.id ? colors.warm : colors.surface, borderColor: selection === level.id ? colors.primary : colors.line }]}>
          <Text style={[styles.label, { color: colors.text }, textStyle(500)]}>{level.label}</Text>
        </Pressable>)}</View> : null}
      </View>;
    })}
    <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Chọn mức độ bạn thích. Đây là ưu tiên mềm, không phải lựa chọn “Không ăn”.</Text>
  </View>;
}
const styles = StyleSheet.create({ group: { gap: 8 }, heading: { fontSize: 14, lineHeight: 21 }, section: { borderTopWidth: StyleSheet.hairlineWidth }, header: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, label: { fontSize: 13, lineHeight: 20, flexShrink: 1 }, summary: { fontSize: 12, lineHeight: 18, flexShrink: 1, textAlign: 'right' }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 8 }, option: { minHeight: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', maxWidth: '100%' }, note: { fontSize: 12, lineHeight: 18 } });
