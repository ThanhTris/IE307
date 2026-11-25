import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../bootstrap/AppProviders';
import { PushLifecycle } from '../features/inbox/components/PushLifecycle';
import { useShellTheme } from '../shared/lib/useShellTheme';
import { HelpProvider } from '../features/support/HelpProvider';

export default function RootLayout() {
  return <AppProviders><RootNavigation /></AppProviders>;
}

function RootNavigation() {
  const { colors, dark } = useShellTheme();
  const segments = useSegments();
  return (
    <HelpProvider segments={segments}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <PushLifecycle />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260, contentStyle: { backgroundColor: colors.background } }}>
        {/* Bottom-navigation tabs cross-fade; every other page slides in from the right. */}
        <Stack.Screen name="index" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="friends" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="history" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="profile" options={{ animation: 'fade', animationDuration: 200 }} />
      </Stack>
    </HelpProvider>
  );
}
