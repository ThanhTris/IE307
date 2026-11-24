import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFonts } from '../../../bootstrap/AppFontProvider';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppButton } from '../../../shared/ui';
import { useToast } from '../../../shared/ui/feedback/Toast';
import { ChoiceIconView, type ChoiceIcon } from '../../../shared/ui/icons/ChoiceIcon';
import { SetupCheckboxRow } from '../../context/components/SetupCheckboxRow';
import { permissionCopy, type PermissionKind, type PermissionService, type RawPermission } from '../services/appPermissions';
import { FOCUSED_STYLE } from '../../../shared/ui/layout/ScreenContainer';

const KINDS: PermissionKind[] = ['notifications', 'camera', 'location'];
const ICONS: Record<PermissionKind, ChoiceIcon> = {
  notifications: { mi: 'notifications' },
  camera: { mi: 'photo-camera' },
  location: { mi: 'place' },
};

export interface HistoryConsentWriter {
  /** Saves the account-level choice; false when the server refused. */
  save(enabled: boolean): Promise<boolean>;
}

/**
 * Shown once, right after the first sign-in on this phone: asks for notifications, camera and location together and
 * offers to keep the meal history. Skipping is fine: each feature asks again when it is used.
 */
export function PermissionsWelcomeScreen({ service, history, onDone }: { service: PermissionService; history?: HistoryConsentWriter; onDone: () => void }) {
  const { colors } = useShellTheme(), { textStyle } = useAppFonts();
  const toast = useToast();
  const [states, setStates] = useState<Partial<Record<PermissionKind, RawPermission>>>({});
  const [keepHistory, setKeepHistory] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all(KINDS.map(async kind => [kind, await service.status(kind)] as const)).then(entries => { if (active) setStates(Object.fromEntries(entries)); });
    return () => { active = false; };
  }, [service]);

  const finish = async (askPermissions: boolean) => {
    if (busy) return;
    setBusy(true);
    try {
      if (askPermissions) {
        for (const kind of KINDS) {
          const outcome = await service.ensure(kind);
          setStates(current => ({ ...current, [kind]: outcome === 'granted' ? 'granted' : outcome === 'unavailable' ? 'unavailable' : 'denied' }));
        }
      }
      if (keepHistory && history && !(await history.save(true))) {
        toast?.show({ title: 'Chưa bật được lưu lịch sử', message: 'Bạn có thể bật lại trong màn Lịch sử.', tone: 'error' });
      }
    } finally {
      setBusy(false);
    }
    onDone();
  };

  return <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }, textStyle(700)]}>Cho phép để dùng đầy đủ</Text>
      <Text style={[styles.subtitle, { color: colors.muted }, textStyle(400)]}>Bạn có thể đổi lại bất cứ lúc nào trong Cài đặt của điện thoại.</Text>
      <View style={styles.list}>
        {KINDS.map(kind => {
          const state = states[kind];
          const note = state === 'granted' ? 'Đã cho phép' : state === 'unavailable' ? 'Chưa hỗ trợ trên bản này' : '';
          return <View key={kind} style={[styles.row, { borderColor: colors.line, backgroundColor: colors.surface }]}>
            <View style={[styles.icon, { backgroundColor: colors.warm }]}><ChoiceIconView icon={ICONS[kind]} size={22} color={colors.primary} /></View>
            <View style={styles.copy}>
              <Text style={[styles.rowTitle, { color: colors.text }, textStyle(600)]}>{permissionCopy[kind].title}</Text>
              <Text style={[styles.rowReason, { color: colors.muted }, textStyle(400)]}>{permissionCopy[kind].reason}</Text>
              {note ? <Text style={[styles.note, { color: state === 'granted' ? colors.primary : colors.muted }, textStyle(600)]}>{note}</Text> : null}
            </View>
          </View>;
        })}
      </View>
      {history ? <SetupCheckboxRow label="Lưu lịch sử bữa ăn của tôi" helper="Chỉ bạn xem được. Có thể tắt trong màn Lịch sử." checked={keepHistory} disabled={busy} onPress={() => setKeepHistory(value => !value)} highlight /> : null}
      <View style={styles.actions}>
        <AppButton label="Cho phép" loading={busy} disabled={busy} onPress={() => { void finish(true); }} colors={colors} />
        <AppButton label="Để sau" variant="secondary" disabled={busy} onPress={() => { void finish(false); }} colors={colors} />
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, padding: 24, gap: 16, ...FOCUSED_STYLE, justifyContent: 'center' },
  title: { fontSize: 24, lineHeight: 32, textAlign: 'center' },
  subtitle: { fontSize: 14, lineHeight: 21, textAlign: 'center' },
  list: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1, borderRadius: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  rowTitle: { fontSize: 15, lineHeight: 22 },
  rowReason: { fontSize: 13, lineHeight: 19 },
  note: { fontSize: 12, lineHeight: 18 },
  actions: { gap: 12, marginTop: 8 },
});
