# GM-09 — checks

## Supplement 2026-11-05 — BrandLogo SVG trên Welcome, Guest Entry và Header UI mock

Bổ sung kiểm tra theo yêu cầu cập nhật:
- Tích hợp component `BrandLogo` SVG (`mobile/assets/brand/gi-cung-duoc-logo.svg`, Figma node `22:394`, SHA-256 `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`) vào màn chào `WelcomeScreen` (khối `logoTile`), màn nhập tên khách `GuestEntryScreen` (khối `logoSlot`) và header trang chủ qua `AppHeader`.
- Giữ nguyên phạm vi UI mock: tương tác guest flow, dialog tài khoản và điều hướng vào/ra không gọi API thật hay thay đổi session server.
- Kiểm tra điều hướng vào/ra:
  - `WelcomeScreen`: chuyển sang `/guest` (`step='name'`) khi bấm nút khách; mở dialog tài khoản khi bấm Đăng nhập / Đăng ký.
  - `GuestEntryScreen`: nút quay lại (`‹ Quay lại` hoặc hardware Back) đưa về màn welcome; validation tên 1–24 ký tự.
- Toàn bộ suite `guestEntryScreen.test.tsx` (11 tests), `homeScreen.test.tsx` (26 tests), `guestEntryRoute.test.tsx`, `routes.test.tsx` đều đạt Pass.

| Kiểm tra | Lệnh / Đầu vào | Kỳ vọng | Thực tế | Kết quả |
|---|---|---|---|---|
| UI Mock Guest Entry | `jest guestEntryScreen.test.tsx` | Validation tên, Back handler, mock lock | 11/11 passed | Pass |
| Home & Welcome Screens | `jest homeScreen.test.tsx` | Render BrandLogo trong AppHeader và các thẻ action | 26/26 passed | Pass |
| Integration Routes | `jest guestEntryRoute.test.tsx routes.test.tsx` | Điều hướng giữa welcome, guest, home | All passed | Pass |
| Android JS Export | `npm run bundle:android` | Xuất gói Hermes chứa SVG và tài sản UI mock | 1682 modules, 3.9 MB bundle | Pass |

## Latest correction — native room-code cells/tutorial motion, 2026-11-02

[Scope, repair and phone checklist](figma-update/INPUT_MOTION_REPAIR.md),
[source/input manifest](figma-update/INPUT_MOTION_MANIFEST.json),
[sanitized results](figma-update/INPUT_MOTION_CHECKS.json).

| Check | Actual | Result |
| --- | --- | --- |
| Targeted UI/hooks/routes |6 suites/39 tests: typing/paste/replace/delete/frozen code; drag/release/cancel/Reduce Motion/double tap; existing join/tutorial guards|Pass|
| Full mobile Jest, run alone |38 suites/807 tests,75.217s; runner/timeouts unchanged|Pass|
| TypeScript / source-tests-scripts lint / architecture |No package/native module or baseline config change|Pass|
| Expo installed compatibility |Locked SDK58; offline-check limitation|Pass with limitation|
| Android export |entry-91143e7847e4b41334bc875b16d69e43.hbc,3.6MB|Pass, packaging only|
| Full Python regression, host |657 tests:650 passed/6 skipped/1 error,154.086s|Existing WinError1314 symlink privilege; no assertion failure|
| Native Android recheck |User images prove pre-fix missing caret/IME overlay; no connected Android/ADB for new screenshots|Not run|

Test fixtures explicitly select Android keyboard behavior and both Reduce Motion
settings; no production behavior or assertion is disabled. Native cursor blink,
Samsung IME and physical animation smoothness cannot be inferred from mocked
events/Animated-value assertions. Legacy real/QA join, actual voting GM-12/26 and
all API/privacy/ACK semantics are unchanged.
Source commits: `3458755` native code cells; `f97a748` tutorial motion. No new
Python failure, native-device Pass, Trí approval or GitHub push is claimed.

## Latest correction — opaque PNG assets, 2026-11-02

User supplied actual Expo Go screenshots showing Welcome's cream rectangle and
Home's solid icon tiles. [Diagnosis/correction](figma-update/ASSET_ALPHA_REPAIR.md)
and [before/after hashes](figma-update/ASSET_ALPHA_MANIFEST.json) supersede asset
hashes in older source manifests; historical receipts remain intact.

| Check | Actual | Result |
| --- | --- | --- |
| Real PNG pixel regression |`node --test mobile/tests/brandAssetTransparency.test.mjs`:14 cases; original13 alpha assertions failed before correction|Pass after correction|
| Full mobile Jest, final run alone |36 suites/797 tests,57.308s; no timeout or assertions changed|Pass|
| TypeScript / source-tests-scripts lint |No package or ambient Node-type configuration change|Pass|
| Architecture / installed Expo compatibility |SDK58 lock retained; offline-check limitation|Pass with limitation|
| Full Python regression, host |657 tests:650 passed/6 skipped/1 error;139.488s|Existing WinError1314: Windows symlink privilege|
| Final Android export |entry-6363d30c7094b01f5080317d8087367f.hbc,3.6MB|Pass, packaging only|
| Asset compositor |[before/after proof](figma-update/asset-alpha-before-after.png): original filled tiles/rectangle versus transparent repaired glyphs/stroke|Pass inspection; not an app screenshot|
| Expo Go after correction |No connected Android/ADB; user screenshots describe pre-fix failures|Not run; user phone recheck required|

