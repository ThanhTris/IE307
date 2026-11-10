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

Repeat with a new run ID and replace `baseline` with `canonical`, `boundaries`,
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

Integration order is GM-40 PR #164 into main, then align the GM-32 supplement
with main and integrate the GM-32-only commit(s) on top of the existing
PR #163 head. Preserve its settings tests and historical evidence. Use a
fast-forward update of the PR head after fetching, checking for review
changes and passing the current merge gate. The branch is local.
