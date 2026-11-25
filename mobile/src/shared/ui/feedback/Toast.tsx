import { CONTAINER_STYLE } from '../layout/ScreenContainer';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../forms/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShellTheme } from '../../lib/useShellTheme';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppIcon } from '../icons/AppIcon';

/**
 * Feedback kinds (see docs/design/FEEDBACK_TOAST_NOTIFICATION.md):
 * - error (red): the API / server refused or could not be reached;
 * - success (green): something was created, added, edited or deleted;
 * - warning (amber): offline, data may be stale, or the action was blocked and needs another step;
 * - info (soft sage): room exit or non-blocking navigation info floating above page content.
 * Events caused by someone else (invites, accepted requests, results) are NOT toasts: see NotificationBanner.
 */
export type ToastTone = 'success' | 'error' | 'warning' | 'info';
export type ToastInput = {
  title: string;
  message?: string;
  tone?: ToastTone;
  duration?: number;
  onPress?: () => void;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
  triggerKey?: string | number;
};
type ToastItem = Required<Omit<ToastInput, 'message' | 'onPress' | 'actionLabel' | 'actionAccessibilityLabel' | 'onAction' | 'triggerKey'>> & {
  id: number;
  message?: string;
  onPress?: () => void;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
};

type ToneTokens = { accent: string; background: string; border: string; text: string; iconBg: string };

/** Each tone has its own colour pair (accent + tinted background) so the state reads at a glance. */
export const toastPalette: Record<ToastTone, ToneTokens> = {
  success: { accent: '#16A34A', background: '#ECFDF3', border: '#BBF7D0', text: '#14532D', iconBg: 'rgba(22,163,74,0.12)' },
  error: { accent: '#DC2626', background: '#FEF2F2', border: '#FECACA', text: '#7F1D1D', iconBg: 'rgba(220,38,38,0.12)' },
  warning: { accent: '#D97706', background: '#FFFBEB', border: '#FDE68A', text: '#78350F', iconBg: 'rgba(217,119,6,0.12)' },
  info: { accent: '#1D6F42', background: '#EEF7F0', border: '#B9DFC3', text: '#14452B', iconBg: 'rgba(29,111,66,0.12)' },
};

export const darkToastPalette: Record<ToastTone, ToneTokens> = {
  success: { accent: '#4ADE80', background: '#14291D', border: '#1E462D', text: '#ECFDF5', iconBg: 'rgba(74,222,128,0.16)' },
  error: { accent: '#F87171', background: '#2D1619', border: '#542429', text: '#FEF2F2', iconBg: 'rgba(248,113,113,0.16)' },
  warning: { accent: '#FBBF24', background: '#2B2111', border: '#4F3B19', text: '#FFFBEB', iconBg: 'rgba(251,191,36,0.16)' },
  info: { accent: '#4ADE80', background: '#16271E', border: '#284936', text: '#ECFDF5', iconBg: 'rgba(74,222,128,0.16)' },
};

/** Guess a tone from Vietnamese copy when the caller did not pass one. */
export function toneFromText(text: string): ToastTone {
  const t = text.toLowerCase();
  if (/(chưa|không|lỗi|thất bại|mất|từ chối|hết hạn|đã đóng|bị hủy)/.test(t)) return /(hãy|thử lại|kiểm tra)/.test(t) && !/(chưa lưu|thất bại|lỗi|mất)/.test(t) ? 'warning' : 'error';
  if (/(hãy|cần|lưu ý|ngoại tuyến)/.test(t)) return 'warning';
  if (/(đã |thành công|hoàn tất)/.test(t)) return 'success';
  return 'info';
}

type ToastApi = { show: (input: ToastInput) => void };
const ToastContext = createContext<ToastApi | null>(null);
/** Visible toasts, kept apart from the stable `show` API so callers do not re-run when the list changes. */
type ToastHosts = { items: ToastItem[]; dismiss: (id: number) => void; top: number; register: (id: number) => () => void };
const ToastItemsContext = createContext<ToastHosts | null>(null);
export const useToast = () => useContext(ToastContext);