An initial broad Jest run overlapped tooling/export and hit one5s router timeout.
The final run alone passed all797 unchanged application tests. The14 PNG checks
use Node's existing built-ins separately, because RN Jest Image mocks cannot
expose incorrect alpha and the app deliberately does not load Node ambient types.
Full lint's ignored local QA imports and Windows symlink limitation remain as
documented below; no unrelated QA file or OS permissions are changed.
The final Python run has no new assertion failures; its only error is the same
OS symlink privilege issue. [Sanitized current results](figma-update/ASSET_ALPHA_CHECKS.json).

## Latest source — PNG repair, 2026-11-02

Source `d5a10cf`; [comparison and limits](figma-update/PNG_REFERENCE_REPAIR.md),
[source manifest](figma-update/PNG_REPAIR_SOURCE_MANIFEST.json),
[sanitized mobile results](figma-update/PNG_REPAIR_MOBILE_CHECKS.json).

| Check | Actual | Result |
| --- | --- | --- |
| Full mobile Jest, host run at76e7dbd |36 suites/797 tests;74.12s; unchanged runner/timeouts|Pass|
| Final Home touch-target layout atd5a10cf |26 Home tests,3.643s; 48dp native target retained|Pass interaction; native geometry Not run|
| TypeScript / scoped ESLint / architecture |Final source/tests/scripts, zero lint errors/warnings|Pass|
| Expo compatibility |Installed SDK58 dependencies match lock; offline-check limitation retained|Pass with limitation|
| Android Hermes export, final source |entry-8504d0203927af928119ab997b354298.hbc,3.6MB|Pass, export only|
| Reference/source/asset audit |30 input hashes;34 changed source/test/asset files;40 local PNG callsites nonempty|Pass inspection; not rendered-geometry acceptance|
| Full `npm run lint` |Four existing stale imports in ignored mobile/.work/gm10Audit.test.tsx|Fail; file/config left untouched|
| Full Python, stable final documentation inputs on host |657 tests:650 passed/6 skipped/1 error;75.974s|Fail: existing WinError1314 symlink privilege|
| Repository / task indexes / whitespace |Offline validators and diff checks|Pass|
| Android visual/Expo Go/320-360-412dp/font200/TalkBack/keyboard/physical gestures|No device/ADB or RN web renderer in environment|Not run|

Regression investigation: first sandbox run timed out a cold Home render;
host execution retained all test limits. A later host run exposed an existing
ambiguous `/anchorId/` query in GM-24's privacy test (35 suites/796 tests passed,
1 failed). Selector now waits for the serialized JSON key rather than matching
explanatory copy. Standalone21 tests and the final full797 tests pass; no GPS
privacy assertion or implementation was removed. Hermes sandbox export failed
writing its temporary output; the unchanged compiler exported successfully on host.
Python sandbox regression also hit temporary-file permission errors; verification
uses the host run, not those misleading sandbox failures.
An intermediate Python run began before the new reference manifest was present
and reported broken-link fixture failures. After input files were complete,
rerunning all657 tests removed those failures; only the existing symlink error
remains. No Python code, privileges or assertion was changed.

## Steps 3–7 local candidates — 2026-11-01

Current source is step 6 `a4dbdec`; prior local step commits: create entry
`fea0696`, join preview `fde3757`, tutorial `1b86133`. See
[final handoff/matrix](figma-update/FINAL_HANDOFF.md),
[reported requirements/design gaps](figma-update/REMAINING_GAPS.md) and
[source manifest](figma-update/FINAL_MANIFEST.json). Earlier manifests/counts
below identify historical tested revisions, not the current source.

| Check | Actual | Result |
| --- | --- | --- |
| Full mobile Jest on host | **36 suites/795 tests**, 114.496s, unchanged runner/5s limits | Pass |
| Typecheck / source lint / architecture | `npm run typecheck`; `npx eslint src tests scripts` (zero warnings/errors); architecture guard | Pass |
| Full mobile lint | Four stale imports in ignored local `.work/gm10Audit.test.tsx`, not committed or altered | Fail (local QA file); do not claim full npm check green |
| Expo locked compatibility | SDK58 installed versions match lockfile; tool warns offline validation limitation | Pass with limitation |
| Android export | Hermes `entry-f5fadfbd9e28e8da6c9622a08bbbd971.hbc`, 3.5MB | Pass, export only |
| Full Python | CPython3.14.7, UTF-8/test deps command-scoped; **657 tests:650 passed/6 skipped/1 error**,113.019s | Fail: existing WinError1314 fixture symlink privilege |
| Repository/indexes/diff/manifests | Offline validators, whitespace, source hash and stage review | Pass |
| Merge gate | Fetched main90e871a, live Project16:28:55Z: READY_FOR_MERGE_REVIEW | Dependency/artifact check only; no approval |
| Native Android/visual/physical swipe/320-360-412dp/font200/TalkBack/Dark/keyboard/Back | No ADB in PATH or configured/standard host SDK location | Not run |

Step-specific tests and earlier sandbox cold-render timeouts are recorded in
STEP3–STEP6; the host full run is the final source regression. No assertions,
timeouts or runner settings were weakened. Python error remains
`test_catalogue_projection.ProjectionAdoptionTests.test_stage_refuses_symlink_output`.
No Windows security setting/test skip was added to hide it. Logs are local
ignored `.work/gm09-remaining-python.log` and mobile `.work/gm09-step6-*`.

