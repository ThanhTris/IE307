import type { ApiError } from '../../../data/api/contracts';
import { mapErrorHelper } from '../../../data/api/client/helpers';
import { HEARTBEAT_MS, RECONNECT_DELAYS_MS, realtimeSocketUrl, type WebSocketLike } from '../../inbox/services/inboxRealtime';

export type RoomSignal = { room_id: string; version: number };
export type RoomRealtimeStatus = 'connecting' | 'live' | 'down';
export interface RoomRealtimeConfig {
  baseUrl: string;
  apiKey: string;
  getAccessToken(): Promise<string | undefined>;
  createSocket?: (url: string) => WebSocketLike;
  fetchFn?: typeof fetch;
}
export type RoomSubscription = (
  roomId: string,
  onSignal: (signal: RoomSignal) => void,
  onStatus: (status: RoomRealtimeStatus) => void,
  onError: (error: ApiError) => void,
) => () => void;

export function isRoomSignal(value: unknown, roomId: string): value is RoomSignal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const row = value as Record<string, unknown>;
  return Object.keys(row).length === 2 && row.room_id === roomId
    && typeof row.version === 'number' && Number.isSafeInteger(row.version) && row.version > 0;
}

// A 30s SELECT lease detects revoked membership even when RLS suppresses the kick's final event.
// It reads two public fields. Snapshot reads are driven by changes, reconnect or transport fallback.
export function createRoomSubscription(config: RoomRealtimeConfig): RoomSubscription {
  return (roomId, onSignal, onStatus, onError) => {
    let active = true;
    let socket: WebSocketLike | undefined;
    let epoch = 0;
    let retryAttempt = 0;
    let heard = true;
    let heartbeat: ReturnType<typeof setTimeout> | undefined;
    let reconnect: ReturnType<typeof setTimeout> | undefined;
    let lease: ReturnType<typeof setTimeout> | undefined;
    let joinTimeout: ReturnType<typeof setTimeout> | undefined;
    let probeController: AbortController | undefined;
    const topic = 'realtime:room-version:' + roomId;
    let ref = 1;
    const current = (generation: number) => active && epoch === generation;
    const clear = () => {
      clearTimeout(heartbeat);
      clearTimeout(lease);
      clearTimeout(joinTimeout);
      probeController?.abort();
      const previous = socket;
      socket = undefined;
      if (previous) {
        previous.onopen = previous.onmessage = previous.onclose = previous.onerror = null;
        try { previous.close(); } catch { /* Socket may already be closed. */ }
      }
    };
    const stop = () => { active = false; ++epoch; clearTimeout(reconnect); clear(); };
    const fatal = (error: ApiError) => { if (active) { onError(error); stop(); } };
    const send = (message: Record<string, unknown>) => {
      try { socket?.send(JSON.stringify({ ...message, ref: String(ref++) })); }
      catch { down(); }
    };
    const down = () => {
      if (!active) return;
      ++epoch;
      clear();
      onStatus('down');
      if (reconnect) return;
      const delay = RECONNECT_DELAYS_MS[Math.min(retryAttempt++, RECONNECT_DELAYS_MS.length - 1)]!;
      reconnect = setTimeout(() => { reconnect = undefined; void connect(); }, delay);
    };
    const probe = async (generation: number): Promise<boolean> => {
      try {
        const token = await config.getAccessToken();
        if (!current(generation)) return false;
        if (!token) { fatal({ messageKey: 'AUTH_REQUIRED' }); return false; }
        const controller = new AbortController();
        probeController = controller;
        const timeout = setTimeout(() => controller.abort(), 10_000);
        let response: Response;
        let body: unknown;
        try {
          response = await (config.fetchFn ?? fetch)(
            config.baseUrl.replace(/\/+$/, '') + '/rest/v1/room_version_signals?select=room_id,version&room_id=eq.' + encodeURIComponent(roomId),
            { headers: { apikey: config.apiKey, Authorization: 'Bearer ' + token }, signal: controller.signal },
          );
          body = await response.json();
        } finally { clearTimeout(timeout); }
        if (!current(generation)) return false;
        if (response.status === 404) { fatal({ messageKey: 'CONTRACT_MISMATCH' }); return false; }
        if (!response.ok) {
          const error = mapErrorHelper({ status: response.status, body });
          if (response.status === 401 || response.status === 403) fatal(error);
          else down();
          return false;
        }
        if (!Array.isArray(body) || body.length > 1 || (body.length === 1 && !isRoomSignal(body[0], roomId))) {
          fatal({ messageKey: 'MALFORMED_RESPONSE' }); return false;
        }
        if (body.length === 0) { fatal({ messageKey: 'NOT_MEMBER' }); return false; }
        onSignal(body[0] as RoomSignal);
        return true;
      } catch {
        if (current(generation)) down();
        return false;
      }
    };
    const checkLease = (generation: number) => {
      lease = setTimeout(() => {
        void probe(generation).then(ok => { if (ok && current(generation)) checkLease(generation); });
      }, 30_000);
    };
    const beat = (generation: number) => {
      heartbeat = setTimeout(() => {
        if (!current(generation)) return;
        if (!heard) { down(); return; }
        heard = false;
        send({ topic: 'phoenix', event: 'heartbeat', payload: {} });
        if (current(generation)) beat(generation);
      }, HEARTBEAT_MS);
    };
    async function connect() {
      if (!active) return;
      clear();
      const generation = ++epoch;
      onStatus('connecting');
      if (!await probe(generation) || !current(generation)) return;
      const token = await config.getAccessToken().catch(() => undefined);
      if (!current(generation)) return;
      if (!token) { fatal({ messageKey: 'AUTH_REQUIRED' }); return; }
      try {
        socket = (config.createSocket ?? (url => new WebSocket(url) as unknown as WebSocketLike))(realtimeSocketUrl(config.baseUrl, config.apiKey));
      } catch { down(); return; }
      heard = true;
      joinTimeout = setTimeout(() => { if (current(generation)) down(); }, 10_000);
      socket.onopen = () => {
        if (!current(generation)) return;
        send({ topic, event: 'phx_join', join_ref: '1', payload: {
          config: { broadcast: { self: false }, presence: { key: '' }, private: false,
            postgres_changes: [{ event: '*', schema: 'public', table: 'room_version_signals', filter: 'room_id=eq.' + roomId }] },
          access_token: token,
        } });
        beat(generation);
      };
      socket.onmessage = event => {
        if (!current(generation)) return;
        heard = true;
        let message: { topic?: string; event?: string; payload?: Record<string, unknown> };
        try { message = JSON.parse(String(event.data)); } catch { return; }
        if (message.topic !== topic) return;
        const payload = message.payload;
        if (message.event === 'system' && payload?.extension === 'postgres_changes') {
          if (payload.status !== 'ok') { down(); return; }
          clearTimeout(joinTimeout);
          retryAttempt = 0;
          onStatus('live');
          clearTimeout(lease);
          checkLease(generation);
        } else if (message.event === 'postgres_changes') {
          const data = payload?.data as Record<string, unknown> | undefined;
          if (data?.type === 'DELETE') return;
          if (isRoomSignal(data?.record, roomId)) onSignal(data.record);
          else fatal({ messageKey: 'MALFORMED_RESPONSE' });
        } else if (message.event === 'phx_close' || message.event === 'phx_error'
            || (message.event === 'phx_reply' && payload?.status === 'error')) down();
      };
      socket.onclose = socket.onerror = () => { if (current(generation)) down(); };
    }
    void connect();
    return stop;
  };
}
