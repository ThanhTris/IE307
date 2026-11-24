import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../forms/ScaledText';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShellTheme } from '../../lib/useShellTheme';
import { useAppPreferences } from '../../lib/AppPreferences';
import { radii, spacing, typography } from '../../theme/tokens';
import { AppIcon, type AppIconName } from '../icons/AppIcon';
import { CONTAINER_STYLE } from '../layout/ScreenContainer';

/**
 * In-app notification banner (ADR-026): something that happened to the user because of someone else (a friend request,
 * an accepted request, an invite to eat, a room result). It is NOT a toast: toasts report the outcome of the user's own
 * action (error, created/edited/deleted). The banner is a white card with a bell that slides down from the top, opens
 * where it points when tapped, hides after a few seconds or when swiped up, and queues when several arrive together.
 */
export type NotificationInput = {
  /** Same key already waiting or showing: ignored, so one event never stacks twice. */
  key?: string;
  title: string;
  message?: string;
  icon?: AppIconName;
  duration?: number;
  onPress?: () => void;
};
type NotificationItem = NotificationInput & { id: number };
type NotificationApi = { notify: (input: NotificationInput) => void };

const NotificationContext = createContext<NotificationApi | null>(null);
/** What the layers draw. A native Modal is its own window above the screen, so each modal mounts a host (like ToastHost). */
type NotificationHosts = { current?: NotificationItem; waiting: number; done: (id: number) => void; top: number; register: (id: number) => () => void };
const NotificationHostsContext = createContext<NotificationHosts | null>(null);
let nextHostId = 0;
const ROOT_HOST = 0;
export const useNotifications = () => useContext(NotificationContext);

export const NOTIFICATION_DURATION_MS = 5000;
const MAX_WAITING = 5;
let nextId = 0;

export function NotificationProvider({ children }: PropsWithChildren) {
  const { notifications, ready } = useAppPreferences();
  const enabled = ready && notifications;
  const [queue, setQueue] = useState<NotificationItem[] | null>(enabled ? [] : null);
  if (enabled !== (queue !== null)) setQueue(enabled ? [] : null);
  const notify = useCallback((input: NotificationInput) => {
    setQueue(current => !current || (input.key && current.some(item => item.key === input.key))
      ? current
      : [...current.slice(-(MAX_WAITING - 1)), { ...input, id: ++nextId }]);
  }, []);
  const done = useCallback((id: number) => setQueue(current => current?.filter(item => item.id !== id) ?? null), []);
  const api = useMemo(() => enabled ? { notify } : null, [enabled, notify]);
  const [hosts, setHosts] = useState<number[]>([]);
  const register = useCallback((id: number) => {
    setHosts(list => [...list, id]);
    return () => setHosts(list => list.filter(host => host !== id));
  }, []);
  const top = hosts.length ? hosts[hosts.length - 1]! : ROOT_HOST;
  const shared = useMemo(() => ({ current: enabled ? queue?.[0] : undefined, waiting: Math.max(0, (queue?.length ?? 0) - 1), done, top, register }),
    [enabled, queue, done, top, register]);
  return <NotificationContext.Provider value={api}><NotificationHostsContext.Provider value={shared}>
    {children}
    <NotificationLayer hostId={ROOT_HOST} />
  </NotificationHostsContext.Provider></NotificationContext.Provider>;
}

/** Mount inside a native Modal so a notification stays visible above it. */
export function NotificationHost() {
  const shared = useContext(NotificationHostsContext);
  const [hostId] = useState(() => ++nextHostId);
  const register = shared?.register;
  useEffect(() => register?.(hostId), [register, hostId]);
  return <NotificationLayer hostId={hostId} />;
}

function NotificationLayer({ hostId }: { hostId: number }) {
  const shared = useContext(NotificationHostsContext);
  if (!shared || shared.top !== hostId || !shared.current) return null;
  return <NotificationCard key={shared.current.id} item={shared.current} waiting={shared.waiting} onDone={shared.done} />;
}

function NotificationCard({ item, waiting, onDone }: { item: NotificationItem; waiting: number; onDone: (id: number) => void }) {
  const { colors } = useShellTheme(), insets = useSafeAreaInsets();
  const [progress] = useState(() => new Animated.Value(0));
  const [drag] = useState(() => new Animated.Value(0));
  const hide = useCallback(() => {
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => onDone(item.id));
  }, [progress, onDone, item.id]);
  useEffect(() => {
    Animated.spring(progress, { toValue: 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
    const timer = setTimeout(hide, item.duration ?? NOTIFICATION_DURATION_MS);
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
  const slide = progress.interpolate({ inputRange: [0, 1], outputRange: [-100, 0] });
  return <Animated.View {...swipe.panHandlers} pointerEvents="box-none"
    style={[styles.host, { top: insets.top + spacing.sm, opacity: progress, transform: [{ translateY: Animated.add(slide, drag) }] }]}>
    <Pressable testID="notification-banner" accessibilityRole="alert" accessibilityLiveRegion="polite"
      accessibilityLabel={item.message ? `${item.title}. ${item.message}` : item.title}
      onPress={() => { item.onPress?.(); hide(); }}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.line, opacity: pressed ? 0.9 : 1 }]}>
      <View style={[styles.icon, { backgroundColor: colors.warm }]}><AppIcon name={item.icon ?? 'bell'} size={20} color={colors.primary} /></View>
      <View style={styles.texts}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        {item.message ? <Text numberOfLines={2} style={[styles.message, { color: colors.muted }]}>{item.message}</Text> : null}
      </View>
      {waiting > 0 ? <View style={[styles.count, { backgroundColor: colors.primary }]}><Text style={[styles.countText, { color: colors.onPrimary }]}>+{waiting}</Text></View> : null}
    </Pressable>
  </Animated.View>;
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, paddingHorizontal: spacing.lg, zIndex: 1100, elevation: 1100, alignItems: 'center' },
  card: { ...CONTAINER_STYLE, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, borderRadius: radii.lg, borderWidth: StyleSheet.hairlineWidth, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  icon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  texts: { flex: 1, minWidth: 0, gap: 2 },
  title: { ...typography.bodyBold },
  message: { ...typography.body },
  count: { minWidth: 28, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  countText: { fontSize: 12, lineHeight: 16, fontWeight: '700' },
});
