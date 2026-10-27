# QA environments and limits

Checked2026-10-27 on macOS/Docker Desktop, Python3.13.3, PostgreSQL17.11.

## Full GM03 QA attempt

Command:

```sh
npm run qa:start -- --run-id gm06-review-20261027 --api-port 54371 --db-port 54372
```

The existing owner-scoped runner created a fresh project and applied the full
migrations0001..0032. Startup then failed QA_HOST_BINDING_NOT_LOOPBACK because
Supabase CLI published wildcard host bindings in this Docker environment. The
runner cleaned its owned resources. No guard was weakened or wildcard opt-in used;
this attempt is Not completed and does not prove full Auth/REST readiness.

## Separate HTTP compatibility check

The successful alternative uses scripts/gm06_isolated_http_check.py, not a change
to GM03's security policy. It creates a new internal Docker network and tmpfs
PostgreSQL/PostgREST containers, using new random password/JWT material. It reads
no existing container credential/connection/network settings and publishes no host
ports. HTTP requests execute inside that owned network. The PG bootstrap permits
password-authenticated connections from the same isolated network only.

Auth schema/users and JWTs are synthetic QA fixtures; v4 migrations/functions,
PostgREST request/role/auth.uid mapping and database writes/readback are real. This
is not GoTrue signup/token refresh, mobile UI, device or production verification.
27 assertions (including140 pinned v2 parity vectors) passed in isolated-http-results.json, including actual DECIDED and
NO_CONSENSUS writer data, result/history/defaults HTTP, denied outsider/missing auth,
cleanup, consent revoke and delete/retry non-resurrection. All own resources were
removed after the run. Application DB/data and unrelated containers were untouched.
