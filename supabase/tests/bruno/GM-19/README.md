# GM-19 — real API with owned synthetic fixture

Start Docker and local Supabase. From the repo root (Python with tzdata/UTF-8,
Node >=22.13):

```powershell
$env:PYTHONUTF8 = '1'
# Optional: $env:GM19_PYTHON = 'C:\Python314\python.exe'
node scripts/gm19_http_check.mjs --bruno
```

Wait for `BRUNO_READY`. It creates real anonymous GoTrue users on :54321,
an owned disposable database/PostgREST, and a gateway on :54331. GM-08 draft
data remains unchanged; new GM-18 synthetic published-state rows exist only
inside that database. No reset or publish into the app database occurs.

Open `supabase/tests/bruno/GM-19`, select **Local.runtime.private**, Run all
47 requests sequentially once. They cover discovery/pool, all nine lifecycle
RPCs, own preferences, ready reset, ACK replay/reuse, start/locked/terminal,
auth errors and create quota10/minute + HTTP429. An error status passes only
when its specific assertion passes. HTTP tests separately check concurrency,
expiry, revalidation, immutable snapshot and GM-07 DTO guards.

Before clicking Run Again, reset only this test database's quota setup:

```powershell
node scripts/gm19_bruno_reset.mjs
```

Stop safely from another terminal (preferred to killing the process on Windows):

```powershell
node scripts/gm19_http_stop.mjs
```

Wait for `owned DB and guests removed`. Cleanup verifies the namespace,
stops its PostgREST, removes that DB/guest identities and ignored runtime files.
Never commit/export/screenshot runtime credentials. This is API evidence;
Android UI is GM-25. Any mandatory Fail/Not run still blocks Done.
