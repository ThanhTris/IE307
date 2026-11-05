# Bổ sung task sau rà soát Data–BE–UI

Ngày: 2026-11-05  
Baseline repo: `0f522ed89b83a7f0968d30e1f4dfe09e33ca97d1`  
Nguồn trạng thái: GitHub Project #2, đọc lại trước khi cập nhật.

## Logo Figma đã đồng bộ

- Thay logo master `22:394` bằng SVG chủ dự án cung cấp: `mobile/assets/brand/gi-cung-duoc-logo.svg`, SHA-256 `cd00727ff0ac169f8a7c364e5b04a751c6963edccc383d3a2ebc5fc062e011b7`.
- Cập nhật mẫu vector ở trang màu sắc `213:5713` và PNG app-icon preview `213:5725`. Master còn nguyên ID và có 10 instance liên kết; screenshot đã kiểm ở master, frame chào `298:2309` và mẫu màu.
- Giữ trang lưu trữ nhận diện cũ `171:45`; tên sản phẩm, màu và bố cục không đổi.
- `docs/design/UI_FIGMA_TASK_MAP.json` ghi nguồn, hash và node để task AI/người thực hiện tra cứu.

## Task Done nhận supplement

| Task / Issue / Owner | Trạng thái Project | Supplement cần hoàn tất |
|---|---|---|
| GM-02 / #63 / Trí | Done → Needs Update | Rà nền `react-native-svg` và transformer theo baseline Expo, Metro/Jest, Expo compatibility và Android export. Phân loại dependency audit theo runtime/dev/build; không nâng hàng loạt. Logo scalable dùng SVG, PNG chỉ làm app icon. |
| GM-03 / #64 / Trí | Done → Needs Update | Dựng QA từ checkout sạch, project/volume/network có ownership, Auth+REST+worker và cleanup. Kiểm binding hiệu lực của API `54361`/DB `54362`; chế độ wildcard của CI không chứng minh loopback-only. |
| GM-05 / #66 / Trung | Done → Needs Update | Nhận master `22:394`, asset/hash mới và component `BrandLogo`; kiểm kích thước/tỷ lệ, nền sáng/tối, touch/accessibility. Dùng code local có sẵn sau khi được chuyển lên nhánh làm việc; chưa coi local patch là main. |
| GM-09 / #70 / Tuấn | Done → Needs Update | Cập nhật logo ở welcome/guest và header chung theo Figma; kiểm điều hướng và hiển thị trên Expo. Màn vẫn nghiệm thu bằng mock theo scope GM-09. |
| GM-24 / #85 / Trang | Done → Needs Update | Sửa hướng dẫn sai ở HANDOFF: GM-24 preview, GM-25 mới tạo phòng bằng `dish_session(command: "create")` theo schema GM-07.B-supplement. Không gửi danh sách preview món; server chọn và khóa pool. |
| GM-39 / #107 / Trang | Done → Needs Update | Hoàn thành cập nhật master/instance Figma và map asset theo SVG mới; kiểm lại các instance, giữ bố cục và nhận diện cũ trong trang archive. |
| GM-40 / #125 / Vinh | Done → Needs Update | Cho runner nhận QA manifest được chỉ định, không phụ thuộc tên container/stack cá nhân có sẵn. Giữ 39 món test; kiểm importer/readback/activation/restore và báo coverage/shortage thật. Không thêm quota món production. |

## Task chưa Done — thêm yêu cầu, giữ Status

| Task / Issue / Owner | Status giữ nguyên | Phần bổ sung |
|---|---|---|
| GM-25 / #86 / Trang | Needs Update | Nối guest/Home/setup/lobby với Auth+REST thật; nhận handoff GM-24 đã sửa; parser rõ contract/version, không fallback mock âm thầm. |
| GM-26 / #87 / Trang | Todo | Host chỉ kết thúc sớm waiting nếu ballot ACK hoàn chỉnh của **đúng vòng hiện tại** lớn hơn nửa roster khóa (`A_r > M/2`). Timeout riêng cho phép từ một phiếu. Không auto-KEEP/auto-finalize; kiểm retry, hai vòng và R2 N=1. |
| GM-27 / #88 / Trang | Todo | Đọc winner/Top 3/điểm đã persist, không tự tính lại; xử lý legacy thiếu field; Places/map chỉ sau winner và phối hợp GM-30. |
| GM-28 / #89 / Trung | Review | Bổ sung trên PR #126 hiện có: history/inbox đọc projection canonical, consent/ACL/revoke/TTL đúng; không dùng fixture làm bằng chứng API thật. |
| GM-29 / #90 / Trung | Review | Bổ sung trên PR #127 hiện có: native push driver, permission/token, cold/warm open và refetch canonical. Expo Go chỉ smoke UI, không là bằng chứng remote push native. |
| GM-30 / #91 / Trang | Todo | Kiểm QR/manual link và Places/map sau winner; lỗi quyền/mạng/quota không đổi hoặc làm mất winner. |
| GM-31 / #92 / Trung | Todo | Draft/cache/outbox phân vùng identity/room/round/poolVersion; refetch trước replay; dọn đúng cache khi logout, revoke, delete/TTL. |
| GM-32 / #93 / Vinh | Needs Update | Regression API/Data/security trên QA có owner marker; tách legacy/canonical, importer/fixture, lỗi sản phẩm/runner/môi trường. Bỏ GM-31 khỏi start gate; GM-03 và GM-31 là đầu vào nghiệm thu/merge. |
| GM-33 / #94 / Vinh | Todo | Có thể bắt đầu visual/mock với GM-07/08/14; tích hợp 27–32 là merge gate. Kiểm bàn phím, TalkBack, font 200%, màn nhỏ, hai client; ghi riêng emulator/điện thoại/native. |
| GM-34 / #95 / Trí | Todo | Kiểm native icon/splash, release artifact và runtime package; Expo export/Expo Go không thay bằng chứng APK/native release. |

