# GM-09 remaining UI steps — local handoff

2026-11-01. Branch `codex/gm-09-figma-update`, owner Tuấn/reviewer Trí.
Source tested: step6 `a4dbdec`, following step2 `e5f92d2`. Requirement revision
`ui-figma-final/2026-10-25/GM-09.2`, received GM-05 and GM-07.1 artifacts plus
the user's current Figma-as-reference/small-additions instruction.

## Commits and source boundaries

| Step | Local source commit | Output |
| --- | --- | --- |
|3|fea0696|New create entry/read-only setup callback; lazy legacy setup fixture|
|4|fde3757|Public-only join preview, confirm, retry/locks and QR/manual fallback|
|5|1b86133|Isolated first-use tutorial, NO/OK/WANT, undo, skip/Back/replay|
|6|a4dbdec|Common flow/accessibility fixes, cancellable reads, real legacy compatibility|
|7|This documentation commit|Current matrix/checks/gaps and source manifest|

[Final test summary](FINAL_TEST_SUMMARY.json) retains sanitized suite results.
[Final source manifest](FINAL_MANIFEST.json) uses UTF-8 LF for text and raw PNG
bytes. Earlier step1/step2 manifests identify their historical revisions.
No API/domain/migration/schema/package/lockfile change. No source was deleted:
legacy CreateRoomScreen, JoinRoomScreen, room receipt/context/preferences still
have GM-25, QA and regression consumers. They are not falsely presented as the
new dish-only flow. No task metadata/Project status or review decision changed.

## Open and reproduce

From clone: `cd mobile`, `npm ci`, `npm run check:expo`, `npm start`; use the
locked SDK58 Expo Go. With no real API configuration the app is explicitly mock.
Full reload → welcome → guest name → tutorial → skip/complete → Home.

- Home **Tạo phòng** → `/room/create-entry`: current name, setup summary/callback
  seam. Missing producer leaves **Tiếp tục thiết lập** unavailable with honest
  copy. Back sends no mutation and asks for no location. It is not full creation.
- Home **Tham gia phòng** → `/room/join-entry`: name/code (`GCD234` fixture),
  **Xem trước phòng** → public count/capacity → **Xác nhận vào phòng** → ACK
  receipt at `/room/preview`. No roster/snapshot read before ACK. Hủy xem trước
  retains inputs and sends no join; retry of unknown delivery keeps request ID
  and payload. A different confirmed intent after definite failure gets a new ID.
- QR tab is a capability seam, not a fake native camera. Denied/unavailable/error
  keeps manual input. A scanned code only fills the field, never auto-joins.
- Home → **Cá nhân** → **Xem lại hướng dẫn**. Tutorial owns only sample state.
  Left=NO, right=OK, double tap=WANT; equivalent buttons are always available.
  Practice the requested choice, undo, complete, replay/Back/skip; no real ballot
  is sent. Onboarding flag is in memory only, not account/durable storage.
- `/dev/home` remains a guarded QA route with fixed Home states. Its create/join
  actions intentionally open legacy compatibility harnesses. Existing context/
  preferences use the GM-10 mock provider only on their own mock routes; new
  create/join entry and tutorial do not create hidden setup fixtures.
- Real mode keeps existing session guards and `/room/create` + `/room/join`
  integration. API error does not switch to mock. New product ports are only
  enabled when the proper producer artifacts arrive.

## Acceptance matrix

| Case / input | Expected → actual | Evidence / status |
| --- | --- | --- |
| Fresh mock/name/tutorial | No automatic room mutation; skip/complete enters Home | Entry/routes/tutorial tests, Pass JS only |
| Create shell/Back/missing setup | No discovery/GPS/create/join; preserve name and report unavailable callback | createRoomEntry/createEntryRoute tests, Pass independent UI; host creation unreceived |
| Public preview | Only code/count/capacity; no roster/ballots/pool/private snapshot before join | joinRoomEntry/joinEntryRoute, Pass mock port |
| Full/locked/expired/auth/network/malformed preview | Preserve input, no false confirmation or join | joinRoomEntry tests, Pass |
| Pending/unknown/accepted join | Freeze edits/Back, prevent duplicate; same request/payload for unknown retry | joinRoomEntry + legacy regression, Pass |
| Preview cancellation / changed warm code / QR | Cancel/Back has no mutation; safe code change invalidates preview; QR never auto-joins | joinRoomEntry/routes, Pass JS; physical QR not implemented (GM-30) |
| Continue saved receipt | Verify room identity/version/membership; do not assume receipt means live room | prior Home/continue tests retained in full suite, Pass JS; durable real seam GM-25/31 missing |
| Tutorial | Correct NO/OK/WANT gates, undo/sample isolation, Back/skip/replay preserves room/name | tutorialScreen/tutorialRoute, Pass JS; physical swipe Not run |
| Real restore/create/join | Retain received GM-07.1 paths and session guards; no replacement guest after restore error | liveRoomLifecycle/guestEntryRoute, Pass synthetic seam; no new HTTP acceptance |
|412/320/360dp/font200/TalkBack/keyboard/physical Back/Dark|Scrollable/wrapping/disabled-state code is present; actual native result not measured|Not run; no ADB at configured/standard host SDK location|

## Verification and remaining gates

- Full Jest on host, unchanged runner/timeouts: **36 suites/795 tests Pass**,
  114.496s. TypeScript, scoped source/tests/scripts ESLint (zero warnings/errors),
  architecture, offline locked Expo compatibility and Android export Pass.
  Hermes `entry-f5fadfbd9e28e8da6c9622a08bbbd971.hbc`,3.5MB; export is not device QA.
- Full `npm run lint` fails on four stale imports in ignored local
  `mobile/.work/gm10Audit.test.tsx`. Left untouched; not committed or hidden by
  config. Do not claim the local full npm check pipeline is green.
- Full Python3.14.7/UTF-8:657 tests,650 Pass/6 skipped/1 existing error,
  113.019s. `test_stage_refuses_symlink_output` cannot create its Windows symlink
  (WinError1314). No Windows privilege or assertion/testskip change.
- Repository/indexes/whitespace/source-manifest checks Pass. Git fetch main
  completed before the live merge gate at16:28:55Z; target90e871a and
  `READY_FOR_MERGE_REVIEW`. This is a dependency/artifact result, not approval
  or evidence of native/producer integration.

[Gap report](REMAINING_GAPS.md) identifies Figma Starter quota, missing updated
GM-10 setup and GM-07/25 public preview producer. The create host flow is not
completed by this independent shell. GM-25/31 own real active-room/step/cache
restoration, GM-30 native QR and GM-35 account actions. No new reverse dependency
or producer implementation was invented to hide missing inputs.

User authorized local commits only. No push to GitHub or write to Figma,
production activation, task Done/Approved or Trí review decision is performed.
Resolve remaining required AC/environment/producer checks before final task
acceptance; these local UI candidates alone do not close all GM-09 requirements.
