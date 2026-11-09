import { act, fireEvent, renderHook, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter } from 'expo-router/testing-library';
import { Linking } from 'react-native';
import Layout from '../../src/app/_layout';
import RoomLayout from '../../src/app/room/_layout';
import JoinEntry from '../../src/app/room/join-entry';
import JoinRoute from '../../src/app/room/join';
import JoinCodeRoute from '../../src/app/join/[code]';
import JoinIndexRoute from '../../src/app/join/index';
import InboxRoute from '../../src/app/inbox';
import Receipt from '../../src/app/room/preview';
import { redirectSystemPath } from '../../src/app/+native-intent';
import { getPreviewClient, rememberPreviewGuest, setPreviewScenario, useRoomPreview } from '../../src/bootstrap/roomPreview';
import {
  emitWarmLinkEventForTesting,
  resetConsumedInitialUrlForTesting,
} from '../../src/features/rooms/services/joinLinks';

// Enable React 19 act environment recognition in Jest
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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
  const client = getPreviewClient();
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
    const codeInput = await screen.findByLabelText('Mã phòng (6 ký tự)');
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
  rememberPreviewGuest('Minh');
  const client = getPreviewClient();
  const join = jest.spyOn(client, 'joinRoom');

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

    // Press join button and verify it explicitly confirms with MNP567, not GCD234!
    await fireEvent.press(screen.getByRole('button', { name: 'Vào phòng →' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Xác nhận vào phòng mô phỏng' }));

    expect(join).toHaveBeenCalledWith(expect.objectContaining({ code: 'MNP567' }));
    expect(join).not.toHaveBeenCalledWith(expect.objectContaining({ code: 'GCD234' }));
  } finally {
    getInitialSpy.mockRestore();
    join.mockRestore();
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

test('/room/join blocks cold launch with userinfo credentials gi-cung-duoc://qa-user:qa-value@room/join?code=GCD234', async () => {
  setPreviewScenario('default');
  resetConsumedInitialUrlForTesting();
  const getInitialSpy = jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('gi-cung-duoc://qa-user:qa-value@room/join?code=GCD234');

  try {
    await renderRouter(
      {
        _layout: Layout,
        'room/_layout': RoomLayout,
        'room/join': JoinRoute,
        'room/preview': Receipt,
      },
      {
        initialUrl: '/room/join?code=GCD234',
      }
    );

    // Verify rejection shows "Liên kết bị chặn" notice
    await screen.findByText('Liên kết bị chặn');

    // Verify code input is empty and not prefilled with GCD234
    const codeInput = await screen.findByLabelText('Mã phòng (6 ký tự)');
    expect(codeInput).toHaveDisplayValue('');

    // User can still manually type a valid code
    await fireEvent.changeText(codeInput, 'XYZ789');
    expect(codeInput).toHaveDisplayValue('XYZ789');
  } finally {
    getInitialSpy.mockRestore();
    resetConsumedInitialUrlForTesting();
  }
});

test('/room/join re-entry from app with empty params does not re-prefill cold launch code', async () => {
  setPreviewScenario('default');
  resetConsumedInitialUrlForTesting();

  // First mount: app opened with deep link GCD234
  const getInitialSpy = jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('gi-cung-duoc://room/join?code=GCD234');

  try {
    await renderRouter(
      {
        _layout: Layout,
        'room/_layout': RoomLayout,
        'room/join': JoinRoute,
        'room/preview': Receipt,
      },
      {
        initialUrl: '/room/join?code=GCD234',
      }
    );

    // Initial mount correctly consumes and prefills GCD234
    const codeInput1 = await screen.findByLabelText('Mã phòng (6 ký tự)');
    await waitFor(() => expect(codeInput1).toHaveDisplayValue('GCD234'));

    // Second re-entry: user navigates to /room/join with empty params from within app
    // Linking.getInitialURL() still holds the OS launch intent, but app session must not re-query it
    await act(async () => {
      router.replace('/room/join');
    });

    const codeInput2 = await screen.findByLabelText('Mã phòng (6 ký tự)');
    // Input must remain empty for manual typing, NOT re-prefilled with GCD234!
    expect(codeInput2).toHaveDisplayValue('');
    expect(screen.queryByText('Liên kết bị chặn')).toBeNull();
  } finally {
    getInitialSpy.mockRestore();
    resetConsumedInitialUrlForTesting();
  }
});

test('warm link with userinfo credentials opened from Home navigates safely with blocked notice and empty input', async () => {
  setPreviewScenario('default');
  rememberPreviewGuest('Tuấn');
  const client = getPreviewClient();
  const join = jest.spyOn(client, 'joinRoom');

  // 1. User is on another screen (Home) when an external URI arrives:
  // Native intent interceptor inspects the raw URL before Expo Router splits parameters
  const rawIntentUrl = 'gi-cung-duoc://qa-user:qa-value@room/join?code=GCD234';
  const guardedTarget = redirectSystemPath({ path: rawIntentUrl, initial: false });
  expect(guardedTarget).toBe('/room/join?error=SUSPICIOUS_PAYLOAD');

  // 2. Expo Router navigates to guarded path into /room/join with empty initial URL
  try {
    await renderRouter(
      {
        _layout: Layout,
        'room/_layout': RoomLayout,
        'room/join': JoinRoute,
        'room/preview': Receipt,
      },
      {
        initialUrl: guardedTarget,
      }
    );

    await waitFor(() => expect(screen).toHavePathname('/room/join'));

    // StatusNotice warning displayed
    await screen.findByText('Liên kết bị chặn');

    // Code input is empty and not prefilled with GCD234
    const codeInput = await screen.findByLabelText('Mã phòng (6 ký tự)');
    expect(codeInput).toHaveDisplayValue('');
    expect(join).not.toHaveBeenCalled();

    // User can still manually type a valid code
    await fireEvent.changeText(codeInput, 'SAFE99');
    expect(codeInput).toHaveDisplayValue('SAFE99');
  } finally {
    join.mockRestore();
  }
});

test('warm link with userinfo credentials opened while on /room/join shows blocked notice and keeps input empty', async () => {
  setPreviewScenario('default');
  rememberPreviewGuest('Tuấn');
  const client = getPreviewClient();
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
        initialUrl: '/room/join',
      }
    );

    // Initially on /room/join with empty input
    const codeInput = await screen.findByLabelText('Mã phòng (6 ký tự)');
    expect(codeInput).toHaveDisplayValue('');

    // Emit warm link containing userinfo credentials
    await act(async () => {
      await emitWarmLinkEventForTesting('gi-cung-duoc://qa-user:qa-value@room/join?code=GCD234');
    });

    // Shows "Liên kết bị chặn"
    await screen.findByText('Liên kết bị chặn');
    expect(codeInput).toHaveDisplayValue('');
    expect(join).not.toHaveBeenCalled();
  } finally {
    join.mockRestore();
  }
});

test('redirectSystemPath preserves Inbox deep links with returnTo query without routing to room join', async () => {
  const expoInbox = 'exp://127.0.0.1:8081/--/inbox?returnTo=history';
  const customInbox = 'gi-cung-duoc:///inbox?returnTo=history';

  expect(redirectSystemPath({ path: expoInbox, initial: false })).toBe(expoInbox);
  expect(redirectSystemPath({ path: customInbox, initial: false })).toBe(customInbox);

  // Render router with inbox path and verify it navigates cleanly to /inbox
  await renderRouter(
    {
      _layout: Layout,
      inbox: InboxRoute,
      'room/_layout': RoomLayout,
      'room/join': JoinRoute,
    },
    {
      initialUrl: '/inbox?returnTo=history',
    }
  );

  await waitFor(() => expect(screen).toHavePathname('/inbox'));
  expect(screen.queryByText('Liên kết bị chặn')).toBeNull();
  expect(screen.queryByText('Vào kèo ăn')).toBeNull();
});
