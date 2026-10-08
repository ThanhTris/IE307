import { parseJoinLink, parseManualCode, routeIncomingLink } from '../src/domain/bootstrap/joinLink';

describe('GM-02 link spike (not production membership)', () => {
  test('strict allowlisted link becomes confirmation route', () => {
    expect(parseJoinLink('gi-cung-duoc://join?code=ABC234')).toBe('ABC234');
    expect(routeIncomingLink('gi-cung-duoc://join?code=ABC234')).toBe('/join?code=ABC234');
    expect(routeIncomingLink('/')).toBe('/');
  });
  test.each([
    'https://evil.example/join?code=ABC234',
    'https://gi-cung-duoc/join?code=ABC234',
    'gi-cung-duoc://evil/join?code=ABC234',
    'gi-cung-duoc://join.evil?code=ABC234',
    'gi-cung-duoc://user@join?code=ABC234',
    'gi-cung-duoc://join:123?code=ABC234',
    'gi-cung-duoc://join/extra?code=ABC234',
    'gi-cung-duoc://join?code=ABC234&code=DEF567',
    'gi-cung-duoc://join?code=ABC234&token=anything',
    'gi-cung-duoc://join?code=%41BC234',
    'gi-cung-duoc://join?code=ABC234#fragment',
    'gi-cung-duoc://join?code=ABC234\n',
    'gi-cung-duoc://join?code=abc234',
    'gi-cung-duoc://join?code=ABO234',
    'gi-cung-duoc://join?code=ABC2345',
    'gi-cung-duoc://join?code=ABC23',
    '', 'not-a-url',
  ])('rejects unsafe or malformed QR/link: %s', (link) => {
    expect(parseJoinLink(link)).toBeNull();
    expect(routeIncomingLink(link)).toBe('/join?invalid=1');
  });
  test('manual fallback normalizes lowercase and surrounding spaces', () => {
    expect(parseManualCode(' abc234 ')).toBe('ABC234');
  });
  test.each([undefined, null, ['ABC234'], 123456, 'ABC 23', 'AB0123', 'ABI234', 'ABC234\nDEF567', 'ＡBC234'])('rejects invalid manual code: %p', (code) => {
    expect(parseManualCode(code)).toBeNull();
  });
});
