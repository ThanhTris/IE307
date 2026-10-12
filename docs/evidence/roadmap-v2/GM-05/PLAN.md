# GM-05 implementation and downstream plan

Ngày 2026-10-12 UTC+7. Scope `food-v1/roadmap-v2/GM-05.1`, nhánh triển khai tạo từ `origin/main` `9188c736def7e125266f8cce2314b9f1f5c31b81`, code commit `b66d9e3`. Người dùng yêu cầu sửa theo lộ trình đã chốt: PR #105 thuộc GM-07; GM-05 phải có component/tokens/map/handoff riêng.

## Phạm vi đã triển khai

1. `mobile/src/shared/theme/tokens.ts`: light/dark color, spacing, radius, typography và control minimum 48dp.
2. `mobile/src/shared/ui/components.tsx` + `index.ts`: `AppHeader`, `AppButton`, `FormField`, `Chip`, `DishCard`, `AvatarRow`, `RoomCode`, `ContextSummary`, `StatusNotice`, `SheetDialog`. Component chỉ nhận props/view data, không gọi API/native/domain.
3. `mobile/src/features/home/screens/ComponentPreviewScreen.tsx` và `/components`: ví dụ ghép Home/card bằng fixture có nhãn; mở từ `/foundation` bằng nút GM-05.
4. `docs/design/COMPONENT_MAP.md`: mapping prototype → component, props/events, states, giới hạn và downstream seam.
5. Component tests + route test: props/events, loading/disabled/error, chip selected, dish image fallback, vote labels, room/context/status/social, route mở preview.

## Sửa input GM-07 theo plan

ROOM_SPEC quy định mã phòng 6 ký tự charset tránh nhầm. Mock trên main còn dùng `GCD1`/4 ký tự và fixture lịch sử 5 ký tự; đã thống nhất fixture `GCD234`, history `PAST23`/`PAST45`, generator `GCD` + 3 ký tự và `isRoomCode` ở client guard. Tests, API contract, GM-07 evidence và invite metadata được cập nhật. Uniqueness production/server vẫn ngoài scope mock.

## Lộ trình tiếp theo

| Bước | Owner / task | Điều kiện vào | Output / cách kiểm |
| --- | --- | --- | --- |
| 1 | Trung / GM-05 review | Reviewer Tuấn đối chiếu component map, UI spec và revision; Trí kiểm gate | Review độc lập, Expo Go component preview, dark/font200/TalkBack/touch48; cập nhật CHECKS/HANDOFF |
| 2 | Tuấn / GM-09 | GM-05 được review/merge; dùng `mobile/src/shared/ui` và GM-07 mock contract | Home/create/join mock screens, route/state/error/empty/loading; mã phòng dùng 6 ký tự; không chờ GM-25/30/39/data thật |
| 3 | GM-10..14 theo owner roadmap | GM-05 + GM-07 đã có trên target | Các màn mock độc lập, fixture có nhãn, component test và Expo route |
| 4 | GM-25 / GM-30 | Màn tương ứng đã bàn giao; API/native task đủ dependency | Tích hợp API/native thật, QR/link/location/Maps theo AC; giữ component/screens và không fallback mock trong production |

## Blocker và giới hạn hiện tại

Lần kiểm tra start gate ghi `BLOCKED_ON_BASE`: Project ghi GM-02 Done nhưng target `origin/main` khác nội dung `mobile/README.md` và `mobile/tests/README.md` so với hồ sơ GM-02. Lần kiểm tra merge gate trước đó ghi `READY_FOR_MERGE_REVIEW | owner=Trung reviewer=Trí`; hiện không thể refresh live vì môi trường thiếu credential `read:project`. Đây là blocker gate metadata, không phải lý do dựng lại shell; cần owner/reviewer GM-02 đối chiếu và cập nhật handoff/target trước merge GM-05. GM-04 cũng cần reviewer xác nhận revision theo gate.

Expo Go Android visual/TalkBack/font 200% chưa chạy trong môi trường này; CHECKS ghi `Not run`, không tuyên bố GM-05 Done. Không thêm package/lockfile/native module, không sửa route nghiệp vụ GM-09, không triển khai API/native GM-25/30.
