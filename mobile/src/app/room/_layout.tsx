import { Stack, usePathname } from 'expo-router';
import { SetupPreviewProvider } from '../../bootstrap/roomSetupPreview';

export default function RoomLayout() {
  const path = usePathname();
  return (
    <SetupPreviewProvider enabled={path === '/room/context' || path === '/room/preferences'}>
      <Stack screenOptions={{ headerShown: false }} />
    </SetupPreviewProvider>
  );
}
