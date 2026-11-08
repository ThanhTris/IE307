import type { SessionApi } from '../../auth/types';

export interface TransportOptions {
  token?: string;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface ApiTransport {
  invoke<T>(rpcName: string, params: Record<string, unknown>, options?: TransportOptions): Promise<T>;
}

export interface ClientConfig {
  authSession?: SessionApi;
  publicKey?: string;
  baseUrl?: string;
  transport?: ApiTransport;
  timeoutMs?: number;
  defaultTimeoutMs?: number;
  initialToken?: string | null;
  fetchFn?: typeof fetch;
}

/**
 * Standard HTTP/Fetch transport for Supabase RPC endpoints.
 */
export class FetchTransport implements ApiTransport {
  private readonly baseUrl: string;
  private readonly fetchFn?: typeof fetch;
  private readonly publicKey?: string;

  constructor(baseUrl: string, fetchFn?: typeof fetch, publicKey?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.fetchFn = fetchFn;
    this.publicKey = publicKey;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  async invoke<T>(rpcName: string, params: Record<string, unknown>, options?: TransportOptions): Promise<T> {
    const url = `${this.baseUrl}/rest/v1/rpc/${rpcName}`;
    const timeoutMs = options?.timeoutMs ?? 15000;
    const controller = new AbortController();
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let didTimeout = false;

    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        didTimeout = true;
        controller.abort(new Error('TIMEOUT'));
      }, timeoutMs);
    }

    let externalAbortListener: (() => void) | null = null;
    if (options?.signal) {
      if (options.signal.aborted) {
        controller.abort(options.signal.reason);
      } else {
        externalAbortListener = () => {
          controller.abort(options.signal?.reason);
        };
        options.signal.addEventListener('abort', externalAbortListener, { once: true });
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };
    if (this.publicKey) headers.apikey = this.publicKey;

    if (options?.token) {
      headers.Authorization = `Bearer ${options.token}`;
    }

    try {
      const activeFetch = this.fetchFn ?? (typeof fetch !== 'undefined' ? fetch : undefined);
      if (!activeFetch) {
        throw new Error('Fetch API is not available in current environment');
      }

      const response = await activeFetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      // Read response body stream strictly ONCE
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }

      if (!response.ok) {
        throw { status: response.status, body };
      }

      return body as T;
    } catch (err: any) {
      if (didTimeout || err?.message === 'TIMEOUT') {
        throw { name: 'AbortError', message: 'TIMEOUT' };
      }
      throw err;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
      if (options?.signal && externalAbortListener) {
        options.signal.removeEventListener('abort', externalAbortListener);
      }
    }
  }
}