The user explicitly authorized a local commit after each step and no push.
No Project/Issue/approval, database, API version or Figma change was made.
Dish-only GM-10 setup/public live join-preview integrations and native acceptance
remain open; independent UI candidates are not full GM-09 Done.

## GM-09.2 step 2 — 2026-11-01

Base `8172241` + working tree on `codex/gm-09-figma-update`, pinned by
[26-file source/test/asset manifest](figma-update/step2/MANIFEST.json).
[Reproduction/scope/limits](figma-update/step2/STEP2.md),
[manual commit guide](figma-update/step2/COMMIT_STEP2.md).

| Check | Actual | Result |
| --- | --- | --- |
| Live start gate | Project #2 at 2026-11-01T15:10:54Z, READY_TO_CLAIM; owner Tuấn/reviewer Trí | Pass at checked time; no Project writes |
| TypeScript / source lint / architecture | `npm run typecheck`, `npx eslint src tests scripts`, `npm run check:architecture`; final source lint has no warnings/errors | Pass |
| Mobile regression | `npm test -- --json --outputFile=.work/gm09-step2-full-jest.json`; **30 suites / 763 tests**, 247.529s | Pass |
| Expo installed compatibility | `npm run check:expo`, locked SDK58; tool warns validation is offline | Pass with offline limitation |
| Android export | Final `npm run bundle:android`; Hermes `entry-1ded42fe7c3f28acf37d285698a10a6a.hbc`, 3.5MB | Pass, export only |
| Full Python regression | CPython3.14.7, UTF-8 and test deps command-scoped; **657 tests: 650 passed, 6 skipped, 1 error**, 234.844s | Fail: existing Windows symlink privilege limitation |
| Repository/indexes/diff | Repository validator, `task_readiness.py --check-docs`, whitespace and source-manifest checks | Pass |
| Native visual/interaction/a11y | Android/Expo Go, 412dp comparison, 320/360dp, font200, TalkBack, keyboard/Back/Dark and effective native asset geometry | Not run |

Final full Jest supersedes the initial step 2 run's route-fixture failures and
the intermittent GM-25 stored-session default5000ms timeout. Tests now wait for
verified continuation, use the development QA route, and assert the new revoked
guest presentation; no runner configuration or timeout was loosened. An earlier
five-suite focused run passed75 tests; the final full run also includes the new
development-fixture route case and shared-read consumers.

Python error:
`test_catalogue_projection.ProjectionAdoptionTests.test_stage_refuses_symlink_output`
raises `WinError 1314` while creating its fixture symlink. The same limitation
was recorded before step 2. No test/security setting was changed to bypass it;
no repository-wide green claim. Local ignored logs:
`mobile/.work/gm09-step2-full-jest.log`, `mobile/.work/gm09-step2-eslint-final.log`,
`mobile/.work/gm09-step2-export-final.log`, `.work/gm09-step2-python.log`.

No stage/commit/push, Done/approval, real API acceptance, persistent recovery or
database activation is claimed. Remaining visual/integration limits are in
FIGMA_PARITY and STEP2.md.

## Main refactor received — 2026-11-01

Working-tree resolution of the user's merge: GM-09 `07fd340` with main
`90e871a`, including mobile refactor `67f332d`. See [resolution and manual merge
completion](figma-update/MAIN_MERGE_2026-11-01.md). Earlier source manifests and
test counts below describe their original revisions.

- TypeScript, ESLint on the five changed source/test files, architecture guard,
  repository validator and task indexes: Pass.
- Six relevant Jest suites: **121/121 tests Pass** (137.43s). Covers guest screen,
  real-mode route seam, main route map, room entry/setup and live room lifecycle.
  Command from `mobile`: `npm test -- --runTestsByPath tests/component/guestEntryScreen.test.tsx tests/integration/guestEntryRoute.test.tsx tests/integration/routes.test.tsx tests/component/roomEntryScreens.test.tsx tests/component/roomSetupScreens.test.tsx tests/component/liveRoomLifecycle.test.tsx`.
  Local ignored report: `mobile/.work/gm09-main-merge-jest.json`.
- Full Python regression on CPython 3.14.7 with command-scoped `PYTHONUTF8=1`
  and the existing ignored test dependency directory: **657 tests, 650 passed,
  6 skipped, 1 error** (81.099s). The error is
  `test_catalogue_projection.ProjectionAdoptionTests.test_stage_refuses_symlink_output`:
  Windows `WinError 1314` cannot create the fixture symlink. No application test
  or OS privilege setting was changed to bypass it. Local ignored log:
  `.work/gm09-main-merge-python-unsandboxed.log`. The earlier sandbox attempt
  encountered temporary-file errors and was interrupted; it is not a pass.
  Repository-wide regression is therefore not fully green.
- No conflict markers remain in mobile source/tests; `git diff --check`: Pass.
  Git's index remains unmerged until the user stages the resolutions.
- Device/rendered Android checks: Not run. No new Figma parity acceptance,
  database activation, approval, stage/commit/push or Project status change.

## GM-09.2 step 1 — 2026-10-31

