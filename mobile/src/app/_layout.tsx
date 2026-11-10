import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../bootstrap/AppProviders';
import { PushLifecycle } from '../features/inbox/components/PushLifecycle';
import { useShellTheme } from '../shared/lib/useShellTheme';

export default function RootLayout() {
  const { colors, dark } = useShellTheme();
  return (
    <AppProviders>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <PushLifecycle />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </AppProviders>
  );
}
