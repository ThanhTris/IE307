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
 * Callers must choose real or mock explicitly so a production client cannot
 * silently receive a mock adapter when configuration is omitted.
 */
export function createApiClient(mode: ApiMode, options?: ClientConfig & MockConfig): ApiClient {
  if (mode === 'real') {
    return new ApiClientImpl(options);
  }
  if (mode === 'mock') {
    return new MockApiClient(options);
  }
  throw new Error('API mode must be explicitly real or mock');
}
