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

### Live PR #126 follow-up — 2026-11-08

- Source checkout: `e5f6e281c7f2b1c5b3e26d4decbde0b80a5be0e6`; merge target present in the in-progress merge: `8b26c3f96d46dff57c1b0857a13e8f1144e0a1cb`. The GM-28 edits are local and uncommitted. The staged main side of the merge is retained; no commit, push, or PR update was made.
- Consumer contract: `ui-figma-final/2026-10-25/GM-28.2`; API source checked in owned QA: `dish-session-v4/roadmap-v2/GM-07.B`, schema `0.9.2`. A manifest/evidence hash records the local feature source separately from the base revision.
- Device: Android Studio AVD `Medium_Phone_API_37.0`, Android 17/API 37, emulator `emulator-5554`, Expo Go `58.0.5`, approximately 412dp at density 420. This is emulator evidence, not a physical-device or native-build result.
- QA: isolated backend-qa run `gm28-pr126-20261108`, API `127.0.0.1:55371`, DB port `55372`; application database was not changed. GoTrue guest signup/refresh, same identity after refresh, authenticated REST, missing JWT and forged JWT passed 7/7. Two-identity invite/accept, unfriend/re-invite/accept, and third-identity invite/reject were exercised through real QA HTTP and Expo UI; sanitized run outputs are in `artifacts/2026-11-08-pr126-avd/`.
- Inbox handled-action regression: after the API confirms accept/reject, the adapter suppresses that event for the same identity during the current app process. The server currently continues returning old invitation rows as `read=false`; suppression is in-memory and does not survive process restart. Durable server read/handled state is not part of the current GM-22/23 contract.
- History consent revoke and restore were acknowledged by the server and the history list remained empty. Canonical result refetch, history delete, group-consent matrix and TTL were **Not run** because this QA run had no saved canonical result fixture.
- Generic GM-V4 HTTP suite **Fail** at the migration-0040 function-body hash guard: expected `d64e2144169770669b7be794bd849abb1a36f7339cbb958bfe2a68fa386512bc`, actual `4f960ee26fbe743c15f1216a068acc2ee8c3e9278484e9981b438dc10dad5554`. No assertion or hash check was weakened. The run stopped before social/history HTTP cases.
- AVD functional interaction at 412dp: friend and inbox flows above passed; history consent controls were exercised. Evidence: `artifacts/2026-11-08-pr126-avd/friends-412-redacted.png`, `inbox-before-reject-412.png`, `inbox-after-reject-412.png`, `history-consent-result-412.png`, `social-flow-report.json`, and `gm28-live-qa-report.json`.
- Width/font scaling: 360dp, 320dp and 200% font-scale attempts were **Fail** because Expo Go reloaded into `TypeError: Cannot read property 'EventEmitter' of undefined`; the 320dp error capture is `artifacts/2026-11-08-pr126-avd/expo-error-at-320.png`. Do not interpret it as a passed responsive check.
- TalkBack: service binding and accessibility labels/hit-target dimensions were inspected; full spoken focus order and activation were **Not run**. See `artifacts/2026-11-08-pr126-avd/talkback-observation.txt`.
- Figma visual parity: **Fail**. At 412dp the functional screens render, but navigation/header and page composition differ from approved Friends/Inbox/History frames. Details and screenshots are in `FIGMA_PARITY.md` and `artifacts/2026-11-08-pr126-avd/`.
- Final automated checks for this exact local source are recorded in `artifacts/2026-11-08-pr126-avd/`: mobile full check, Expo compatibility, Android JS export, Python regression, repository validator, task-doc index, merge readiness and whitespace check. The readiness command reports `READY_FOR_MERGE_REVIEW`; this gate checks delivered artifacts/approval mapping and does not override the runtime Fail/Not run entries above.
- Cleanup status is recorded in `artifacts/2026-11-08-pr126-avd/qa-cleanup-final.txt`; only the owned QA run and its ADB reverse mappings were eligible for cleanup. Emulator settings were restored to density 420, font scale 1.0 and TalkBack disabled.

### Canonical inbox result and saved-history close-out — 2026-11-08

This follow-up supersedes the prior “saved canonical result unavailable” statements for the AVD scenario below. It does not supersede the earlier Figma-parity, narrow-viewport or complete TalkBack limitations.

