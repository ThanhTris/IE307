## Task và phạm vi

GM-09 / issue #70 — cập nhật UI Welcome, khách, Home, tiếp tục phiên,
entry tạo/tham gia phòng và tutorial theo Figma. Owner Tuấn (`mtuan2491`),
reviewer Trí (`ThanhTris`). Branch `codex/gm-09-figma-update` → `main`.
Revision yêu cầu: `ui-figma-final/2026-10-25/GM-09.2`.

Luồng mock mới: Welcome → nhập tên → tutorial → Home. Màn tham gia phòng tách
nhập mã, preview công khai, xác nhận và các trạng thái lỗi; chỉ join sau xác nhận.
Home/tiếp tục phiên giữ kiểm tra session và snapshot. Tutorial có thẻ mẫu riêng,
kéo/nghiêng theo tay, nhấn đúp WANT, hoàn tác, bỏ qua và xem lại; có nút thay
gesture và hỗ trợ Reduce Motion. Sửa alpha của13 PNG gây ô trắng/ô icon đặc màu;
ô mã dùng TextInput native có caret, paste và Backspace.

Phần độc lập này bàn giao UI/mock và callback cho GM-10/11/25/30/31. Form
thiết lập dish-only của GM-10 và adapter preview thật vẫn cần nhận/tích hợp.
Real mode giữ đường create/join đã nhận, lỗi API không chuyển sang mock.
Không thay package/lockfile, API/schema/migration, engine hoặc UI ballot thật.

## Start gate và merge gate

- Start gate live `2026-11-02T08:32:18Z`: `READY_TO_CLAIM`.
- Đã fetch `origin/main`; target `90e871aafd9dad7864672f8bc03aee329ada9bae`.
- Merge gate live `2026-11-02T08:32:20Z`: **`BLOCKED_ON_BASE`** — artifact GM-05
  `mobile/src/shared/theme/tokens.ts` trên nhánh khác target. Diff gồm màu muted
  Light và màu nhấn/nền phụ Dark chuyển sang xanh; cần Trí review và chốt cách
  bàn giao thay đổi token trước merge. Không sửa metadata producer để vượt gate.

- [x] Start dependencies được kiểm qua Project; không dùng cache/local fallback.
- [x] Target ref đã cập nhật và merge gate đã chạy.
- [ ] Giải quyết khác biệt artifact GM-05 trên target và chạy lại merge gate.
- [ ] Trí review đúng revision, đối chiếu CI và quyết định nghiệm thu/merge.

PR để **Draft** trong khi các mục merge/acceptance còn mở. Việc tạo PR không
tự đóng issue #70, bật auto-merge hoặc thay Status/Done trên Project.

## AC và verification

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Full mobile Jest | **38 suites/807 tests Pass**,75.217s; source `f97a748`; giữ nguyên runner/timeouts |
| Typing/gesture/route tests |6 suites/39 tests Pass; native code cells, paste/edit/delete, frozen intent, drag/release/cancel/double tap/Reduce Motion, tutorial isolation |
| PNG pixel regression |14 cases Pass tại bản sửa asset; đọc pixel PNG thật, không dựa vào Image mock |
| TypeScript / source-tests-scripts ESLint / architecture |Pass; full `npm run lint` trên máy vẫn có4 import lỗi của file QA cũ trong thư mục làm việc cục bộ |
| Expo installed compatibility |Pass theo SDK58/lockfile; có giới hạn kiểm offline |
| Android Hermes export |Pass, entry-91143e7847e4b41334bc875b16d69e43.hbc; không thay APK hoặc nghiệm thu thiết bị |
| Python regression |657 tests:650 Pass/6 skipped/1 error; lần kiểm docs cuối124.417s; lỗi quyền symlink Windows `WinError1314` đã có trước; không thay assertions/OS privileges |
| Repository/task indexes/diff |Pass sau chỉnh tài liệu; không đổi task metadata/indexes |
| Native/visual acceptance |Ảnh người dùng đã giúp tái hiện lỗi trước sửa. Caret/IME Samsung, physical drag/glow và 320/360/412dp/font200/TalkBack sau sửa vẫn **Not run** trong evidence; cần xác nhận trên thiết bị trước nghiệm thu |

## Artifact bàn giao và cách mở

- [HANDOFF](HANDOFF.md) — đọc cập nhật mới nhất ở đầu file.
- [CHECKS](CHECKS.md), [FIGMA_PARITY](FIGMA_PARITY.md).
- [Sửa asset](figma-update/ASSET_ALPHA_REPAIR.md),
  [sửa input/tutorial và manifest](figma-update/INPUT_MOTION_REPAIR.md).

Từ repo root: `npm --prefix mobile start -- --clear`, mở Expo Go đúng SDK58.
Mock mới có nhãn: Welcome → tên khách → tutorial → Home. Join dùng mã mẫu
`GCD234`: Tiếp tục → preview số thành viên → Xác nhận vào phòng → receipt.
Kiểm Back/nhập mã khác, chữ không bị vẽ chồng và caret ở ô đang chọn. Replay
tutorial từ Cá nhân; kiểm cùng Reduce Motion bật/tắt. UI mock không thay
auth/REST/QR/persistence acceptance của task tích hợp.
