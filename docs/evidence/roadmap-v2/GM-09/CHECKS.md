# GM-09 — checks

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
