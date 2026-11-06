# Bàn giao đầu ra task — GM-27 / roadmap-v2

## Current local handoff — 2026-11-06

Source: PR issue #88 branch `issue88_task_gm27` / `issue88_figma_ui_gm27`, baseline `origin/main` (`bb2103a`, bao gồm GM-26 PR #156).
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
| `mobile/src/features/result/services/resultRepository.ts` | GM-27 | GM-27.2 | `import { LiveResultRepository, createLiveResultRepository, MockResultRepository, createMockResultRepository } from '@/features/result'` | Interface `ResultRepository` thống nhất gọi RPC `dish_session('result', ...)` v4; bộ nhớ đệm kết quả terminal phân vùng theo `${identity}:${roomId}:${contractVersion}`; vô hiệu hóa cache khi mất quyền (`NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`); generation counter chống late in-flight response ghi đè cache đã hủy; adapter mapper và validator nghiêm ngặt (`roundDishId` bắt buộc, trần điểm $2 \times \text{round1BallotCount}$, rejection phiên bản lạ `unsupported-v99`, giá trị `priceReference = null` khi thiếu nguồn thực tế); cô lập lỗi Places. | GM-30, GM-33, App Shell |
| `mobile/src/features/result/screens/LiveDishResultScreen.tsx` | GM-27 | GM-27.2 | `import { LiveDishResultScreen } from '@/features/result'` | Component màn hình kết quả live: kết nối `ResultRepository`, tự động tải đồng thời room snapshot để lấy danh sách companions; polling `NOT_READY` có backoff hữu hạn (tối đa 10 lần) kèm fallback error và nút thử lại; dọn dẹp timer khi unmount / đổi phòng; reset state tức thì khi `roomId` đổi (`isRoomChanged`), chống rò rỉ dữ liệu giữa các phòng; hiển thị podium Top 3 / đồng hạng; cô lập lỗi Places kèm nút thử lại; `handleExternalAction` trả `{ ok: false }` chờ GM-30. | UI Consumer, App Shell |
| `mobile/src/bootstrap/DishResultEntry.tsx` | GM-27 | GM-27.2 | `<DishResultEntry mode="real" roomId={roomId} ... />` | Entry point phân nhánh mock/real cho kết quả món: ở mode `real`, render `<LiveDishResultScreen key={roomId} roomId={roomId} ... />` khi có `roomId` (dùng `key={roomId}` đảm bảo tái tạo component sạch); fallback `StatusNotice` an toàn khi thiếu `roomId`. | Router, App Shell |
| `mobile/src/app/room/result.tsx` | GM-27 | GM-27.2 | Route `/room/result?roomId=...` | Route màn hình kết quả: nhận query param `roomId`, chuyển tiếp vào `DishResultEntry` để hiển thị kết quả live thật từ database/RPC. | Navigation, Router |
| `mobile/src/app/room/no-consensus.tsx` | GM-27 | GM-27.2 | Route `/room/no-consensus?roomId=...` | Route màn hình không đạt đồng thuận: nhận query param `roomId`, kích hoạt luồng No Consensus tương ứng với lý do (`EMPTY_INTERSECTION` hoặc `ALL_REMOVED`). | Navigation, Router |
| `mobile/tests/unit/resultRepository.test.ts` | GM-27 | GM-27.2 | `npm --prefix mobile test -- tests/unit/resultRepository.test.ts` | 38 unit tests kiểm tra toàn diện `LiveResultRepository`, phân vùng cache theo identity, hủy cache khi mất quyền, chặn late response ghi đè, polling NOT_READY, RPC error mapping, trần điểm $2 \times \text{round1BallotCount}$, status/reason pairings, dense ranking ties, legacy compatibility, metadata giá trung thực, và cô lập lỗi Places. | CI / Regression |
| `mobile/tests/component/liveDishResultScreen.test.tsx` | GM-27 | GM-27.2 | `npm --prefix mobile test -- tests/component/liveDishResultScreen.test.tsx` | 13 component tests kiểm tra `LiveDishResultScreen` và `DishResultEntry`: Top 3 podium, đồng hạng dense rank, EMPTY_INTERSECTION, ALL_REMOVED, retry, cô lập lỗi Places và phục hồi sau lỗi, bounded polling NOT_READY, dọn dẹp timer khi unmount, chuyển phòng sạch không rò rỉ dữ liệu, và chế độ real/mock. | CI / Regression |
| `docs/evidence/roadmap-v2/GM-27/CHECKS.md` | GM-27 | GM-27.2 | Đọc tài liệu đối chiếu | Báo cáo chi tiết các ca kiểm thử, kết quả chạy thực tế, lệnh tái lập và giới hạn môi trường. | Reviewer, Audit |
| `docs/evidence/roadmap-v2/GM-27/FIGMA_PARITY.md` | GM-27 | GM-27.2 | Đọc tài liệu đối chiếu | Báo cáo ma trận đối chiếu 3 Figma nodes (`330:3075`, `617:1671`, `379:1478`), kiến trúc dữ liệu và quy tắc nghiệp vụ. | Reviewer, Audit |