Current welcome/guest-entry candidate on `codex/gm-09-figma-update`, base `621accc` + working tree: [checks and reproduction](figma-update/STEP1.md), [Figma parity/Not run device checks](FIGMA_PARITY.md). The supplement retains one pre-existing GM-25 test timeout and does not claim complete mobile/visual acceptance. Prior test counts and device confirmations below do not apply automatically to the new revision.

## Supplement 2026-10-27 — Home aligned to approved Figma frame

After the owner reported that Home still looked old, the current working tree updates it to the approved [Home frame 330:3067](figma/330-3067-home.png): G mark/title and inbox action, headline/subtitle, friends-dining banner, square create/join actions, quick-friends card and four-item bottom navigation. It uses GM-05 shared `AppHeader`, `AppButton`, `AvatarRow`, `BrandBanner`, and `AppBottomNavigation`; brand artwork/icons are bundled from Figma with hashes in `mobile/assets/brand/SOURCE.md`. Create/join/session/repository callbacks and explicit mock label remain. Empty friend results are represented honestly; no sample identities are added.

| Check | Expected | Actual | Result |
|---|---|---|---|
| Component + route regressions | Shared components render; Home navigation/create/join remains available | Targeted Jest: 3 suites / 46 tests passed; strict typecheck passed | Pass (automated) |
| Lint / architecture | No new lint errors or dependency-boundary violations | Lint exit 0, four existing warnings in upstream API files; architecture guard passed | Pass with warnings |
| Android export | Updated screen and all Figma assets bundle | Expo Android export passed, 1,407 modules, 40 assets, Hermes 3.4 MB | Pass (export only) |
| Updated Home on Android emulator | See composition, spacing, artwork and navigation on rendered app | AVD `Medium_Phone_API_37.0` booted and ADB reported `emulator-5554` online; Expo Go 58.0.5 is installed, but Android could not resolve its launcher/`exp://` activity (`No activities found` / `Activity class ... does not exist`). App did not render and no screenshot was obtained | Not run |

This section supersedes descriptions below that say the Home layout/artwork remain old, for the current working tree only. Earlier screenshots and hashes refer to older source and remain historical. It does not claim pixel-perfect parity or GM-09 acceptance.

## Bàn giao review theo xác nhận người dùng — 2026-10-15

Người dùng xác nhận “tôi đã kiểm tra GM-09 thành công và hoạt động” sau bản sửa cuối. Ghi **Pass kiểm thủ công tổng thể theo người dùng**, chưa phải approval của Trí. Theo chỉ dẫn hiện tại, lần bàn giao GM-09 dùng biên bản văn bản, không yêu cầu ảnh/video. [Biên bản và giới hạn xác nhận](MANUAL_DEVICE_CHECK.md) ghi thông số chưa cung cấp và các ca thiết bị chưa xác nhận riêng; không tự suy light/dark/font200/TalkBack/keyboard/Back hoặc từng fixture đạt từ xác nhận chung.

Revision bàn giao: HEAD `67356949615c39134ba24b71301c45fed917089e` + working tree chưa commit, [manifest source/test cuối](REVIEW_PACKAGE_MANIFEST.json). Code/test không đổi trong lượt cập nhật tài liệu này; kết quả source mới nhất là 14 suites / **462 mobile tests**, Android Hermes export Pass, **550 Python tests không skipped**. Các log 460 tests/6 skipped/Fail ở dưới là lịch sử của revision trước.

Owner Tuấn, reviewer Trí; chỉ Trí được review cuối, merge và chuyển GM-09 sang Done. Không đổi metadata task/Project/approval; [nội dung PR chuẩn bị](PR_BODY.md) và [hướng dẫn commit/push](COMMIT_AND_PUSH.md) để người dùng chạy sau kiểm diff.

| Kiểm lượt chuẩn bị review | Actual / evidence | Kết quả |
| --- | --- | --- |
| Repository/indexes/diff | Validator, `task_readiness.py --check-docs`, `git diff --check` exit0; [output](REVIEW_PREPARATION_REPOSITORY_CHECK.txt). Task chỉ cập nhật body báo cáo, không đổi metadata nên indexes không cần sinh lại | Pass |
| Manifest source/test | 11 file, không có hash lệch; [manifest](REVIEW_PACKAGE_MANIFEST.json), cùng output kiểm repository. Lượt này không đổi source/test nên không lặp mobile check/export | Pass |
| Python regression sau cập nhật tài liệu | CPython3.12.14 / Windows, PYTHONUTF8=1, quyền fixture Temp; **550 tests / 98.964s, OK, không skipped**; [output](REVIEW_PREPARATION_PYTHON_REGRESSION.txt). Cell ERROR trong log là fixture kiểm failure path | Pass |
| GitHub chỉ đọc | Start gate live `2026-10-15T12:56:34.670228+00:00`: READY_TO_CLAIM; remote main `ce7b87a`, chưa có nhánh cùng tên hoặc PR mở khi kiểm. Chưa stage/commit/push/tạo PR/merge hoặc đổi Project | Đã đọc; không thay review/gate merge của Trí |

## Bản sửa tiếp sau lỗi box-only — 2026-10-15

Người dùng báo cả hai CTA không bấm được sau patch trước. Ghi nhận **Fail trên thiết bị cho bản box-only**, không dùng 460 tests Pass của bản đó để kết luận native đạt. Revision mới: `6735694` + working tree; owner Tuấn, reviewer Trí, GM-09.1/GM-05.1 giữ nguyên. Gate live `2026-10-15T12:37:55.766142+00:00`: `READY_TO_CLAIM`.

