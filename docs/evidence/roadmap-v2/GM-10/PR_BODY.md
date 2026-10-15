## Task và phạm vi

GM-10 roadmap-v2 — UI chọn khu vực, giờ ăn và sở thích theo mẫu. Related issue: #71. Task: `tasks/backlog/GM-10.md`. Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`). Assignment accepted theo issue/gate đã ghi trong CHECKS; metadata lịch sử không tự đổi thành Approved/Done.

Host chọn điểm ăn công cộng, bán kính, buổi/ngày/giờ và ngân sách; xác nhận rồi xem món mẫu trước lưu. Thành viên xem context và lưu khẩu vị/consent của mình. Có trạng thái lỗi/rỗng/tải, khóa thao tác khi chưa rõ kết quả ghi và retry cùng intent. Sau lưu khẩu vị có biên nhận và chỉnh lại; Back/Home giữ đúng luồng.

Bản sửa cuối tách ngày và giờ, thêm bộ chọn ngày inline, đưa ngân sách vào card riêng và đổi xác nhận thành checkbox xanh bấm được toàn hàng. Dùng tokens/components GM-05 và client/mock GM-07; không thêm package hoặc đổi contract/shared theme.

Branch `codex/gm-10-context-and-preferences` → `main`; không stacked. Baseline `food-v1`, contract `food-v1/roadmap-v2/GM-10.1`. Nguồn: UI_SPEC, CONTEXT_HISTORY_SPEC, CATALOG_PREFERENCES_SPEC, FOOD_DATA_SPEC; workflow ADR-011/013. Đây là màn mock; API/GPS/history thật, lobby và persistent intent thuộc task tích hợp.

## Start gate — trước viết phần độc lập

- [x] Đã chạy start gate live; GM-05/#66 và GM-07/#68 Done trên Project, có output/HANDOFF đúng version. Lần trước chỉnh UI cuối: `2026-10-15T16:04:45.696281+00:00`, READY_TO_CLAIM.
- Plan/ownership/test plan tại `docs/evidence/roadmap-v2/GM-10/PLAN.md`; không thêm dependency/package cần duyệt mới. Reviewer cuối giữ ThanhTris, không tự ghi reviewer đã approve.
- GM-05.1: tokens/shared UI; GM-07.1: DTO/client/mock. Reuse artifacts, không dựng lại nền. GM-14/18/19 song song, không là start dependency.

## Merge gate — Trí đối chiếu lại trước merge

| Dependency | Upstream PR / merge commit | Project / artifact |
| --- | --- | --- |
| GM-05/#66 | PR #109, `9e9f5ba` | Done theo start gate; tokens/components GM-05.1 có trên base đã kiểm |
| GM-07/#68 | PR #104, `0711782`; supplement PR #105, `9f71bba` | Done theo start gate; contracts/client/mock GM-07.1 có trên base đã kiểm |

- [ ] Cập nhật ref target và xác nhận upstream thực tế trên target hiện hành.
- [ ] Chạy lại `python scripts/task_readiness.py --task GM-10 --gate merge --base-ref origin/main` sau fetch.
- [ ] Cập nhật nhánh nếu cần; kiểm diff/conflict và chạy lại checks phù hợp sau tích hợp.
- Target đã kiểm trước đây: `30ecb5675104f13c64580018cad118647fb3d601`. Merge gate lịch sử trong CHECKS không thay gate mới cho PR cuối; không khẳng định main hiện tại chưa thay đổi.
- Không đổi schema/privacy/migration. Rollback bằng revert patch UI GM-10 theo quy trình review; không tác động DB.

## AC và verification

| AC / output | Kết quả / evidence | Giới hạn |
| --- | --- | --- |
| Origin khác nơi bán; nhiệt độ khác cay; sở thích mềm không NO | Pass tự động: unit/component, CHECKS | Mock DTO, không ghi phiếu thật |
| Host xác nhận điểm/buổi/giờ; denied/outside/empty/stale rõ | Pass tự động: chặn save/continue, không tự nới vùng/giờ | GPS action mock; success-empty supplement khi nối API cần adapter GM-24/25 |
| Giá unknown, empty/reset-ready | Pass tự động: Chưa có giá, không fake0; context reset cả nhóm, preferences reset caller | Không nghiệm thu server transaction |
| avoidRecent/history consent | Pass tự động: controls, consent mặc định false, hero/skip giữ consent | Không gọi history thật |
| Hai màn chạy trên Expo Go sau sửa cuối | Pass theo xác nhận chung của người dùng, MANUAL_DEVICE_CHECK | Không có metadata thiết bị hoặc kết quả riêng từng fixture/a11y; Trí kiểm phần bắt buộc trước nghiệm thu |
| Handoff/input/output/version/cách thử | HANDOFF + CHECKS + manifest 18 source/test files | Chưa có approval của Trí |

