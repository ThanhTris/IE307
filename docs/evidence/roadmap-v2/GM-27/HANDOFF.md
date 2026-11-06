# Bàn giao đầu ra task — GM-27 / roadmap-v2

## Current local handoff — 2026-11-06

Source: PR issue #88 branch `issue88_task_gm27`, baseline `origin/main` (`bb2103a`, bao gồm GM-26 PR #156).
Task / owner / reviewer / track / stage: GM-27 / Trang (`rosy179`) / Trí (`ThanhTris`) / INTEGRATION / integration.
Contract version: `ui-figma-final/2026-10-25/GM-27.2` & `dish-session-v4/roadmap-v2/GM-07.B-supplement`.
Artifacts bàn giao chính:
- `mobile/src/features/result/services/resultRepository.ts`
- `mobile/src/features/result/screens/LiveDishResultScreen.tsx`
- `mobile/src/bootstrap/DishResultEntry.tsx`
- `mobile/src/app/room/result.tsx`
- `mobile/src/app/room/no-consensus.tsx`
- `docs/evidence/roadmap-v2/GM-27/CHECKS.md`
- `docs/evidence/roadmap-v2/GM-27/HANDOFF.md`
- `docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md`

---

## 1. File và cách dùng

| Artifact thực tế | Producer | Version | Cách import / dùng | Mục đích & Trách nhiệm | Task nhận |
| --- | --- | --- | --- | --- | --- |
| `mobile/src/features/result/services/resultRepository.ts` | GM-27 | GM-27.2 | `import { LiveResultRepository, createLiveResultRepository, MockResultRepository, createMockResultRepository } from '@/features/result'` | Interface `ResultRepository` thống nhất gọi RPC `dish_session('result', ...)` v4; cung cấp cache kết quả terminal theo `roomId`; adapter mapper và validator payload nghiêm ngặt (`mapRawToScoredResult`, `mapRawToResultDish`, `mapSnapshotMembersToCompanions`); cô lập lỗi Places. | GM-30, GM-33, App Shell |
| `mobile/src/features/result/screens/LiveDishResultScreen.tsx` | GM-27 | GM-27.2 | `import { LiveDishResultScreen } from '@/features/result'` | Component màn hình kết quả live: kết nối `ResultRepository`, tự động tải đồng thời room snapshot để lấy danh sách thành viên (companions), hiển thị podium Top 3 / đồng hạng, kích hoạt tìm kiếm quán lân cận (Places) độc lập, quản lý retry khi lỗi mạng. | UI Consumer, App Shell |
| `mobile/src/bootstrap/DishResultEntry.tsx` | GM-27 | GM-27.2 | `<DishResultEntry mode="real" roomId={roomId} ... />` | Entry point phân nhánh mock/real cho kết quả món: ở mode `real`, render `LiveDishResultScreen` khi có `roomId`; fallback `StatusNotice` an toàn khi thiếu `roomId`. | Router, App Shell |
| `mobile/src/app/room/result.tsx` | GM-27 | GM-27.2 | Route `/room/result?roomId=...` | Route màn hình kết quả: nhận query param `roomId`, chuyển tiếp vào `DishResultEntry` để hiển thị kết quả live thật từ database/RPC. | Navigation, Router |
| `mobile/src/app/room/no-consensus.tsx` | GM-27 | GM-27.2 | Route `/room/no-consensus?roomId=...` | Route màn hình không đạt đồng thuận: nhận query param `roomId`, kích hoạt luồng No Consensus tương ứng với lý do (`EMPTY_INTERSECTION` hoặc `ALL_REMOVED`). | Navigation, Router |
| `mobile/tests/unit/resultRepository.test.ts` | GM-27 | GM-27.2 | `npm test -- tests/unit/resultRepository.test.ts` | 23 unit tests kiểm tra toàn diện `LiveResultRepository`, caching, RPC error mapping, trần điểm $2 \times \text{round1BallotCount}$, status/reason pairings, dense ranking ties, legacy compatibility, và cô lập lỗi Places. | CI / Regression |
| `mobile/tests/component/liveDishResultScreen.test.tsx` | GM-27 | GM-27.2 | `npm test -- tests/component/liveDishResultScreen.test.tsx` | 7 component tests kiểm tra `LiveDishResultScreen` và `DishResultEntry`: Top 3 podium, đồng hạng dense rank, EMPTY_INTERSECTION, ALL_REMOVED, retry, cô lập lỗi Places, và chế độ real/mock. | CI / Regression |
| `docs/evidence/roadmap-v2/GM-27/CHECKS.md` | GM-27 | GM-27.2 | Đọc tài liệu đối chiếu | Báo cáo chi tiết các ca kiểm thử, kết quả chạy thực tế, lệnh tái lập và giới hạn môi trường. | Reviewer, Audit |
| `docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md` | GM-27 | GM-27.2 | Đọc tài liệu đối chiếu | Báo cáo ma trận đối chiếu 3 Figma nodes (`330:3075`, `617:1671`, `379:1478`), kiến trúc dữ liệu và quy tắc nghiệp vụ. | Reviewer, Audit |

