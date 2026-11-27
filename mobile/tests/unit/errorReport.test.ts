import * as SecureStore from 'expo-secure-store';
import {
  SUPPORT_EMAIL, buildErrorReport, flushErrorReports, reportSummary, sendErrorReport, supportMailUrl,
} from '../../src/shared/errors/errorReport';

jest.mock('expo-secure-store', () => {
  const store = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => { store.set(key, value); }),
    deleteItemAsync: jest.fn(async (key: string) => { store.delete(key); }),
    store,
  };
});

const store = (SecureStore as unknown as { store: Map<string, string> }).store;
const context = { errorCode: 'NETWORK_ERROR' as const, screen: 'guest_entry', action: 'create_guest' };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const reply = (body: unknown, ok = true) => jest.fn(async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
const offline = jest.fn(async () => { throw new TypeError('Network request failed'); }) as unknown as typeof fetch;
const allowed = ['clientReportId', 'installId', 'errorCode', 'screen', 'action', 'requestId', 'appVersion', 'platform', 'osVersion', 'occurredAt', 'note', 'urgent'];

beforeEach(() => {
  store.clear();
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'http://127.0.0.1:54321';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'public-key';
});

describe('error reports', () => {
  it('builds only allowlisted fields and drops unsafe or oversized values', async () => {
    const report = await buildErrorReport(
      { ...context, requestId: 'Bearer abc.def secret', extra: 'token' } as never, `  ${'a'.repeat(600)}  `);
    expect(Object.keys(report).every(key => allowed.includes(key))).toBe(true);
    expect(report.requestId).toBeUndefined();
    expect(report.note).toHaveLength(500);
    expect(report.clientReportId).toMatch(uuid);
    expect(report.installId).toMatch(uuid);
    expect((await buildErrorReport(context)).installId).toBe(report.installId);
  });

  it('sends without any session token', async () => {
    const fetcher = reply({ ok: true, reportCode: 'GCD-0123456789' });
    await expect(sendErrorReport(await buildErrorReport(context), fetcher)).resolves.toEqual({ status: 'sent', reportCode: 'GCD-0123456789' });
    const [url, init] = (fetcher as unknown as jest.Mock).mock.calls[0];
    expect(url).toBe('http://127.0.0.1:54321/rest/v1/rpc/report_app_error');
    expect(Object.keys(init.headers).map(key => key.toLowerCase())).toEqual(['apikey', 'content-type']);
  });

  it('keeps a report on the phone while the server is unreachable and sends it once later', async () => {
    const report = await buildErrorReport(context, 'bấm Tiếp tục thì lỗi');
    await expect(sendErrorReport(report, offline)).resolves.toEqual({ status: 'queued' });
    await expect(sendErrorReport(report, reply({}, false))).resolves.toEqual({ status: 'queued' });
    await expect(flushErrorReports(offline)).resolves.toBe(0);
    const fetcher = reply({ ok: true, reportCode: 'GCD-0123456789' });
    await expect(flushErrorReports(fetcher)).resolves.toBe(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(flushErrorReports(fetcher)).resolves.toBe(0);
  });

  it('does not queue a report the server refuses', async () => {
    await expect(sendErrorReport(await buildErrorReport(context), reply({ ok: false, messageKey: 'RATE_LIMITED' })))
      .resolves.toEqual({ status: 'rejected', reason: 'RATE_LIMITED' });
    await expect(flushErrorReports(offline)).resolves.toBe(0);
  });

  it('keeps at most three waiting reports', async () => {
    for (let i = 0; i < 5; i++) await sendErrorReport(await buildErrorReport(context), offline);
    await expect(flushErrorReports(reply({ ok: true, reportCode: 'GCD-0123456789' }))).resolves.toBe(3);
  });

  it('writes an urgent email and a summary without install id or secrets', async () => {
    const report = await buildErrorReport(context, 'cần sửa gấp', true);
    const url = supportMailUrl(report, 'GCD-0123456789');
    expect(url.startsWith(`mailto:${SUPPORT_EMAIL}?subject=`)).toBe(true);
    const text = decodeURIComponent(url);
    expect(text).toContain('GCD-0123456789');
    expect(text).toContain('Mã lỗi: NETWORK_ERROR');
    expect(text).not.toContain(report.installId);
    expect(text).not.toContain('public-key');
    expect(reportSummary(report)).not.toContain(report.installId);
  });
});
