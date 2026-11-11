import type { PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react-native';
import { DishResultEntry } from '../../src/features/result/screens/DishResultEntry';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: jest.fn() }));
jest.mock('../../src/features/auth/components/RequireActiveSession', () => ({ RequireActiveSession: ({ children }: PropsWithChildren) => children }));
test('without a room id the result entry shows a recoverable notice and never sample data', async () => {
  jest.mocked(useRoomRepository).mockReturnValue({ mode: 'real' } as ReturnType<typeof useRoomRepository>);
  await render(<DishResultEntry onHome={jest.fn()} onNewSession={jest.fn()} onOtherScreen={jest.fn()} />);
  expect(screen.getByText('Chưa thể mở kết quả')).toBeOnTheScreen();
  expect(screen.queryByText(/Mô phỏng/)).toBeNull(); expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
});
