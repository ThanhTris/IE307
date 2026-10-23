import type { ApiClient, ReadResult, WriteResult } from '../../../data/api/contracts';
import type { RoomRepository } from '../../rooms/services/roomRepository';

type ApiResult<T> = ReadResult<T> | WriteResult<T>;

/** Runs a feature API call through the repository's authenticated client and rejects stale identity results. */
export async function callSessionApi<T>(
  repository: RoomRepository,
  operation: (client: ApiClient) => Promise<ApiResult<T>>,
): Promise<ApiResult<T>> {
  const sessionRequired = Boolean(repository.getSessionApi());
  const initialUserId = repository.getCurrentUser()?.id;
  if (sessionRequired && (!initialUserId || repository.getSessionStatus() !== 'active')) return authRequired<T>();

  let result: ApiResult<T>;
  try {
    result = await operation(repository.getApiClient());
  } catch {
    return { ok: false, error: { messageKey: 'NETWORK_ERROR' } };
  }

  if (sessionRequired && (
    repository.getSessionStatus() !== 'active'
    || repository.getCurrentUser()?.id !== initialUserId
    || (!result.ok && result.error.messageKey === 'AUTH_REQUIRED')
  )) return authRequired<T>();

  return result;
}

function authRequired<T>(): ApiResult<T> {
  return { ok: false, error: { messageKey: 'AUTH_REQUIRED' } };
}