let nextId = 0;
let nextHostId = 0;
const ROOT_HOST = 0;

export function ToastProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const show = useCallback((input: ToastInput) => {
    const tone = input.tone ?? toneFromText(`${input.title} ${input.message ?? ''}`);
    const defaultDuration = input.actionLabel
      ? 6000
      : tone === 'error' || tone === 'warning' || (tone === 'info' && input.message)
        ? 4500
        : 3000;
    const item: ToastItem = {
      id: ++nextId,
      title: input.title,
      message: input.message,
      tone,
      duration: input.duration ?? defaultDuration,
      onPress: input.onPress,
      actionLabel: input.actionLabel,
      actionAccessibilityLabel: input.actionAccessibilityLabel,
      onAction: input.onAction,
    };
    // Replace matching text in-place (so e.g. 2nd failure adds the "Báo lỗi" action chip without stacking duplicates).
    setItems(current => (
      current.some(c => c.title === item.title && c.message === item.message)
        ? current.map(c => (c.title === item.title && c.message === item.message ? item : c))
        : [...current.slice(-2), item]
    ));
  }, []);
  const dismiss = useCallback((id: number) => setItems(current => current.filter(c => c.id !== id)), []);
  const api = useMemo(() => ({ show }), [show]);
  // Only the top-most host draws, so a toast is never shown twice (screen + open modal).
  const [hosts, setHosts] = useState<number[]>([]);
  const register = useCallback((id: number) => {
    setHosts(current => [...current, id]);
    return () => setHosts(current => current.filter(host => host !== id));
  }, []);
  const top = hosts.length ? hosts[hosts.length - 1]! : ROOT_HOST;
  const visible = useMemo(() => ({ items, dismiss, top, register }), [items, dismiss, top, register]);
  return <ToastContext.Provider value={api}><ToastItemsContext.Provider value={visible}>
    {children}
    <ToastLayer hostId={ROOT_HOST} />
  </ToastItemsContext.Provider></ToastContext.Provider>;
}

/**
 * Draws the visible toasts. The provider mounts one for the screen; a native Modal is a separate window drawn above it,
 * so every modal (sheet, dialog, QR) mounts its own host to keep toasts visible while it is open.
 */
export function ToastHost() {
  const visible = useContext(ToastItemsContext);
  const [hostId] = useState(() => ++nextHostId);
  const register = visible?.register;
  useEffect(() => register?.(hostId), [register, hostId]);
  return <ToastLayer hostId={hostId} />;
}

function ToastLayer({ hostId }: { hostId: number }) {
  const visible = useContext(ToastItemsContext), insets = useSafeAreaInsets();
  if (!visible || visible.top !== hostId) return null;
  return <View pointerEvents="box-none" style={[styles.host, { top: insets.top + spacing.sm }]}>
    {visible.items.map(item => <ToastCard key={item.id} item={item} onDone={visible.dismiss} />)}
  </View>;
}

