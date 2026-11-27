import { mapErrorHelper } from '../../src/data/api/client/helpers';

describe('mapErrorHelper HTTP status', () => {
  it.each([500, 502, 503, 504])('reads %i as the server being unreachable, like the auth transport', status => {
    expect(mapErrorHelper({ status, body: 'Service Unavailable' }).messageKey).toBe('NETWORK_ERROR');
  });

  it('keeps the business code when a server error body carries one', () => {
    expect(mapErrorHelper({ status: 500, body: { code: 'P0001', message: 'ROOM_FULL' } }).messageKey).toBe('ROOM_FULL');
  });

  it('leaves an unrecognised client error unknown', () => {
    expect(mapErrorHelper({ status: 418, body: null }).messageKey).toBe('UNKNOWN_ERROR');
  });
});
