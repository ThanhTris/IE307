import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FlavorProfile, UserPreferences } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { PreferenceFlavorLevels } from './PreferenceFlavorLevels';

const options = [
  { id: 'unknown', label: 'Không ưu tiên', description: 'Không ưu tiên nhiệt độ' },
  { id: 'hot', label: 'Nóng', description: 'Nóng' }, { id: 'warm', label: 'Ấm', description: 'Ấm' },
  { id: 'cold', label: 'Lạnh', description: 'Lạnh' }, { id: 'ambient', label: 'Nhiệt độ phòng', description: 'Nhiệt độ phòng' },
] as const;
export function PreferenceAdvancedPanel({ value = 'unknown', flavor, disabled, onChange, onFlavorChange }: { value?: UserPreferences['temperature']; flavor?: FlavorProfile; disabled?: boolean; onChange: (value: NonNullable<UserPreferences['temperature']>) => void; onFlavorChange?: (value: FlavorProfile) => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), [open, setOpen] = useState(false);
  return <View style={[styles.card, { borderColor: colors.line, backgroundColor: colors.surface }]}>
    <Pressable accessibilityRole="button" accessibilityLabel="Tùy chọn nâng cao" accessibilityState={{ expanded: open, disabled }} disabled={disabled} onPress={() => setOpen(previous => !previous)} style={styles.header}>
      <View style={styles.copy}><Text style={[styles.title, { color: colors.text }, textStyle(600)]}>Tùy chọn nâng cao</Text><Text style={[styles.summary, { color: colors.muted }, textStyle(400)]}>{`Nhiệt độ · ${options.find(option => option.id === value)?.label ?? 'Chưa rõ'}`}</Text></View>
      <Image source={require('../../../../assets/brand/home/back.png')} accessible={false} resizeMode="contain" style={[styles.chevron, { tintColor: colors.text, transform: [{ rotate: open ? '90deg' : '-90deg' }] }]} />
    </Pressable>
    {open ? <View style={styles.details}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(600)]}>Nhiệt độ món</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>{options.map(option => <Pressable key={option.id} accessibilityRole="radio" accessibilityLabel={option.description} accessibilityState={{ checked: value === option.id, disabled }} disabled={disabled} onPress={() => onChange(option.id)} style={[styles.option, { borderColor: value === option.id ? colors.primary : colors.line, backgroundColor: value === option.id ? colors.warm : colors.surface, opacity: disabled ? 0.5 : 1 }]}>
        <View accessible={false} style={[styles.radio, { borderColor: value === option.id ? colors.primary : colors.line }]}>{value === option.id ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}</View>
        <Text style={[styles.label, { color: colors.text }, textStyle(500)]}>{option.label}</Text>
      </Pressable>)}</View>
      <Text style={[styles.summary, { color: colors.muted }, textStyle(400)]}>Chỉ là ưu tiên mềm; không loại món khỏi lượt chọn.</Text>
      {onFlavorChange ? <PreferenceFlavorLevels value={flavor} disabled={disabled} onChange={onFlavorChange} /> : null}
    </View> : null}
  </View>;
}
const styles = StyleSheet.create({ card: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 12 }, header: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }, copy: { flex: 1, minWidth: 0, gap: 4 }, title: { fontSize: 14, lineHeight: 21 }, summary: { fontSize: 12, lineHeight: 18 }, chevron: { width: 20, height: 20 }, details: { gap: 10, paddingBottom: 12 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, option: { minHeight: 48, borderRadius: 24, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, maxWidth: '100%' }, label: { fontSize: 13, lineHeight: 20, flexShrink: 1 }, radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' }, dot: { width: 8, height: 8, borderRadius: 4 } });