---

## 2. Acceptance criteria và trạng thái

| AC | Trạng thái | Môi trường & Lệnh | Evidence | Giới hạn & Ghi chú |
| --- | --- | --- | --- | --- |
| **AC1: Kiểm Top 1/2/3 và đồng hạng, malformed/thiếu field mới báo lỗi contract, legacy ẩn trường thiếu** | **Pass (code & automated tests)** | `npm test -- tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx` | 23/23 unit tests, 7/7 component tests pass. Kiểm tra trần điểm $2 \times \text{round1BallotCount}$, bắt buộc cặp status/reasonCode đúng 1:1, dense rank bằng nhau khi đồng điểm, legacy `unscored-v1` ẩn điểm/rank an toàn. | Synthetic RPC responses bám sát backend schema 0.16.0 / GM-20. |
| **AC2: Android refetch/retry/reconnect giữ nguyên winner/Top 3; lỗi Places không ảnh hưởng kết quả** | **Pass (code & automated tests) / Not run (Android thật)** | `liveDishResultScreen.test.tsx` ("Places lookup failure does not disrupt winner or podium presentation") | Caching kết quả terminal theo `roomId` chống refetch flicker; `fetchNearbyPlaces` bọc try/catch độc lập, lỗi quyền location/quota không làm thay đổi hay mất winner/podium. | Cần kiểm tra thực tế trên thiết bị Android vật lý khi có API key Google Places (GM-30/GM-33). |
| **AC3: Nhận thiết kế qua link node của task (330:3075, 617:1671, 379:1478)** | **Pass (contract & spec mapping)** | Xem [FIGMA_PARITY.md](FIGMA_PARITY.md) | Đối chiếu chi tiết 3 Figma nodes: Vinh danh kết quả, Podium đồng hạng, và Trạng thái Nearby Places. | Visual parity trên màn hình thật cần reviewer nghiệm thu. |
| **AC4: Chuyển reference code Figma sang React Native/Expo/TypeScript theo cấu trúc dự án** | **Pass** | `LiveDishResultScreen.tsx`, `DishResultFlow.tsx`, `PodiumStep.tsx` | Tái sử dụng trọn vẹn tokens màu sắc (`palette.warmOrange`, `palette.emeraldGreen`), typography (`typography.fontFamily`), component thẻ món, nút bấm ≥48dp. Không dùng Tailwind/web CSS. | Tuân thủ tuyệt đối quy chuẩn TypeScript strict và Expo baseline. |
| **AC5: Bàn giao bảng frame/state → route → fixture/API → expected/actual** | **Pass (documentation)** | Xem mục 1 trong [FIGMA_PARITY.md](FIGMA_PARITY.md) | Bảng ma trận 3 nodes, các trạng thái loading, finalizing, ready, error, empty, ties. | Đầy đủ bảng đối chiếu. |
| **AC6: Bố cục, chữ, màu, asset, khoảng cách, icon và hành động đúng Figma** | **Pass (component assertions) / Not run (Android Visual)** | `liveDishResultScreen.test.tsx` | Kiểm tra text labels "Món được chọn", "Quán gần bạn", huy hiệu hạng 1/2/3, điểm số "X điểm", nút Home / Tạo phiên mới. | Pixel-perfect comparison trên thiết bị vật lý chờ review của Trí. |
| **AC7: Có loading/empty/error/disabled/retry/Back, TalkBack, touch target ≥48dp, safe area** | **Pass** | `LiveDishResultScreen.tsx` | Trạng thái `loading`, `finalizing` (khi phòng chưa chốt xong), `error` kèm nút "Thử lại", `ResultStateContainer` xử lý safe area, các nút hành động đạt chuẩn touch target tối thiểu 48×48dp. | Hỗ trợ đầy đủ TalkBack và Dark mode theo cấu trúc dự án. |
| **AC8: Mock có nhãn và fixture cố định; API lỗi không chuyển âm thầm sang mock** | **Pass** | `DishResultEntry.tsx`, `liveDishResultScreen.test.tsx` | Phân nhánh tường minh: `mode === 'mock'` dùng Mock/fixture; `mode === 'real'` gọi `LiveResultRepository`. Khi API lỗi, hiển thị `ResultErrorState` với nút Thử lại, TUYỆT ĐỐI không fallback sang mock dữ liệu giả. | Đã xác minh bằng component test SCR-05 và SCR-07. |

