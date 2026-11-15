import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { SwipeToDeleteRow } from '../../src/shared/ui';

const colors = { danger: '#c00', bg: '#fff' } as never;
const touch = (x: number, t: number) => ({
  nativeEvent: { touches: [{ pageX: x, pageY: 10, identifier: 1, timestamp: t }], changedTouches: [{ pageX: x, pageY: 10, identifier: 1, timestamp: t }], pageX: x, pageY: 10, timestamp: t },
  touchHistory: { indexOfSingleActiveTouch: 0, mostRecentTimeStamp: t, numberActiveTouches: 1,
    touchBank: [{ touchActive: true, startPageX: 300, startPageY: 10, startTimeStamp: 0, currentPageX: x, currentPageY: 10, currentTimeStamp: t, previousPageX: 300, previousPageY: 10, previousTimeStamp: 5 }] },
});
async function drag(to: number) {
  const row = screen.getByTestId('swipe-row');
  await act(async () => { row.props.onResponderGrant(touch(300, 1)); });
  await act(async () => { row.props.onResponderMove(touch(to, 20)); });
  await act(async () => { row.props.onResponderRelease(touch(to, 40)); });
}
const mountRow = async (onDelete: () => void | Promise<boolean | void>) => {
  await render(<View style={{ width: 300 }}><SwipeToDeleteRow onDelete={onDelete} colors={colors}><Text>Dòng</Text></SwipeToDeleteRow></View>);
  await act(async () => { await fireEvent(screen.getByTestId('swipe-row').parent!.parent!, 'layout', { nativeEvent: { layout: { width: 300, height: 60, x: 0, y: 0 } } }); });
};

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

test('letting go past half of the row deletes it in one gesture', async () => {
  const onDelete = jest.fn().mockResolvedValue(true);
  await mountRow(onDelete);
  await drag(300 - 200);   // moved 200 of 300: past half
  await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
  expect(onDelete).toHaveBeenCalledTimes(1);
});

test('letting go before half only springs back', async () => {
  const onDelete = jest.fn();
  await mountRow(onDelete);
  await drag(300 - 80);    // moved 80 of 300
  await act(async () => { await jest.advanceTimersByTimeAsync(300); });
  expect(onDelete).not.toHaveBeenCalled();
});