- [x] `npm run check`: TypeScript strict/lint/architecture đạt; **17 suites / 551 tests**. Có 4 lint warnings upstream đã ghi, không sửa nền trong GM-10.
- [x] `npm run bundle:android`: export Android đạt, 1294 modules; không coi bundle là device test.
- [x] Python regression sau chuẩn bị hồ sơ: **550 tests/99.928s, OK, không skipped**, exit0; log `PRE_COMMIT_PYTHON_REGRESSION.txt`. Hai lượt sandbox lỗi quyền thư mục tạm được giữ trong CHECKS; lượt cuối ngoài sandbox đạt, không đổi code/test.
- Repo validator, `task_readiness.py --check-docs`, diff và manifest: kết quả tại CHECKS; lượt chuẩn bị tài liệu tại `PRE_COMMIT_REPOSITORY_CHECK.txt`.
- `npm run check:expo` online: **exit1**, đề xuất expo~57.0.30/router~57.0.28 so với khóa57.0.29/57.0.27. Không tự nâng package; cần Trí đối chiếu dependency nền, không ghi check này Pass.
- Expo Go: xác nhận bằng văn bản theo yêu cầu người dùng, không yêu cầu ảnh/video. Light/dark/font200/TalkBack/keyboard/Back và từng fixture chưa có kết quả riêng; không tự đánh Pass.
- A6 contrast shared GM-05, A7 mapping supplement GM-24/25 và A8 production composition GM-25 đã được người dùng loại khỏi phạm vi đánh giá GM-10; giữ ghi chú bàn giao, không mở rộng patch.

## Artifact bàn giao và output chạy được

Track UI / stage screens / dữ liệu mock GM-07. Không dùng verified dataset production; SQL/RLS/native API testing ngoài scope này.

- Output: `mobile/src/features/context/screens/ContextScreen.tsx`, `mobile/src/features/preferences/screens/PreferencesScreen.tsx`; routes `mobile/src/app/gm10/`, mock provider `mobile/src/bootstrap/roomSetupPreview.tsx`.
- Mở: tại `mobile`, `npm ci --no-audit --no-fund` rồi `npm start -- --clear`; Home → Công cụ kiểm thử → Chọn điểm ăn và khẩu vị → lưu context → Chọn khẩu vị → lưu/bỏ qua → biên nhận. Fixture controls cuối màn; expected/assertions/các case tái lập tại HANDOFF/CHECKS.
- Consumers GM-24/25/31 nhận repository/callbacks/catalogue/location và durable intent; GM-39 đối chiếu UI theo phạm vi được Trí giao. Không giả nối phòng GM-09 hoặc lobby GM-11.
- Evidence folder: `docs/evidence/roadmap-v2/GM-10/`. Đọc `HANDOFF.md`, `CHECKS.md`, `MANUAL_DEVICE_CHECK.md`, `DATE_UI_REVIEW.md`; hashes tại `PATCH_MANIFEST.json`. Các log AUDIT/SCOPE_FIX/FINAL cũ là lịch sử.
- Tested revision: base `30ecb5675104f13c64580018cad118647fb3d601` + working tree có hashes trong manifest. Commit PR được tạo sau bước chuẩn bị tài liệu; Trí đối chiếu SHA thực tế trên PR và mọi thay đổi sau kiểm. Không ghi SHA chưa tồn tại.

## Review cuối — Trí

- [ ] Trí kiểm AC, các mục bắt buộc chưa xác nhận riêng, hai gate và evidence đúng revision PR cuối.
- [ ] Trí quyết định nghiệm thu, merge và chuyển Done trên Project; lưu review revision/evidence thật.

Chưa được duyệt/merge/Done. Xác nhận chạy ổn của người dùng và checks tự động không thay approval của Trí. Không dùng liên kết tự đóng issue.
