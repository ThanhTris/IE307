import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Text } from '../../../shared/ui/forms/ScaledText';
import type { ReadResult, SessionUser } from '../../../data/api/contracts';
import type { AccountService } from '../../../data/auth';
import type { AccountProfile } from '../../../data/auth/types';
import { ApiFeatureFrame, AppButton, AppHeader, SheetDialog } from '../../../shared/ui';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { radii, spacing, typography } from '../../../shared/theme/tokens';
import { useAccountAction } from '../hooks/useAccountAction';
import { accountErrorMessage } from '../services/accountMessages';
import type { PersonalHistorySettings } from '../services/profileHistorySettings';
import { ProfileSettings } from '../components/ProfileSettings';
import { ProfileLegalLinks } from '../components/ProfileLegalLinks';

type Props = {
  user: SessionUser;
  account?: AccountService;
  historySettings?: PersonalHistorySettings;
  canDeleteAccount?: boolean;
  onNavigate: (path: string) => void;
  onHome: () => void;
  onLogout: () => Promise<boolean>;
};

export function ProfileScreen({ user, account, historySettings, canDeleteAccount, onNavigate, onHome, onLogout }: Props) {
  const { colors } = useShellTheme();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [profile, setProfile] = useState<ReadResult<AccountProfile>>();
  const [profileRequest, setProfileRequest] = useState(0);
  const { pending, error, run } = useAccountAction();
  const guest = user.isGuest;

  useEffect(() => {
    if (guest || !account) return;
    let active = true;
    void account.getProfile().then(result => { if (active) setProfile(result); });
    return () => { active = false; };
  }, [guest, account, profileRequest, user.id]);

  const header = <AppHeader onPressBrand={onHome} onInbox={() => onNavigate('/inbox')} showInbox={!guest} showFriends={false} showProfile={false}
    allowTitleWrap hideDivider colors={{ ...colors, surface: colors.background }} />;

  return <ApiFeatureFrame active="profile" title="Cá nhân" onNavigate={onNavigate} onHome={onHome} topBar={header}>
    <Text accessibilityRole="header" style={[typography.titleLarge, { color: colors.text }]}>{guest ? 'Khách' : 'Cá nhân'}</Text>
    <View style={[styles.card, { backgroundColor: colors.warm }]}>
      <View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.line }]}
        accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Text style={[typography.titleLarge, { color: colors.text }]}>{user.displayName.trim().slice(0, 1).toUpperCase()}</Text>
      </View>
      <Text accessibilityRole="header" style={[typography.titleMedium, styles.center, { color: colors.text }]}>
        {user.displayName}
      </Text>
      {!guest && account && !profile ? <Text accessibilityLiveRegion="polite" style={[typography.caption, { color: colors.muted }]}>Đang tải email…</Text> : null}
      {!guest && profile?.ok ? <Text style={[typography.body, styles.center, { color: colors.muted }]}>{profile.data.email}</Text> : null}
      {!guest && profile?.ok === false ? <>
        <Text style={[typography.caption, styles.center, { color: colors.muted }]}>{accountErrorMessage(profile.error)}</Text>
        <AppButton label="Tải lại email" variant="secondary" colors={colors} onPress={() => {
          setProfile(undefined);
          setProfileRequest(value => value + 1);
        }} />
      </> : null}
    </View>
    {guest ? <>
      <Text style={[typography.body, styles.center, { color: colors.muted }]}>Giữ bạn bè và lịch sử khi đổi máy.</Text>
      <AppButton label="Đăng nhập" onPress={() => onNavigate('/account/sign-in')} colors={colors} />
      <AppButton label="Liên kết email" variant="secondary" onPress={() => onNavigate('/account/link')} colors={colors} />
      <Text style={[typography.caption, { color: colors.muted }]}>Bạn vẫn có thể tạo hoặc tham gia phòng với tư cách khách.</Text>
      <ProfileSettings />
    </> : <>
      <Text accessibilityRole="header" style={[typography.titleMedium, { color: colors.text }]}>Tài khoản</Text>
      <View style={[styles.rows, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <Pressable accessibilityRole="button" onPress={() => onNavigate('/account/edit-profile')}
          style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.line }]}>
          <Text style={[typography.bodyBold, styles.rowLabel, { color: colors.text }]}>Sửa hồ sơ</Text>
          <Text accessible={false} style={[typography.titleMedium, { color: colors.text }]}>›</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => onNavigate('/account/change-password')} style={styles.row}>
          <Text style={[typography.bodyBold, styles.rowLabel, { color: colors.text }]}>Đổi mật khẩu</Text>
          <Text accessible={false} style={[typography.titleMedium, { color: colors.text }]}>›</Text>
        </Pressable>
      </View>
      {historySettings ? <ProfileSettings history={historySettings} /> : null}
      <AppButton label="Đăng xuất" variant="secondary" onPress={() => setConfirmLogout(true)} colors={colors} />
    </>}
    <ProfileLegalLinks />
    {canDeleteAccount ? (
      <Pressable accessibilityRole="button" accessibilityLabel="Xóa tài khoản" onPress={() => onNavigate('/account/delete-account')}
        style={[styles.row, styles.deleteRow, { backgroundColor: colors.surface, borderColor: colors.danger }]}>
        <Text style={[typography.bodyBold, styles.rowLabel, { color: colors.danger }]}>Xóa tài khoản</Text>
        <Text accessible={false} style={[typography.titleMedium, { color: colors.danger }]}>›</Text>
      </Pressable>
    ) : null}
    <SheetDialog visible={confirmLogout} title="Đăng xuất?" showClose={false}
      onClose={() => { if (!pending) setConfirmLogout(false); }} colors={colors}>
      <Text style={[typography.body, { color: colors.text }]}>Bạn có thể tiếp tục sử dụng ứng dụng với tài khoản khách</Text>
      {error ? <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger }]}>{accountErrorMessage(error)}</Text> : null}
      <AppButton label={pending ?? 'Đăng xuất'} variant="danger" loading={!!pending} colors={colors} onPress={() => {
        void run('Đang đăng xuất…', async () => await onLogout()
          ? { ok: true, data: undefined }
          : { ok: false, error: { messageKey: 'UNKNOWN_ERROR' } });
      }} />
      <AppButton label="Ở lại" variant="secondary" disabled={!!pending} onPress={() => setConfirmLogout(false)} colors={colors} />
    </SheetDialog>
  </ApiFeatureFrame>;
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', borderRadius: radii.xl, paddingVertical: 28, paddingHorizontal: spacing.xl, gap: spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  center: { textAlign: 'center' },
  rows: { borderRadius: radii.lg, borderWidth: 1 },
  row: { minHeight: 56, paddingVertical: spacing.md, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowLabel: { flex: 1 },
  deleteRow: { borderWidth: 1, borderRadius: radii.lg },
});
