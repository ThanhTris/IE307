import { Text } from 'react-native';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import Layout from '../../src/app/_layout';
import RoomLayout from '../../src/app/room/_layout';
import Entry from '../../src/app/room/create-entry';
import Setup from '../../src/app/room/setup';
import Context from '../../src/app/room/context';
import Preferences from '../../src/app/room/preferences';
import { MockApiClient } from '../../src/data/api';
import { rememberPreviewGuest } from '../../src/bootstrap/roomPreview';

const routes = { _layout: Layout, 'room/_layout': RoomLayout, 'room/create-entry': Entry, 'room/setup': Setup, 'room/context': Context, 'room/preferences': Preferences, index: () => <Text>Home fixture</Text> };
test('entry opens dish-only setup without seeding a hidden location room', async () => {
  rememberPreviewGuest('Tuấn');
  const discovery = jest.spyOn(MockApiClient.prototype, 'getDiscoveryContext'), create = jest.spyOn(MockApiClient.prototype, 'createRoom');
  try {
    await renderRouter(routes, { initialUrl: '/room/create-entry' });
    await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục thiết lập' }));
    await screen.findByText('Số món để lựa chọn · 10–20');
    expect(screen).toHavePathname('/room/setup');
    expect(discovery).not.toHaveBeenCalled(); expect(create).not.toHaveBeenCalled();
  } finally { discovery.mockRestore(); create.mockRestore(); }
});
test.each(['/room/context', '/room/preferences'])('unbound mock link %s goes to new setup, not legacy discovery', async initialUrl => {
  const discovery = jest.spyOn(MockApiClient.prototype, 'getDiscoveryContext');
  try {
    await renderRouter(routes, { initialUrl });
    await screen.findByText('Số món để lựa chọn · 10–20');
    expect(screen).toHavePathname('/room/setup');
    expect(discovery).not.toHaveBeenCalled();
  } finally { discovery.mockRestore(); }
});