---

## 2. Acceptance criteria và trạng thái

| AC | Trạng thái | Môi trường & Lệnh | Evidence | Giới hạn & Ghi chú |
| --- | --- | --- | --- | --- |
| **AC1: Kiểm Top 1/2/3 và đồng hạng, malformed/thiếu field mới báo lỗi contract, legacy ẩn trường thiếu** | **Pass (code & automated tests)** | `npm --prefix mobile test -- tests/unit/resultRepository.test.ts tests/component/liveDishResultScreen.test.tsx` | 38/38 unit tests, 13/13 component tests pass. Kiểm tra trần điểm $2 \times \text{round1BallotCount}$, bắt buộc cặp status/reasonCode đúng 1:1, dense rank bằng nhau khi đồng điểm, từ chối phiên bản lạ (`unsupported-v99`), bắt buộc `roundDishId`, `priceReference = null` khi thiếu nguồn, legacy `unscored-v1` ẩn điểm/rank an toàn. | Synthetic RPC responses bám sát backend schema 0.16.0 / GM-20. |
| **AC2: Android refetch/retry/reconnect giữ nguyên winner/Top 3; lỗi Places không ảnh hưởng kết quả** | **Pass (code & automated tests) / Not run (Android thật)** | `liveDishResultScreen.test.tsx` & `resultRepository.test.ts` | Caching kết quả terminal theo `${identity}:${roomId}:${contractVersion}` chống refetch flicker; hủy cache khi mất session/quyền (`NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`); `fetchNearbyPlaces` bọc try/catch độc lập, lỗi mạng/hết quota/từ chối quyền chuyển sang trạng thái lỗi kèm nút thử lại mà không làm mất winner/podium. | Cần kiểm tra thực tế trên thiết bị Android vật lý khi có API key Google Places (GM-30/GM-33). |
| **AC3: Nhận thiết kế qua link node của task (330:3075, 617:1671, 379:1478)** | **Pass (contract & spec mapping)** | Xem [FIGMA_PARITY.md](FIGMA_PARITY.md) | Đối chiếu chi tiết 3 Figma nodes: Vinh danh kết quả, Podium đồng hạng, và Trạng thái Nearby Places. | Visual parity trên màn hình thật cần reviewer nghiệm thu. |
| **AC4: Chuyển reference code Figma sang React Native/Expo/TypeScript theo cấu trúc dự án** | **Pass** | `LiveDishResultScreen.tsx`, `DishResultFlow.tsx`, `ResultPodium.tsx` | Tái sử dụng trọn vẹn tokens màu sắc (`palette.warmOrange`, `palette.emeraldGreen`), typography (`typography.fontFamily`), component thẻ món, nút bấm ≥48dp. Không dùng Tailwind/web CSS. | Tuân thủ tuyệt đối quy chuẩn TypeScript strict và Expo baseline. |
| **AC5: Bàn giao bảng frame/state → route → fixture/API → expected/actual** | **Pass (documentation)** | Xem mục 1 trong [FIGMA_PARITY.md](FIGMA_PARITY.md) | Bảng ma trận 3 nodes, các trạng thái loading, finalizing, ready, error, empty, ties. | Đầy đủ bảng đối chiếu. |
| **AC6: Bố cục, chữ, màu, asset, khoảng cách, icon và hành động đúng Figma** | **Pass (component assertions) / Not run (Android Visual)** | `liveDishResultScreen.test.tsx` | Kiểm tra text labels "Món được chọn", "Quán gần bạn", huy hiệu hạng 1/2/3, điểm số "X điểm", nút Home / Tạo phiên mới. | Pixel-perfect comparison trên thiết bị vật lý chờ review của Trí. |
| **AC7: Có loading/empty/error/disabled/retry/Back, TalkBack, touch target ≥48dp, safe area** | **Pass** | `LiveDishResultScreen.tsx` | Trạng thái `loading`, `finalizing` (khi phòng chưa chốt xong kèm polling có ngưỡng dừng 10 lần), `error` kèm nút "Thử lại", `ResultStateContainer` xử lý safe area, các nút hành động đạt chuẩn touch target tối thiểu 48×48dp. | Hỗ trợ đầy đủ TalkBack và Dark mode theo cấu trúc dự án. |
| **AC8: Mock có nhãn và fixture cố định; API lỗi không chuyển âm thầm sang mock** | **Pass** | `DishResultEntry.tsx`, `liveDishResultScreen.test.tsx` | Phân nhánh tường minh: `mode === 'mock'` dùng Mock/fixture; `mode === 'real'` gọi `LiveResultRepository`. Khi API lỗi, hiển thị `ResultErrorState` với nút Thử lại, TUYỆT ĐỐI không fallback sang mock dữ liệu giả. | Đã xác minh bằng component test SCR-05 và SCR-07. |

