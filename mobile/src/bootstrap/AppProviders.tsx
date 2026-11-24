import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NotificationProvider } from '../shared/ui/feedback/NotificationBanner';
import { ToastProvider } from '../shared/ui/feedback/Toast';
import { AppFontProvider } from './AppFontProvider';
import { InboxBadgeProvider } from './InboxBadgeProvider';
import { RoomRepositoryProvider } from './RoomRepositoryProvider';
import { AppPreferencesProvider } from '../shared/lib/AppPreferences';

// GM-07/GM-25 mounts repository contracts here; the shell needs no auth/API configuration.
export function AppProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider>
      <AppFontProvider>
        <AppPreferencesProvider>
          <RoomRepositoryProvider>
            <ToastProvider><NotificationProvider><InboxBadgeProvider>{children}</InboxBadgeProvider></NotificationProvider></ToastProvider>
          </RoomRepositoryProvider>
        </AppPreferencesProvider>
      </AppFontProvider>
    </SafeAreaProvider>
  );
}
