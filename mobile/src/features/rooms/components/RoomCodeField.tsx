import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { Platform, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { normalizeRoomCode } from '../services/roomEntry';

/** Native glyphs and carets: no transparent IME input over simulated text. */
export function RoomCodeField({ value, onChange, disabled, error }: { value: string; onChange: (value: string) => void; disabled?: boolean; error?: string }) {
  const { colors, dark } = useShellTheme(), { textStyle } = useAppFonts();
  const { width, fontScale } = useWindowDimensions();
  const inputs = useRef<(ComponentRef<typeof TextInput> | null)[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [focusRequest, setFocusRequest] = useState<number>();
  const [measuredWidth, setMeasuredWidth] = useState<number>();
  const columns = fontScale > 1.3 || (measuredWidth ?? Math.min(width, 480) - 82) < 328 ? 3 : 6;
  useEffect(() => {
    if (focusRequest !== undefined && !disabled) inputs.current[focusRequest]?.focus();
  }, [focusRequest, value, disabled]);
  const focus = (index: number) => {
    // Codes are contiguous: don't let a tap on an empty later cell create gaps.
    const target = Math.min(index, value.length, 5);
    if (target !== index) { setFocusRequest(target); inputs.current[target]?.focus(); return; }
    setActive(index);
  };
  const edit = (index: number, text: string) => {
    if (disabled) return;
    const entered = normalizeRoomCode(text).replace(/\s/g, '').slice(0, 6);
    const start = Math.min(index, value.length);
    const next = entered.length === 6 ? entered : `${value.slice(0, start)}${entered}${value.slice(start + Math.max(1, entered.length))}`.slice(0, 6);
    setFocusRequest(entered.length === 6 ? 5 : entered ? Math.min(start + entered.length, 5) : Math.max(start - 1, 0));
    onChange(next);
  };
  const backspace = (index: number) => {
    if (disabled || value[index] || index === 0) return;
    onChange(`${value.slice(0, index - 1)}${value.slice(index)}`);
    setFocusRequest(index - 1);
  };
  return <View style={styles.field}>
    <Text accessibilityRole="header" style={[styles.label, { color: colors.text }, textStyle(700)]}>Mã phòng</Text>
    <View style={[styles.card, { backgroundColor: dark ? colors.surface : '#FFFFFF', borderColor: error ? colors.danger : colors.line }]}>
      <View style={styles.slots} onLayout={event => setMeasuredWidth(event.nativeEvent.layout.width)}>
        {Array.from({ length: 6 }, (_, index) => <TextInput
          key={index}
          ref={input => { inputs.current[index] = input; }}
          accessibilityLabel={`Ký tự ${index + 1} của mã phòng`}
          accessibilityHint={error ?? 'Mã gồm 6 ký tự. Có thể dán toàn bộ mã vào một ô.'}
          value={value[index] ?? ''}
          onChangeText={text => edit(index, text)}
          onFocus={() => focus(index)}
          onBlur={() => setActive(current => current === index ? null : current)}
          onKeyPress={event => { if (event.nativeEvent.key === 'Backspace') backspace(index); }}
          editable={!disabled}
          maxLength={6}
          selectTextOnFocus
          caretHidden={false}
          cursorColor={colors.primary}
          selectionColor={colors.primary}
          underlineColorAndroid="transparent"
          autoCorrect={false}
          spellCheck={false}
          autoComplete="off"
          textContentType="none"
          importantForAutofill="no"
          keyboardType={Platform.OS === 'android' ? 'visible-password' : 'default'}
          autoCapitalize="characters"
          returnKeyType={index === 5 ? 'done' : 'next'}
          submitBehavior={index === 5 ? 'blurAndSubmit' : 'submit'}
          onSubmitEditing={() => { if (index < 5) setFocusRequest(Math.min(index + 1, value.length, 5)); else inputs.current[index]?.blur(); }}
          style={[styles.input, { flexBasis: columns === 6 ? '14%' : '30%', color: colors.text, borderColor: active === index ? colors.primary : error ? colors.danger : colors.line, backgroundColor: active === index ? colors.warm : colors.background }, textStyle(700)]}
        />)}
      </View>
      <Text style={[styles.pasteHint, { color: colors.muted }, textStyle(400)]}>Nhấn giữ một ô để dán toàn bộ mã</Text>
    </View>
    {error ? <Text accessibilityRole="alert" style={[styles.helper, { color: colors.text, backgroundColor: colors.warm }, textStyle(400)]}>{error}</Text> : <Text style={[styles.helper, { color: colors.muted }, textStyle(400)]}>Lấy mã từ người tạo phòng.</Text>}
  </View>;
}
const styles = StyleSheet.create({
  field: { gap: 20 }, label: { fontSize: 24, lineHeight: 32 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 12 },
  slots: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: { flexGrow: 1, minWidth: 48, minHeight: 58, borderWidth: 1, borderRadius: 12, paddingHorizontal: 4, paddingVertical: 8, fontSize: 24, lineHeight: 34, textAlign: 'center' },
  pasteHint: { textAlign: 'right', fontSize: 12, lineHeight: 18 }, helper: { fontSize: 14, lineHeight: 21, borderRadius: 8 },
});
