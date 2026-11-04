import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import Layout from '../../src/app/_layout';
import Index from '../../src/app/index';
import Profile from '../../src/app/profile';
import Tutorial from '../../src/app/tutorial';
import { markTutorialSeen, rememberPreviewGuest, rememberPreviewRoom, setPreviewScenario, useRoomPreview } from '../../src/bootstrap/roomPreview';

test('replaying tutorial preserves the active mock room and guest identity', async () => {
  setPreviewScenario('default'); rememberPreviewGuest('Minh'); markTutorialSeen();
  const active = { roomId: 'room_mock_001', code: 'GCD234', version: 1, role: 'host' as const };
  rememberPreviewRoom(active);
  const preview = await renderHook(useRoomPreview);
  await renderRouter({ _layout: Layout, index: Index, profile: Profile, tutorial: Tutorial }, { initialUrl: '/' });
  await fireEvent.press(screen.getByRole('tab', { name: 'Cá nhân' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Xem lại hướng dẫn' }));
  await waitFor(() => expect(screen).toHavePathname('/tutorial'));
  await fireEvent.press(screen.getByRole('button', { name: 'Bỏ qua hướng dẫn' }));
  await waitFor(() => expect(screen).toHavePathname('/'));
  expect(preview.result.current.active).toEqual(active);
  expect(preview.result.current.guestName).toBe('Minh');
});
