import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { AppIcon } from '../icons/AppIcon';
import type { ComponentThemeProps } from '../types';

/** Dragging the row further than this share of its width and letting go deletes it. */
export const SWIPE_DELETE_THRESHOLD = 0.5;

/**
 * List row that deletes in one gesture: drag it left, past half of its width, and let go. The row slides out and
 * `onDelete` runs; let go earlier and it springs back. The red area behind shows a bin that grows once the drag is far
 * enough ("let go now"). TalkBack gets a "Xóa" action and the (covered) bin button, so it needs no gesture.
 */
export function SwipeToDeleteRow({ children, onDelete, label = 'Xóa', accessibilityLabel, disabled, colors }: ComponentThemeProps & {
  children: ReactNode; onDelete: () => void | Promise<boolean | void>; label?: string; accessibilityLabel?: string; disabled?: boolean;
}) {
  const [x] = useState(() => new Animated.Value(0));
  const [width, setWidth] = useState(320);
  const live = useRef({ disabled, width, onDelete });
  useEffect(() => { live.current = { disabled, width, onDelete }; });
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const settle = (to: number) => Animated.spring(x, { toValue: to, useNativeDriver: true, friction: 9, tension: 90 }).start();
  // Handlers read the ref only when a gesture happens, never while rendering.
  // eslint-disable-next-line react-hooks/refs
  const responder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_e, g) => !live.current.disabled && Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { x.stopAnimation(); },
    onPanResponderMove: (_e, g) => x.setValue(Math.max(-live.current.width, Math.min(0, g.dx))),
    onPanResponderRelease: (_e, g) => {
      const { width: w, onDelete: remove } = live.current;
      if (-g.dx > w * SWIPE_DELETE_THRESHOLD) {
        Animated.timing(x, { toValue: -w, duration: 140, useNativeDriver: true }).start(() => {
          // The row stays out while the delete runs. If it reports failure the row comes back at once; if it never
          // says (it returns nothing) the row comes back after a while only if it is still on screen.
          void Promise.resolve(remove()).then(ok => {
            if (!mounted.current) return;
            if (ok === false) settle(0); else setTimeout(() => { if (mounted.current) settle(0); }, 4000);
          }, () => { if (mounted.current) settle(0); });
        });
      } else settle(0);
    },
    onPanResponderTerminate: () => settle(0),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [x]);

  const bin = x.interpolate({ inputRange: [-width, -width * SWIPE_DELETE_THRESHOLD, -width * 0.2, 0], outputRange: [1.35, 1.35, 1, 0.7], extrapolate: 'clamp' });
  return <View style={styles.root} onLayout={event => setWidth(event.nativeEvent.layout.width || 320)}>
    <View style={[styles.action, { backgroundColor: colors?.danger }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} disabled={disabled} onPress={() => onDelete()} style={styles.actionButton}>
        <Animated.View style={{ transform: [{ scale: bin }] }}><AppIcon name="trash" size={22} color="#FFFFFF" /></Animated.View>
      </Pressable>
    </View>
    <Animated.View testID="swipe-row" {...responder.panHandlers} style={[{ backgroundColor: colors?.bg, transform: [{ translateX: x }] }]}
      accessibilityActions={[{ name: 'delete', label }]} onAccessibilityAction={event => { if (event.nativeEvent.actionName === 'delete' && !disabled) onDelete(); }}>
      {children}
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', borderRadius: 12 },
  action: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'flex-end', justifyContent: 'center' },
  actionButton: { alignSelf: 'flex-end', height: '100%', paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
});
