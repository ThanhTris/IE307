import { mapErrorHelper } from '../../../data/api/client/helpers';
import type { ApiClient, ReadResult, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from './roomRepository';

type ApiResult<T> = ReadResult<T> | WriteResult<T>;

/** Runs a feature API call through the repository's authenticated client and rejects stale identity results. */
export async function callSessionApi<T>(
  repository: RoomRepository,
  operation: (client: ApiClient) => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  const session = repository.getSessionApi();
  const sessionRequired = Boolean(session);
  const initialSnapshot = repository.getSessionSnapshot?.();
  const initialUserId = initialSnapshot?.user?.id ?? repository.getCurrentUser()?.id;
  const initialGeneration = session?.getGeneration?.() ?? 0;
  if (sessionRequired && (!initialUserId || repository.getSessionStatus() !== 'active')) return authRequired<T>();

  const sessionUnchanged = () => !sessionRequired || (
    repository.getSessionStatus() === 'active'
    && repository.getCurrentUser()?.id === initialUserId
    && repository.getSessionSnapshot?.() === initialSnapshot
    && (session?.getGeneration?.() ?? 0) === initialGeneration
  );

  let result: ApiResult<T>;
  try {
    result = await operation(repository.getApiClient());
  } catch (error) {
    result = { ok: false, error: mapErrorHelper(error) };
  }

  // Auth failures can arrive as a normalized envelope or as a thrown FetchTransport error.
  // Recover the existing session once; never replay the API operation (writes may have committed).
  if (!result.ok && result.error.messageKey === 'AUTH_REQUIRED') {
    if (sessionRequired && sessionUnchanged()) {
      try {
        const refreshed = await session!.refreshSession();
        if (refreshed.ok && refreshed.data.id !== initialUserId) {
          // A refresh token must never silently change the identity bound to cached data.
          await repository.logout();
        } else if (!refreshed.ok) {
          // Synchronize the public repository state after the auth manager marks the session lost.
          await repository.restoreSession();
        }
      } catch {
        try { await repository.restoreSession(); } catch { /* Return the same safe auth error either way. */ }
      }
    }
    return authRequired<T>();
  }

  if (!sessionUnchanged()) return authRequired<T>();

  return result;
}

function authRequired<T>(): ApiResult<T> {
  return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
}