- Source: branch `codex/gm-28-social-inbox-history`; `HEAD=e5f6e281c7f2b1c5b3e26d4decbde0b80a5be0e6`, merge target `origin/main=8b26c3f96d46dff57c1b0857a13e8f1144e0a1cb`. Main is staged in the active merge worktree; no merge commit, push or PR update was made. Source hashes and sanitized outputs are in `artifacts/2026-11-08-pr126-avd/live-closeout-manifest.json`.
- QA: owned disposable run `gm28-pr126-20261108`, API `127.0.0.1:55371`, DB `55372`; last `backend-qa verify` passed ownership, worker heartbeat, 27 migrations, schema `0.9.2`, 200 functions and two catalogues. The app database was not used or reset. The tested room used `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
- Device: Android Studio AVD `Medium_Phone_API_37.0`, Android 17/API 37, Expo Go `58.0.5`, 1080×2400 at density 420 (about 412dp). This is emulator/Expo Go evidence, not a physical phone or native development build.

| Scenario | Expected | Actual | Result/evidence |
|---|---|---|---|
| Accept the live room invitation from Inbox | Recipient becomes the second member in the same B-supplement room | App confirmed and opened the live lobby; API snapshot reported 2 members | **Pass** — `room-invite-accept-live.json`, `room-bsupp-after-accept-avd.png` |
| Start the round | Authenticated host starts the 10-dish pool; member sees the same room and round | API start returned HTTP 200; snapshot was `ROUND_1`, pool 10, version advanced; AVD opened the live ballot | **Pass** — `room-round-start-live.json`, earlier live-room screenshots retained in this evidence folder |
| Submit a complete ballot in the app | All 10 choices are set and the server ACK is visible | AVD showed “Tất cả các món đã được chọn”, then “Phiếu đã được nộp và ghi nhận trên hệ thống” | **Pass** — `after-submit.png` remains only in the owned private QA directory because it contains raw dish UUIDs |
| Canonical result and ranking | Authorized result is persisted; winner is in the top score group; ties retain equal dense rank | API returned HTTP 200, `DECIDED`, `round1BallotCount=1`; `Phở bò`, `Salad` and `Phở gà` each had score 2/rank 1, and `Phở gà` was the persisted winner. Only one of the two room members submitted before terminalization; this does not claim a two-member consensus run. | **Pass for this terminal projection** — `live-result-parity.json`, `result-live-final.png` |
| Inbox event and open | Exactly one result inbox item references the canonical room/result/status; tapping it refetches the authorized current snapshot and opens the matching result | QA API found one matching `room_result`; AVD displayed “Kết quả phòng đã sẵn sàng”; tapping it opened the result screen and winner reveal | **Pass** — `live-result-inbox-check.json`, `inbox-live-result-row.png`, `inbox-result-opened-live.png`; `socialInboxHistoryRepositories.test.ts` also asserts the exact GM-07.B `dish_session(snapshot)` RPC through `ApiClientImpl` |
| Outsider result access | Non-member cannot read the terminal result | Third guest received HTTP `403`, `NOT_MEMBER`, with no result data | **Pass** — `outsider-result-acl.json` |
| Saved personal history and delete | Consent-authorized history shows the same canonical result; delete is server-ACKed and removed from the current list | AVD showed the saved `Phở gà` result, two participants, and all three rank-1/2-point entries. After confirmation, the server ACKed deletion and the list reloaded empty. | **Pass** — `history-live-result-card.png`, `history-live-delete-confirm.png`, `history-live-after-delete.png` |
| Cache invalidation after cross-adapter consent change | A late read from another history adapter cannot repopulate a revoked cache | Jest regression passes for shared consent invalidation, concurrent ACK ordering, stale response and deletion; this particular live AVD run did not perform a second consent revocation after the history item was deleted | **Unit Pass; live revoke Not run** — focused test file below |

- Final mobile evidence for the pre-style-only source: `npm run check` passed TypeScript, ESLint, 72 Jest suites / 1,352 tests, and architecture boundaries. After changing only a test type annotation to remove a lint warning, standalone `npm run lint` passed and `npm test -- --runInBand tests/unit/socialInboxHistoryRepositories.test.ts` passed 1 suite / 23 tests. Expo compatibility and Android JS export passed; Python regression passed 664 tests with 2 skipped. Exact command outputs are retained in this folder.
- `push-settings` is absent from the app route tree and Inbox UI. Result ID malformed/cross-room mismatch is rejected by the repository guard; `DECIDED` + `round=1` + `ACCEPTABLE_FINAL` is rejected by the shared raw terminal validator and regression tests.
- Remaining limits: visual parity is still Partial/Fail as recorded in `FIGMA_PARITY.md`; 320/360dp and 200% font-scale final-source reload, full spoken TalkBack order/activation, physical Android, native build, remote push, NO_CONSENSUS result open, full group-consent/TTL matrix and two-member vote completion are **Not run**. Do not mark GM-28/GM-27 complete from this follow-up alone.

### Historical Inbox read-all AVD prototype — 2026-11-08

- Source: PR #126 worktree `codex/gm-28-social-inbox-history`, `HEAD=e5f6e281c7f2b1c5b3e26d4decbde0b80a5be0e6`; main merge target staged from `8b26c3f96d46dff57c1b0857a13e8f1144e0a1cb`. Source remains uncommitted; no commit, push, PR update, merge or Project status change was performed.
- Consumer contract: `food-v1/roadmap-v2/GM-23.3`, migration `0041_gm23_inbox_read_all.sql`, schema `0.17.0`. The API implementation is in the separate GM-23 worktree; it is not yet part of this PR's target branch.
- Device: Android Studio AVD `Medium_Phone_API_37.0`, Android 17/API 37, Expo Go `58.0.5`, 1080×2400 at density 420 (about 412dp), font scale 1.0. Not a physical phone or native build.

| Scenario | Expected | Actual | Result/evidence |
|---|---|---|---|
| Inbox “Đọc tất cả” | Authenticated user marks every current unread/unexpired inbox row as read; do not claim success until API ACK | One unread row was visible. After tapping, the app displayed the server acknowledgment; database readback was 1 read / 0 unread. | **Pass** — [AVD screenshot](artifacts/2026-11-08/inbox-read-all-live.png), [run manifest](artifacts/2026-11-08-inbox-read-all/manifest.json) |
| History with no entries | Render real API empty state without mock fallback | “Chưa có dữ liệu đã lưu” was displayed. | **Pass** — [AVD screenshot](artifacts/2026-11-08/history-empty-live.png) |
| Revoke personal history consent | Persist caller's revoke; do not expose personal history afterwards | App acknowledgment appeared; QA DB readback was `personal=false`, zero personal history rows. | **Pass** — [AVD screenshot](artifacts/2026-11-08/history-consent-revoke-live.png) |
| Populated history detail for this fresh QA guest | Open an authorized saved result from history | This particular fresh guest had no saved row, so that scenario was not run in this QA session. The earlier same-source canonical result/history AVD close-out remains linked above and is not overwritten. | **Not run in this session** |

- Automated checks on this source: `npm run check` passed (typecheck, lint, 72 suites / 1,357 Jest tests, architecture); `npm run check:expo` passed at Expo 58.0.23; `npm run bundle:android` exported the Android bundle (1,718 entry modules); Python regression passed 664 tests with 2 skipped; repository validator, task-doc index and staged/unstaged diff checks passed. Output summary: [checks-summary.json](artifacts/2026-11-08-inbox-read-all/checks-summary.json).
- The supplement verifies the UI/API transition at 412dp. It does not change the prior overall visual finding: Figma parity remains Partial/Fail. Final-source 320/360dp, 200% font scale and full TalkBack order/activation were not rerun; remote push remains outside this consumer check.
- QA run `gm23-inbox-read-20261108-2` was disposable. After capture, worker, Supabase project, volume and network were stopped/removed; the exact QA container/volume/network were absent and only the API ADB reverse mapping was removed. The unrelated Metro mapping `tcp:8084` was left in place. Application DB was not used.
- This QA evidence used the prototype migration. The shipped contract is GM-28.1 in PR #126, verified below.

### GM-28.1 SQL and REST verification — 2026-11-08

- Baseline PR head `efa9e0f` plus the GM-28.1 changes in this PR. Owned QA run
  `gm28-pr126-readall-20261108` used loopback Auth, REST and worker, applied 28 migrations
  through `0041_gm28_inbox_read_all.sql`, and verified ownership and function definitions.
- PostgreSQL TAP **18/18**. Checks include execute privileges, caller isolation, all pages beyond 50,
  expired and already-read rows, ACK shape, and replay leaving later rows unread.
- Authenticated HTTP **12/12** with synthetic guests. Missing JWT returned 401, invalid request returned
  400, and simultaneous retries returned the same ACK. The other account's inbox stayed unread until
  that account called the RPC. Owner and recipient state were verified through real Inbox reads.
- Focused mobile Jest **184/184**, with malformed ACKs and mixed legacy/canonical notifications covered.
  Full `npm run check` passed typecheck, lint, architecture and **72 suites / 1,361 tests**.
- Full QA regression passed **7 Auth/REST and 169 v4 assertions**, with 599 schema envelopes checked.
  The first Windows run exposed a CRLF/LF mismatch in the migration 0040 body hash. The rerun used the exact
  LF bytes in Git and passed the existing hash assertion. Both owned QA runs were stopped and cleaned up.
- Repository validation and task indexes passed. The live Project checker returned
  `READY_FOR_MERGE_REVIEW` against main `8b26c3f` after restoring the shared GM-07 API files to the target revision.
- AVD with the final GM-28.1 migration, full Figma parity and complete TalkBack remain **Not run** for this
  revision. The historical prototype run above is retained as prior evidence.

### PR #126 four review findings follow-up — 2026-11-08

- Source: PR branch codex/gm-28-social-inbox-history, base 95eb87a052d9f92e14e4db23cce591a2f986ec3c; edits are local and uncommitted. No commit, push, PR update, merge, Project update, or status change was made.
- Scenario matrix and file hashes: [four-findings follow-up](artifacts/2026-11-08-pr126-four-findings/FOLLOWUP.md) and [manifest](artifacts/2026-11-08-pr126-four-findings/manifest.json).

| Finding | Verification | Result and limit |
|---|---|---|
| Legacy result notification called canonical snapshot | Unit test asserts legacy metadata calls authenticated get_room_snapshot and never calls the canonical repository snapshot. Component test asserts the read-only legacy result route. Canonical versioned metadata still calls dish_session(snapshot) and rejects unsupported versions. | **Code + unit/component Pass. Live backend/AVD request Not run.** The cause was routing both wire formats through the v4 snapshot path; a legacy decision-v2 room returns 409 CONTRACT_MISMATCH there. |
| Bottom navigation labels clipped at narrow width/large text | Inspected Friends and History on Medium_Phone_API_37.0 at 360dp/200% and 320dp/200%. | **AVD visual Pass for nav labels** — all four tabs remain visible; page content scrolls independently. Screenshots are linked in the follow-up. |
| TalkBack focus and activation unclear | TalkBack was enabled for the AVD check. Focus advanced through brand, notifications and Add Friend; Enter opened the Add Friend dialog without sending an invitation. | **Partial.** Focus/activation observed; complete spoken-utterance transcript and full screen-by-screen traversal were not captured, so full TalkBack acceptance remains Not run. TalkBack was disabled afterward. |
| Figma captures used different data states | Added a development-only /dev/gm28-parity route with fixed sample repositories. Captured Friends (2 friends/1 pending invite), Inbox (2 current invitations and prior result states), and History (2 decided results and 1 no-consensus entry). | **Semantic sample alignment Pass; visual parity Partial.** The route uses local fixture data and does not call API. Remaining composition/details are recorded in FIGMA_PARITY.md; do not claim full Figma parity. |

- Device: Android Studio AVD Medium_Phone_API_37.0, Android 17/API 37, Expo Go 58.0.5. Final screenshot is 1080×2400 at density 420 (about 412dp), font scale 1.0. Settings were restored after 320/360dp and 200% checks.
- API boundary: an owned disposable QA runtime was verified and stopped/cleaned. No JWT-backed live social/history HTTP run or AVD-to-API result-open test was performed in this follow-up. No application database was used or reset.
- npm run check: **72 suites / 1,363 Jest tests passed**, TypeScript passed, ESLint had no errors (4 existing warnings), architecture check passed.
- npm run check:expo: passed with “dependencies up to date”; the tool noted dependency validation is unreliable in offline mode.
- npm run bundle:android: passed; Android bundle exported with 1,722 entry modules.
- Python repository regression: **664 passed, 2 skipped**.
- Repository validator, task-doc index and git diff --check: passed. Diff check emitted only LF-to-CRLF working-copy notices.
- The first pushed revision b19ad9e passed all 19 GitHub checks after rerun. Its first GM-18 attempt failed because Docker could not bind host port 54322; rerun started Supabase and the SQL/HTTP assertions passed. The GM-14 mock InboxScreen change was then removed to restore the upstream artifact; this follow-up source requires its own CI run.
- After restoring that file, the merge readiness checker returned READY_FOR_MERGE_REVIEW against origin/main 8b26c3f96d46dff57c1b0857a13e8f1144e0a1cb. This gate does not replace Trí's review, the still-missing live AVD-to-API result-open case, full TalkBack evidence, or visual parity acceptance.
