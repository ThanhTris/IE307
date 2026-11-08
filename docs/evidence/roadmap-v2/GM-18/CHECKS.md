# GM-18 — Checks tích hợp GM-17

> Supplement hiện hành2026-10-29: [GM18.2 dish-only API](dish-only/HANDOFF.md), [checks mới](dish-only/CHECKS.md). Phần bên dưới giữ evidence offering/coverage legacy; không là nghiệm thu API mới.

2026-10-13. Owner Tâm, reviewer Trí, review Pending. Branch
`codex/gm-18-catalogue-eligibility`, tested HEAD `19aacc4186c78471893b4c052f67872f67ffb678`
+ working-tree patch; target `origin/main` `4a38588f515c6121a38c605bf50e209d570b90bd`
(GM-17 PR #111). Contract GM-18.1/GM-07.1, food1.1.0/schema0.2.0,
eligibility1.0.0/policy gm18-api-1.0.0. macOS, Node26.0.0, PostgreSQL17.11,
Python3.13.3 SQL / bundled3.12.14 regression & HTTP helper.
Source hashes: integration/sql-results.json, http-results.json, PATCH_MANIFEST.json.

## Output và assertion thật

| Output / input | Expected + assertion | Actual / evidence | Loại / kết quả |
| --- | --- | --- | --- |
| Actual GM-08 0.4.1 load/query | 21 venues/18 dishes/190 offerings; no invented coverage or eligible pool; unchanged rows/version | Actual counts, empty OUT_OF_COVERAGE/version0.4.1; integration/sql-results.json + http-results.json | Data thật trong DB test; Pass |
| Private SQL/kernel/access/rollback | Complete output parity, independent offering sets, scoped grants, rollback leaves upstream/data/sentinel | 147 assertions / 60 cases; integration/sql-results.json | PostgreSQL thật, positive fixtures rõ nhãn; Pass |
| get_discovery_context | Correct typed coverage/anchors/serverTime; missing administrative linkage explicit unknown | Real guest JWT + GM-07 guards/GM-18 adapter, actual empty and synthetic positive; integration/http-results.json | HTTP thật; Pass |
| preview_food_pool | <=8 unique, refs/prices/null, seed/version/reasons; validate shapes/date/radius/horizon; deterministic | 31 HTTP cases across suite; integration/http-results.json | JWT/PostgREST/network/client thật, positive data synthetic; Pass |
| get_result_offerings | Host/member only, exact persisted winner, both venues, sold-out empty, immutable decision | Outsider/left403, expired410; room/result hash unchanged; integration/http-results.json | HTTP thật, fixture decision; Pass |
| Auth/privacy/rate | Missing/forged/expired401, same signed unexpired control200; no private fields; concurrent60 allowed/61st429 | Assertions and mapped client errors; integration/http-results.json | HTTP/JWT thật; Pass |
| TS domain regression | Hard eligibility, schedules/DST/lastOrder/unknown, soft ranking, rank-nine winner | 237/237 (68 eligibility); integration/domain-regression.txt | Pure domain/fixtures; Pass |
| Mobile check | tsc/lint/Jest/architecture | 382/382; 4 baseline GM-07 warnings, 0 errors; integration/mobile-check.txt | Unit/contract, no device claim; Pass |
| GM-17 regression | Existing access/retention unaffected, local definitions match fresh | 93 assertions; integration/gm17-regression.json | SQL claims, not JWT proof; Pass; optional concurrentCleanup skipped by upstream runner |
| Local development API deployment | Final definitions/grants/policy match fresh migration | integration/local-deployment.json | Local-only own uncommitted functions refreshed; no data reset/publish; Pass |
| Full Python | Repository/tooling/data regression | 550/550; integration/python-regression.txt | Offline regression; Pass |
| Repository/docs/diff | Validator/indexes/whitespace | integration/repository-check.txt, docs-freshness.txt, diff-check.txt | Tooling; Pass |
| Project gates | Start Done; merge deps/artifacts match fetched main | integration/start-gate.txt, merge-gate.txt; READY_FOR_MERGE_REVIEW at 2026-10-13T13:22:49Z | Live Project, no cache; Pass |
| Android UI → real API | GM-24/25/27 app/device matrix | Not run here; HANDOFF lists endpoint setup and cases | Consumer integration; no reverse dependency |
| Remote CI / Trí review | Current revision after commit/push | Not run / Pending | No automatic approval/Done |

The SQL report compares all 60 complete TS/SQL outputs including exact offering
sets, ordered profiles/prices/unit/null, metadata and empty reasons. Original42
cases retained; 18 edge cases include four DST fold/gap cases. Public API security
is separately tested with real GoTrue guest JWTs (not just forged SQL claims).
HTTP positive rows are newly generated synthetic published-state ACL simulation
inside a disposable DB, never relabelled actual data or verified publication.

Actual bundle SHA256:
`0b45ecbd2c8b8fdd237aeaa8f2bc66beef11eceebbfad8a313f06779d282ed02`.
Actual data retains draft/null/unknown; verified manifest remains0/null. Source,
rights, schedules/service modes/coverage are not invented. ADR-014 accepts this
actual-data test separately from synthetic positive coverage fixtures.

RPCs use auth.uid/server time, private fixed-path wrappers and explicit projections.
User selected10km/7days, private read budget60/minute per identity/endpoint.
Result read filters same winner before cap; sold-out does not reroll. New rollback
removes only API objects without CASCADE; upstream schema/kernel/data remain.
HTTP test cleanup removed its container, DB and namespaced synthetic guests.

Initial integration runs exposed an ambiguous rate-window conflict target and
an empty adminAreaId rejected by GM-07. Both are fixed in the final uncommitted
migration. Synthetic setup was adjusted to satisfy published-state schema checks;
this adjustment only applies to synthetic rows, not GM-08. Final HTTP31/SQL147
reports refer to final bytes; local definitions/grants/policy were compared with
fresh deployment. The developer draft had already been applied by local startup,
so only its own function definitions were refreshed; no merged migration changed.

First merge-check attempt using system Python could not verify the live Project;
re-run with bundled Python's CA store succeeded without TLS bypass/cache/fallback.

## Tái lập và giới hạn

See HANDOFF for commands and the real client composition. Server/SQL/HTTP assertions
do not replace Android/native/Expo screen acceptance. No UI route, auth scaffold,
upstream grants/schema, package or lockfile changes. GM-17 optional concurrent
cleanup is skipped by that regression runner; GM-18 rate race is executed.
Trí must review AC and this patch revision before moving Done/merging.

Historical checks/logs remain under CHECKS-2026-10-12.md and the old root evidence;
old GM-17/verified blockers no longer describe current acceptance (ADR-014).
