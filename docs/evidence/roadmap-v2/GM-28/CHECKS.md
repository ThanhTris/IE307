# GM-28 — Checks

### Review response — 2026-11-07 (local, pending PR update)

- Split PR ownership per Trí's latest review: this PR now keeps GM-28; GM-29 push files/evidence and GM-31 outbox/migrations/voting integration/evidence are removed for their task PRs. Task-number `/gm28/*` route aliases are removed.
- `historyRepository.ts` retains its injectable `DurableHistoryStore` interface and identity-safe in-memory cache. It no longer imports or initializes SQLite/SecureStore; durable wiring is owned by GM-31.
- Tightened raw wire guards for friend identity, friend rows and inbox rows (including rejection of unknown root fields). Added malformed canonical history and thrown HTTP 401/403/409 regressions.
- `npm run check:expo`: Pass on Expo 58.0.23. `npm run typecheck`: Pass. Focused API/repository/history regression: 3 suites / 157 tests Pass. `git diff --check`: Pass.
- Full `npm run check`: Pass — typecheck, lint, 68 suites / 1141 tests, architecture check. A subsequent standalone lint run after removing the new test warning also passed cleanly.
- AVD + local Backend QA, two-account live flows, and Figma screenshot parity remain Not run. PR #157 result-route overlap remains until that PR merges; do not mark this PR Ready or the task Done yet.

## Run record

### Trí review follow-up — 2026-11-07 (local, pending PR update)

- Base: PR #126 reviewed head `97007037`; this follow-up commit is committed locally and pending push. No Project status or approval was changed.
- Addressed the seven remaining reviewer groups: ballot identity/session epoch, version-only outbox reconciliation, best-effort remote push unregister on logout, history item/cache TTL and cross-adapter consent invalidation, stale canonical-result response guard, server-ACKed push token retry, and retryable SecureStore deletion.
- Added managed regressions for identity change during enqueue, same-scope version increase preserving pending/unknown intents, cross-adapter consent ACK, history item/cache expiry, stale A→B result response, push registration retry after server error, and SecureStore deletion failure/retry.
- `mobile/npm run check`: Pass — typecheck, lint, 70 suites / 1138 tests, architecture check.
- Full local suite uses synthetic storage/transport. HTTP against Supabase, Android/native restart and push delivery, and Figma visual comparison remain Not run. PR #157 result-reader overlap still requires owner coordination before merging both PRs.
- CI rerun `42268134968` on head `0827990` passed all jobs. Fresh-runner Supabase startup, GM-18 SQL/JWT HTTP and GM-21 history/consent integration passed; the previous host-port-54322 collision did not recur. This does not cover the GM-28 social two-identity invite/ACL matrix or Android/native/Figma evidence listed above.
- PR #126 draft remains unapproved; no Done or merge claim is made.

### Owner feedback follow-up — 2026-11-06

- Revision: follow-up code commit `2ec9c2a`, based on PR #126 head `28a210c`; pending push in this run. PR remains draft for owner review.
- Implemented PR #126 feedback covering session/API 401 recovery, identity-safe history cache operations, canonical history/results, inbox result references, accept-invite routing, live room friend invites, G01 friend name search, and consolidated live routes.
- `mobile/npm run typecheck`: Pass.
- `mobile/npm run lint`: Pass.
- GM-28 repository/canonical-history Jest: 2 suites / 16 tests passed. New reviewer regressions use real `SessionManager`, `ApiClientImpl`, and `LiveRoomRepository` with synthetic storage/transport for cold restore, feature 401→refresh, delayed response across same-user logout/restore, and durable-cache reads across auth epochs.
- Focused GM-28/29/31 Jest: 5 suites / 50 tests passed.
- Regression Jest for routes, lobby lifecycle and result entry: 3 suites / 41 tests passed after preserving existing error-code display behavior and avoiding SQLite access in mock preview.
- Full `mobile/npm run check`: Pass — typecheck, lint, 69 suites / 1129 tests, and architecture check.
- `mobile/npm run check:expo`: Pass — Expo 58.0.23 dependencies match the lockfile and bundled compatibility check.
- `mobile/npx expo config --type public`: Pass — Android-only config resolves; no EAS project ID is configured.
- `python scripts/validate_repository.py`: Pass; `python scripts/task_readiness.py --check-docs`: Pass; `git diff --check`: Pass.
- `python -m unittest discover -s tests -p "test_*.py"`: 660 run, 6 skipped, 1 error (`WinError 1314`) in existing symlink-creation test `test_stage_refuses_symlink_output`; Windows does not grant symlink privilege in this environment. The failure is unrelated to the mobile patch.
- Android, live API/multi-user ACL, EAS push delivery and Figma screenshot comparison: Not run; their environments/evidence are unavailable in this workspace.

### Earlier follow-up before owner-feedback patch — 2026-11-06 (superseded below)

