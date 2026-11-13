import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppIcon } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';

const REVEAL = 88;

/**
 * List row that slides left to reveal a red "Xóa" button (swipe to delete). Drag past half to keep it open,
 * tap the button to delete, tap the row or drag back to close. TalkBack gets a "Xóa" custom action instead.
 */
export function SwipeToDeleteRow({ children, onDelete, label = 'Xóa', accessibilityLabel, disabled, colors }: ComponentThemeProps & {
  children: ReactNode; onDelete: () => void; label?: string; accessibilityLabel?: string; disabled?: boolean;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const open = useRef(false);
  const live = useRef({ disabled });
  useEffect(() => { live.current = { disabled }; });

  const settle = (to: number) => {
    open.current = to !== 0;
    Animated.spring(x, { toValue: to, useNativeDriver: true, friction: 9, tension: 90 }).start();
  };
  // Handlers read the ref only when a gesture happens, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => !live.current.disabled && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { x.stopAnimation(); },
    onPanResponderMove: (_e, g) => {
      const start = open.current ? -REVEAL : 0;
      x.setValue(Math.max(-REVEAL - 24, Math.min(0, start + g.dx)));
    },
    onPanResponderRelease: (_e, g) => {
      const start = open.current ? -REVEAL : 0;
      settle(start + g.dx < -REVEAL / 2 ? -REVEAL : 0);
    },
    onPanResponderTerminate: () => settle(open.current ? -REVEAL : 0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [x]);

  return <View style={styles.root}>
    <View style={[styles.action, { backgroundColor: colors?.danger }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} disabled={disabled} onPress={() => { settle(0); onDelete(); }} style={styles.actionButton}>
        <AppIcon name="trash" size={20} color="#FFFFFF" />
        <Text style={styles.actionText}>{label}</Text>
      </Pressable>
    </View>
    <Animated.View {...responder.panHandlers} style={[{ backgroundColor: colors?.bg, transform: [{ translateX: x }] }]}
      accessibilityActions={[{ name: 'delete', label }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete' && !disabled) onDelete(); }}>
      <Pressable accessible={false} onPress={() => { if (open.current) settle(0); }}>{children}</Pressable>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', borderRadius: 12 },
  action: { position: 'absolute', top: 0, right: 0, bottom: 0, width: REVEAL, alignItems: 'center', justifyContent: 'center' },
  actionButton: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', gap: 2 },
  actionText: { color: '#FFFFFF', fontFamily: 'InterSemiBold', fontSize: 12, lineHeight: 16 },
});