Bản hiện tại bỏ pointerEvents override, giữ Pressable mặc định. Nhãn stretch theo chiều ngang, minHeight46dp và nhận padding ngang/dọc; cùng border1dp của khung tạo touch target tối thiểu48dp, chữ vẫn căn giữa. Handler duy nhất ở Pressable; không gắn onPress vào Text, không thêm nút lồng/hitSlop hoặc bỏ disabled/loading.

| Kiểm | Actual / evidence | Kết quả |
| --- | --- | --- |
| Mobile check | Exit0; typecheck/eslint/architecture đạt, 4 lint warnings upstream hiện có; 14 suites / **462 tests**, Jest50.174s; [output](BUTTON_LABEL_AREA_MOBILE_CHECK.txt). Hai case primary/secondary: bấm nhãn/khung gọi một lần mỗi thao tác, disabled/loading chặn cả hai, re-enable hoạt động | Pass tự động |
| Android export | Exit0;1284 modules; Hermes `entry-616b817e965f225bf5519bc600b0dac4.hbc`; [output](BUTTON_LABEL_AREA_ANDROID_BUNDLE.txt) | Pass export, chưa là native smoke |
| Python regression | CPython3.12.14 / Windows, PYTHONUTF8=1, quyền fixture Temp; **550 tests / 102.402s, OK, không skipped**; [output](BUTTON_LABEL_AREA_PYTHON_REGRESSION.txt). Cell ERROR là fixture kiểm failure path | Pass |
| Repository/indexes/diff | Validator, `task_readiness.py --check-docs`, `git diff --check` exit0; [output](BUTTON_LABEL_AREA_REPOSITORY_CHECK.txt) | Pass |
| Expo Go trên bản sửa mới | Sau bản sửa cuối, người dùng xác nhận GM-09 đã kiểm thành công và hoạt động; [biên bản](MANUAL_DEVICE_CHECK.md) phân biệt xác nhận chung với từng ca chưa báo riêng | **Pass tổng thể theo xác nhận người dùng; từng điểm chạm/guard trên thiết bị chưa được báo riêng** |

Các kiểm nhãn/khung trong Jest kiểm callback/guard, không mô phỏng hình học hit testing Android. Xác nhận thủ công mới nhất ở đầu file; evidence cũ bên dưới chỉ là lịch sử. Không commit/push/Done/Approved trong lượt cập nhật tài liệu.

## Lịch sử patch box-only không đạt trên thiết bị — 2026-10-15

Theo báo lỗi Expo Go của người dùng: CTA tạo phòng/nhập mã chỉ phản hồi khi chạm chữ. Revision `6735694` + working tree hiện tại; owner Tuấn, reviewer Trí, contract GM-09.1. [Plan bổ sung](PLAN.md) ghi scope sửa AppButton dùng chung của GM-05 theo yêu cầu này. Pressable đặt `pointerEvents="box-only"` để cả khung nút nhận chạm trực tiếp; nhãn không là đích chạm riêng. Props/contract GM-05.1, layout/tokens và disabled/loading giữ nguyên. SHA256 `mobile/src/shared/ui/components.tsx`: `9c14509a8cedcc7590d7e9dcc0544f19edbf5e197bdc3c35df99b7484f9c4cc5`.

| Kiểm | Actual / evidence | Kết quả |
| --- | --- | --- |
| Gate trước code | Live Project `2026-10-15T12:17:52.191954+00:00`, `READY_TO_CLAIM`; GM-05/07 đủ đầu vào | Pass dependency/artifact gate, không là approval |
| `npm run check` | Typecheck/eslint/architecture exit0; 14 suites / 460 tests; 4 lint warnings upstream hiện có; [output](BUTTON_HIT_AREA_MOBILE_CHECK.txt) | Pass tự động, không kiểm hình học native |
| `npm run bundle:android` | 1284 modules, Hermes `entry-4d3fb41e52c573e96c6bcd94e6aaf7fd.hbc`; [output](BUTTON_HIT_AREA_ANDROID_BUNDLE.txt). Sandbox chặn Hermes `spawn EPERM` ở lần đầu; lần cuối chạy với quyền phù hợp exit0 | Pass export, không là mở app |
| Python regression | CPython3.12.14 / Windows, `PYTHONUTF8=1`, quyền tạo fixture Temp; **550 tests / 99.591s, OK, không skipped**; [output](BUTTON_HIT_AREA_PYTHON_REGRESSION.txt). Cell ERROR trong log là fixture kiểm failure path | Pass |
| Repository/indexes/diff | Validator, `task_readiness.py --check-docs`, `git diff --check` đều exit0; [output](BUTTON_HIT_AREA_REPOSITORY_CHECK.txt) | Pass |
| Expo Go: trái/giữa/phải trong nền hai CTA | Người dùng báo sau bản box-only cả nút tạo phòng và Tôi có mã phòng đều không bấm được; chưa có model/OS/ảnh kèm phản hồi | **Fail theo kiểm thực tế của người dùng — đã thay thế bản sửa này** |

Không lấy Jest/bundle làm xác nhận đã hết lỗi trên thiết bị. Evidence hoàn thiện bên dưới là lượt trước thay đổi AppButton; manifest của 9 file cũ được giữ nguyên, chưa bao gồm file shared UI mới này. Không commit/push, đổi Project hoặc ghi Done/Approved.

