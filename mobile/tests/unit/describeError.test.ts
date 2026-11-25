import { ACTION_LABEL, ERROR_CODES, describeError } from '../../src/shared/errors/describeError';

describe('describeError', () => {
  it('gives every error code plain copy and a usable next step', () => {
    for (const code of ERROR_CODES) {
      const result = describeError({ messageKey: code });
      expect(result.code).toBe(code);
      expect(result.title.length).toBeGreaterThan(5);
      expect(result.message.length).toBeGreaterThan(10);
      expect(`${result.title} ${result.message}`).not.toMatch(/phiên cục bộ|token|RPC|payload|\b[A-Z_]{6,}\b/);
      if (result.action !== 'none') expect(ACTION_LABEL[result.action]).toBeTruthy();
    }
  });

  it('keeps the person on the screen for server and network failures and lets them report', () => {
    for (const messageKey of ['NETWORK_ERROR', 'TIMEOUT', 'MALFORMED_RESPONSE', 'UNKNOWN_ERROR'] as const) {
      expect(describeError({ messageKey })).toMatchObject({ action: 'retry', reportable: true });
    }
  });

  it('routes an expired session to sign in and a closed room to home', () => {
    expect(describeError({ messageKey: 'AUTH_REQUIRED' }).action).toBe('signIn');
    expect(describeError({ messageKey: 'ROOM_TERMINAL' }).action).toBe('home');
    expect(describeError({ messageKey: 'VERSION_CONFLICT' }).action).toBe('reload');
  });

  it('does not invite reports for mistakes the person can fix', () => {
    for (const messageKey of ['INVALID_INPUT', 'RATE_LIMITED', 'ROOM_FULL', 'INCOMPLETE_BALLOT'] as const) {
      expect(describeError({ messageKey }).reportable).toBe(false);
    }
  });

  it('falls back for an unknown or missing code, including inherited object keys', () => {
    expect(describeError(undefined).code).toBe('UNKNOWN_ERROR');
    expect(describeError({ messageKey: 'toString' as never }).code).toBe('UNKNOWN_ERROR');
  });
});
