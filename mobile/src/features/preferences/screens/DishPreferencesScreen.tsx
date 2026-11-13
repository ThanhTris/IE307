import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { UserPreferences } from '../../../data/api/contracts';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../../shared/ui';
import { DishSetupFrame } from '../../context/components/DishSetupFrame';
import { ChoiceGrid } from '../../context/components/ChoiceGrid';
import { SetupChoice } from '../../context/components/SetupChoice';
import { emptyPreferences, type SetupCatalogue } from '../../context/services/dishSetup';
import { fattyChoice, flavorChoices, flavorSelected, isAnything, optionSelected, toggleFlavor, togglePreference } from '../services/dishPreferences';
import { categoriesForMeal } from '../../context/services/dishSetupCatalogue';
import { preferenceAssets } from '../components/preferenceAssets';
// import { PreferenceAdvancedPanel } from '../components/PreferenceAdvancedPanel';
import { ToastNotice } from '../../../shared/ui/feedback/Toast';

export function DishPreferencesScreen({ preferences, catalogue, mealSlot, onChange, onBack, onSave, busy, submitDisabled, notice, noticeTone = 'error', editing, extra }: {
  preferences: UserPreferences; catalogue: SetupCatalogue; /** "snack" shows the snack dish groups. */ mealSlot?: string; onChange: (value: UserPreferences) => void;
  onBack: () => void; onSave: (skip: boolean) => void; busy?: boolean; submitDisabled?: boolean; notice?: string; /** Red (server problem) or amber (offline, stale, blocked form). */ noticeTone?: 'error' | 'warning'; editing?: boolean; extra?: ReactNode;
}) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts(), { width, fontScale } = useWindowDimensions();
  const columns = fontScale > 1.7 ? 1 : width < 360 || fontScale > 1.2 ? 2 : 3;
  const heading = (label: string) => <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }, textStyle(700)]}>{label}</Text>;
  return <DishSetupFrame title="Khẩu vị" onBack={onBack} busy={busy}
    action={<Pressable accessibilityRole="button" accessibilityLabel="Bỏ qua" disabled={busy || submitDisabled} hitSlop={12} onPress={() => onSave(true)}><Text style={[styles.skip, { color: colors.primary, opacity: busy || submitDisabled ? 0.5 : 1 }, textStyle(700)]}>Bỏ qua</Text></Pressable>}
    footer={<AppButton label={editing ? 'Lưu thay đổi →' : 'Vào phòng chờ →'} loading={busy} disabled={busy || submitDisabled} onPress={() => onSave(false)} colors={colors} />}>
    {notice ? <ToastNotice title={notice} tone={noticeTone} /> : null}
    <SetupChoice label="Ăn gì cũng được" checkbox columns={1} icon={{ food: 'silverware-fork-knife' }} selected={isAnything(preferences)} disabled={busy} onPress={() => onChange(emptyPreferences(preferences.historyConsent))} />
    {(['categories', 'cuisines'] as const).map(key => { const options = key === 'categories' ? categoriesForMeal(catalogue, mealSlot) : catalogue.cuisines; const regionColumns = columns === 3 ? 2 : columns; return <View key={key} style={styles.section}>
      {heading(key === 'categories' ? 'Loại món' : 'Ẩm thực')}
      {!options.length ? <StatusNotice title="Chưa có lựa chọn được bàn giao" message="Không tự thêm nhãn hoặc ID chưa có dữ liệu." colors={colors} /> : <ChoiceGrid columns={key === 'categories' ? columns : regionColumns}>{tile => options.map(option => <SetupChoice key={option.id} width={tile} label={option.unknown ? `${option.label} · Chưa rõ` : option.label} columns={columns} stacked icon={preferenceAssets[option.code ?? '']} selected={optionSelected(preferences[key === 'categories' ? 'categoryIds' : 'cuisineIds'], option)} disabled={busy || option.unknown} onPress={() => onChange(togglePreference(preferences, key === 'categories' ? 'categoryIds' : 'cuisineIds', option))} />)}</ChoiceGrid>}
    </View>; })}
    {heading('Hương vị')}<ChoiceGrid columns={columns}>{tile => <>
      {flavorChoices.map(choice => <SetupChoice key={choice.id} width={tile} label={choice.label} columns={columns} stacked icon={preferenceAssets[choice.id]} selected={flavorSelected(preferences, choice)} disabled={busy} onPress={() => onChange(toggleFlavor(preferences, choice))} />)}
      <SetupChoice width={tile} label={fattyChoice.label} columns={columns} stacked icon={preferenceAssets.fatty} selected={preferences.categoryIds.includes(fattyChoice.id)} disabled={busy} onPress={() => onChange(togglePreference(preferences, 'categoryIds', fattyChoice))} />
    </>}</ChoiceGrid>
    {/* Advanced options are not built yet. Re-enable together; history consent belongs above the advanced panel.
    <SetupChoice label="Cho phép lưu lịch sử cá nhân cho tài khoản này" checkbox columns={1} selected={preferences.historyConsent} disabled={busy} onPress={() => onChange({ ...preferences, historyConsent: !preferences.historyConsent })} />
    <PreferenceAdvancedPanel value={preferences.temperature} flavor={preferences.flavor} disabled={busy} onChange={temperature => onChange({ ...preferences, temperature })} onFlavorChange={flavor => onChange({ ...preferences, flavor })} />
    */}
    {extra}
  </DishSetupFrame>;
}
const styles = StyleSheet.create({ section: { gap: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, heading: { fontSize: 17, lineHeight: 24 }, note: { fontSize: 13, lineHeight: 20 }, skip: { fontSize: 15, lineHeight: 21 } });
