import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppFontProvider } from './AppFontProvider';
import { RoomRepositoryProvider } from './RoomRepositoryProvider';

// GM-07/GM-25 mounts repository contracts here; the shell needs no auth/API configuration.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AppFontProvider>
        <RoomRepositoryProvider>{children}</RoomRepositoryProvider>
      </AppFontProvider>
    </SafeAreaProvider>
  );
}
