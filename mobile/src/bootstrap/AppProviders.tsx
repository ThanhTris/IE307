import type { PropsWithChildren } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// GM-07 mounts repository contracts here; the shell needs no auth/API configuration.
export function AppProviders({ children }: PropsWithChildren) {
  return <SafeAreaProvider>{children}</SafeAreaProvider>;
}
