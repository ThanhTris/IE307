import type { ReactNode } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { UserPreferences } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { DishSetupFrame } from '../../context/components/DishSetupFrame';
import { SetupChoice } from '../../context/components/SetupChoice';
import { emptyPreferences, type SetupCatalogue } from '../../context/services/dishSetup';
import { flavorChoices, flavorSelected, isAnything, optionIds, toggleFlavor, togglePreference } from '../services/dishPreferences';
import { preferenceAssets } from '../components/preferenceAssets';
import { PreferenceAdvancedPanel } from '../components/PreferenceAdvancedPanel';

export function DishPreferencesScreen({ preferences, catalogue, onChange, onBack, onSave, busy, submitDisabled, notice, editing, extra }: {
  preferences: UserPreferences; catalogue: SetupCatalogue; onChange: (value: UserPreferences) => void;
  onBack: () => void; onSave: (skip: boolean) => void; busy?: boolean; submitDisabled?: boolean; notice?: string; editing?: boolean; extra?: ReactNode;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.7 ? 1 : width < 360 || fontScale > 1.2 ? 2 : 3;
  const heading = (label: string) => <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>{label}</Text>;
  return <DishSetupFrame title="Khẩu vị" onBack={onBack} busy={busy}
    action={<AppButton label="Bỏ qua" variant="quiet" disabled={busy || submitDisabled} onPress={() => onSave(true)} colors={colors} />}
    footer={<AppButton label={editing ? 'Lưu thay đổi →' : 'Vào phòng chờ →'} loading={busy} disabled={busy || submitDisabled} onPress={() => onSave(false)} colors={colors} />}>
    {notice ? <StatusNotice title={notice} colors={colors} /> : null}
    <SetupChoice label="Ăn gì cũng được" checkbox columns={1} icon={require('../../../../assets/brand/entry-ui/rice.png')} selected={isAnything(preferences)} disabled={busy} onPress={() => onChange(emptyPreferences(preferences.historyConsent))} />
    {(['categories', 'cuisines'] as const).map(key => <View key={key} style={styles.section}>
      {heading(key === 'categories' ? 'Loại món' : 'Ẩm thực')}
      {!catalogue[key].length ? <StatusNotice title="Chưa có lựa chọn được bàn giao" message="Không tự thêm nhãn hoặc ID chưa có dữ liệu." colors={colors} /> : <View style={styles.grid}>{catalogue[key].map(option => <SetupChoice key={option.id} label={option.unknown ? `${option.label} · Chưa rõ` : option.label} columns={columns} stacked={key === 'categories'} icon={preferenceAssets[option.code ?? '']} selected={optionIds(option).every(id => preferences[key === 'categories' ? 'categoryIds' : 'cuisineIds'].includes(id))} disabled={busy || option.unknown} onPress={() => onChange(togglePreference(preferences, key === 'categories' ? 'categoryIds' : 'cuisineIds', option))} />)}</View>}
    </View>)}
    {heading('Hương vị')}<View style={styles.grid}>{flavorChoices.map(choice => <SetupChoice key={choice.id} label={choice.label} columns={fontScale > 1.7 ? 1 : 2} icon={preferenceAssets[choice.id]} selected={flavorSelected(preferences, choice)} disabled={busy} onPress={() => onChange(toggleFlavor(preferences, choice))} />)}</View>
    <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Ưu tiên mềm: ít mặn/đậm đà, chua và cay; không phải yêu cầu loại món.</Text>
    <PreferenceAdvancedPanel value={preferences.temperature} flavor={preferences.flavor} disabled={busy} onChange={temperature => onChange({ ...preferences, temperature })} onFlavorChange={flavor => onChange({ ...preferences, flavor })} />
    <SetupChoice label="Cho phép lưu lịch sử phiên này" checkbox columns={1} selected={preferences.historyConsent} disabled={busy} onPress={() => onChange({ ...preferences, historyConsent: !preferences.historyConsent })} />
    <Text style={[styles.note, { color: colors.muted }, textStyle(400)]}>Khẩu vị là riêng tư. Thay đổi áp dụng cho phòng này; không ghi đè mặc định tài khoản.</Text>{extra}
  </DishSetupFrame>;
}
const styles = StyleSheet.create({ section: { gap: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontSize: 17, lineHeight: 24 }, note: { fontSize: 13, lineHeight: 20 } });
