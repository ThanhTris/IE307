import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ToastProvider } from '../shared/ui/feedback/Toast';
import { AppFontProvider } from './AppFontProvider';
import { InboxBadgeProvider } from './InboxBadgeProvider';
import { RoomRepositoryProvider } from './RoomRepositoryProvider';

// GM-07/GM-25 mounts repository contracts here; the shell needs no auth/API configuration.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AppFontProvider>
        <RoomRepositoryProvider>
          <ToastProvider><InboxBadgeProvider>{children}</InboxBadgeProvider></ToastProvider>
        </RoomRepositoryProvider>
      </AppFontProvider>
    </SafeAreaProvider>
  );
}
