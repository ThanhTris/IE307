/**
 * GM-07 — Public API module exports and factory helper.
 * Spec: docs/architecture/API_CONTRACT.md
 */

export * from './contracts';
export * from './client';
export * from './mock';

import { ApiClient } from './contracts';
import { ApiClientImpl, ClientConfig } from './client';
import { MockApiClient, MockConfig } from './mock';

export type ApiMode = 'real' | 'mock';

/**
 * Factory helper to construct the appropriate ApiClient instance.
 * Production mode defaults to 'real' Supabase client; tests and UI development use 'mock'.
 */
export function createApiClient(mode: ApiMode = 'mock', options?: ClientConfig & MockConfig): ApiClient {
  if (mode === 'real') {
    return new ApiClientImpl(options);
  }
  return new MockApiClient(options);
}
