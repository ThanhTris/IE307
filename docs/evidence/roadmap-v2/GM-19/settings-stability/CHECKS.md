# GM19.2 — actual settings correction checks

Local candidate on2026-10-29; base GM-15 PR140 commit237e5f7, maina6e89fc.
Internal supplement GM19.2/schema0.11.1; public GM-07.B baseline unchanged.
Reviewer Trí, approval pending. No Project status or app DB changes.

| Check | Expected / actual | Result |
| --- | --- | --- |
| Disposable DB, current migrations / ledger / worker | New labelled QA with GoTrue/PostgREST, schema0.11.1 and live worker; real39-dish test/demo + separate synthetic20-dish fixture | Pass |
| Actual dispatcher definition and private execute ACL | Function-body SHA equals0034; direct execute denied to anon/authenticated/service_role | Pass |
| Complete v4 HTTP suite |151 assertions;575 actual request/response envelopes validated by baseline JSON Schema; includes existing consent/history/timer/Top3/privacy/admission regressions | Pass |
| New GM19 settings cases | Host/member/outsider, unchanged state on denial, new no-op/time-only/offset/null, exact replay after edits/start, requestId reuse, invalid/stale/locked, count/meal/equivalent-content, pinned catalogue/seed, shortage, concurrent duplicate/settings/start | Pass, input-response samples and expected/actual in http-results.json |
| Pinned seed independent of room version | Synthetic equal-seed rooms: intervening time-only mutation does not change subsequent selected cards | Pass |
| Duplicate/race |6 duplicate attempts=>one ACK/mutation; competing edits and two start/edit races=>one accepted/one VERSION_CONFLICT, no partial mixed state | Pass |
| Scoped source comparison | Other dispatcher branches are unchanged versus0027, excluding host-guard list/declaration and updateSettings body; public routes untouched | Pass |
| Node decision regression |288 tests Pass,0 skipped; v2/v3/v4 | Pass |
| Backend tooling Node tests |19 tests Pass,0 skipped | Pass |
| Python regression |642 tests OK,6 skipped | Pass |
| Repository / task indexes / diff | Link/JSON/contract index and whitespace checks | Pass after final evidence files exist |
| Live Project start / merge gate | READY_TO_CLAIM / READY_FOR_MERGE_REVIEW against fresh origin/main; gate output is not approval | Pass |
| Native/UI/production | Not changed or tested; Android consumers retain their own acceptance | Not run |
| Canonical result writer/new B-supplement API | Remains GM-20; this patch retains existing v4 authority/wire | Not run |

Runtimes: macOS arm64, Node24.22.1, Python3.12.14, PostgreSQL17 Docker Supabase,
GoTrue JWT auth and actual PostgREST requests. Existing locked root dependencies
were restored via npm ci; no new package/lock changes. jsonschema4.26.0 is the
existing CI requirement in an isolated /tmp venv. No mobile TS code changed;
Jest/typecheck/lint results from GM-15 remain its own evidence, not a new run here.

The strict GM-03 setup first rejected Docker Desktop wildcard bindings and cleaned
its own resources. Subsequent runs use the pre-existing explicit local wildcard
opt-in of the CI runner; no guard was removed. One initial test run caught the
11.0 normalization in the wrong copied branch, corrected before final run. The
final full run is runtime-results.json/http-results.json and matches0034 hashes.

Counts can vary by one conditional assertion for each actual concurrent winner;
151/575 are this final run, not a fixed quota. Assertions check both valid race
outcomes. Fixture-only seeds/ballots/UUIDs are synthetic; credentials are absent.
Runner stops its worker/containers and removes its owned workdir; default CLI
backup volumes were additionally removed only after verifying exact run labels.
Application containers/data were preserved. See cleanup.json and manifest hashes.

Reproduce: [HANDOFF](HANDOFF.md), [HTTP examples](../../../../../supabase/tests/http/GM-19-settings-v4.http).
Reports pin the HEAD-before-patch revision237e5f7 and source hashes, not a fabricated
feature-commit SHA. The final commit contains the actual tested bytes. Human
acceptance, Project Done and stacked PR merge remain Trí's decisions.
