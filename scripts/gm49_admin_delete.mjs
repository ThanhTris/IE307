#!/usr/bin/env node
// Operator tool: delete one account on request received outside the app (the store web form).
// Stages the deletion (refuses an account in a live room), then deletes the user through the GoTrue admin API
// so the database trigger removes the personal data in the same transaction.
//   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=... \
//     node scripts/gm49_admin_delete.mjs --user-id <uuid> --yes
// The service key comes from the environment only. Output is status labels; no email, token or key is printed.
import { argv, env } from 'node:process';

const option = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const userId = option('--user-id');
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class Refused extends Error {}
const fail = message => { throw new Refused(message); };

async function main() {
  if (!userId || !uuid.test(userId)) fail('Pass --user-id <uuid> (the account UUID verified with the requester).');
  if (!argv.includes('--yes')) fail('Deletion is permanent. Re-run with --yes after verifying the request out of band.');
  const base = (env.SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!base || !key) fail('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.');

  const headers = { apikey: key, authorization: 'Bearer ' + key, 'content-type': 'application/json' };
  const staged = await fetch(base + '/rest/v1/rpc/gm49_admin_prepare_delete', {
    method: 'POST', headers, body: JSON.stringify({ person: userId }), signal: AbortSignal.timeout(15000),
  });
  if (!staged.ok) fail('STAGE_FAILED http ' + staged.status);
  const state = await staged.json();
  if (state !== 'READY') fail(state === 'ACTIVE_ROOM'
    ? 'ACTIVE_ROOM: the account is in a room that has not finished. Retry after it ends.' : String(state));

  const removed = await fetch(base + '/auth/v1/admin/users/' + userId, { method: 'DELETE', headers, signal: AbortSignal.timeout(30000) });
  if (!removed.ok) fail('DELETE_FAILED http ' + removed.status + ' (nothing was committed; re-run to retry within fifteen minutes)');
  console.log('DELETED ' + userId);
}

main().catch(error => {
  console.error(error instanceof Refused ? error.message : 'UNEXPECTED_FAILURE');
  process.exitCode = 1;
});
