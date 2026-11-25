import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ErrorCode } from '../../data/api/contracts';

/** Same address as the public support page (GM-50). */
export const SUPPORT_EMAIL = '23521645@gm.uit.edu.vn';

const QUEUE_KEY = 'gcd.error_reports.queue.v1';
const INSTALL_KEY = 'gcd.error_reports.install.v1';
const QUEUE_LIMIT = 3;
const TIMEOUT_MS = 10_000;

/**
 * The only fields that ever leave the phone (ADR-030). No token, email, password, code, vote, room code, location or
 * server response: callers cannot add fields, and the server rejects unknown keys.
 */
export type ErrorReport = {
  clientReportId: string;
  installId: string;
  errorCode: ReportCode;
  screen: string;
  action?: string;
  requestId?: string;
  appVersion: string;
  platform: 'android' | 'ios' | 'web';
  osVersion?: string;
  occurredAt: string;
  note?: string;
  urgent: boolean;
};

/** `USER_FEEDBACK`: the person opened help on their own; their note is the report. */
export type ReportCode = ErrorCode | 'USER_FEEDBACK';

export type ReportContext = {
  errorCode: ReportCode;
  /** Stable screen id such as `guest_entry`; never user text. */
  screen: string;
  action?: string;
  requestId?: string;
  occurredAt?: string;
};

export type SendResult =
  | { status: 'sent'; reportCode: string }
  | { status: 'queued' }
  | { status: 'rejected'; reason: 'RATE_LIMITED' | 'INVALID_INPUT' };

/** Random id in UUID v4 shape. Identifies a report or an install, not a person; not used for security. */
function randomId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, char => {
    const value = Math.floor(Math.random() * 16);
    return (char === 'x' ? value : (value % 4) + 8).toString(16);
  });
}

const safeText = (value: string | undefined, pattern: RegExp) => (value && pattern.test(value) ? value : undefined);

async function installId(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(INSTALL_KEY);
    if (saved) return saved;
    const created = randomId();
    await SecureStore.setItemAsync(INSTALL_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}

export async function buildErrorReport(context: ReportContext, note = '', urgent = false): Promise<ErrorReport> {
  const appVersion = safeText(Constants.expoConfig?.version, /^[A-Za-z0-9._+-]{1,32}$/) ?? 'unknown';
  const osVersion = safeText(String(Platform.Version ?? '').slice(0, 40), /^[A-Za-z0-9._ ()-]{1,40}$/);
  const requestId = safeText(context.requestId, /^[A-Za-z0-9._:-]{1,100}$/);
  const text = [...note.trim()].slice(0, 500).join('');
  return {
    clientReportId: randomId(),
    installId: await installId(),
    errorCode: context.errorCode,
    screen: context.screen,
    ...(context.action ? { action: context.action } : {}),
    ...(requestId ? { requestId } : {}),
    appVersion,
    platform: Platform.OS === 'ios' ? 'ios' : Platform.OS === 'web' ? 'web' : 'android',
    ...(osVersion ? { osVersion } : {}),
    occurredAt: context.occurredAt ?? new Date().toISOString(),
    ...(text ? { note: text } : {}),
    urgent,
  };
}

/** One request without any session token, so reporting still works when sign-in is the thing that failed. */
async function post(report: ErrorReport, fetcher: typeof fetch): Promise<SendResult> {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL, key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { status: 'queued' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetcher(`${url.replace(/\/$/, '')}/rest/v1/rpc/report_app_error`, {
      method: 'POST',
      headers: { apikey: key, 'content-type': 'application/json' },
      body: JSON.stringify({ payload: report }),
      signal: controller.signal,
    });
    if (!response.ok) return { status: 'queued' };
    const body = await response.json() as { ok?: unknown; reportCode?: unknown; messageKey?: unknown };
    if (body?.ok === true && typeof body.reportCode === 'string') return { status: 'sent', reportCode: body.reportCode };
    if (body?.ok === false) return { status: 'rejected', reason: body.messageKey === 'RATE_LIMITED' ? 'RATE_LIMITED' : 'INVALID_INPUT' };
    return { status: 'queued' };
  } catch {
    return { status: 'queued' };
  } finally {
    clearTimeout(timer);
  }
}

async function readQueue(): Promise<ErrorReport[]> {
  try {
    const value: unknown = JSON.parse(await SecureStore.getItemAsync(QUEUE_KEY) ?? '[]');
    return Array.isArray(value) ? value as ErrorReport[] : [];
  } catch {
    return [];
  }
}

async function writeQueue(reports: ErrorReport[]): Promise<void> {
  try {
    if (reports.length) await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(reports.slice(-QUEUE_LIMIT)));
    else await SecureStore.deleteItemAsync(QUEUE_KEY);
  } catch { /* Losing a queued report must never break the app. */ }
}

/** Sends now; if the server cannot be reached the report waits on the phone. */
export async function sendErrorReport(report: ErrorReport, fetcher: typeof fetch = fetch): Promise<SendResult> {
  const result = await post(report, fetcher);
  if (result.status === 'queued') {
    await writeQueue([...(await readQueue()).filter(item => item.clientReportId !== report.clientReportId), report]);
  }
  return result;
}

/** Retries waiting reports, oldest first. The server stores each `clientReportId` once. */
export async function flushErrorReports(fetcher: typeof fetch = fetch): Promise<number> {
  const queue = await readQueue();
  if (!queue.length) return 0;
  const waiting: ErrorReport[] = [];
  let sent = 0;
  for (const report of queue) {
    const result = await post(report, fetcher);
    if (result.status === 'sent') sent++;
    else if (result.status === 'queued') waiting.push(report);
  }
  await writeQueue(waiting);
  return sent;
}

/** Pre-filled email for urgent problems. The person sees and can edit everything before sending. */
export function supportMailUrl(report: ErrorReport, reportCode?: string): string {
  const lines = [
    'Mô tả sự cố (bạn viết thêm ở đây):',
    report.note ?? '',
    '',
    '--- Thông tin kỹ thuật ---',
    ...(reportCode ? [`Mã báo lỗi: ${reportCode}`] : []),
    `Mã lỗi: ${report.errorCode}`,
    `Màn: ${report.screen}${report.action ? ` / ${report.action}` : ''}`,
    `Thời điểm: ${report.occurredAt}`,
    `Phiên bản: ${report.appVersion} (${report.platform} ${report.osVersion ?? ''})`,
  ];
  const subject = report.errorCode === 'USER_FEEDBACK'
    ? `[Gì Cũng Được] Cần trợ giúp${reportCode ? `: ${reportCode}` : ''}`
    : `[Gì Cũng Được] Lỗi cần xử lý gấp: ${reportCode ?? report.errorCode}`;
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

/** Short text for the clipboard, for people who contact support another way. */
export function reportSummary(report: ErrorReport, reportCode?: string): string {
  return [reportCode, report.errorCode, report.screen, report.occurredAt, report.appVersion].filter(Boolean).join(' · ');
}
