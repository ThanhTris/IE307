import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { JoinSpikeScreen } from '../src/features/bootstrap/screens/JoinSpikeScreen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ bottom: 0, top: 0, left: 0, right: 0 }) }));

describe('link confirmation spike', () => {
  test('valid code is shown with explicit server limitation and a return action', () => {
    render(<JoinSpikeScreen code="ABC234" />);
    expect(screen.getByText('Mã: ABC234')).toBeTruthy();
    expect(screen.getByText(/Chưa đăng nhập, kiểm phòng/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /tham gia/i })).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: 'Về màn kiểm tra' }));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
  test.each([undefined, ['ABC234', 'DEF567'], 'https://evil.example', 'ABC23'])('invalid incoming params show fallback without navigation: %p', (code) => {
    render(<JoinSpikeScreen code={code} />);
    expect(screen.getByRole('header', { name: 'Link hoặc mã không hợp lệ' })).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
