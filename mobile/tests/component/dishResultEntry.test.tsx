import type { PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react-native';
import { DishResultEntry } from '../../src/bootstrap/DishResultEntry';
import { useRoomRepository } from '../../src/bootstrap/RoomRepositoryProvider';

jest.mock('../../src/bootstrap/RoomRepositoryProvider', () => ({ useRoomRepository: jest.fn() }));
jest.mock('../../src/features/auth/components/RequireActiveSession', () => ({ RequireActiveSession: ({ children }: PropsWithChildren) => children }));
test('real mode never renders mock results even when a legacy QA flag is supplied', async () => {
  jest.mocked(useRoomRepository).mockReturnValue({ mode: 'real' } as ReturnType<typeof useRoomRepository>);
  await render(<DishResultEntry legacy onHome={jest.fn()} onNewSession={jest.fn()} onLegacyNewSession={jest.fn()} onOtherScreen={jest.fn()} />);
  expect(screen.getByText('Chưa thể mở kết quả')).toBeOnTheScreen();
  expect(screen.queryByText(/Mô phỏng/)).toBeNull(); expect(screen.queryByText('Phở bò tái nạm')).toBeNull();
});