- Revision: rebased GM-28 change on `origin/main` `bb2103a2c1c8abe806376870ffbd42ee0e09dcdc`; local follow-up patch is not yet committed.
- Scope: connect Home actions to the live GM-28 routes while preserving current main route wiring; clear history cache on logout; show cached history with its original `fetchedAt` and a stale/offline notice after network/timeout failure. Auth and other server errors continue to suppress cached history.
- `git diff --check`: Pass.
- `npm ci --no-audit --no-fund`: Not run to completion; npm exited 1 with `ENOTEMPTY` while removing `mobile/node_modules/react-native/React/DevSupport`.
- `npm run check:expo`: Blocked by the incomplete install (`@expo/ui/package.json` missing).
- `npm run check`: Blocked by the incomplete install (`tsc` unavailable). The prior 656-test result below is historical from the pre-rebase revision, not a result for this follow-up patch.
- Android/API multi-user, Figma screenshot comparison, and producer deployment checks: Not run; no device/backend test environment or captured Figma/app screenshots were available in this run.

#### Follow-up assertions

| Check | Result | Input/command | Expected | Actual |
|---|---|---|---|---|
| History cache retained on network error | Added, not executed | `mobile/tests/unit/gm28Repositories.test.ts` | Failed network fetch leaves last successful identity-scoped snapshot available | Assertion added; Jest unavailable because dependency installation failed |
| Offline history rendering | Implemented, not device-verified | `LiveHistoryScreen.tsx` | Network/timeout uses cached snapshot with original timestamp and stale label; auth/other errors hide cache | Code path added; runtime/visual behavior Not run |
| Current route wiring | Implemented, not device-verified | `mobile/src/app/index.tsx` | Real mode opens GM-28 Friends/Inbox/History; mock mode keeps legacy preview routes | Source wired; navigation Not run |

- Date: 2026-10-18 (Asia/Bangkok).
- Base commit: `8cf8084a021d56fae261da34503ed5a7a45681bd`.
- Task contract: `food-v1/roadmap-v2/GM-28.1`.
- Schema/API source: `mobile/src/data/api/contracts.ts`, `mobile/src/data/api/client.ts`; upstream GM-21/22/23/25 integration must be reverified on target before merge.
- Dataset: N/A for local unit checks; no live dataset was used.
- Build/device: local Windows checkout; no Android device/build evidence. `adb` is unavailable in PATH.

## Assertions

| Check | Result | Input/command | Expected | Actual |
|---|---|---|---|---|
| GM-28 repository adapters | Pass | `cd mobile; npm test -- --runInBand tests/unit/gm28Repositories.test.ts` | Social calls delegate with request IDs; inbox dedupes events and uses inbox-row cursor; room accept sends invitation ID; history cache is user-scoped and cleared | `mobile/tests/unit/gm28Repositories.test.ts` passed during `npm run check` |
| Mobile typecheck | Pass | `cd mobile; npm run typecheck` (via `npm run check`) | TypeScript strict check succeeds | Passed |
| Mobile lint | Pass with existing warnings | `cd mobile; npm run lint` (via `npm run check`) | No lint errors | No errors; warnings remain in existing `data/api/contracts.ts` and `data/api/index.ts` |
| Mobile full test suite | Pass | `cd mobile; npm run check` | All Jest tests and architecture check pass | Typecheck passed; lint had 0 errors (4 pre-existing warnings); 24 suites / 656 tests passed; architecture boundaries OK |
| Repository validator | Pass | `python scripts/validate_repository.py` | Documentation, links, JSON, task manifest and dependency metadata validate | Passed; validator explicitly does not check native/backend execution or human approval |
| Repository regression tests | Pass | `python -m unittest discover -s tests -p "test_*.py"` | Python repository suite passes | 550 tests passed |
| Task docs index | Pass | `python scripts/task_readiness.py --check-docs` | Generated task indexes match metadata | Passed |
| Diff whitespace | Pass | `git diff --check` | No whitespace errors | Passed |
| Real Supabase/API, two identities and server-side state | Not run | Requires configured test backend/accounts and cleanup approval | Invite/accept/reject/unfriend, expiry/outsider/session loss, inbox refetch/dedup, history consent/delete/group ACL/network | No API endpoint or credentials were supplied/used |
| Android calling API | Not run | Requires reachable test endpoint and Android device/development build | Verify endpoint/auth/network/lifecycle and server state against matrix | `adb` is not installed/available; no device assertion |
| Expo mock isolation/navigation | Not run on device | Expo Android launch and route interaction | No mock fallback in real-mode errors; mock direct route explains unavailable integration | Code path is implemented; device behavior not evidenced |

## Evidence boundaries

Unit tests and local type/lint checks prove adapter behavior only. They do not prove API deployment, SQL/RLS behavior, Android navigation, or GM-21/22/23 production integration. No secret, token, vote, GPS, or personal data was recorded. Replace any `Running` entry with the actual final command result before review.
