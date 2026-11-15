/**
 * Listens for new inbox rows of the signed-in account through Supabase Realtime (ADR-026, migration 0053), so a
 * notification shows within about a second instead of waiting for the next read. It uses the platform WebSocket and the
 * Phoenix channel protocol directly (no extra library). The pushed row carries only ids and timestamps; the caller then
 * reads the inbox through the usual RPC. RLS limits the stream to the account's own rows.
 */
export type InboxRealtimeStatus = 'connecting' | 'live' | 'down';

export interface InboxRealtimeOptions {
  baseUrl: string;
  apiKey: string;
  userId: string;
  /** A fresh access token for each (re)connection; undefined stops trying until the next start. */
  getAccessToken: () => Promise<string | undefined>;
  /** A new inbox row was written for this account. */
  onInsert: () => void;
  onStatus?: (status: InboxRealtimeStatus) => void;
  createSocket?: (url: string) => WebSocketLike;
  setTimer?: (run: () => void, ms: number) => unknown;
  clearTimer?: (timer: unknown) => void;
}

/** The part of WebSocket this client uses (lets tests inject a fake). */
export interface WebSocketLike {
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onerror: ((event: unknown) => void) | null;
  onclose: ((event: unknown) => void) | null;
  send(data: string): void;
  close(): void;
}

export const HEARTBEAT_MS = 25_000;
/** Waits between reconnection attempts; the last one repeats. */
export const RECONNECT_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000];

export function realtimeSocketUrl(baseUrl: string, apiKey: string): string {
  return `${baseUrl.replace(/\/+$/, '').replace(/^http/i, 'ws')}/realtime/v1/websocket?apikey=${encodeURIComponent(apiKey)}&vsn=1.0.0`;
}

/** Starts listening; returns a function that stops and closes the connection. */
export function subscribeInboxRealtime(options: InboxRealtimeOptions): () => void {
  const setTimer = options.setTimer ?? ((run, ms) => setTimeout(run, ms));
  const clearTimer = options.clearTimer ?? (timer => clearTimeout(timer as ReturnType<typeof setTimeout>));
  const create = options.createSocket ?? (url => new WebSocket(url) as unknown as WebSocketLike);
  const topic = `realtime:inbox:${options.userId}`;
  let stopped = false;
  let socket: WebSocketLike | undefined;
  let heartbeat: unknown;
  let retry: unknown;
  let attempt = 0;
  let ref = 1;
  let heard = true;

  const status = (value: InboxRealtimeStatus) => options.onStatus?.(value);
  const send = (message: Record<string, unknown>) => { try { socket?.send(JSON.stringify({ ...message, ref: String(ref++) })); } catch { /* reconnect handles it */ } };
  const clearTimers = () => {
    if (heartbeat !== undefined) { clearTimer(heartbeat); heartbeat = undefined; }
    if (retry !== undefined) { clearTimer(retry); retry = undefined; }
  };
  const beat = () => {
    heartbeat = setTimer(() => {
      // Nothing came back since the last beat: the connection is half-open (network switch, dropped tunnel).
      if (!heard) { drop(); scheduleReconnect(); return; }
      heard = false;
      send({ topic: 'phoenix', event: 'heartbeat', payload: {} });
      beat();
    }, HEARTBEAT_MS);
  };
  const scheduleReconnect = () => {
    if (stopped || retry !== undefined) return;
    status('down');
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)]!;
    attempt += 1;
    retry = setTimer(() => { retry = undefined; void connect(); }, delay);
  };
  const drop = () => {
    clearTimers();
    const old = socket;
    socket = undefined;
    if (old) { old.onopen = old.onmessage = old.onerror = old.onclose = null; try { old.close(); } catch { /* already closed */ } }
  };

  async function connect() {
    if (stopped) return;
    drop();
    status('connecting');
    let token: string | undefined;
    try { token = await options.getAccessToken(); } catch { token = undefined; }
    if (stopped) return;
    if (!token) { scheduleReconnect(); return; }
    let next: WebSocketLike;
    try { next = create(realtimeSocketUrl(options.baseUrl, options.apiKey)); } catch { scheduleReconnect(); return; }
    socket = next;
    heard = true;
    next.onopen = () => {
      send({
        topic, event: 'phx_join', join_ref: '1',
        payload: {
          config: { broadcast: { self: false }, presence: { key: '' }, private: false,
            postgres_changes: [{ event: 'INSERT', schema: 'public', table: 'inbox', filter: `owner_user_id=eq.${options.userId}` }] },
          access_token: token,
        },
      });
      beat();
    };
    next.onmessage = event => {
      heard = true;
      let message: { topic?: string; event?: string; payload?: Record<string, unknown> };
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (message.topic !== topic) return;
      if (message.event === 'phx_reply' && message.payload?.status === 'error') { drop(); scheduleReconnect(); return; }
      if (message.event === 'system' && message.payload?.extension === 'postgres_changes') {
        if (message.payload.status === 'ok') { attempt = 0; status('live'); } else { drop(); scheduleReconnect(); }
        return;
      }
      if (message.event === 'postgres_changes') { options.onInsert(); return; }
      // The server closes the channel when the access token expires: join again with a fresh one.
      if (message.event === 'phx_close' || message.event === 'phx_error') { drop(); scheduleReconnect(); }
    };
    next.onerror = () => { drop(); scheduleReconnect(); };
    next.onclose = () => { drop(); scheduleReconnect(); };
  }

  void connect();
  return () => { stopped = true; drop(); };
}