## Hoàn thiện theo UI đã Done — 2026-10-15

Revision hiện hành: HEAD `6735694` + working tree, contract GM-09.1; [hashes của 9 file code/test](COMPLETION_PATCH_MANIFEST.json), [đối chiếu yêu cầu/patch/test plan và kết quả](COMPLETION_REVIEW_2026-10-15.md). Owner Tuấn, reviewer Trí. Nhận component/tokens GM-05, contract/mock GM-07 và đối chiếu UI GM-02/05/12 **Done trên Project**. Không áp GM-39 In Progress như mẫu app được duyệt.

| AC / kiểm | Input và expected | Actual / evidence | Kết quả |
| --- | --- | --- | --- |
| Home/CTA/avatar/create/join/back/validation | Home → tạo/vào → receipt → Home/resume; dữ liệu/thời gian sai không gửi | Component và route tests đạt; summary GM-05 hiện đúng anchor/bữa/giờ/radius trước xác nhận | Pass tự động; [mobile output](COMPLETION_MOBILE_CHECK.txt) |
| Mã theo contract, nhãn mô phỏng, không tự join | Trim/uppercase/6 ký tự; QR/incoming code cần xác nhận | Code từ adapter; incoming code mới hủy xác nhận cũ; pending/unknown/ACK không bị code mới thay intent | Pass tự động; cùng output |
| Fixture loading/empty/network/full/locked/expired, camera interface | Có controls dưới Công cụ kiểm thử, manual fallback, retry không gửi trùng | Các case cũ tiếp tục đạt; bổ sung ACK lock, inject/reuse requestId, friends error riêng và bỏ phản hồi phiên cũ | Pass tự động; cùng output |
| Mở/kiểm Expo Go Android thật | Home/Create/Join; dark/light, font200, TalkBack, keyboard/hardware Back và screenshots | Máy không có ADB; chưa có xác nhận thiết bị mới trong cuộc hội thoại | **Not run — chặn nghiệm thu AC này / Done** |
| Đầu vào/đầu ra cho task sau | GM-25 dùng lại layout/props/repository; GM-30 incoming/camera interface; GM-39 đọc artifacts | Props export, Home navigation và RequestIdFactory inject được; [HANDOFF](HANDOFF.md) có cách mở/scenario/known limits | Pass tài liệu/interface; không thay API/native integration |
| `npm run check` | Strict typecheck, eslint, Jest, architecture guard | Exit0; 14 suites / 460 tests, Jest22.015s; 4 warning upstream hiện có | Pass; [output](COMPLETION_MOBILE_CHECK.txt) |
| `npm run check:expo` | Dependency compatibility | Exit0; Dependencies are up to date; không đổi package/lockfile | Pass |
| `npm run bundle:android` | Metro/Hermes xuất bundle | Exit0; 1284 modules; bundle `entry-b3aa0a4b4d484df8018568ddc1bbdf65.hbc` | Pass export; [output](COMPLETION_ANDROID_BUNDLE.txt), chưa là mở app |
| Python regression | Full suite có timezone data/quyền fixture tạm | 550 tests / 53.212s, OK (skipped=6), exit0 | Pass với 6 skipped; [output](COMPLETION_PYTHON_REGRESSION.txt) |
| Validator/check-docs/diff/protected scope | Docs links/JSON/indexes hợp lệ; không đổi upstream | Tất cả exit0, 9 hashes khớp, 0 unmerged path; gate `READY_FOR_MERGE_REVIEW` trên main vừa fetch | Pass; [log cuối](COMPLETION_REPOSITORY_CHECK.txt) |

Không thêm dependency/provider/native module hoặc triển khai task sau. Không commit/push hoặc sửa `GM-09-report.md`. Các mục bên dưới là lịch sử của revision trước.

## Cập nhật main — 2026-10-15

Kết hợp HEAD `606f040` với `origin/main` `ce7b87a` trong phiên merge đang chờ commit. Chi tiết revision, scope, môi trường và kết quả tại [MERGE_MAIN_2026-10-15.md](MERGE_MAIN_2026-10-15.md). Mobile check đạt 14 suites / 448 tests; Python regression đạt 550 tests (6 skipped). Đây là kiểm tra tích hợp code, chưa nghiệm thu Expo Go hoặc Approved/Done.

## Revision làm lại UI — 2026-10-13

Kết quả hiện hành áp dụng HEAD `9e9f5ba` + working tree chưa commit, hashes mới tại [PATCH_MANIFEST.json](PATCH_MANIFEST.json). Phạm vi và mẫu đối chiếu tại [UI_REWORK.md](UI_REWORK.md). Owner Tuấn, reviewer Trí; chưa nghiệm thu Expo Go, chưa Done.

Trước patch: đã đọc Project #2 live, GM-02 #63/GM-05 #66/GM-07 #68 Done; GM-09 #70 có `assignment:accepted`, assignee `mtuan2491`. Readiness lúc `2026-10-13T07:38:01.320761+00:00`: `READY_TO_CLAIM`. PR #109/#104/#105 đã merge và merge commit là ancestor HEAD. Chỉ đọc GitHub, không đổi Project/issue/approval.

Windows PowerShell, Node 24.20.0/npm 11.19.0; đã chạy `npm ci --no-audit --no-fund` theo lockfile hiện có. Runtime kiểm cuối: Expo 57.0.27, Router 57.0.25, React Native 0.86.3. Không sửa package/lockfile. Python 3.12.14 dùng đường dẫn ghi bên dưới, `PYTHONUTF8=1`.

