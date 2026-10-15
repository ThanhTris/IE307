# GM-23 — Handoff

## Artifacts

- `supabase/migrations/0025_notifications.sql` — schema `0.7.0`, RPCs,
  ownership generation, private delivery leases and receipt boundary.
- `supabase/functions/push-sender/index.ts` — trusted Expo sender; no package
  or native module.
- `scripts/gm23_sender_worker.mjs` — local one-shot/minute loop with an
  exclusive lock; `--once` runs one cycle.
- `supabase/tests/notifications.sql`, `supabase/tests/http/GM-23.http` and
  `supabase/tests/bruno/GM-23/` — SQL/HTTP/Bruno inputs.

## Local run

```powershell
npm run backend:start
node scripts/gm23_http_check.mjs
node scripts/gm23_http_check.mjs --bruno
node scripts/gm23_http_stop.mjs
```

The Bruno mode keeps only an owned disposable runtime. Stop it through the
stop script or Ctrl+C; it removes the tagged users and database. The sender
worker requires `GM23_SERVICE_ROLE_KEY` and uses loopback by default:

```powershell
$env:GM23_SERVICE_ROLE_KEY='<server-only key>'
node scripts/gm23_sender_worker.mjs --once
```

Set `EXPO_ACCESS_TOKEN` only in the trusted worker environment when Expo
access-token authentication is enabled. Never put either secret in mobile,
Bruno committed environments, logs or evidence.

## Consumer boundaries

GM-28 consumes inbox DTOs. GM-29 owns Android permission, Expo token
registration/unregistration before logout and real remote delivery. GM-30 owns
tap/deep-link/auth/refetch. Offline logout must still run GM-16 local cleanup;
it cannot claim that the server revoked a token until an online unregister has
completed.

Remote Expo delivery and Android checks remain `Not run` here by design.
