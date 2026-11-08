# Windows worker console fix — 2026-10-26

The user observed terminal windows repeatedly opening and closing while the QA worker was active. The Node launcher already used `windowsHide`, but Python's recurring `docker inspect`/`docker exec` subprocesses did not suppress console creation. A hidden Python parent can therefore still create visible Windows console children.

`scripts/dish_policy_worker.py` now routes both QA adapters through `run_hidden_process`, adding `subprocess.CREATE_NO_WINDOW` only on Windows. `supabase/seed/import_food_data.py` applies the same flag to `LocalDB.run`, which is the worker's app-local adapter. Existing stdout/stderr capture, timeout, SQL error redaction and ownership checks remain in place.

Verification:

- 2 focused process regressions and all 29 food-import regressions Pass. They check the Windows launch flag, SQL input/output preservation and the absence of Windows-only flags on POSIX.
- Root runner tests: 16/16 Pass.
- Fresh owned QA `gm03-20261026m`: setup/manifest verification Pass, 7 Auth/REST and 82 v4 HTTP assertions Pass.
- Controlled stop of the exact script/nonce-owned worker, then `qa:worker-start`: Ready with a fresh heartbeat; the database was retained.
- Bruno desktop on the new QA run: 6/6 Pass. The Runner stayed visible without the recurring terminal overlay during this run. This is desktop observation plus process-creation regression, not a claim about Android behavior.

Docker was off during the first old-run cleanup attempt. The runner returned nonzero and retained ownership state; after Docker was started once, cleanup retry for `gm03-20261026l` succeeded. Final verification after worker recovery also passed. New run `gm03-20261026m` was then cleaned successfully (worker, Supabase project and network); application resources and the separately owned existing QA project were outside that cleanup. Docker remained running.
