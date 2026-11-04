import { LiveLobbyScreen } from './LiveLobbyScreen';
import type { DemoDestination } from '../../shared/components/MockDemo';
import type { MockApiClient } from '../../../data/api';

type Props = {
  onNavigate: (destination: DemoDestination) => void;
  onHome: () => void;
  mockClient?: MockApiClient;
};

/** Compatibility entry point for the mock lobby; the active route also uses LiveLobbyScreen. */
export function LobbyScreen({ onNavigate, onHome, mockClient }: Props) {
  return <LiveLobbyScreen onNavigate={onNavigate} onHome={onHome} mockClient={mockClient} />;
}