| Kiểm / input → expected | Actual | Status / output hiện hành |
| --- | --- | --- |
| Home CTA/avatar/loading/empty/network/resume; mở/đóng Công cụ kiểm thử → fixture không chiếm màn mặc định, CTA vẫn tương tác | Assertions hiện có và disclosure mới đạt | Pass tự động; [UI_REWORK_MOBILE_CHECK.txt](UI_REWORK_MOBILE_CHECK.txt) |
| Create field/confirm/retry; Join normalize/confirm/QR deny; fixture full/reset và navigation/back → giữ DTO/callback, không tự join | 10 suites / 343 tests Pass, 12.705s | Pass tự động; cùng output |
| `npm run check` → TypeScript strict/lint/Jest/import guard đạt | Exit 0; 4 warnings cũ ở GM-07, không có lint error | Pass; cùng output |
| `npm run bundle:android` → Android Hermes export chạy được | Exit 0; bundle `entry-4da4ea3dac939fadfc08bd30dc03a17f.hbc`, dist/android | Pass export; [UI_REWORK_ANDROID_BUNDLE.txt](UI_REWORK_ANDROID_BUNDLE.txt), không thay bằng chứng mở Expo Go |
| `npm ci --no-audit --no-fund` → cài đúng lockfile đã chốt | Exit 0; xác minh Expo/Router khớp package, package/lockfile bất biến | Pass; [UI_REWORK_NPM_CI.txt](UI_REWORK_NPM_CI.txt) |
| `validate_repository.py`, `task_readiness.py --check-docs`, `git diff --check`, integrity/scope → docs/links/hashes hợp lệ và không sửa upstream | Exit 0; manifest khớp 16 file; protected paths và source logic giữ nguyên | Pass; [UI_REWORK_DOCS_AND_DIFF.txt](UI_REWORK_DOCS_AND_DIFF.txt) |
| Python `-B -m unittest discover -s tests -p 'test_*.py'` → full suite đạt | 544 tests / 84.786s; 1 failure encoding probe, 5 errors taxonomy locking yêu cầu Linux/macOS/WSL | **Fail**; [UI_REWORK_PYTHON_REGRESSION.txt](UI_REWORK_PYTHON_REGRESSION.txt) |
| Expo Go Android: Home/Create/Join, 320–599dp, light/dark, font200, TalkBack, keyboard, hardware Back và screenshot → đúng mẫu trên thiết bị | Chưa có device/adb hoặc kết quả kiểm mới của người dùng | **Not run**; Trí/Tuấn kiểm trước nghiệm thu |
| API/native room/GPS/camera thật | Ngoài stage màn mock GM-09 | N/A |

Sandbox ban đầu chặn Hermes spawn và Temp của regression. Đã chạy lại với quyền phù hợp; bảng trên dùng kết quả cuối, không dùng lỗi sandbox làm lỗi feature. Sáu ca Python còn lỗi trùng tên/loại với báo cáo trước; chưa chạy baseline sạch trong lượt này, không tuyên bố full regression Pass.

`.agents/` tự tạo đã bị xóa theo yêu cầu; không tạo rules/skills khác. Shared UI/tokens, API/mock, package/lockfile, backend và prototype/spec ngoài scope giữ nguyên. Công cụ fixture được mở qua **Công cụ kiểm thử** ở cuối màn; đổi scenario remount màn nên cần mở lại disclosure để đổi tiếp.

## Lịch sử kiểm trước khi làm lại UI

Các bảng và output phía dưới là lượt trước, không dùng để thay kết quả revision UI hiện hành bên trên. Các hashes `.agents/` và kiểm skill cũ không còn áp dụng; manifest hiện hành đã loại chúng.

