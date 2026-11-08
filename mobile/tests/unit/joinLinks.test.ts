import { Linking } from 'react-native';
import {
  createJoinRoomDeepLink,
  createJoinRoomShareMessage,
  createJoinRoomWebLink,
  generateQrMatrix,
  isSuspiciousSearchParams,
  isSuspiciousWord,
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

    test('rejects obfuscated/encoded tokens and unknown query params', () => {
      const res1 = parseJoinRoomUrl('https://gicungduoc.vn/join/ABC234?%74oken=synthetic');
      expect(res1).toEqual({
        ok: false,
        error: 'SUSPICIOUS_PAYLOAD',
        rawUrl: 'https://gicungduoc.vn/join/ABC234?%74oken=synthetic',
      });

      const res2 = parseJoinRoomUrl('gi-cung-duoc://room/join?code=ABC234&%73ecret=123');
      expect(res2).toEqual({
        ok: false,
        error: 'SUSPICIOUS_PAYLOAD',
        rawUrl: 'gi-cung-duoc://room/join?code=ABC234&%73ecret=123',
      });

      const res3 = parseJoinRoomUrl('https://gicungduoc.vn/join/ABC234?extra=param');
      expect(res3).toEqual({
        ok: false,
        error: 'SUSPICIOUS_PAYLOAD',
        rawUrl: 'https://gicungduoc.vn/join/ABC234?extra=param',
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

    test('isSuspiciousWord and isSuspiciousSearchParams detect credentials and unexpected params', () => {
      expect(isSuspiciousWord('token')).toBe(true);
      expect(isSuspiciousWord('%74oken')).toBe(true);
      expect(isSuspiciousWord('secret')).toBe(true);
      expect(isSuspiciousWord('password')).toBe(true);
      expect(isSuspiciousWord('code')).toBe(false);

      // Safe params: only code or permitted dev flags
      expect(isSuspiciousSearchParams({ code: 'GCD234' })).toBe(false);
      expect(isSuspiciousSearchParams({ code: 'GCD234', simulatedScanner: '1' })).toBe(false);
      expect(isSuspiciousSearchParams({ code: 'GCD234', simulatedPlaces: '1' })).toBe(false);

      // Suspicious params: token, %74oken, extra unallowed query keys
      expect(isSuspiciousSearchParams({ code: 'GCD234', token: 'synthetic' })).toBe(true);
      expect(isSuspiciousSearchParams({ code: 'GCD234', '%74oken': 'synthetic' })).toBe(true);
      expect(isSuspiciousSearchParams({ code: 'GCD234', secret: '123' })).toBe(true);
      expect(isSuspiciousSearchParams({ code: 'GCD234', unknownParam: 'val' })).toBe(true);
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

  describe('generateQrMatrix & Independent ISO/IEC 18004 Decoder Test', () => {
    function decodeQrMatrix(matrix: boolean[][]): string {
      const size = matrix.length;
      const version = (size - 17) / 4;

      const formatCoords = [
        [8, 0], [8, 1], [8, 2], [8, 3], [8, 4], [8, 5], [8, 7], [8, 8],
        [7, 8], [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
      ];
      let rawFormat = 0;
      for (let i = 0; i < 15; i++) {
        const coord = formatCoords[i];
        const r = coord ? (coord[0] ?? 0) : 0;
        const c = coord ? (coord[1] ?? 0) : 0;
        if (matrix[r]?.[c]) rawFormat |= 1 << (14 - i);
      }
      const format = rawFormat ^ 0x5412;
      const maskPattern = (format >> 10) & 7;

      const maskFns = [
        (r: number, c: number) => (r + c) % 2 === 0,
        (r: number, _c: number) => r % 2 === 0,
        (_r: number, c: number) => c % 3 === 0,
        (r: number, c: number) => (r + c) % 3 === 0,
        (r: number, c: number) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
        (r: number, c: number) => ((r * c) % 2) + ((r * c) % 3) === 0,
        (r: number, c: number) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
        (r: number, c: number) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
      ];
      const maskFn = maskFns[maskPattern] ?? maskFns[0]!;

      const isFunction = (r: number, c: number): boolean => {
        if (r <= 8 && c <= 8) return true;
        if (r <= 8 && c >= size - 8) return true;
        if (r >= size - 8 && c <= 8) return true;
        if (r === 6 || c === 6) return true;
        if (version >= 2) {
          const alignCenters = version === 2 ? [18] : [22];
          for (const ar of alignCenters) {
            for (const ac of alignCenters) {
              if ((ar <= 8 && ac <= 8) || (ar <= 8 && ac >= size - 8) || (ar >= size - 8 && ac <= 8)) continue;
              if (Math.abs(r - ar) <= 2 && Math.abs(c - ac) <= 2) return true;
            }
          }
        }
        if ((r === 8 && c <= 8) || (c === 8 && r <= 8)) return true;
        if (r === 8 && c >= size - 8) return true;
        if (c === 8 && r >= size - 8) return true;
        if (r === size - 8 && c === 8) return true;
        return false;
      };

      const bits: number[] = [];
      let upward = true;
      for (let c = size - 1; c > 0; c -= 2) {
        if (c === 6) c--;
        const rows = upward
          ? Array.from({ length: size }, (_, i) => size - 1 - i)
          : Array.from({ length: size }, (_, i) => i);

        for (const r of rows) {
          for (const col of [c, c - 1]) {
            if (!isFunction(r, col)) {
              const bit = (matrix[r]![col] ? 1 : 0) ^ (maskFn(r, col) ? 1 : 0);
              bits.push(bit);
            }
          }
        }
        upward = !upward;
      }

      let bitIdx = 0;
      const readBits = (n: number): number => {
        let val = 0;
        for (let i = 0; i < n; i++) {
          val = (val << 1) | (bits[bitIdx++] ?? 0);
        }
        return val;
      };

      const mode = readBits(4);
      if (mode !== 4) {
        throw new Error(`Expected Byte mode (4), got ${mode}`);
      }

      const charCount = readBits(8);
      const bytes: number[] = [];
      for (let i = 0; i < charCount; i++) {
        bytes.push(readBits(8));
      }

      return new TextDecoder().decode(new Uint8Array(bytes));
    }

    test('generates standard QR matrix with finder patterns and valid structure', () => {
      const matrix = generateQrMatrix('https://gicungduoc.vn/join/ABC234');
      const size = matrix.length;
      expect(size).toBeGreaterThanOrEqual(21);
      expect(matrix[0]).toHaveLength(size);

      // Top-left finder center (row 2-4, col 2-4 should be true)
      expect(matrix[3]![3]).toBe(true);
      // Top-right finder center (row 3, col size-4)
      expect(matrix[3]![size - 4]).toBe(true);
      // Bottom-left finder center (row size-4, col 3)
      expect(matrix[size - 4]![3]).toBe(true);

      // Timing pattern at row 6 should alternate
      expect(matrix[6]![8]).toBe(true);
      expect(matrix[6]![9]).toBe(false);
      expect(matrix[6]![10]).toBe(true);
    });

    test('roundtrip decodes QR matrix back to exact web URL and room code', () => {
      const url = 'https://gicungduoc.vn/join/ABC234';
      const matrix = generateQrMatrix(url);
      const decoded = decodeQrMatrix(matrix);
      expect(decoded).toBe(url);

      const parsed = parseJoinRoomUrl(decoded);
      expect(parsed).toEqual({
        ok: true,
        code: 'ABC234',
        rawUrl: url,
      });
    });

    test('roundtrip decodes custom scheme deep link back to exact URL and room code', () => {
      const deepLink = 'gi-cung-duoc://room/join?code=XYZ789';
      const matrix = generateQrMatrix(deepLink);
      const decoded = decodeQrMatrix(matrix);
      expect(decoded).toBe(deepLink);

      const parsed = parseJoinRoomUrl(decoded);
      expect(parsed).toEqual({
        ok: true,
        code: 'XYZ789',
        rawUrl: deepLink,
      });
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
    test('SimulatedQrScannerAdapter allows simulating valid and invalid scans without auto-filling default code', async () => {
      const adapter = new SimulatedQrScannerAdapter('granted');
      expect(adapter.isSimulated).toBe(true);
      expect(await adapter.getPermissionStatus()).toBe('granted');

      // Without input, simulateScan must return ok: false without auto-filling any fixture code
      const emptyScan = await adapter.simulateScan!();
      expect(emptyScan).toEqual({ ok: false, code: '' });

      const validScan = await adapter.simulateScan!('abc234');
      expect(validScan).toEqual({ ok: true, code: 'ABC234' });

      const invalidScan = await adapter.simulateScan!('invalid_0');
      expect(invalidScan).toEqual({ ok: false, code: 'INVALID_0' });

      // Can configure test code via setScannedCodeOrUrl
      adapter.setScannedCodeOrUrl('XYZ789');
      const configuredScan = await adapter.simulateScan!();
      expect(configuredScan).toEqual({ ok: true, code: 'XYZ789' });

      adapter.setPermissionStatus('denied');
      expect(await adapter.getPermissionStatus()).toBe('denied');
    });

    test('NativeQrScannerAdapter returns denied per blocked CAMERA config', async () => {
      const adapter = new NativeQrScannerAdapter();
      expect(adapter.isSimulated).toBe(false);
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

    test('late cold link resolving after warm link is ignored (monotonic sequence)', async () => {
      let resolveCold: ((url: string) => void) | null = null;
      const coldPromise = new Promise<string>(resolve => {
        resolveCold = resolve;
      });
      const getInitialSpy = jest.spyOn(Linking, 'getInitialURL').mockReturnValue(coldPromise as any);

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

      // While cold link is pending, warm link MNP567 arrives
      expect(listenerCallback).not.toBeNull();
      listenerCallback!({ url: 'gi-cung-duoc://room/join?code=MNP567' });
      expect(onJoinCode).toHaveBeenCalledTimes(1);
      expect(onJoinCode).toHaveBeenCalledWith('MNP567', 'gi-cung-duoc://room/join?code=MNP567');

      // Now cold link GCD234 resolves late
      resolveCold!('gi-cung-duoc://room/join?code=GCD234');
      await new Promise<void>(resolve => { setImmediate(() => resolve()); });

      // Cold link GCD234 must be dropped because a newer warm link arrived first!
      expect(onJoinCode).toHaveBeenCalledTimes(1);
      expect(onJoinCode).not.toHaveBeenCalledWith('GCD234', expect.anything());

      unsubscribe();
      getInitialSpy.mockRestore();
      addEventSpy.mockRestore();
    });

    test('callbacks are discarded after unsubscribe', async () => {
      let resolveCold: ((url: string) => void) | null = null;
      const coldPromise = new Promise<string>(resolve => {
        resolveCold = resolve;
      });
      const getInitialSpy = jest.spyOn(Linking, 'getInitialURL').mockReturnValue(coldPromise as any);

      const removeSpy = jest.fn();
      const addEventSpy = jest.spyOn(Linking, 'addEventListener').mockReturnValue({ remove: removeSpy } as any);

      const onJoinCode = jest.fn();
      const onError = jest.fn();

      const unsubscribe = subscribeToJoinLinks({ onJoinCode, onError });

      // Unsubscribe before cold link resolves
      unsubscribe();
      expect(removeSpy).toHaveBeenCalled();

      // Cold link resolves after unsubscribe
      resolveCold!('gi-cung-duoc://room/join?code=GCD234');
      await new Promise<void>(resolve => { setImmediate(() => resolve()); });

      // Callback must not be called after unsubscribe
      expect(onJoinCode).not.toHaveBeenCalled();
      expect(onError).not.toHaveBeenCalled();

      getInitialSpy.mockRestore();
      addEventSpy.mockRestore();
    });
  });
});
