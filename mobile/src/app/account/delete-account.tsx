import { useState } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { AccountFormFrame } from '../../features/account/components/AccountFormFrame';
import { DeleteAccountScreen } from '../../features/account/screens/DeleteAccountScreen';
import { useShellTheme } from '../../shared/lib/useShellTheme';
import { AppButton, StatusNotice } from '../../shared/ui';

export default function DeleteAccountRoute() {
  const live = useRoomRepository();
  const router = useRouter();
  const { colors } = useShellTheme();
  const [cleaning, setCleaning] = useState(false);
  const back = () => router.canGoBack() ? router.back() : router.replace('/profile');

  if (live.isInitializing) return <AccountFormFrame title="Xóa tài khoản" onBack={back}>
    <StatusNotice title="Đang khôi phục phiên…" colors={colors} />
  </AccountFormFrame>;

  if (live.status === 'blocked' && !live.user) return <AccountFormFrame title="Xóa tài khoản" onBack={back} busy={cleaning}>
    <StatusNotice title="Cần dọn dữ liệu trên thiết bị"
      message="Hãy thử lại để dọn dữ liệu của phiên trước." tone="warning" colors={colors} />
    <AppButton label="Dọn lại dữ liệu" loading={cleaning} colors={colors} onPress={() => {
      if (cleaning) return;
      setCleaning(true);
      void live.logout().finally(() => setCleaning(false));
    }} />
  </AccountFormFrame>;

  if (live.status !== 'active' || !live.user) return <Redirect href="/welcome" />;
  if (!live.accountDeletion) return <AccountFormFrame title="Xóa tài khoản" onBack={back}>
    <StatusNotice title="Chưa thể kết nối dịch vụ xóa tài khoản" colors={colors} />
  </AccountFormFrame>;

  return <DeleteAccountScreen key={live.user.id + ':' + live.user.isGuest}
    user={live.user} deletion={live.accountDeletion} onBack={back} onSignInAgain={live.logout} />;
}
