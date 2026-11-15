import { relativeDayLabel } from '../../src/features/rooms/services/lobbyPresentation';

describe('lobby meal day label', () => {
  const now = new Date(2026, 10, 11, 9, 0); // Wed 11 Nov 2026, local time
  it('says today, tomorrow, then the dated weekday', () => {
    expect(relativeDayLabel(new Date(2026, 10, 11, 19, 30), now)).toBe('Hôm nay');
    expect(relativeDayLabel(new Date(2026, 10, 12, 7, 0), now)).toBe('Ngày mai');
    expect(relativeDayLabel(new Date(2026, 10, 14, 12, 0), now)).toBe('Thứ 7, 14/11');
  });
});
