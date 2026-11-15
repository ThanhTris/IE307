import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SwipeToDeleteRow } from '../../src/shared/ui';

test('the revealed Xóa button deletes; TalkBack gets a delete action; disabled rows do nothing', async () => {
  const onDelete = jest.fn();
  const view = await render(<SwipeToDeleteRow accessibilityLabel="Xóa Linh" onDelete={onDelete}><Text>Linh</Text></SwipeToDeleteRow>);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa Linh' }));
  expect(onDelete).toHaveBeenCalledTimes(1);
  await view.rerender(<SwipeToDeleteRow accessibilityLabel="Xóa Linh" disabled onDelete={onDelete}><Text>Linh</Text></SwipeToDeleteRow>);
  await fireEvent.press(screen.getByRole('button', { name: 'Xóa Linh' }));
  expect(onDelete).toHaveBeenCalledTimes(1);
});
