import { useMemo, useRef, useState } from 'react';
import { Redirect } from 'expo-router';
import { LiveFriendsScreen } from '../../features/friends/screens/LiveFriendsScreen';
import { createGm28FigmaHistoryRepository, createGm28FigmaInboxRepository, createGm28FigmaSocialRepository } from '../../features/shared/fixtures/gm28FigmaParity';
import { LiveHistoryScreen } from '../../features/history/screens/LiveHistoryScreen';
import { LiveInboxScreen } from '../../features/inbox/screens/LiveInboxScreen';

type PreviewScreen = 'friends' | 'inbox' | 'history';

/** Development-only composition preview. Its repositories return fixed Figma sample data and never call the API. */
export default function Gm28FigmaParityRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gm28FigmaParityPreview />;
}

function Gm28FigmaParityPreview() {
  const [screen, setScreen] = useState<PreviewScreen>('friends');
  const previousSocialScreen = useRef<PreviewScreen>('friends');
  const socialRepository = useMemo(() => createGm28FigmaSocialRepository(), []);
  const inboxRepository = useMemo(() => createGm28FigmaInboxRepository(), []);
  const historyRepository = useMemo(() => createGm28FigmaHistoryRepository(), []);

  const navigate = (path: string) => {
    if (path.startsWith('/inbox')) {
      previousSocialScreen.current = screen === 'history' ? 'history' : 'friends';
      setScreen('inbox');
    } else if (path.startsWith('/friends')) setScreen('friends');
    else if (path.startsWith('/history')) setScreen('history');
  };
  const back = () => setScreen(previousSocialScreen.current);

  if (screen === 'inbox') return <LiveInboxScreen repository={inboxRepository} displayName="Minh" onNavigate={navigate} onHome={back} />;
  if (screen === 'history') return <LiveHistoryScreen repository={historyRepository} onNavigate={navigate} onHome={back} />;
  return <LiveFriendsScreen repository={socialRepository} inboxRepository={inboxRepository} onNavigate={navigate} onHome={back} />;
}
