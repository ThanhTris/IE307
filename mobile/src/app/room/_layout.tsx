import { Stack, usePathname } from 'expo-router';
import { SetupPreviewProvider } from '../../bootstrap/roomSetupPreview';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';

export default function RoomLayout() {
  const path = usePathname();
  const live = useRoomRepository();
  return (
    <SetupPreviewProvider enabled={live.mode !== 'real' && (path === '/room/context' || path === '/room/preferences')}>
      <Stack screenOptions={{ headerShown: false }} />
    </SetupPreviewProvider>
  );
}