function ToastCard({ item, onDone }: { item: ToastItem; onDone: (id: number) => void }) {
  const { dark } = useShellTheme();
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const palette = (dark ? darkToastPalette : toastPalette)[item.tone];
  const hide = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone(item.id));
  }, [progress, onDone, item.id]);
  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
    const timer = setTimeout(hide, item.duration);
    return () => clearTimeout(timer);
  }, [progress, hide, item.duration]);
  const swipe = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy < -6 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
    onPanResponderMove: (_event, gesture) => drag.setValue(Math.min(0, gesture.dy)),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dy < -24 || gesture.vy < -0.5) hide();
      else Animated.spring(drag, { toValue: 0, useNativeDriver: true }).start();
    },
  }), [drag, hide]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  return <Animated.View {...swipe.panHandlers} style={[
    styles.card,
    { backgroundColor: palette.background, borderColor: palette.border, opacity: progress, transform: [{ translateY: Animated.add(translateY, drag) }] },
  ]}>
    <Pressable testID={`toast-${item.tone}`} accessibilityRole="alert" accessibilityLiveRegion="polite"
      onPress={() => { item.onPress?.(); hide(); }} style={styles.row}>
      <View style={[styles.iconBadge, { backgroundColor: palette.iconBg }]}>
        <AppIcon name={item.tone} size={20} color={palette.accent} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: palette.text }]}>{item.title}</Text>
        {item.message ? <Text style={[styles.message, { color: palette.text }]}>{item.message}</Text> : null}
      </View>
      {item.actionLabel && item.onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={item.actionAccessibilityLabel ?? item.actionLabel}
          onPress={event => { event.stopPropagation?.(); item.onAction?.(); hide(); }}
          style={[styles.actionChip, { borderColor: palette.border, backgroundColor: palette.iconBg }]}>
          <Text style={[styles.actionText, { color: palette.accent }]}>{item.actionLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel="Đóng thông báo" hitSlop={8}
        onPress={event => { event.stopPropagation?.(); hide(); }}
        style={({ pressed }) => [styles.closeBtn, { opacity: pressed ? 0.6 : 0.8 }]}>
        <AppIcon name="close" size={16} color={palette.text} />
      </Pressable>
    </Pressable>
  </Animated.View>;
}

/**
 * Drop-in replacement for a transient inline notice: shows a floating toast whenever text or triggerKey changes (0px layout footprint).
 * Without a ToastProvider (isolated component tests) it falls back to rendering inline so test queries remain functional.
 */
export function ToastNotice({ title, message, tone, duration, actionLabel, actionAccessibilityLabel, onAction, triggerKey }: ToastInput) {
  const { dark } = useShellTheme();
  const toast = useToast();
  const onActionRef = useRef(onAction);
  useEffect(() => {
    onActionRef.current = onAction;
  }, [onAction]);

  useEffect(() => {
    if (toast && title) {
      toast.show({
        title,
        message,
        tone,
        duration,
        actionLabel,
        actionAccessibilityLabel,
        onAction: actionLabel ? () => onActionRef.current?.() : undefined,
      });
    }
  }, [toast, title, message, tone, duration, actionLabel, actionAccessibilityLabel, triggerKey]);

  if (toast) return null;
  const resolvedTone = tone ?? toneFromText(`${title} ${message ?? ''}`);
  const palette = (dark ? darkToastPalette : toastPalette)[resolvedTone];
  return <View accessibilityRole="alert" style={[styles.card, styles.inline, { backgroundColor: palette.background, borderColor: palette.border }]}>
    <View style={styles.inlineRow}>
      <View style={[styles.iconBadge, { backgroundColor: palette.iconBg }]}>
        <AppIcon name={resolvedTone} size={18} color={palette.accent} />
      </View>
      <View style={styles.texts}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {message ? <Text style={[styles.message, { color: palette.text }]}>{message}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onAction}
          style={[styles.actionChip, { borderColor: palette.border, backgroundColor: palette.iconBg }]}>
          <Text style={[styles.actionText, { color: palette.accent }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, paddingHorizontal: spacing.lg, alignItems: 'center', gap: spacing.sm, zIndex: 1000, elevation: 1000 },
  card: { ...CONTAINER_STYLE, borderRadius: radii.xl, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  inline: { paddingVertical: spacing.md, paddingHorizontal: spacing.md, elevation: 0, shadowOpacity: 0 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingLeft: spacing.md, paddingRight: spacing.sm },
  iconBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.bodyBold },
  message: { ...typography.caption, lineHeight: 18 },
  actionChip: { paddingHorizontal: spacing.md, minHeight: 32, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  actionText: { ...typography.caption, fontFamily: 'InterSemiBold' },
  closeBtn: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
