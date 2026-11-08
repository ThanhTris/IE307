import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../bootstrap/AppProviders';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { installGlobalJoinLinkGuard } from '../features/rooms/services/joinLinks';

// Enforce global join link safety guard before Expo Router evaluates incoming intents
installGlobalJoinLinkGuard();

export default function RootLayout() {
  const { colors, dark } = useShellTheme();
  return (
    <AppProviders>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </AppProviders>
  );
}
