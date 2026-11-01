import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { PreviewControls, previewSessionToken, rememberPreviewRoom, setPreviewScenario, useRoomPreview } from '../../../bootstrap/roomPreview';
import { MOCK_DEFAULT_ROOM_CODE } from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { Chip } from '../../../shared/ui';
import { createHomePreview, homePreviewScenarios, type HomePreviewScenario } from '../fixtures/homePreview';
import { HomeScreen, type HomeScreenProps } from './HomeScreen';

export function HomePreviewScreen(props: Pick<HomeScreenProps, 'onCreate' | 'onJoin' | 'onResume' | 'onOpenFoundation' | 'onOpenRoomSetup' | 'onOpenDiscoveryContext' | 'onFriends' | 'onHistory' | 'onInbox'>) {
  const { colors } = useShellTheme();
  const preview = useRoomPreview();
  const [scenario, setScenario] = useState<HomePreviewScenario>('existing');
  const fixture = useMemo(() => createHomePreview(scenario, () => setScenario('no-room')), [scenario]);
  const selectScenario = (next: HomePreviewScenario) => {
    if (next === 'active-room') {
      // Explicit QA selection replaces only the in-memory mock room, never real data.
      setPreviewScenario('default');
      rememberPreviewRoom({ roomId: 'room_mock_001', code: MOCK_DEFAULT_ROOM_CODE, version: 1, role: 'host' });
    }
    setScenario(next);
  };
  return <HomeScreen {...props} key={`${scenario}:${preview.revision}`} isMock
    repository={scenario === 'existing' ? preview.client : fixture.repository}
    sessionToken={previewSessionToken} activeRoom={scenario === 'existing' ? preview.active : fixture.activeRoom}
    liveSession={fixture.liveSession}
    previewControls={busy => <>
      <Text style={{ color: colors.text }}>Mô phỏng Home · fixture cố định, không đổi phiên thật</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{homePreviewScenarios.map(([id, label]) => <Chip key={id} label={label} selected={scenario === id} onPress={() => selectScenario(id)} disabled={busy} colors={colors} />)}</View>
      <PreviewControls disabled={busy} />
    </>} />;
}
