import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '../../shared/ui/forms/ScaledText';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { AccountAccessScreen, AccountEditScreen, type AccountAccessFlow } from '../../features/account';
import { AppButton } from '../../shared/ui';
import { AccountFormFrame } from '../../features/account/components/AccountFormFrame';
import { useShellTheme } from '../../shared/lib/useShellTheme';

export default function AccountRoute() {
  const { flow, source } = useLocalSearchParams<{ flow: string; source?: string }>();
  const router = useRouter();
  const live = useRoomRepository();
  const { colors } = useShellTheme();
  const user = live.status === 'active' ? live.user : null;
  const back = () => router.canGoBack() ? router.back() : router.replace(user ? '/profile' : '/welcome');
  const navigate = (next: AccountAccessFlow) => {
    const destination = { pathname: '/account/[flow]' as const, params: { flow: next } };
    if (flow === 'recovery' && next === 'sign-in') {
      if (user && !user.isGuest) void live.logout().finally(() => router.replace(destination));
      else router.replace(destination);
    } else router.push(destination);
  };
  if (live.isInitializing) return <AccountFormFrame title="Tài khoản" onBack={back}>
    <Text accessibilityLiveRegion="polite" style={{ color: colors.text }}>Đang khôi phục phiên…</Text>
  </AccountFormFrame>;
  if (!live.account) return <AccountFormFrame title="Tài khoản" onBack={back}>
    <Text accessibilityRole="alert" style={{ color: colors.text }}>Tính năng tài khoản chưa có kết nối xác thực.</Text>
    <AppButton label="Quay lại" colors={colors} onPress={back} />
  </AccountFormFrame>;
  if (flow === 'edit-profile' || flow === 'change-password') {
    if (!user || user.isGuest) return <Redirect href={user ? '/profile' : '/welcome'} />;
    return <AccountEditScreen key={`${user.id}:${flow}`} kind={flow} user={user} account={live.account}
      onBack={back} onRecovery={() => router.push({
        pathname: '/account/[flow]', params: { flow: 'recovery', source: 'change-password' },
      })} />;
  }
  if (flow !== 'sign-in' && flow !== 'sign-up' && flow !== 'link' && flow !== 'recovery') return <Redirect href="/" />;
  if (flow === 'link' && !user) return <Redirect href="/welcome" />;
  if (flow === 'sign-up' && user?.isGuest) return <Redirect href={{ pathname: '/account/[flow]', params: { flow: 'link' } }} />;
  const recoveryForCurrentAccount = flow === 'recovery' && source === 'change-password';
  return <AccountAccessScreen key={recoveryForCurrentAccount ? 'recovery:' + user?.id : flow}
    flow={flow} account={live.account} isGuest={user?.isGuest === true} recoveryForCurrentAccount={recoveryForCurrentAccount}
    onBack={back} onNavigate={navigate} onComplete={() => router.dismissTo(flow === 'link' ? '/profile' : '/')} />;
}
