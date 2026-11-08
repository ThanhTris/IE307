import { fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import Layout from '../../src/app/_layout';
import RoomLayout from '../../src/app/room/_layout';
import JoinEntry from '../../src/app/room/join-entry';
import JoinRoute from '../../src/app/room/join';
import JoinCodeRoute from '../../src/app/join/[code]';
import JoinIndexRoute from '../../src/app/join/index';
import Receipt from '../../src/app/room/preview';
import { rememberPreviewGuest, setPreviewScenario, useRoomPreview } from '../../src/bootstrap/roomPreview';

test('product preview is public-only; private snapshot is first read after explicit join ACK', async () => {
  setPreviewScenario('default'); rememberPreviewGuest('Minh');
  const preview = await renderHook(useRoomPreview);
  const client = preview.result.current.client;
  const snapshot = jest.spyOn(client, 'getRoomSnapshot'), join = jest.spyOn(client, 'joinRoom');
  try {
    await renderRouter({ _layout: Layout, 'room/_layout': RoomLayout, 'room/join-entry': JoinEntry, 'room/preview': Receipt }, { initialUrl: '/room/join-entry?code=gcd234' });
    expect(join).not.toHaveBeenCalled(); expect(snapshot).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Tiếp tục →' }));
    await screen.findByText('2/20 thành viên');
    expect(join).not.toHaveBeenCalled(); expect(snapshot).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận vào phòng' }));
    await waitFor(() => expect(screen).toHavePathname('/room/preview'));
    await screen.findByLabelText('Mã phòng GCD234');
    expect(join).toHaveBeenCalledTimes(1); expect(snapshot).toHaveBeenCalled();
  } finally { snapshot.mockRestore(); join.mockRestore(); }
});

test('/room/join blocks URL with suspicious tokens, prevents code prefill and preview, and keeps manual entry', async () => {
  setPreviewScenario('default');
  rememberPreviewGuest('Tuấn');
  const preview = await renderHook(useRoomPreview);
  const client = preview.result.current.client;
  const join = jest.spyOn(client, 'joinRoom');

  try {
    await renderRouter(
      {
        _layout: Layout,
        'room/_layout': RoomLayout,
        'room/join': JoinRoute,
        'room/preview': Receipt,
      },
      {
        initialUrl: '/room/join?code=GCD234&%74oken=synthetic',
      }
    );

    // Verify rejection prevented prefilling GCD234 and join was not called
    expect(screen.getByText('Vào kèo ăn')).toBeOnTheScreen();
    expect(join).not.toHaveBeenCalled();

    // Verify code input is empty and not prefilled with GCD234
    const codeInput = screen.getByLabelText('Mã phòng (6 ký tự)');
    expect(codeInput).toHaveDisplayValue('');

    // User can still enter code manually and proceed safely
    await fireEvent.changeText(codeInput, 'XYZ789');
    await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng →' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' }));

    expect(join).toHaveBeenCalledWith(expect.objectContaining({ code: 'XYZ789' }));
    expect(join).not.toHaveBeenCalledWith(expect.objectContaining({ code: 'GCD234' }));
  } finally {
    join.mockRestore();
  }
});

test('/room/join mounted from route param MNP567 does not get overwritten by late getInitialURL resolving GCD234', async () => {
  setPreviewScenario('default');
  let resolveCold: ((url: string) => void) | null = null;
  const coldPromise = new Promise<string>(resolve => {
    resolveCold = resolve;
  });
  const getInitialSpy = jest.spyOn(Linking, 'getInitialURL').mockReturnValue(coldPromise as any);

  try {
    await renderRouter(
      {
        _layout: Layout,
        'room/_layout': RoomLayout,
        'room/join': JoinRoute,
        'room/preview': Receipt,
      },
      {
        initialUrl: '/room/join?code=MNP567',
      }
    );

    // Initial param code MNP567 should be filled
    const codeInput = screen.getByLabelText('Mã phòng (6 ký tự)');
    expect(codeInput).toHaveDisplayValue('MNP567');

    // Late cold URL resolves with GCD234
    resolveCold!('gi-cung-duoc://room/join?code=GCD234');
    await waitFor(() => {
      // Must still be MNP567, NOT overwritten by GCD234!
      expect(codeInput).toHaveDisplayValue('MNP567');
    });
  } finally {
    getInitialSpy.mockRestore();
  }
});

test('Expo router redirects /join/[code] to /room/join with prefilled code', async () => {
  setPreviewScenario('default');
  await renderRouter(
    {
      _layout: Layout,
      'join/[code]': JoinCodeRoute,
      'room/_layout': RoomLayout,
      'room/join': JoinRoute,
      'room/preview': Receipt,
    },
    {
      initialUrl: '/join/GCD234',
    }
  );

  await waitFor(() => expect(screen).toHavePathname('/room/join'));
  const codeInput = screen.getByLabelText('Mã phòng (6 ký tự)');
  expect(codeInput).toHaveDisplayValue('GCD234');
});

test('Expo router redirects /join with query code to /room/join', async () => {
  setPreviewScenario('default');
  await renderRouter(
    {
      _layout: Layout,
      'join/index': JoinIndexRoute,
      'room/_layout': RoomLayout,
      'room/join': JoinRoute,
      'room/preview': Receipt,
    },
    {
      initialUrl: '/join?code=XYZ789',
    }
  );

  await waitFor(() => expect(screen).toHavePathname('/room/join'));
  const codeInput = screen.getByLabelText('Mã phòng (6 ký tự)');
  expect(codeInput).toHaveDisplayValue('XYZ789');
});
