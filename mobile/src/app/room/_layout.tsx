import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { SetupPreviewProvider } from '../../bootstrap/roomSetupPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';

export default function RoomLayout() {
  const path = usePathname();
  const params = useGlobalSearchParams<{ legacy?: string; roomId?: string }>();
  const live = useRoomRepository();
  return (
    <SetupPreviewProvider enabled={live.mode !== 'real' && (params.legacy === '1' || !!params.roomId) && (path === '/room/context' || path === '/room/preferences')}>
      <Stack screenOptions={{ headerShown: false }} />
    </SetupPreviewProvider>
  );
}
