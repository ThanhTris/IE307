# GM-09 — bàn giao màn Home / create / join

## Bổ sung nhận main — 2026-10-15

Đã hòa giải merge HEAD `606f040` với main `ce7b87a`: giữ Home `/` và toàn bộ luồng GM-09; shell `/shell` nhận điều hướng bình chọn GM-12 và công cụ GM-16, giữ guard development/env của GM-16. Bổ sung thông báo cho hai ErrorCode upstream `NOT_RECIPIENT` / `INVITE_CANCELLED`; không sửa contract. Test route giữ cả hai nhánh. Xem [kết quả tích hợp](MERGE_MAIN_2026-10-15.md). Merge commit chưa tạo; `GM-09-report.md` vẫn untracked, ngoài staging. Hồ sơ ngày 2026-10-13 bên dưới là lịch sử của revision trước, không là hashes/evidence của bản tích hợp mới.

## Bàn giao trước khi nhận main

Owner Tuấn (`mtuan2491`), reviewer Trí. [Issue #70](https://github.com/ThanhTris/IE307/issues/70), branch `codex/gm-09-home-create-and-join-room`. Contract `food-v1/roadmap-v2/GM-09.1`. Tested revision: HEAD `9e9f5ba67899ea162b79b5c6ac17cd5479c505da` **+ working tree chưa commit**, ngày 2026-10-13 UTC+7; hashes tại [PATCH_MANIFEST.json](PATCH_MANIFEST.json).

Nhận GM-05.1 từ PR #109 (merge `9e9f5ba`), GM-07.1 từ PR #104 (`0711782`)/#105 (`9f71bba`). Hai dependency Done trên Project và code nằm trên base. Start gate `READY_TO_CLAIM` do local proposed; issue có `assignment:accepted`. Kiểm lại live ngày 2026-10-13 trước patch UI. Không thay task metadata/Project. [Plan](PLAN.md), [kết quả](CHECKS.md), [đối chiếu mẫu và thay đổi UI](UI_REWORK.md).

## Mở và kiểm

```powershell
cd mobile
npm ci --no-audit --no-fund
npm start
```

Expo Go Android cùng LAN, SDK 57. Home `/` → **＋ Tạo kèo ăn** (`/create-room`) hoặc **Tôi có mã phòng** (`/join-room`); success đến `/room-preview`. `/shell`, `/foundation`, `/components` giữ công cụ nền. Không cần env/auth/backend hay quyền camera/vị trí.

- Create: nhập tên, chọn điểm công cộng/radius/buổi, xem giờ UTC+7 hoặc nhập `YYYY-MM-DD HH:mm`, budget để trống hoặc VNĐ/người; xác nhận context rồi tạo. Ăn ngay lấy giờ server mẫu +15 phút **một lần**, retry giữ nguyên payload/requestId. Đổi context bỏ xác nhận; quá giờ phải cập nhật/đổi giờ.
- Join: tên + mã 6 chữ/số theo GM-07, chuẩn hóa trim/uppercase; **Vào phòng →** chỉ mở xác nhận. Nút điền mẫu dùng code exported `GCD234`; response code/roomId/version lấy từ adapter. Deep link `/join-room?code=gcd234` không tự join.
- Mở **Công cụ kiểm thử** ở cuối màn để đổi fixture: Bình thường / Tải chậm / Trống / Mất mạng / Đầy phòng / Đã khóa / Hết hạn / Mất phiên / Ngoài vùng / Giới hạn / Dữ liệu cũ. Lỗi lifecycle xuất hiện khi submit; Trống ở Home/discovery. Đổi fixture xóa phiên mẫu và remount màn, nên mở lại disclosure để đổi tiếp. Trên Home, link cấu trúc nằm trong disclosure; trên Create, thử GPS-denied/cập nhật giờ mẫu cũng ở đó.
- QR chỉ gọi action interface và mô phỏng denied; luôn quay lại manual. Receipt chỉ xác nhận mẫu + context; callbacks sang khẩu vị/lobby chưa nối màn task khác. Home và direct create/join giữ receipt đang có.

## Seams cho task nhận

| Artifact | Cách dùng / task nhận |
| --- | --- |
| `mobile/src/features/home/screens/HomeScreen.tsx` | Inject `repository`, `sessionToken`, `activeRoom`, callbacks create/join/resume/foundation; GM-25. Avatar preview tối đa 5, không suy online từ Friend.status=active. |
| `mobile/src/features/rooms/screens/CreateRoomScreen.tsx` | Inject repository + `onEntered(RoomEntryReceipt)`; `CreateRoomRequest` đúng GM-07, không thêm room title/lat/lng; GM-10/25. |
| `mobile/src/features/rooms/screens/JoinRoomScreen.tsx` | `initialCode`, `sampleCode` chỉ mock, `onScan: CameraAction`, `onEntered`; GM-25/30 thay camera/link tại composition, giữ explicit confirmation. |
| `mobile/src/features/rooms/screens/RoomEntryReceiptScreen.tsx` | `onPreferences(receipt)` / `onLobby(receipt)` nhận `{roomId, code, version, role}`; GM-10/11/25. Chưa setReady/start. |
| `services/roomEntry.ts`, `hooks/useRoomEntry.ts` trong feature rooms | Narrow `Pick<ApiClient,…>`, validation/timezone/error copy; read hủy response cũ, write chống bấm trùng/late response. |
| `mobile/src/bootstrap/roomPreview.tsx` | Factory mode `'mock'` tường minh + store RAM + controls. GM-25 thay wiring/session/requestId và nhãn mock theo task integration; không dùng store mẫu làm cache/persistence production. |

## Kết quả và giới hạn

- UI mới: Home có hero món ăn/CTA/avatar; Create nhóm buổi/giờ, điểm ăn và ngân sách; Join có xem mã 6 chữ/số và khung QR minh họa. Dùng palette/spacing/type GM-05 khớp UI_DESIGN_SPECIFICATION, không thay tokens hoặc contract. Fixture/tools thu gọn; mock luôn có nhãn.
- Mobile revision UI hiện hành: typecheck/lint/Jest/architecture Pass; 10 suites / 343 tests, 4 warnings cũ GM-07. Android Hermes export Pass. [Output](UI_REWORK_MOBILE_CHECK.txt), [bundle](UI_REWORK_ANDROID_BUNDLE.txt). Metro/manifest ở lượt trước là evidence lịch sử, chưa kiểm lại trong lượt UI này.
- Expo Go Android, ảnh/video, dark/font200/TalkBack/keyboard/hardware Back trên thiết bị: **Not run**, chưa có thiết bị/adb hoặc xác nhận mới từ người dùng. Owner Tuấn và reviewer Trí kiểm trước nghiệm thu.
- Python 3.12.14 hiện hành: 544 tests, **Fail (1 failure, 5 errors)**; encoding probe và taxonomy locking Windows đã ghi ở GM-07. Không sửa data/runner trong GM-09; cần maintainer/Trí xử lý hoặc kiểm Linux/WSL. [Output](UI_REWORK_PYTHON_REGRESSION.txt).
- Không đổi package/lockfile/shared UI/DTO/schema/luật phiếu; không thêm provider, GPS/camera/native module. Không có RPC thật, lobby/preferences/social thật, SecureStore/outbox hay dataset verified; các phần này thuộc task nhận sau.
- `.agents/` tự tạo đã xóa hoàn toàn khỏi workspace theo yêu cầu ngày 2026-10-13; không tạo rules/skills thay thế. Chỉ dùng AGENTS/task/spec/workflow và artifact hiện hành trong project. `prompt.txt` không bị sửa. Không commit/push/Approved/Done; việc bàn giao này không thay review Trí.
