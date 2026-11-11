import { useEffect, useRef, useState } from 'react';
import { PanResponder, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppIcon } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';

export type DishCountProps = ComponentThemeProps & {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  layout?: 'card' | 'inline';
};

const THUMB = 28;

/** Drag-to-set slider over [min, max]: moves freely while the finger is down; the value is sent on release. */
function CountSlider({ value, min, max, disabled, onDrag, onCommit, colors }: { value: number; min: number; max: number; disabled: boolean; onDrag: (next: number) => void; onCommit: (next: number) => void; colors: DishCountProps['colors'] }) {
  const [width, setWidth] = useState(0);
  const live = useRef({ width: 0, min, max, disabled, onDrag, onCommit, last: value });
  useEffect(() => { live.current = { ...live.current, width, min, max, disabled, onDrag, onCommit }; });
  const pick = (x: number) => {
    const { width: w, min: lo, max: hi, disabled: off } = live.current;
    if (off || w <= THUMB) return;
    const next = Math.round(lo + Math.min(1, Math.max(0, (x - THUMB / 2) / (w - THUMB))) * (hi - lo));
    live.current.last = next;
    live.current.onDrag(next);
  };
  const release = () => { if (!live.current.disabled) live.current.onCommit(live.current.last); };
  // Handlers read `live` only while a gesture runs, never during render.
  // eslint-disable-next-line react-hooks/refs
  const [responder] = useState(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: event => pick(event.nativeEvent.locationX), onPanResponderMove: event => pick(event.nativeEvent.locationX),
    onPanResponderRelease: () => release(), onPanResponderTerminate: () => release(),
  }));
  const ratio = (value - min) / (max - min), left = ratio * Math.max(0, width - THUMB);
  return <View accessible accessibilityRole="adjustable" accessibilityLabel="Kéo để chọn số món" accessibilityValue={{ min, max, now: value }}
    accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]} onAccessibilityAction={event => onCommit(Math.min(max, Math.max(min, value + (event.nativeEvent.actionName === 'increment' ? 1 : -1))))}
    onLayout={event => setWidth(event.nativeEvent.layout.width)} style={[styles.slider, { opacity: disabled ? 0.45 : 1 }]} {...responder.panHandlers}>
    <View pointerEvents="none" style={[styles.track, { backgroundColor: colors?.line }]} />
    <View pointerEvents="none" style={[styles.trackFill, { width: left + THUMB / 2, backgroundColor: colors?.primary }]} />
    <View pointerEvents="none" style={[styles.thumb, { left, backgroundColor: colors?.primary, borderColor: colors?.surface }]} />
  </View>;
}

export function DishCount({ value, onChange, min = 10, max = 20, disabled = false, colors, layout = 'card' }: DishCountProps) {
  const [dragging, setDragging] = useState<number | null>(null);
  const count = Math.min(max, Math.max(min, dragging ?? value));
  const inline = layout === 'inline';
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    const typed = Number(draft);
    if (draft !== null && draft.trim() !== '' && Number.isFinite(typed)) onChange(Math.min(max, Math.max(min, Math.round(typed))));
    setDraft(null);
  };
  return (
    <View
      accessibilityRole="summary"
      style={[styles.dishCount, inline && styles.inline, { backgroundColor: colors?.surface, borderColor: colors?.line }]}
    >
      {!inline ? <Text style={[styles.dishCountLabel, { color: colors?.muted }]}>SỐ MÓN</Text> : null}
      <View style={[styles.dishCountControls, inline && styles.inlineControls]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Giảm số món"
          accessibilityState={{ disabled: disabled || count <= min }}
          disabled={disabled || count <= min}
          onPress={() => onChange(Math.max(min, count - 1))}
          style={({ pressed }) => [
            styles.countButton,
            inline && styles.inlineButton,
            {
              borderColor: colors?.line,
              backgroundColor: pressed ? colors?.soft : inline ? colors?.warm : colors?.surface,
              opacity: disabled || count <= min ? 0.45 : 1,
            },
          ]}
        >
          <AppIcon name="minus" size={22} color={colors?.text} />
        </Pressable>
        <View style={styles.valueBox}>
          <TextInput
            accessibilityLabel={`${count} món`}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
            editable={!disabled}
            value={draft ?? String(count)}
            onChangeText={text => setDraft(text.replace(/\D/g, ''))}
            onBlur={commit}
            onSubmitEditing={commit}
            style={[styles.dishCountValue, styles.valueInput, { color: colors?.text }]}
          />
          {inline ? <Text style={[styles.unit, { color: colors?.muted }]}> món</Text> : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Tăng số món"
          accessibilityState={{ disabled: disabled || count >= max }}
          disabled={disabled || count >= max}
          onPress={() => onChange(Math.min(max, count + 1))}
          style={({ pressed }) => [
            styles.countButton,
            inline && styles.inlineButton,
            {
              borderColor: colors?.line,
              backgroundColor: pressed ? colors?.soft : inline ? colors?.warm : colors?.surface,
              opacity: disabled || count >= max ? 0.45 : 1,
            },
          ]}
        >
          <AppIcon name="plus" size={22} color={colors?.text} />
        </Pressable>
      </View>
      <CountSlider value={count} min={min} max={max} disabled={disabled} onDrag={setDragging} onCommit={next => { setDragging(null); onChange(next); }} colors={colors} />
      {!inline ? <Text style={[styles.helper, { color: colors?.muted }]}>
        Chọn từ {min} đến {max} món
      </Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  dishCount: { borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  dishCountLabel: { ...typography.caption },
  dishCountControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  countButton: { width: 48, height: 48, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  countButtonText: { fontSize: 24, lineHeight: 28, fontWeight: '700' },
  dishCountValue: { ...typography.titleLarge, minWidth: 56, textAlign: 'center' },
  helper: { ...typography.caption },
  inline: { padding: spacing.sm, borderRadius: radii.md },
  inlineControls: { width: '100%', justifyContent: 'space-between', gap: spacing.sm },
  inlineButton: { borderRadius: radii.sm, borderWidth: 0 },
  unit: { ...typography.caption },
  valueBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', minWidth: 56 },
  valueInput: { padding: 0, minWidth: 40 },
  slider: { alignSelf: 'stretch', height: 36, justifyContent: 'center', marginHorizontal: spacing.sm },
  track: { position: 'absolute', left: 0, right: 0, height: 6, borderRadius: 3 },
  trackFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3 },
  thumb: { position: 'absolute', width: THUMB, height: THUMB, borderRadius: THUMB / 2, borderWidth: 3 },
});
