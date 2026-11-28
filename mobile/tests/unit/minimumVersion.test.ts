import {
  DEFAULT_PLAY_STORE_URL,
  checkMinimumVersionFromServer,
  compareSemver,
  evaluateMinimumVersion,
  isAllowedUpdateUrl,
  parseSemver,
  validateVersionPolicyPayload,
} from '../../src/features/release/services/minimumVersion';

describe('GM-54 minimum version gate & fail-open behavior', () => {
  test('parses and compares semantic versions numerically', () => {
    expect(parseSemver('1.0.0')).toEqual([1, 0, 0]);
    expect(parseSemver('1.10.2')).toEqual([1, 10, 2]);
    expect(parseSemver('1.0')).toBeNull();
    expect(parseSemver('v1.0.0')).toBeNull();
    expect(parseSemver('')).toBeNull();

    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('1.0.0', '1.1.0')).toBe(-1);
    expect(compareSemver('1.2.0', '1.10.0')).toBe(-1);
    expect(compareSemver('1.10.0', '1.2.0')).toBe(1);
    expect(compareSemver('2.0.0', '1.99.99')).toBe(1);
    expect(compareSemver('bad', '1.0.0')).toBeNull();
  });

  test('TC-REL-003 blocks when installed app version is below server minimum version', () => {
    const decision = evaluateMinimumVersion('1.0.0', {
      platform: 'android',
      minimumVersion: '1.1.0',
      updateUrl: 'https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile',
      message: 'Có bản cập nhật quan trọng.',
    });

    expect(decision).toEqual({
      updateRequired: true,
      reason: 'below-minimum',
      currentVersion: '1.0.0',
      minimumVersion: '1.1.0',
      updateUrl: 'https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile',
      message: 'Có bản cập nhật quan trọng.',
    });
  });

  test('allows when installed version equals or exceeds server minimum', () => {
    const equal = evaluateMinimumVersion('1.1.0', {
      platform: 'android',
      minimumVersion: '1.1.0',
      updateUrl: DEFAULT_PLAY_STORE_URL,
    });
    expect(equal).toEqual({
      updateRequired: false,
      reason: 'up-to-date',
      currentVersion: '1.1.0',
      minimumVersion: '1.1.0',
    });

    const newer = evaluateMinimumVersion('1.2.0', {
      platform: 'android',
      minimumVersion: '1.1.0',
      updateUrl: DEFAULT_PLAY_STORE_URL,
    });
    expect(newer.updateRequired).toBe(false);
    expect(newer.reason).toBe('up-to-date');
  });

  test('TC-REL-004 fails open when payload schema, platform, or updateUrl is invalid or unsafe', () => {
    expect(validateVersionPolicyPayload(null)).toBeNull();
    expect(validateVersionPolicyPayload([])).toBeNull();
    expect(validateVersionPolicyPayload({ minimumVersion: 'not-semver' })).toBeNull();
    expect(validateVersionPolicyPayload({ platform: 'ios', minimumVersion: '2.0.0' })).toBeNull();
    expect(validateVersionPolicyPayload({ minimumVersion: '2.0.0', updateUrl: 'javascript:alert(1)' })).toBeNull();
    expect(validateVersionPolicyPayload({ minimumVersion: '2.0.0', updateUrl: 'https://evil.example/apk' })).toBeNull();
    expect(validateVersionPolicyPayload({ minimumVersion: '2.0.0', message: 123 })).toBeNull();

    for (const badPayload of [
      null,
      {},
      { minimumVersion: 'broken' },
      { minimumVersion: '9.9.9', updateUrl: 'http://play.google.com/store/apps/details?id=vn.gicungduoc.mobile' },
      { minimumVersion: '9.9.9', updateUrl: 'https://untrusted.example/app' },
    ]) {
      const decision = evaluateMinimumVersion('1.0.0', badPayload);
      expect(decision.updateRequired).toBe(false);
      expect(decision.reason).toBe('fail-open');
    }

    expect(isAllowedUpdateUrl('https://play.google.com/store/apps/details?id=vn.gicungduoc.mobile')).toBe(true);
    expect(isAllowedUpdateUrl('https://gicungduoc.vn/download')).toBe(true);
    expect(isAllowedUpdateUrl('http://play.google.com')).toBe(false);
  });

  test('checkMinimumVersionFromServer returns required update when RPC responds below minimum', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        platform: 'android',
        minimumVersion: '1.0.1',
        updateUrl: DEFAULT_PLAY_STORE_URL,
        message: 'Cập nhật ngay',
      }),
    });

    const result = await checkMinimumVersionFromServer({
      currentVersion: '1.0.0',
      supabaseUrl: 'https://example.supabase.co/',
      publicKey: 'sb_publishable_demo_key',
      fetchImpl: fetchMock,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://example.supabase.co/rest/v1/rpc/get_app_version_policy',
      expect.objectContaining({
        method: 'POST',
        headers: {
          apikey: 'sb_publishable_demo_key',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_platform: 'android' }),
      }),
    );
    expect(result).toEqual({
      updateRequired: true,
      reason: 'below-minimum',
      currentVersion: '1.0.0',
      minimumVersion: '1.0.1',
      updateUrl: DEFAULT_PLAY_STORE_URL,
      message: 'Cập nhật ngay',
    });
  });

  test('TC-REL-004 checkMinimumVersionFromServer fails open on network failure, HTTP error, and unconfigured env', async () => {
    const unconfigured = await checkMinimumVersionFromServer({
      currentVersion: '1.0.0',
      supabaseUrl: '',
      publicKey: '',
    });
    expect(unconfigured).toEqual({
      updateRequired: false,
      reason: 'unconfigured',
      currentVersion: '1.0.0',
    });

    const httpError = await checkMinimumVersionFromServer({
      currentVersion: '1.0.0',
      supabaseUrl: 'https://example.supabase.co',
      publicKey: 'sb_publishable_demo_key',
      fetchImpl: jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) }),
    });
    expect(httpError.updateRequired).toBe(false);
    expect(httpError.reason).toBe('network-or-server-error');

    const networkError = await checkMinimumVersionFromServer({
      currentVersion: '1.0.0',
      supabaseUrl: 'https://example.supabase.co',
      publicKey: 'sb_publishable_demo_key',
      fetchImpl: jest.fn().mockRejectedValue(new Error('offline')),
    });
    expect(networkError.updateRequired).toBe(false);
    expect(networkError.reason).toBe('network-or-server-error');
  });
});
