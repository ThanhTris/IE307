# GM-17 — Local access suite

Start Docker Linux engine and local backend, apply0004; no DB reset. Node>=22.13,
Python3.12+ with timezone data/UTF-8. From repository root:

```powershell
$env:PYTHONUTF8 = '1'
# Set GM17_PYTHON to a Python with tzdata if the host Python lacks it.
node scripts/gm17_http_check.mjs --bruno-setup
```

This runs real HTTP assertions, creates three anonymous test identities and an
isolated synthetic namespace. Open collection `supabase/tests/bruno/GM-17`, select
`Local.runtime.private`, run sequentially once. Tokens/public key are in ignored
local environment, never commit/export/screenshot credentials. Collection read
tests16cases; HTTP runner additionally proves write denial/forged/expired tokens.
Bruno collection execution is reported separately from the Node HTTP runner.

```powershell
node scripts/gm17_bruno_cleanup.mjs
```

Cleanup only deletes the saved synthetic namespace/three test users and ignored
credential files. Run cleanup before another --bruno-setup. Expired test sessions
or consumed rate-limit buckets require re-setup later, not disabling rate limits.
No verified dataset publication. Published positive predicates/retention/RPC
boundary/concurrency use disposable SQL, not this collection's draft namespace.

Requests and expected assertions also at `supabase/tests/http/GM-17.http`.
Missing/forged JWT401, explicit private columns403/42501; outsider authorized
lists200/[] are expected RLS results, not a successful read of a room.
