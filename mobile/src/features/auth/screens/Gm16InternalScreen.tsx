import * as SecureStore from 'expo-secure-store';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createAuthenticatedApiClient } from '../../../data/auth';
import type { SessionStatus } from '../../../data/auth/session';
import type { ApiError, SessionUser } from '../../../data/api/contracts';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { styles } from '../../home/screens/AppShellScreen';

const markerKey = 'gcd.gm16.harness.v1';
const enabled = typeof __DEV__ !== 'undefined' && __DEV__ && process.env.EXPO_PUBLIC_GM16_INTERNAL === 'true';
type Result = { label: string; ok: boolean; error?: ApiError; user?: SessionUser };

function errorText(error?: ApiError) { return error?.messageKey ?? 'UNKNOWN_ERROR'; }

export function Gm16InternalScreen({ onBack }: { onBack: () => void }) {
  const { colors } = useShellTheme();
  const [status, setStatus] = useState<SessionStatus>('empty');
  const [user, setUser] = useState<SessionUser | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [marker, setMarker] = useState(false);
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';

  const client = useMemo(() => {
    if (!publicKey) return null;
    try {
      const composed = createAuthenticatedApiClient({
        baseUrl,
        publicKey,
        clearPrivateData: async () => { await SecureStore.deleteItemAsync(markerKey); setMarker(false); },
      });
      return composed;
    } catch {
      return null;
    }
  }, [baseUrl, publicKey]);

  const run = async (action: () => Promise<Result>) => {
    setBusy(true);
    try {
      const outcome = await action();
      setResult(outcome);
      if (outcome.user) setUser(outcome.user);
      setStatus(client?.session.getStatus() ?? 'empty');
    } finally { setBusy(false); }
  };
  const invalid = (label: string): Result => ({ label, ok: false, error: { messageKey: 'INVALID_INPUT' } });
  const createGuest = () => run(async () => {
    if (!client) return invalid('Tạo guest');
    const response = await client.session.createGuestSession({ displayName: 'GM-16 Android', requestId: `gm16-${Date.now()}` });
    return response.ok ? { label: 'Tạo guest', ok: true, user: response.data.user } : { label: 'Tạo guest', ok: false, error: response.error };
  });
  const restore = () => run(async () => {
    if (!client) return invalid('Restore');
    const response = await client.session.restoreSession();
    return response.ok ? { label: 'Restore', ok: true, user: response.data } : { label: 'Restore', ok: false, error: response.error };
  });
  const refresh = () => run(async () => {
    if (!client) return invalid('Refresh');
    const response = await client.session.refreshSession();
    return response.ok ? { label: 'Refresh', ok: true, user: response.data } : { label: 'Refresh', ok: false, error: response.error };
  });
  const check = () => restore();
  const writeMarker = () => run(async () => {
    await SecureStore.setItemAsync(markerKey, 'present');
    setMarker(true);
    return { label: 'Dữ liệu riêng', ok: true };
  });
  const logout = () => run(async () => {
    if (!client) return invalid('Logout');
    const response = await client.session.logout(`gm16-logout-${Date.now()}`);
    setUser(null);
    return response.ok ? { label: 'Logout', ok: true } : { label: 'Logout', ok: false, error: response.error };
  });

  if (!enabled) return null;
  const actions = [['Tạo guest', createGuest], ['Restore', restore], ['Refresh', refresh], ['Kiểm session', check], ['Tạo dữ liệu test riêng', writeMarker], ['Logout', logout]] as const;
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>GM-16 · Kiểm session</Text>
        <Text style={[styles.body, { color: colors.muted }]}>Màn nội bộ development. Không hiển thị token, key hoặc response thô.</Text>
        <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.heading, { color: colors.text }]}>Trạng thái: {status}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Identity: {user ? `${user.displayName} · ${user.id}` : 'chưa có'}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>API: {baseUrl}</Text>
          <Text style={[styles.body, { color: colors.muted }]}>Dữ liệu harness: {marker ? 'đang có' : 'đã xóa/chưa tạo'}</Text>
          {!client && <Text accessibilityRole="alert" style={[styles.body, { color: '#B3261E' }]}>Thiếu public key hoặc cấu hình API không hợp lệ.</Text>}
        </View>
        {actions.map(([label, action]) => (
          <Pressable key={label} disabled={busy} accessibilityRole="button" accessibilityLabel={label} onPress={action} style={({ pressed }) => [styles.button, { backgroundColor: colors.primary, opacity: busy || pressed ? 0.65 : 1 }]}>
            <Text style={[styles.buttonLabel, { color: colors.onPrimary }]}>{busy ? 'Đang kiểm…' : label}</Text>
          </Pressable>
        ))}
        {result && <Text accessibilityRole="alert" style={[styles.body, { color: result.ok ? colors.primary : '#B3261E' }]}>{result.label}: {result.ok ? 'PASS' : `FAIL · ${errorText(result.error)}`}</Text>}
        <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}>
          <Text style={[styles.buttonLabel, { color: colors.text }]}>Quay lại</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
