# GM-32 manifest regression handoff

Run `scripts/gm32_regression.py` with the explicitly selected manifest from
the current checkout. Use Node 24, pinned root dependencies, Python with
`scripts/ci-requirements.txt`, and a Docker runtime publishing QA ports on
loopback. The outbox group also uses the pinned mobile dependencies.

```sh
npm ci
npm --prefix mobile ci
python -m pip install -r scripts/ci-requirements.txt
PYTHON=python npm run qa:start -- --run-id gm32-baseline --api-port 54371 --db-port 54372
python scripts/gm32_regression.py baseline --qa-manifest .work/qa/gm32-baseline/manifest.json
npm run qa:stop -- --run-id gm32-baseline
```

Repeat with a new run ID and replace `baseline` with `legacy-decision`, `canonical`, `boundaries`,
`history`, `notifications` or `outbox`. Use distinct port pairs for concurrent projects.
Stop each named run even if a suite fails. History, canonical, notification and boundary
suites can modify temporary catalogue/configuration fixtures as part
of their assertions. Use a fresh disposable project for each of those groups.
The runner writes a summary to `.work/gm32/<run-id>/summary.json`. Producer
details stay in the ignored workspace. The summary carries the manifest seal,
migration ledger file hashes, catalogue identities, stage ownership and actual
counts. Keep raw requests and any private runtime files out of review artifacts.

| Group | Received inputs and scope |
| --- | --- |
| baseline | GM-03 Auth + REST + worker, GM-40 39-dish GM-18.2 test catalogue and v3 continuity, GM-07.B/GM-19 admission/settings, GM-08 draft and GM-18 legacy SQL/TS eligibility vectors, v2 lifecycle, race and atomic rollback |
| legacy-decision | Received decision-v2 evaluator and seeded selector vectors compared with deployed legacy SQL and the TypeScript test suite |
| canonical | GM-15 fixture vectors, GM-20.4 SQL evaluator and real B-supplement HTTP including races, stale versions, ACK and terminal results |
| boundaries | Canonical exact count, all survivor counts, roster majority, timeout tick, preference isolation and invite/start race |
| history | GM-21 canonical consent, reader and retention on the supplied stack |
| notifications | GM-23 canonical inbox and sender regression. Transport uses a local fake push provider |
| outbox | GM-31 repository tests and GM-32 opt-in live reconciliation. Node SQLite provides the test database and an in-memory adapter stands in for SecureStore |

For GM-33, retest reconnect after force-stop, private SQLite/SecureStore,
two-client retry and UI state transitions on Android. Record the app build,
runtime manifest, device and actual outcome separately from the server suite.
Use the [mobile API matrix](../../../testing/MOBILE_API_TEST_MATRIX.md) for
endpoint setup. Provide the QA API URL and public anon key to the Android
client. Use `adb reverse` for loopback on a USB device, or the supported HTTPS
QA endpoint. Use two distinct guest identities; service-role credentials stay
in the owned runner.
Map native push and Places to the corresponding producer capabilities. The
current [regression summary](manifest-regression/CHECKS.md) distinguishes
validated scopes from pending checks.

## Consumer coverage to carry into GM-33

| Consumer | Received GM-32 evidence | Device follow-up |
| --- | --- | --- |
| GM-24–27, rooms/voting/result | Actual create, locked counts, invite/start, two rounds, deadline/majority, Top 3 and stale replay across the recorded contracts | Join with independent identity, verify UI transitions and unchanged winner across reconnect/provider failure |
| GM-28, social/inbox/history | Authenticated admission, event/inbox, consent/retention and G01–G03 adapter-state assertions | Verify user-visible errors, stale cache, unavailable reference, retry and identity changes on the target build |
| GM-29/30, push/links/Places | Inbox/sender with fake provider; isolated Places permission/quota/attribution unit coverage | Real QA push, physical QR and restricted Places key on the native candidate |
| GM-31, private cache and ballot replay | Node SQLite with live canonical REST, exact ACK replay and stale-intent removal | Native SQLite/SecureStore, force-stop/restart and two independent identities |
| GM-35, G04/G05 | Not run. No live profile-save/password-change consumer on this revision | Once the P1 consumer is available, verify form retention or field clearing through network/server failures |

## Pull request target

GM-40 PR #164 landed on main at `30aa524`. The GM-32 change is based on
the existing PR #163 head and retains its GM-19 settings tests. Before any
subsequent update, fetch both refs, preserve upstream PR commits and rerun
`python scripts/task_readiness.py --task GM-32 --gate merge --base-ref origin/main --verify-outputs`.
Keep GM-33 on its own branch.
