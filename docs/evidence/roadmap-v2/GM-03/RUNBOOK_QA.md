# GM-03 — Isolated Auth + REST QA runbook

This runner owns a fresh disposable Supabase project per run ID. It never targets the app project and does not reset an existing database. Supabase CLI is pinned to `2.120.0`.

The application project remains the environment for normal development. This QA project is temporary acceptance infrastructure: it proves migrations work from an empty database, keeps synthetic users/data separate, and permits complete cleanup without deleting application data. Stop the completed QA run before starting another on the same ports.

On Windows, the worker's recurring Docker commands use `CREATE_NO_WINDOW`; the Node runner uses `windowsHide`. A terminal window must not open on each timeout tick. The worker's local-database adapter uses the same hidden-process setting. These flags only control console creation; Docker, ownership checks, SQL results and errors still run normally.

## Start and verify

From the repository root, install root tooling with `npm ci` and make sure Docker Desktop is using its Linux engine. The default ports are API `54361`, DB `54362`. If either is busy, choose an explicitly unused pair; this checkout uses `54371/54372` because the first pair belongs to a separate QA project.

```powershell
npm run qa:start -- --run-id gm03-20261026 --api-port 54371 --db-port 54372
npm run qa:status -- --run-id gm03-20261026
npm run qa:verify -- --run-id gm03-20261026
npm run qa:test -- --run-id gm03-20261026
```

`qa:start` creates a project ID, DB volume, Docker network and owner UUID for that run. The copied config disables Realtime and seeds from the checked-in migrations only. It validates/stages GM-40 data, then installs both the draft/test-demo catalogue and a distinct 20-card synthetic fixture in the owned DB. The synthetic fixture is labelled `fixtureOnly`; it is never published to the application DB. A sealed manifest is created only after schema/contract, migration ledger, complete function signature/body/owner/ACL/`search_path`, catalogue hashes and owner marker have been read back.

`qa:verify` compares the sealed source/config/migration hashes and live DB inventory to the manifest. Drift is an error; the verifier does not reseal or bless a changed database. The worker reads that same manifest and stops on source, ownership or runtime drift.

If startup was interrupted after the manifest was sealed, or the owned worker stopped while the QA database is still running, restart only that run's worker after verifying the runtime:

```powershell
npm run qa:worker-start -- --run-id gm03-20261026
npm run qa:verify -- --run-id gm03-20261026
npm run qa:worker-stop -- --run-id gm03-20261026
```

`qa:worker-start` verifies the sealed manifest, source hashes, database inventory and ownership before spawning. It refuses a PID that belongs to another process and is safe to repeat when the worker is already healthy.
`qa:worker-stop` stops only the worker whose PID command line matches the run-scoped script and nonce; it leaves the QA database and network running.

## Bruno

`qa:start` creates ignored private environment `supabase/tests/bruno/GM-03/environments/Local.<run-id>.private.bru`. Select it in Bruno and run all six requests in order: GoTrue health, anonymous guest signup, refresh, authenticated identity RPC, missing JWT, forged JWT. The environment holds the loopback URL, public anon key and run ID only; it must never point at the application DB. Signup/refresh response panes contain short-lived credentials, so do not capture or publish those bodies. The Runner assertions show status and identity behavior without saving token values.

## Cleanup and retry

```powershell
npm run qa:stop -- --run-id gm03-20261026
npm run qa:status -- --run-id gm03-20261026
```

Cleanup stops only the run-scoped worker and Supabase project, checks container/volume/network ownership, and removes its private credentials and Bruno environment. If any cleanup step fails, the command exits nonzero and leaves state/ownership metadata; rerun `qa:stop` with the same ID to retry. A stopped run ID is retained as evidence and cannot be reused. Do not remove Docker resources manually or stop another project to clear a port.
If Ctrl+C interrupts a runner command after an owned state file exists, its child command is cancelled and the same owned cleanup runs; exit code `130` means cleanup completed. If cleanup itself fails, the command exits nonzero and retains state for `qa:stop` retry.

The QA project uses a fresh database volume and has no application database connection. `qa:test` runs real GoTrue signup/refresh and authenticated REST plus the existing GM-07.B/v4 HTTP suite. Bruno desktop is a separate visual run. Android/Expo is outside the GM-03 runner acceptance.
