import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import type { PermissionService } from '../services/appPermissions';

/**
 * A reminder on the inbox when the phone does not allow notifications: asks again, and after a second refusal
 * (the phone will not show the question any more) sends the person to Settings. Nothing shows when it is allowed or
 * cannot be given on this build.
 */
export function NotificationPermissionNudge({ service }: { service: PermissionService }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const [state, setState] = useState<'hidden' | 'ask' | 'settings'>('hidden');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void service.status('notifications').then(status => { if (active) setState(status === 'denied' || status === 'undetermined' ? 'ask' : 'hidden'); });
    return () => { active = false; };
  }, [service]);

  if (state === 'hidden') return null;
  const press = async () => {
    if (busy) return;
    if (state === 'settings') { await service.openSettings(); return; }
    setBusy(true);
    try {
      const outcome = await service.ensure('notifications');
      setState(outcome === 'blocked' ? 'settings' : outcome === 'denied' ? 'ask' : 'hidden');
    } finally {
      setBusy(false);
    }
  };
  return <View style={[styles.card, { backgroundColor: colors.warm, borderColor: colors.line }]}>
    <Text style={[styles.title, { color: colors.text }, textStyle(600)]}>Thông báo đang tắt</Text>
    <Text style={[styles.body, { color: colors.muted }, textStyle(400)]}>Bật thông báo để không bỏ lỡ lời mời kết bạn, lời rủ ăn và kết quả phòng.</Text>
    <AppButton label={state === 'settings' ? 'Mở Cài đặt' : 'Bật thông báo'} variant="secondary" loading={busy} disabled={busy} onPress={() => { void press(); }} colors={colors} />
  </View>;
}

const styles = StyleSheet.create({
  card: { gap: 8, padding: 12, borderWidth: 1, borderRadius: 12 },
  title: { fontSize: 15, lineHeight: 22 },
  body: { fontSize: 13, lineHeight: 19 },
});
