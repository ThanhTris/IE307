import { Stack } from 'expo-router';
import { SetupPreviewProvider } from '../../bootstrap/roomSetupPreview';

export default function RoomLayout() {
  return (
    <SetupPreviewProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </SetupPreviewProvider>
  );
}
