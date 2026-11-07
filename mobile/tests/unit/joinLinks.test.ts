import { Linking } from 'react-native';
import {
  createJoinRoomDeepLink,
  createJoinRoomShareMessage,
  createJoinRoomWebLink,
  generateQrMatrix,
  NativeQrScannerAdapter,
  parseJoinRoomUrl,
  SimulatedQrScannerAdapter,
  subscribeToJoinLinks,
} from '../../src/features/rooms/services/joinLinks';

describe('GM-30 joinLinks — Native QR, Links, Allowlist & Resolvers', () => {
  describe('parseJoinRoomUrl & Allowlist Guard', () => {
    test('parses custom scheme with query param (gi-cung-duoc://room/join?code=ABC234)', () => {
      const result = parseJoinRoomUrl('gi-cung-duoc://room/join?code=ABC234');
      expect(result).toEqual({
        ok: true,
        code: 'ABC234',
        rawUrl: 'gi-cung-duoc://room/join?code=ABC234',
      });
    });

    test('parses custom scheme with path (gi-cung-duoc://join/XYZ789)', () => {
      const result = parseJoinRoomUrl('gi-cung-duoc://join/XYZ789');
      expect(result).toEqual({
        ok: true,
        code: 'XYZ789',
        rawUrl: 'gi-cung-duoc://join/XYZ789',
      });
    });

    test('parses custom scheme short path (gi-cung-duoc://r/KLM456)', () => {
      const result = parseJoinRoomUrl('gi-cung-duoc://r/KLM456');
      expect(result).toEqual({
        ok: true,
        code: 'KLM456',
        rawUrl: 'gi-cung-duoc://r/KLM456',
      });
    });

    test('parses allowed web domain with path (https://gicungduoc.vn/join/ABC234)', () => {
      const result = parseJoinRoomUrl('https://gicungduoc.vn/join/ABC234');
      expect(result).toEqual({
        ok: true,
        code: 'ABC234',
        rawUrl: 'https://gicungduoc.vn/join/ABC234',
      });
    });

    test('parses allowed subdomain with query (https://app.gicungduoc.vn/join?code=XYZ789)', () => {
      const result = parseJoinRoomUrl('https://app.gicungduoc.vn/join?code=XYZ789');
      expect(result).toEqual({
        ok: true,
        code: 'XYZ789',
        rawUrl: 'https://app.gicungduoc.vn/join?code=XYZ789',
      });
    });

    test('normalizes lowercase and whitespace in room code', () => {
      const result = parseJoinRoomUrl('gi-cung-duoc://room/join?code=  abc234  ');
      expect(result).toEqual({
        ok: true,
        code: 'ABC234',
        rawUrl: 'gi-cung-duoc://room/join?code=  abc234  ',
      });
    });

    test('rejects disallowed web hosts (e.g. phishing / external domain)', () => {
      const result = parseJoinRoomUrl('https://evil-phishing.com/join/ABC234');
      expect(result).toEqual({
        ok: false,
        error: 'DISALLOWED_HOST',
        rawUrl: 'https://evil-phishing.com/join/ABC234',
      });
    });

    test('rejects disallowed schemes (e.g. http, ftp, javascript, data)', () => {
      expect(parseJoinRoomUrl('javascript:alert(1)')).toEqual({
        ok: false,
        error: 'DISALLOWED_SCHEME',
        rawUrl: 'javascript:alert(1)',
      });
      expect(parseJoinRoomUrl('data:text/html,hack')).toEqual({
        ok: false,
        error: 'DISALLOWED_SCHEME',
        rawUrl: 'data:text/html,hack',
      });
      expect(parseJoinRoomUrl('ftp://gicungduoc.vn/join/ABC234')).toEqual({
        ok: false,
        error: 'DISALLOWED_SCHEME',
        rawUrl: 'ftp://gicungduoc.vn/join/ABC234',
      });
    });

    test('rejects suspicious payloads containing tokens or passwords in query params', () => {
      const result = parseJoinRoomUrl('https://gicungduoc.vn/join/ABC234?token=secret123');
      expect(result).toEqual({
        ok: false,
        error: 'SUSPICIOUS_PAYLOAD',
        rawUrl: 'https://gicungduoc.vn/join/ABC234?token=secret123',
      });

      const resultBearer = parseJoinRoomUrl('gi-cung-duoc://room/join?code=ABC234&bearer=fake');
      expect(resultBearer).toEqual({
        ok: false,
        error: 'SUSPICIOUS_PAYLOAD',
        rawUrl: 'gi-cung-duoc://room/join?code=ABC234&bearer=fake',
      });
    });

    test('rejects invalid room codes (wrong length or excluded chars: 0, O, 1, I)', () => {
      expect(parseJoinRoomUrl('https://gicungduoc.vn/join/SHORT')).toEqual({
        ok: false,
        error: 'INVALID_CODE',
        rawUrl: 'https://gicungduoc.vn/join/SHORT',
      });
      // Character '0' and 'O' are not in alphabet ABCDEFGHJKLMNPQRSTUVWXYZ23456789
      expect(parseJoinRoomUrl('https://gicungduoc.vn/join/ABCD0O')).toEqual({
        ok: false,
        error: 'INVALID_CODE',
        rawUrl: 'https://gicungduoc.vn/join/ABCD0O',
      });
      // Character '1' and 'I' are excluded
      expect(parseJoinRoomUrl('https://gicungduoc.vn/join/ABCD1I')).toEqual({
        ok: false,
        error: 'INVALID_CODE',
        rawUrl: 'https://gicungduoc.vn/join/ABCD1I',
      });
    });

    test('rejects malformed or empty inputs', () => {
      expect(parseJoinRoomUrl('')).toEqual({
        ok: false,
        error: 'MALFORMED_URL',
        rawUrl: '',
      });
      expect(parseJoinRoomUrl('   ')).toEqual({
        ok: false,
        error: 'MALFORMED_URL',
        rawUrl: '   ',
      });
    });
  });

  describe('Link Generation', () => {
    test('createJoinRoomDeepLink creates canonical deep link', () => {
      expect(createJoinRoomDeepLink('abc234')).toBe('gi-cung-duoc://room/join?code=ABC234');
      expect(createJoinRoomDeepLink('  XYZ789  ')).toBe('gi-cung-duoc://room/join?code=XYZ789');
    });

    test('createJoinRoomWebLink creates canonical web share link', () => {
      expect(createJoinRoomWebLink('abc234')).toBe('https://gicungduoc.vn/join/ABC234');
    });

    test('createJoinRoomShareMessage creates friendly invite text without sensitive data', () => {
      const msg = createJoinRoomShareMessage('abc234');
      expect(msg).toContain('ABC234');
      expect(msg).toContain('https://gicungduoc.vn/join/ABC234');
      expect(msg).not.toContain('token');
      expect(msg).not.toContain('secret');
    });
  });

  describe('generateQrMatrix', () => {
    test('generates valid 25x25 matrix with finder patterns at 3 corners', () => {
      const matrix = generateQrMatrix('https://gicungduoc.vn/join/ABC234');
      expect(matrix).toHaveLength(25);
      expect(matrix[0]).toHaveLength(25);

      // Top-left finder center (row 2-4, col 2-4 should be true)
      expect(matrix[3]![3]).toBe(true);
      // Top-right finder center (row 3, col 25-4=21)
      expect(matrix[3]![21]).toBe(true);
      // Bottom-left finder center (row 21, col 3)
      expect(matrix[21]![3]).toBe(true);

      // Timing pattern at row 6 should alternate
      expect(matrix[6]![8]).toBe(true);
      expect(matrix[6]![9]).toBe(false);
      expect(matrix[6]![10]).toBe(true);
    });

    test('is deterministic for identical inputs', () => {
      const m1 = generateQrMatrix('test_1');
      const m2 = generateQrMatrix('test_1');
      expect(m1).toEqual(m2);

      const m3 = generateQrMatrix('test_2');
      expect(m1).not.toEqual(m3);
    });
  });

  describe('QR Scanner Adapters', () => {
    test('SimulatedQrScannerAdapter allows simulating valid and invalid scans', async () => {
      const adapter = new SimulatedQrScannerAdapter('granted');
      expect(await adapter.getPermissionStatus()).toBe('granted');

      const validScan = await adapter.simulateScan!('abc234');
      expect(validScan).toEqual({ ok: true, code: 'ABC234' });

      const invalidScan = await adapter.simulateScan!('invalid_0');
      expect(invalidScan).toEqual({ ok: false, code: 'INVALID_0' });

      adapter.setPermissionStatus('denied');
      expect(await adapter.getPermissionStatus()).toBe('denied');
    });

    test('NativeQrScannerAdapter returns denied per blocked CAMERA config', async () => {
      const adapter = new NativeQrScannerAdapter();
      expect(await adapter.getPermissionStatus()).toBe('denied');
      expect(await adapter.requestPermission()).toBe('denied');
    });
  });

  describe('subscribeToJoinLinks', () => {
    test('handles initial cold URL and warm event URL', async () => {
      const getInitialSpy = jest.spyOn(Linking, 'getInitialURL').mockResolvedValue('gi-cung-duoc://room/join?code=GCD234');
      let listenerCallback: ((event: { url: string }) => void) | null = null;
      const removeSpy = jest.fn();

      const addEventSpy = jest.spyOn(Linking, 'addEventListener').mockImplementation((event, cb) => {
        if (event === 'url') {
          listenerCallback = cb as unknown as (event: { url: string }) => void;
        }
        return { remove: removeSpy } as any;
      });

      const onJoinCode = jest.fn();
      const onError = jest.fn();

      const unsubscribe = subscribeToJoinLinks({ onJoinCode, onError });

      // Wait for cold start resolution
      await new Promise<void>(resolve => { setImmediate(() => resolve()); });
      expect(getInitialSpy).toHaveBeenCalled();
      expect(onJoinCode).toHaveBeenCalledWith('GCD234', 'gi-cung-duoc://room/join?code=GCD234');

      // Simulate warm-start incoming URL
      expect(listenerCallback).not.toBeNull();
      listenerCallback!({ url: 'https://gicungduoc.vn/join/KLM456' });
      expect(onJoinCode).toHaveBeenCalledWith('KLM456', 'https://gicungduoc.vn/join/KLM456');

      // Simulate invalid incoming URL
      listenerCallback!({ url: 'https://evil.com/join/EVIL56' });
      expect(onError).toHaveBeenCalledWith('DISALLOWED_HOST', 'https://evil.com/join/EVIL56');

      unsubscribe();
      expect(removeSpy).toHaveBeenCalled();

      getInitialSpy.mockRestore();
      addEventSpy.mockRestore();
    });
  });
});