---

## 3. Hướng dẫn tích hợp cho các task kế tiếp

### 3.1. Dành cho GM-30 (Google Places Client Integration)
- GM-30 cung cấp client Google Places cho món thắng (`fetchNearbyPlaces`).
- Interface `ResultRepository` đã chuẩn bị sẵn phương thức tùy chọn:
  ```typescript
  fetchNearbyPlaces?(params: {
    resultId: string;
    winnerDishId: string;
    dishName: string;
    location?: { latitude: number; longitude: number };
  }): Promise<ReadResult<NearbyState>>;
  ```
- Khi khởi tạo `LiveResultRepository`, GM-30 có thể truyền thêm `placesService` hoặc implement `fetchNearbyPlaces`.
- `LiveDishResultScreen` đã xử lý toàn bộ vòng đời Places (loading indicator, empty list, error banner, retry button, request permission button).

### 3.2. Dành cho GM-33 (QA & End-to-End Verification)
- Khởi động backend Supabase local hoặc staging:
  ```powershell
  npx supabase start
  ```
- Đặt biến môi trường trong `mobile/.env.local`:
  ```ini
  EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  ```
- Chạy Metro Bundler:
  ```powershell
  cd mobile
  npx expo start --clear
  ```
- Hoàn thành bỏ phiếu Vòng 1 và Vòng 2 trên 2 client (Host & Member).
- Khi Host chốt Vòng 2, cả 2 client tự động điều hướng sang `/room/result?roomId=<ROOM_ID>`.
- `LiveDishResultScreen` gọi RPC `dish_session('result', ...)` và hiển thị món thắng cùng Top 3.

---

## 4. Các luật bất biến sản phẩm (Product Invariants)

1. **Server là nguồn chân lý duy nhất (Server Authority)**:
   - Client hiển thị kết quả từ `result_projection` đã persist trên database.
   - Tuyệt đối không tự tính lại điểm (`2 * WANT + OK`) ở client.
   - Tuyệt đối không tự re-sort danh sách hoặc tự quyết định tie-break.
2. **Dense Ranking & Đồng hạng**:
   - Các món có cùng điểm số nhận cùng thứ hạng dense rank (ví dụ: hai món 8 điểm cùng mang huy hiệu Hạng 1; món kế tiếp 6 điểm mang huy hiệu Hạng 2).
   - Đáp ứng trực quan theo Figma node `617:1671`.
3. **Cô lập lỗi Places (Places Failure Isolation)**:
   - Dịch vụ Places chỉ được kích hoạt sau khi đã có món thắng canonical.
   - Bất kỳ sự cố nào từ phía Places (người dùng từ chối cấp quyền vị trí, mất mạng, hết quota Places API) chỉ ảnh hưởng tới khung danh sách quán bên dưới; TUYỆT ĐỐI không làm mất, xóa, hay thay đổi thông tin món thắng và bục vinh danh Top 3.
4. **Bảo mật phiếu bầu (Ballot Privacy)**:
   - Payload kết quả `result_projection` chỉ chứa điểm tổng hợp của món, TUYỆT ĐỐI không chứa phiếu bầu thô (raw ballots) hoặc danh tính người đã chọn món.
