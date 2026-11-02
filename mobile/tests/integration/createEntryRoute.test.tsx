import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import Layout from '../../src/app/_layout';
import RoomLayout from '../../src/app/room/_layout';
import CreateEntry from '../../src/app/room/create-entry';
import { MockApiClient } from '../../src/data/api';
import { rememberPreviewGuest } from '../../src/bootstrap/roomPreview';

test('new create route does not initialize location discovery or create a hidden legacy fixture', async () => {
  rememberPreviewGuest('Minh');
  const discovery = jest.spyOn(MockApiClient.prototype, 'getDiscoveryContext');
  const create = jest.spyOn(MockApiClient.prototype, 'createRoom');
  const join = jest.spyOn(MockApiClient.prototype, 'joinRoom');
  try {
    await renderRouter({ _layout: Layout, 'room/_layout': RoomLayout, 'room/create-entry': CreateEntry, index: () => <Text>Home fixture</Text> }, { initialUrl: '/room/create-entry' });
    expect(screen.getByText('Chủ phòng: Minh')).toBeOnTheScreen();
    expect(discovery).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled(); expect(join).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Quay lại' }));
    expect(discovery).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  } finally { discovery.mockRestore(); create.mockRestore(); join.mockRestore(); }
});
