import { render, screen, waitFor } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { useEffect } from 'react';
import { AppFontProvider, useAppFonts } from '../../src/bootstrap/AppFontProvider';

function FontProbe() {
  const { status, textStyle } = useAppFonts();
  return (
    <View>
      <Text testID="font-status">{status}</Text>
      <Text testID="font-regular" style={textStyle(400)}>Cả nhóm ăn gì?</Text>
      <Text testID="font-medium" style={textStyle(500)}>Cả nhóm ăn gì?</Text>
      <Text testID="font-semibold" style={textStyle(600)}>Cả nhóm ăn gì?</Text>
      <Text testID="font-bold" style={textStyle(700)}>Cả nhóm ăn gì?</Text>
    </View>
  );
}

test('children render while Inter is loading and remain mounted when it resolves', async () => {
  let resolveFonts!: () => void;
  const loadFonts = jest.fn(() => new Promise<void>(resolve => { resolveFonts = resolve; }));
  let mounts = 0;
  function StableChild() {
    useEffect(() => { mounts += 1; }, []);
    return <FontProbe />;
  }

  await render(<AppFontProvider loadFonts={loadFonts}><StableChild /></AppFontProvider>);
  expect(screen.getByText('loading')).toBeOnTheScreen();
  expect(screen.getByTestId('font-regular')).toBeOnTheScreen();
  const initialMounts = mounts;
  resolveFonts();
  await waitFor(() => expect(screen.getByText('ready')).toBeOnTheScreen());
  expect(mounts).toBe(initialMounts);
  expect(screen.getByTestId('font-regular')).toHaveStyle({ fontFamily: 'InterRegular' });
  expect(screen.getByTestId('font-medium')).toHaveStyle({ fontFamily: 'InterMedium' });
  expect(screen.getByTestId('font-semibold')).toHaveStyle({ fontFamily: 'InterSemiBold' });
  expect(screen.getByTestId('font-bold')).toHaveStyle({ fontFamily: 'InterBold' });
});

test('a delayed font load keeps usable children on screen', async () => {
  let finish!: () => void;
  const loadFonts = () => new Promise<void>(resolve => { finish = resolve; });
  await render(<AppFontProvider loadFonts={loadFonts}><FontProbe /></AppFontProvider>);
  expect(screen.getByText('loading')).toBeOnTheScreen();
  expect(screen.getByTestId('font-regular')).toBeOnTheScreen();
  finish();
  await waitFor(() => expect(screen.getByText('ready')).toBeOnTheScreen());
});

test('a font load failure keeps Vietnamese text available with system weights', async () => {
  const loadFonts = jest.fn().mockRejectedValue(new Error('font unavailable'));
  await render(<AppFontProvider loadFonts={loadFonts}><FontProbe /></AppFontProvider>);
  await waitFor(() => expect(screen.getByText('fallback')).toBeOnTheScreen());
  expect(screen.getByTestId('font-regular')).toBeOnTheScreen();
  expect(screen.getByTestId('font-regular')).toHaveStyle({ fontWeight: '400' });
});
