import { destinationFor, incidentFor } from '../../src/shared/errors/failure';
import { ERROR_CODES } from '../../src/shared/errors/describeError';
import { clearIncident, peekIncident, setIncident } from '../../src/shared/errors/incident';

describe('where a failure takes the person', () => {
  it('sends a room that is gone home instead of offering a pointless retry', () => {
    for (const code of ['ROOM_NOT_FOUND', 'ROOM_TERMINAL', 'ROOM_EXPIRED', 'NOT_MEMBER', 'CONTRACT_MISMATCH'] as const) {
      expect(destinationFor(code, 'room')).toBe('home');
      expect(destinationFor(code, 'result')).toBe('home');
    }
    expect(destinationFor('ROOM_NOT_FOUND', 'entry')).toBe('stay');
  });

  it('asks accounts to sign in again and gives guests a fresh start from home', () => {
    expect(destinationFor('AUTH_REQUIRED', 'room', { isGuest: false })).toBe('signIn');
    expect(destinationFor('AUTH_REQUIRED', 'room', { isGuest: true })).toBe('home');
    expect(destinationFor('AUTH_REQUIRED', 'auth')).toBe('stay');
  });

  it('stays for network and input problems and rereads stale data', () => {
    for (const code of ['NETWORK_ERROR', 'TIMEOUT', 'MALFORMED_RESPONSE', 'RATE_LIMITED', 'INVALID_INPUT', 'NOT_ENOUGH_MEMBERS'] as const) {
      expect(destinationFor(code, 'room')).toBe('stay');
    }
    expect(destinationFor('VERSION_CONFLICT', 'room')).toBe('reload');
    for (const code of ERROR_CODES) expect(['stay', 'reload', 'home', 'signIn']).toContain(destinationFor(code, 'room'));
  });

  it('offers reporting only for exits the person could not have caused, without any room data', () => {
    expect(incidentFor({ code: 'ROOM_TERMINAL', title: 'Chủ phòng đã hủy phòng' }, 'home', 'room/lobby'))
      .toEqual({ destination: 'home', title: 'Chủ phòng đã hủy phòng', message: 'Về trang chủ để tạo hoặc vào phòng khác.' });
    const unexpected = incidentFor({ code: 'ROOM_NOT_FOUND' }, 'home', 'room/lobby');
    expect(unexpected.report).toMatchObject({ errorCode: 'ROOM_NOT_FOUND', screen: 'room/lobby' });
    expect(Object.keys(unexpected.report!).sort()).toEqual(['action', 'errorCode', 'occurredAt', 'screen']);
    expect(incidentFor({ code: 'AUTH_REQUIRED' }, 'signIn', 'room/lobby').message).toBe('Đăng nhập lại để tiếp tục.');
  });

  it('keeps the reason until it is dismissed', () => {
    const incident = incidentFor({ code: 'ROOM_EXPIRED' }, 'home', 'room/lobby');
    setIncident(incident);
    expect(peekIncident()).toBe(incident);
    clearIncident();
    expect(peekIncident()).toBeUndefined();
  });
});