## Dependency và kiểm tra

- GM-32 `start_dependencies`: GM-06/07/18/20/21/22/23. `merge_dependencies`: GM-03/06/07/18/20/21/22/23/31.
- GM-33 `start_dependencies`: GM-07/08/14. Giữ GM-27…32 ở `merge_dependencies` để kiểm visual/mock bắt đầu được trước; chưa nghiệm thu tích hợp cho tới khi đủ artifact và dependency Done.
- Chỉ Done mở dependency. GM-35…38 giữ nguyên trạng thái và lịch P1/P2.
- Trạng thái live sau cập nhật 7 thẻ Done: **19 Done, 12 Needs Update, 2 Review, 7 Todo**. Comment trên từng issue là yêu cầu thực thi; file này là bảng đối chiếu repo.
- Project README và `tasks/README.md` được sửa số task: 40 card, GM-01 dùng alias GM-00/#37; task IDs roadmap-v2 GM-01…GM-40.

## Giới hạn bằng chứng

Ảnh Figma xác nhận logo/master và một frame chào đã cập nhật. Không suy ra từ đó rằng toàn bộ app đã nối API, APK/native đã đạt, hoặc task supplement đã được review. BE/Data giữ nghiệm thu baseline; blocker QA chưa tái hiện bug sản phẩm. Chỉ chuyển các task baseline trên Project theo quyết định supplement; không đánh Done/Approved thay reviewer Trí.

## Đồng bộ live đã thực hiện

- Project #2: chuyển đúng GM-02/03/05/09/24/39/40 từ Done sang Needs Update. Trạng thái cuối cần xác minh là 19 Done, 12 Needs Update, 2 Review, 7 Todo; các task còn lại, assignee, deadline và PR review fields giữ nguyên.
- Project README sửa thành 40 card roadmap-v2: GM-00/#37 là alias baseline GM-01, card riêng GM-02…GM-40; dependency chỉ mở khi Done.
- Đăng supplement comment vào issues [#63](https://github.com/ThanhTris/IE307/issues/63#issuecomment-6647237954), [#64](https://github.com/ThanhTris/IE307/issues/64#issuecomment-6647237890), [#66](https://github.com/ThanhTris/IE307/issues/66#issuecomment-6647238896), [#70](https://github.com/ThanhTris/IE307/issues/70#issuecomment-6647238183), [#85](https://github.com/ThanhTris/IE307/issues/85#issuecomment-6647238208), [#107](https://github.com/ThanhTris/IE307/issues/107#issuecomment-6647238384), [#125](https://github.com/ThanhTris/IE307/issues/125#issuecomment-6647238694), [#86](https://github.com/ThanhTris/IE307/issues/86#issuecomment-6647238758), [#87](https://github.com/ThanhTris/IE307/issues/87#issuecomment-6647238367), [#88](https://github.com/ThanhTris/IE307/issues/88#issuecomment-6647238863), [#89](https://github.com/ThanhTris/IE307/issues/89#issuecomment-6647238895), [#90](https://github.com/ThanhTris/IE307/issues/90#issuecomment-6647238343), [#91](https://github.com/ThanhTris/IE307/issues/91#issuecomment-6647238674), [#92](https://github.com/ThanhTris/IE307/issues/92#issuecomment-6647238526), [#93](https://github.com/ThanhTris/IE307/issues/93#issuecomment-6647238828), [#94](https://github.com/ThanhTris/IE307/issues/94#issuecomment-6647238747), [#95](https://github.com/ThanhTris/IE307/issues/95#issuecomment-6647239036).
- GM-28/29 giữ Review; yêu cầu bổ sung nêu rõ tiếp tục trên PR #126/#127 hiện có.
- Local task specs, GM-24 HANDOFF, GM-26 waiting rule, dependency GM-32/33 và Figma asset map được đồng bộ. Các thay đổi source/task docs vẫn ở local, chưa commit/push; Project status/comments/README và Figma đã cập nhật trực tiếp.

### Ảnh hưởng dependency theo gate Done-only

Sau khi chạy task readiness với Project live: GM-32 và GM-33 là READY_TO_CLAIM theo start gate đã chỉnh; GM-40 là READY_TO_START. Task readiness báo các consumer phụ thuộc trực tiếp vào GM-02/03/05/09/24 ở trạng thái Needs Update đang bị chặn, đúng quy tắc Done-only. Các task không thuộc bảy supplement không bị đổi trạng thái; phải đợi owner hoàn tất supplement và Trí nghiệm thu lại trước khi gate mở.

### Kiểm tra hồ sơ local

- `python scripts/validate_repository.py`: Pass.
- `python scripts/task_readiness.py --check-docs`: Pass; task indexes đã được sinh lại.
- `git diff --check` và parse JSON task map: Pass.
- Không chạy mobile/BE runtime tests trong đợt chỉ đồng bộ task này; logo source local chưa được xem là đã merge/test trên main.

