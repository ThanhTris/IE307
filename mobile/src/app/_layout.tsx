import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProviders } from '../bootstrap/AppProviders';
import { PushLifecycle } from '../features/inbox/components/PushLifecycle';
import { UpdateRequiredScreen } from '../features/release/screens/UpdateRequiredScreen';
import { checkMinimumVersionFromServer, type MinimumVersionDecision } from '../features/release/services/minimumVersion';
import { useShellTheme } from '../shared/lib/useShellTheme';

export default function RootLayout() {
  return <AppProviders><RootNavigation /></AppProviders>;
}

function RootNavigation() {
  const { colors, dark } = useShellTheme();
  const [updateGate, setUpdateGate] = useState<Extract<MinimumVersionDecision, { updateRequired: true }>>();

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    void checkMinimumVersionFromServer({ signal: controller.signal }).then(decision => {
      if (active && decision.updateRequired) {
        setUpdateGate(decision);
      }
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  if (updateGate) {
    return (
      <>
        <StatusBar style={dark ? 'light' : 'dark'} />
        <UpdateRequiredScreen
          currentVersion={updateGate.currentVersion}
          minimumVersion={updateGate.minimumVersion}
          updateUrl={updateGate.updateUrl}
          message={updateGate.message}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <PushLifecycle />
      <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right', animationDuration: 260, contentStyle: { backgroundColor: colors.background } }}>
        {/* Bottom-navigation tabs cross-fade; every other page slides in from the right. */}
        <Stack.Screen name="index" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="friends" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="history" options={{ animation: 'fade', animationDuration: 200 }} />
        <Stack.Screen name="profile" options={{ animation: 'fade', animationDuration: 200 }} />
      </Stack>
    </>
  );
}
