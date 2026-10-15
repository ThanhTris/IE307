# GM-09 — checks

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
