import { OcrError, uuid } from './contract.ts';
import { readJson } from './read-json.ts';

/** Verify with the configured project's Auth server, never decoded client claims. */
export function supabaseAuthorizer(supabaseUrl: string, publicKey: string, fetcher: typeof fetch = fetch) {
  const base = new URL(supabaseUrl);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password || base.search || base.hash ||
      base.pathname !== '/' || !publicKey) throw new Error('Invalid server Auth configuration');
  return async (request: Request): Promise<string | null> => {
    const authorization = request.headers.get('authorization');
    if (!authorization || authorization.length > 8192 || !/^Bearer [A-Za-z0-9._-]+$/i.test(authorization)) return null;
    try {
      const response = await fetcher(new URL('/auth/v1/user', base), {
        headers: { apikey: publicKey, Authorization: authorization },
        redirect: 'error', signal: AbortSignal.timeout(3000),
      });
      if (response.status === 401 || response.status === 403) return null;
      if (!response.ok) throw new Error('Auth unavailable');
      const user: unknown = await readJson(response, 64 * 1024, 3000);
      if (typeof user !== 'object' || user === null || !('id' in user) || !uuid(user.id)) return null;
      return user.id.toLowerCase();
    } catch { throw new OcrError('AUTH_UNAVAILABLE', 503); }
  };
}
