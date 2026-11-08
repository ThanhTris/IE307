# GM-30 — UI native QR, liên kết, vị trí và Places/map kết quả (#91)

Owner: Trí (`ThanhTris`) · Reviewer: Trí (`ThanhTris`).
Contract: `ui-figma-final/2026-10-25/GM-30.1` and `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Issue: resolves #91

---

## 1. Scope & Implementation

- **Mã QR & Liên kết phòng (`joinLinks.ts` & `RoomQrModal.tsx`)**:
  - Tạo ma trận QR bit 25×25 xác định thuần TypeScript qua `generateQrMatrix` và vẽ bằng `react-native-svg` trong `RoomQrModal` (Figma Node `368:12182`), không thêm native library nặng vào `package.json`.
  - Bộ sinh và phân tích cú pháp Deep Link (`gi-cung-duoc://room/join?code=...`) & Web Link (`https://gicungduoc.vn/join/...`) với cơ chế lọc allowlist nghiêm ngặt (`gi-cung-duoc:`, `exp:`, `https:`, domain `gicungduoc.vn`).
  - Loại bỏ và từ chối toàn bộ query parameter chứa token, bí mật hoặc credential.
  - Lắng nghe sự kiện mở liên kết cả lúc cold-start lẫn warm-start qua `subscribeToJoinLinks`.
  - Cung cấp `SimulatedQrScannerAdapter` và `NativeQrScannerAdapter` phục vụ kiểm thử Chặng 3A trên AVD.

- **Màn hình vào phòng đa chế độ (`JoinRoomEntryScreen.tsx` & `useJoinRoomEntry.ts`)**:
  - Chế độ quét QR máy ảnh với viewfinder viền cam và nút chuyển "Nhập mã bằng tay" (Figma Node `268:2019`).
  - Giao diện xử lý khi quyền máy ảnh bị từ chối (`cameraStatus === 'denied'`): biểu tượng khóa, thông báo giải thích, nút "Mở Cài đặt" (`Linking.openSettings`) và nút "Nhập mã bằng tay" (Figma Node `275:2088`).
  - Giao diện xác nhận phòng sau khi quét/nhận liên kết thành công: hiển thị mã phòng, số lượng thành viên từ preview công khai và nút "Xác nhận vào phòng" với token lũy thừa idempotent (Figma Node `268:2081`).

- **Quán ăn gần bạn & Liên kết ngoài (`placesRepository.ts` & `externalLinks.ts`)**:
  - `LivePlacesRepository`: tích hợp Google Places API (New) `places:searchText` endpoint với FieldMask chuẩn, tính khoảng cách Haversine (`calculateDistanceM`).
  - Chế độ Dev Simulated AVD gắn nhãn rõ ràng (`[Simulated AVD] ...`) và vị trí mô phỏng giúp kiểm thử luồng UI trên AVD mà không tốn phí Google billing key.
  - **Cô lập kết quả tuyệt đối (Winner Isolation)**: Chỉ tìm quán khi kết quả ở trạng thái `DECIDED`. Mọi lỗi từ chối GPS, lỗi mạng hay API quota **tuyệt đối không bao giờ làm mất, thay đổi hoặc reroll món thắng và bục vinh danh Top 3**.
  - **Monotonic Epoch Guard**: Hủy bỏ ngay lập tức request Places dở dang khi người dùng chuyển sang xem phòng/món khác (`placesSeqRef` & `AbortController`).
  - Khung nhắc quyền vị trí trong màn hình kết quả (Figma Node `622:8962`).
  - Thẻ quán ăn gần bạn, sơ đồ bản đồ và các nút hành động (Figma Node `206:913` & `379:1478`).
  - `openExternalAction`: Mở Google Maps / Geo URI, tìm kiếm review trên TikTok (`TikTok ↗`) và video trên YouTube (`YouTube ↗`) theo allowlist an toàn.

---

## 2. Đối chiếu 7 Figma Nodes

| Figma Node | Frame / Trạng thái | Vị trí hiện thực | Kết quả kiểm thử |
| --- | --- | --- | --- |
| `268:2019` | Vào phòng · Quét QR | `JoinRoomEntryScreen.tsx` | **Pass** (Viewfinder, camera mode, manual switch) |
| `275:2088` | Vào phòng · Camera bị từ chối | `JoinRoomEntryScreen.tsx` | **Pass** (Denied banner, Open settings, manual switch) |
| `268:2081` | Vào phòng · Xác nhận | `JoinRoomEntryScreen.tsx` | **Pass** (Room code, member count, confirm button) |
| `368:12182` | L07 · Mở mã QR | `RoomQrModal.tsx` & `LiveLobbyScreen.tsx` | **Pass** (SVG QR matrix, copy link with feedback) |
| `622:8962` | Kết quả — Cần bật vị trí | `LiveDishResultScreen.tsx` & `NearbyPlacesSection.tsx` | **Pass** (Permission notice, request button, isolated) |
| `206:913` | GCD / Nearby Places Map | `ResultMapCard.tsx` | **Pass** (Map card, venues, Google Maps button) |
| `379:1478` | GCD / Nearby Places State | `NearbyPlacesSection.tsx` | **Pass** (Loading/ready/empty/error/offline + TikTok/YouTube) |

---

## 3. Local Verification & Quality Gates

- **Unit & Component Tests**: **58/58 tests passed (100%)**
  - `tests/unit/joinLinks.test.ts`: 18/18 passed
  - `tests/unit/externalLinks.test.ts`: 18/18 passed
  - `tests/unit/placesRepository.test.ts`: 14/14 passed
  - `tests/component/gm30FigmaParity.test.tsx`: 8/8 passed
- **TypeScript**: `npm run typecheck` (`tsc --noEmit`) đạt **0 errors**.
- **ESLint**: `npm run lint` (`eslint .`) đạt **0 errors, 0 warnings**.
- **Repository Validation**: `python scripts/validate_repository.py` đạt chuẩn.
- **Task Docs Consistency**: `python scripts/task_readiness.py --check-docs` đạt chuẩn.
- **Quy tắc 2 Chặng Kiểm thử (AIDD)**:
  - **Chặng 3A (Máy ảo AVD + Backend QA local)**: Đã nghiệm thu đầy đủ trên AVD qua `SimulatedQrScannerAdapter` và Dev Simulated Places Adapter có gắn nhãn rõ ràng, đáp ứng trọn vẹn 7 nhóm kiểm chặn lỗi review.
  - **Chặng 3B (Điện thoại thật qua USB)**: Camera QR vật lý và Google Places production billing key được hoãn sang `GM-33`/`GM-34`.

---

## 4. Evidence Artifacts

- [CHECKS.md](CHECKS.md)
- [FIGMA_PARITY.md](FIGMA_PARITY.md)
- [HANDOFF.md](HANDOFF.md)
