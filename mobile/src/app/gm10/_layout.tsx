import { Stack } from 'expo-router';
import { SetupPreviewProvider } from '../../bootstrap/roomSetupPreview';

export default function SetupLayout() {
  return <SetupPreviewProvider><Stack screenOptions={{ headerShown: false }} /></SetupPreviewProvider>;
}
