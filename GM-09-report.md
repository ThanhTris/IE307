# Báo cáo bàn giao GM-09

Ngày cập nhật: 2026-10-15. Nhánh `codex/gm-09-home-create-and-join-room`, target `main`; base HEAD `6735694` + working tree chưa commit. Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`), contract `food-v1/roadmap-v2/GM-09.1`.

Người dùng xác nhận “tôi đã kiểm tra GM-09 thành công và hoạt động” sau bản sửa cuối. Lần bàn giao này dùng [biên bản kiểm bằng văn bản](docs/evidence/roadmap-v2/GM-09/MANUAL_DEVICE_CHECK.md) theo chỉ dẫn hiện tại, không yêu cầu ảnh/video UI. Xác nhận này là kết quả kiểm của người dùng, chưa phải approval của Trí.

## Đầu ra hiện hành

- Home: guest/session, CTA tạo/vào phòng, avatar preview, trạng thái lỗi/trống và resume phòng mẫu; lỗi friends không chặn entry khi session còn hợp lệ.
- Create: tên host, điểm công cộng/radius/buổi/giờ UTC+7/budget nullable, tóm tắt bối cảnh và xác nhận trước gửi; retry giữ payload/requestId, khóa sau ACK.
- Join: mã 6 chữ/số theo contract, trim/uppercase, xác nhận riêng; incoming code chỉ prefill, không auto-join hoặc thay intent pending/unknown/ACK.
- Receipt: đọc snapshot/context, khóa bước tiếp khi tải/lỗi, callbacks nhận roomId/code/version/role; giữ phiên mẫu trong RAM.
- AppButton: nhãn phủ lòng nút để nhận chạm cả khoảng trống hai bên, bỏ thử nghiệm pointerEvents làm mất phản hồi; guard disabled/loading và props GM-05.1 giữ nguyên.
- Không đổi package/lockfile, DTO/schema hoặc backend. API, GPS/camera/QR thật, lobby/preferences và persistence thuộc task tích hợp.

## Kiểm chứng hiện hành

| Kiểm | Kết quả |
| --- | --- |
| Typecheck/lint/Jest/architecture | Pass; 14 suites / 462 tests; 4 lint warnings upstream hiện có |
| Android Hermes export | Pass; 1284 modules; không phải APK/native integration |
| Python regression trên source cuối | Pass; 550 tests, không skipped |
| Expo Go | Pass tổng thể theo xác nhận người dùng trong cuộc hội thoại |
| Thông số và kiểm thiết bị chi tiết | Model/Android/Expo Go chưa được cung cấp; light/dark/font200/TalkBack/keyboard/Back/từng fixture chưa có kết quả riêng, Trí đối chiếu trước nghiệm thu |

Các kết quả 343/460 tests, Python Fail hoặc 6 skipped trong evidence cũ là lịch sử. Lượt chuẩn bị bàn giao chỉ sửa tài liệu/manifest; kiểm repository/indexes/regression/diff mới được ghi ở [CHECKS](docs/evidence/roadmap-v2/GM-09/CHECKS.md).

## Mở và nhận bàn giao

Tại `mobile`, chạy `npm ci --no-audit --no-fund`, rồi `npm start -- --clear`. Expo Go SDK57 cùng LAN: Home → Tạo kèo ăn / Tôi có mã phòng → receipt → Home/resume. Join có mã mẫu `GCD234`. Chọn Công cụ kiểm thử → Bình thường để xóa active receipt trước khi thử hai CTA; khi còn phòng, khóa tạo/vào phòng mới là hành vi có chủ đích. Theme app theo Android, chưa có công tắc riêng trong app.

- [CHECKS](docs/evidence/roadmap-v2/GM-09/CHECKS.md): kết quả tự động, xác nhận thủ công và giới hạn.
- [HANDOFF](docs/evidence/roadmap-v2/GM-09/HANDOFF.md): cách mở, interface và consumers GM-10/11/25/30/39.
- [PLAN](docs/evidence/roadmap-v2/GM-09/PLAN.md): scope/upstream và các lần sửa.
- [Manifest source/test cuối](docs/evidence/roadmap-v2/GM-09/REVIEW_PACKAGE_MANIFEST.json): hashes working tree đã kiểm.
- [Nội dung PR chuẩn bị](docs/evidence/roadmap-v2/GM-09/PR_BODY.md).
- [Lệnh commit/push và gửi Trí review](docs/evidence/roadmap-v2/GM-09/COMMIT_AND_PUSH.md).

## Quyết định còn chờ Trí

Người dùng commit/push nhánh và tạo PR target main để Trí review. Chỉ Trí được review cuối, merge và chuyển GM-09 Done trên Project #2; không tự ghi Approved, tự đóng issue hoặc đổi metadata task sang done. Agent chưa commit/push/tạo PR/merge hoặc thay đổi Project trong lượt chuẩn bị tài liệu này.

## Lịch sử báo cáo ngày 2026-10-13

Phần dưới giữ nguyên kết quả tại thời điểm cũ, không thay thế xác nhận kiểm thủ công và kết quả hiện hành ở trên.

Đã làm lại **Home, tạo phòng và nhập mã bằng mock** theo UI mẫu trên nhánh `codex/gm-09-home-create-and-join-room`, ngày 2026-10-13. Đã xóa toàn bộ `.agents/` tự tạo. Chưa nghiệm thu toàn task: còn kiểm Expo Go Android thật và review Trí. Không commit/push hoặc chuyển issue/Project Done.

## Đã làm

- Home: guest/session, avatar preview, CTA create/join, lời giải thích GPS/manual, empty/network/lost-session và quay lại phòng mẫu.
- CreateRoom: tên host đúng DTO, điểm công cộng/radius/buổi/giờ UTC+7/budget nullable, xác nhận context, validation và success code từ adapter. Ăn ngay +15 phút một lần; hẹn giờ không cộng buffer; không gửi GPS cá nhân.
- JoinRoom: mã 6 chữ/số theo GM-07, trim/uppercase, xác nhận trước join; full/locked/expired/invalid/network/loading. QR là action interface/placeholder, có manual fallback; deep link chỉ prefill.
- Receipt lưu trong RAM để xem xác nhận/context và resume. Có callbacks roomId/code/version/role sang GM-10/11; chưa viết màn khẩu vị/lobby hoặc setReady/start.
- Routes mỏng; Home ở `/`, create `/create-room`, join `/join-room`, receipt `/room-preview`. Giữ shell GM-02 ở `/shell` và công cụ `/foundation`, `/components`.
- UI mới có hero món ăn/CTA/avatar, Create nhóm form thành card, Join có ô xem mã chữ/số và khung QR minh họa; tools/fixture thu gọn dưới Công cụ kiểm thử. Đối chiếu [mẫu và guideline đã kiểm](docs/evidence/roadmap-v2/GM-09/UI_REWORK.md).
- Tái dùng component GM-05 và mock GM-07; không thêm package/provider, sửa lockfile/shared contract/backend. `.agents/` tự tạo đã xóa; dùng AGENTS/task/spec/workflow hiện hành, không tạo rules/skills mới. `prompt.txt` giữ nguyên.

## Kiểm tra

| Mục | Kết quả |
| --- | --- |
| TypeScript / lint / architecture / Jest | Pass; 10 suites, 343 tests; 4 lint warnings có sẵn ở GM-07 |
| Android Hermes bundle | Pass; không phải bằng chứng Expo Go/thiết bị |
| Dependencies | Đã npm ci theo lockfile hiện có; Expo57.0.27/Router57.0.25; package/lockfile bất biến |
| Metro / manifest | Output lượt trước là lịch sử; chưa chạy lại ở lượt làm mới UI |
| Python regression 3.12.14 | **Fail:** 544 tests, 1 failure encoding probe + 5 errors locking Windows; trùng các ca đã ghi ở GM-07 |
| Expo Go Android / dark / font200 / TalkBack / keyboard / hardware Back | **Not run:** chưa có thiết bị/adb hoặc kết quả kiểm mới |

GM-05/07 đã Done trên Project và có code/HANDOFF trên base `9e9f5ba`; issue #70 có `assignment:accepted` cho Tuấn. Checker còn `READY_TO_CLAIM` vì metadata local proposed; không tự sửa trạng thái để khớp board. Tested revision là **base + working tree chưa commit**, không phải commit chứa implementation.

## Mở và bàn giao

Chạy `cd mobile` rồi `npm start`, mở bằng Expo Go Android SDK57 cùng LAN. Từ Home thử tạo/vào phòng; mở **Công cụ kiểm thử** ở cuối màn để đổi fixture success/loading/empty/errors. Đổi fixture remount màn nên mở lại disclosure để đổi tiếp. Create cần chọn anchor, nhập tên và xác nhận context; Join có nút điền mã mẫu `GCD234` và bước confirm.

- [HANDOFF](docs/evidence/roadmap-v2/GM-09/HANDOFF.md): paths, interfaces, commands, task nhận GM-10/11/25/30 và giới hạn.
- [CHECKS](docs/evidence/roadmap-v2/GM-09/CHECKS.md): AC/assertions/output và các mục chưa chạy.
- [PLAN](docs/evidence/roadmap-v2/GM-09/PLAN.md): scope/ownership/upstream đã nhận.
- [Manifest](docs/evidence/roadmap-v2/GM-09/PATCH_MANIFEST.json): hashes code/tests của working tree đã kiểm.

Tuấn/Trí cần kiểm trên Android, lưu device/build/ảnh hoặc video và review revision này trước nghiệm thu. Mạng/auth/room RPC, GPS/camera, lobby/preferences/social thật và persistence thuộc các task tích hợp tiếp theo.