Status: code đã kiểm tự động, **chưa nghiệm thu Expo Go / chưa Done**. Owner Tuấn, reviewer Trí; [issue #70](https://github.com/ThanhTris/IE307/issues/70). Ngày kiểm 2026-10-12 → 2026-10-13 UTC+7.

Branch `codex/gm-09-home-create-and-join-room`; tested HEAD `9e9f5ba` + working tree chưa commit, [manifest](PATCH_MANIFEST.json). Contract GM-09.1; upstream GM-05.1/GM-07.1 trên base. Schema/dataset thật: N/A cho màn mock. Windows PowerShell; Node 24.20.0, npm 11.19.0; Expo 57.0.27 / React Native 0.86.3. Python chính cho regression: `C:/Users/saveb/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe` 3.12.14, có tzdata, `PYTHONUTF8=1`.

## Tái lập

Từ root: `cd mobile`, `npm ci --no-audit --no-fund`, `npm run check`, `npm run bundle:android`; mở Expo bằng `npm start`. [HANDOFF](HANDOFF.md) ghi route/scenario/thao tác từng màn. `npm ci` dùng package/lock đã chốt, không thay version. Bundle ở ignored `mobile/dist/android` không phải APK hay bằng chứng thiết bị.

## AC và assertion thực tế

| AC / case | Input → expected / actual | Kết quả / evidence |
| --- | --- | --- |
| Home/CTA/avatar | restoreSession + listFriends → guest greeting, avatar preview, create/join; empty khác lost-session/network; active receipt có resume và chặn phòng mới | Pass unit/interaction; `roomEntryScreens.test.tsx` |
| Create validation | tên rỗng/24 ký tự, anchor, confirm, date overflow/past, budget nullable → lỗi hoặc DTO đúng; không raw GPS/room title | Pass unit/interaction; cùng suite + `roomEntry.test.ts` |
| Context/time | 1/2/5 km → metres; local UTC+7, buổi boundary, late-night giữ dinner; ăn ngay +15 phút một lần, custom không cộng; đổi context bỏ confirm | Pass unit/interaction; host kiểm giờ thật trên device còn Not run |
| Join/code | lowercase/whitespace → uppercase; reject numeric demo/charset sai; confirm trước write; response code/roomId/version giữ từ adapter | Pass unit/interaction + route deep-link |
| Loading/retry | pending → khóa form/back, duplicate không thêm request; timeout/network retry giữ requestId/payload; unmount bỏ late response | Pass interaction; không nghiệm thu outbox/persistence thật |
| Errors/fixtures | empty/network/full/locked/expired/invalid/stale, outside/quota/lost-session → copy theo ErrorCode, không success giả | Pass tests; route test đổi fixture Full và reset |
| Camera/manual | injected denied/scanned → fallback hoặc prefill, không auto-join, không xin permission thật | Pass interaction; GM-30 nối native |
| Routes/back | Home→create/join→back; join-confirm→receipt→Home→resume; deep link chưa có RAM và active guard; shell→foundation→components/not-found | Pass 9 route tests; hardware Back trên Android Not run |
| Handoff | paths, callback DTO, upstream version/commit, commands, fixture và limitations | Pass tài liệu + validator; người nhận vẫn kiểm đúng revision |
| Expo Go bắt buộc | Android SDK57, mở cả 3 màn, thao tác states/back/keyboard, dark/font200/TalkBack; ảnh/video/model/build | **Not run**; không có device/adb, chờ Tuấn/Trí kiểm. Không lấy Jest/bundle thay AC này. |

## Commands và output

| Command | Actual | Kết quả |
| --- | --- | --- |
| `npm run check` (mobile) | typecheck/lint/architecture exit 0; 10 suites / 343 tests; 4 warnings cũ `contracts.ts`/`index.ts` | Pass; [MOBILE_CHECK.txt](MOBILE_CHECK.txt) |
| `npm run bundle:android` | 1267 modules, Hermes bundle + metadata trong dist/android | Pass; [ANDROID_BUNDLE.txt](ANDROID_BUNDLE.txt) |
| `EXPO_OFFLINE=1 npm start -- --port 8082` + GET local manifest | Metro khởi động; HTTP 200, SDK `57.0.0`, `exposdk:57.0.0`, Android Hermes launchAsset URL. Dừng đúng tiến trình smoke sau kiểm. | Pass startup/manifest; [METRO_SMOKE.txt](METRO_SMOKE.txt), [METRO_MANIFEST.json](METRO_MANIFEST.json); chưa mở device |
| `$env:EXPO_OFFLINE='1'; npm run check:expo` | dependencies up to date; CLI cảnh báo offline validation unreliable | Pass giới hạn offline; [EXPO_COMPATIBILITY.txt](EXPO_COMPATIBILITY.txt), chưa kiểm remote metadata |
| `python -B scripts/validate_repository.py` / `task_readiness.py --check-docs` / `git diff --check` | validator/indexes/diff exit 0; 5 skill frontmatters/name/relative links hợp lệ; 16 mobile files + 7 agent rules có hashes | Pass; [DOCS_AND_DIFF.txt](DOCS_AND_DIFF.txt) |
| Python 3.12.14 `-B -m unittest discover -s tests -p 'test_*.py'` | 544 tests / 79.044s; 1 failure `test_fixture_under_windows_cp1252_default`, 5 errors `test_vilao_catalogue` yêu cầu Linux/macOS/WSL locking | **Fail**; [PYTHON_REGRESSION_312.txt](PYTHON_REGRESSION_312.txt) |
| Python 3.14.7 cùng regression | 536 tests; 166 failures / 37 errors / 6 skipped, chủ yếu thiếu tzdata cùng lỗi Windows; không dùng làm kết quả Pass | Diagnostic Fail; [PYTHON_REGRESSION.txt](PYTHON_REGRESSION.txt) |

6 ca còn lỗi trên Python 3.12 trùng tên/loại lỗi đã ghi trong [CHECKS GM-07](../GM-07/CHECKS.md). Chưa chạy baseline sạch trên đúng HEAD để khẳng định mọi kết quả regression giống main. Không sửa Python/data/source tests trong patch này, không tuyên bố full regression Pass.

Sandbox ban đầu chặn Temp, npm cache thiếu gói và spawn Hermes EPERM; đã chạy lại npm ci/bundle/regression bằng quyền phù hợp. Không nới package/version hoặc sửa runner để vượt checks. Tests chỉ dùng synthetic data; không log token/GPS/phiếu thật.

Start gate live trên base: `READY_TO_CLAIM` lúc `2026-10-12T16:42:58Z`, upstream Done/output đã nhận; acceptance kiểm riêng nhãn issue. Chưa thực hiện merge, review người dùng hay ghi Approved/Done. [PLAN](PLAN.md) và [HANDOFF](HANDOFF.md) là đầu ra để Trí review working tree.
