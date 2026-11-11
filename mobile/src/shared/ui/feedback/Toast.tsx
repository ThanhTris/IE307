import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppIcon } from '../icons/AppIcon';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';
export type ToastInput = { title: string; message?: string; tone?: ToastTone; duration?: number };
type ToastItem = Required<Omit<ToastInput, 'message'>> & { id: number; message?: string };

/** Each tone has its own colour pair (accent + tinted background) so the state reads at a glance. */
export const toastPalette: Record<ToastTone, { accent: string; background: string; text: string }> = {
  success: { accent: '#16A34A', background: '#ECFDF3', text: '#14532D' },
  error: { accent: '#DC2626', background: '#FEF2F2', text: '#7F1D1D' },
  warning: { accent: '#D97706', background: '#FFFBEB', text: '#78350F' },
  info: { accent: '#2563EB', background: '#EFF6FF', text: '#1E3A8A' },
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
    const item: ToastItem = { id: ++nextId, title: input.title, message: input.message, tone: input.tone ?? toneFromText(`${input.title} ${input.message ?? ''}`), duration: input.duration ?? 3000 };
    // Same text already visible: don't stack duplicates.
    setItems(current => current.some(c => c.title === item.title && c.message === item.message) ? current : [...current.slice(-2), item]);
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
  const [progress] = useState(() => new Animated.Value(0));
  const palette = toastPalette[item.tone];
  const hide = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone(item.id));
  }, [progress, onDone, item.id]);
  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
    const timer = setTimeout(hide, item.duration);
    return () => clearTimeout(timer);
  }, [progress, hide, item.duration]);
  const translateY = progress.interpolate({ inputRange: [0, 1], outputRange: [-80, 0] });
  return <Animated.View style={[styles.card, { backgroundColor: palette.background, borderColor: palette.accent, opacity: progress, transform: [{ translateY }] }]}>
    <Pressable testID={`toast-${item.tone}`} accessibilityRole="alert" accessibilityLiveRegion="polite" onPress={hide} style={styles.row}>
      <AppIcon name={item.tone} size={22} color={palette.accent} />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: palette.text }]}>{item.title}</Text>
        {item.message ? <Text style={[styles.message, { color: palette.text }]}>{item.message}</Text> : null}
      </View>
    </Pressable>
  </Animated.View>;
}

/**
 * Drop-in replacement for a transient inline notice: shows a toast whenever the text appears or changes.
 * Without a ToastProvider (isolated component tests) it falls back to rendering the text inline.
 */
export function ToastNotice({ title, message, tone }: ToastInput) {
  const toast = useToast();
  useEffect(() => { if (toast && title) toast.show({ title, message, tone }); }, [toast, title, message, tone]);
  if (toast) return null;
  const palette = toastPalette[tone ?? toneFromText(`${title} ${message ?? ''}`)];
  return <View accessibilityRole="alert" style={[styles.card, styles.inline, { backgroundColor: palette.background, borderColor: palette.accent }]}>
    <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
    {message ? <Text style={[styles.message, { color: palette.text }]}>{message}</Text> : null}
  </View>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: spacing.lg, right: spacing.lg, gap: spacing.sm, zIndex: 1000, elevation: 1000 },
  card: { borderRadius: radii.lg, borderLeftWidth: 4, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  inline: { padding: spacing.md, elevation: 0, shadowOpacity: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
  texts: { flex: 1, gap: 2 },
  title: { ...typography.bodyBold },
  message: { ...typography.body },
});
