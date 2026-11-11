/**
 * Public API module exports and the factory for the real client.
 * Spec: docs/architecture/API_CONTRACT.md
 * Test doubles live in tests/mocks/api and are never shipped in the app bundle.
 */

import { ApiClient } from './contracts';
import { ApiClientImpl, ClientConfig } from './client';

export * from './contracts';
export * from './client';

export type ApiMode = 'real';

export function createApiClient(mode: ApiMode, options?: ClientConfig): ApiClient {
  if (mode !== 'real') throw new Error('Only the real API client is available in the app');
  return new ApiClientImpl(options);
}