---

## 3. Hướng dẫn tích hợp cho các task kế tiếp

### 3.1. Dành cho GM-30 (Google Places Client Integration)
- GM-30 cung cấp client Google Places cho món thắng (`placesFetcher`).
- Interface `LiveResultRepositoryDeps` và `ResultRepository` sử dụng signature hàm `placesFetcher` với tham số `latitude` và `longitude` ở cấp cao nhất (top-level):
  ```typescript
  export interface FetchNearbyPlacesParams {
    resultId: string;
    winnerDishId: string;
    dishName?: string;
    latitude?: number;
    longitude?: number;
  }

  export interface LiveResultRepositoryDeps {
    roomRepository?: RoomRepository;
    client?: ApiClient;
    rpcCaller?: (name: string, params: Record<string, unknown>) => Promise<unknown>;
    contractVersion?: string;
    placesFetcher?: (params: FetchNearbyPlacesParams) => Promise<ReadResult<NearbyState>>;
    getCurrentIdentity?: () => string | null;
  }
  ```
- Khi khởi tạo repository trong module GM-30:
  ```typescript
  const repo = createLiveResultRepository({
    placesFetcher: async (params: FetchNearbyPlacesParams) => {
      // Thực hiện gọi Places API trực tiếp từ mobile
    },
  });
  ```
- `LiveDishResultScreen` đã xử lý toàn bộ vòng đời Places (loading indicator, empty list, error banner kèm nút "Thử lại", permission denied kèm nút cấp quyền).
- Hành động ngoài (`handleExternalAction`) hiện tại trả `{ ok: false }` để hiển thị thông báo "Chưa thực hiện được thao tác. Hãy thử lại." cho đến khi GM-30 triển khai linking thật.

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
   - Bất kỳ sự cố nào từ phía Places (người dùng từ chối cấp quyền vị trí, mất mạng, hết quota Places API) chỉ ảnh hưởng tới khung danh sách quán bên dưới; TUYỆT ĐỐI không làm mất, xóa, hay thay đổi thông tin món thắng và bục vinh danh Top 3. Khi lỗi xảy ra, khung quán chuyển sang thẻ lỗi có nút "Thử lại", không bị treo spinner.
4. **Bảo mật phiếu bầu (Ballot Privacy)**:
   - Payload kết quả `result_projection` chỉ chứa điểm tổng hợp của món, TUYỆT ĐỐI không chứa phiếu bầu thô (raw ballots) hoặc danh tính người đã chọn món.
5. **Tính trung thực của dữ liệu giá (Price Truthfulness)**:
   - Khi trường `sourceRef` và `source` từ server vắng mặt hoặc rỗng, client giữ nguyên `priceReference = null`, không tự ý thêm nhãn giả định như "Menu".
