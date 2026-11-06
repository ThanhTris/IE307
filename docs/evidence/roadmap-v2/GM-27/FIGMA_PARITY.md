# Báo cáo đối chiếu Figma — GM-27 / roadmap-v2: UI–API kết quả Top 3 và Places độc lập

- **Task**: GM-27 (Issue #88)
- **Assignee**: @rosy179 (Trang)
- **Reviewer**: @ThanhTris (Trí)
- **Figma file**: `3Ysh0mOAEkAgA5DgZPSC1j` (Gì Cũng Được App)
- **Mã revision UI**: `ui-figma-final/2026-10-25/GM-27.2`
- **Màn hình thực tế trong code**:
  - `mobile/src/features/result/screens/LiveDishResultScreen.tsx`
  - `mobile/src/features/result/screens/DishResultFlow.tsx`
  - `mobile/src/features/result/screens/DishResultScreen.tsx`
  - `mobile/src/shared/ui/result/ResultPodium.tsx`
  - `mobile/src/shared/ui/result/ResultPodiumGraphic.tsx`
  - `mobile/src/features/result/components/NearbyPlacesSection.tsx`
  - `mobile/src/features/result/components/WinnerCelebration.tsx`
  - `mobile/src/features/result/components/ResultCompanions.tsx`
  - `mobile/src/bootstrap/DishResultEntry.tsx`
  - `mobile/src/app/room/result.tsx`
  - `mobile/src/app/room/no-consensus.tsx`
- **Tầng dịch vụ & Gateway**:
  - `mobile/src/features/result/services/resultRepository.ts` (`LiveResultRepository`, `MockResultRepository`)

---

## 1. Ma trận đối chiếu 3 Figma Nodes

| Figma Node | Tên Frame / Trạng thái | Yêu cầu thiết kế Figma | Hiện thực thực tế trong source & routes | Trạng thái đối chiếu |
| --- | --- | --- | --- | --- |
| `330:3075` | **11 · Vinh danh / Kết quả / Bản đồ** | - Vinh danh món thắng chung cuộc ở vị trí nổi bật nhất: ảnh món lớn, tên món, mô tả, huy hiệu Quán quân, số điểm đạt được.<br>- Bục vinh danh Top 3 (Podium) hiển thị 3 món dẫn đầu theo bậc thang trực quan: Hạng 1 (ở giữa, cao nhất), Hạng 2 (bên trái), Hạng 3 (bên phải), kèm điểm số "X điểm".<br>- Danh sách thành viên cùng tham gia (Companions avatars).<br>- Khung danh sách quán ăn gần bạn (Nearby Places) phục vụ món thắng: thẻ quán, khoảng cách (km), địa chỉ, đánh giá sao, bản đồ.<br>- Các nút hành động chính: "Về trang chủ", "Tạo phiên mới". | Hiện thực trong `LiveDishResultScreen.tsx` kết hợp `DishResultFlow.tsx` trên route `/room/result?roomId=...`. Dữ liệu món thắng, điểm số và Top 3 được nhận nguyên vẹn từ canonical `result_projection` của backend qua `LiveResultRepository.getResult`. Hỗ trợ animation chúc mừng (Celebration Modal) và danh sách companions từ room snapshot. Các hành động ngoài trả `{ ok: false }` chờ GM-30 triển khai linking thật. | **Pass (Code & Component Test) / Not run (Android Visual)** |
| `617:1671` | **GCD / Result Podium · Đồng hạng** | - Xử lý trường hợp có các món đồng điểm trong Top 3 (ví dụ 2 món cùng đạt điểm cao nhất hoặc đồng hạng 2/3).<br>- Áp dụng dense ranking: các món cùng điểm nhận cùng một huy hiệu thứ hạng (ví dụ cả hai cùng là "Hạng 1").<br>- Không tự ý dùng hàm ngẫu nhiên hay tie-break ở client để loại bỏ trạng thái đồng hạng.<br>- Bục vinh danh và thẻ món hiển thị nhất quán thứ hạng đồng hạng. | Hiện thực trong `resultRepository.ts` (`mapRawToScoredResult`, `mapRawToResultDish`) và `ResultPodium.tsx` (`ResultPodiumGraphic.tsx`). Giữ nguyên `rank` từ backend canonical engine; các món có cùng rank nhận cùng badge và bậc bục tương ứng. Đã kiểm chứng qua unit test REP-06 và component test SCR-02, SCR-10. | **Pass (Code & Component Test) / Not run (Android Visual)** |
| `379:1478` | **GCD / Nearby Places State** | - Quản lý các trạng thái của khung quán ăn gần bạn:<br>  1. `loading`: Hiển thị skeleton hoặc spinner khi đang tìm kiếm quán quanh vị trí người dùng.<br>  2. `ready`: Danh sách các quán ăn gần nhất phục vụ món thắng, có khoảng cách và địa chỉ cụ thể.<br>  3. `empty`: Thông báo không tìm thấy quán nào trong bán kính quy định.<br>  4. `permission_denied`: Banner giải thích cần quyền vị trí kèm nút "Cấp quyền truy cập vị trí".<br>  5. `error` / `offline`: Banner thông báo lỗi kết nối hoặc quota kèm nút "Thử lại".<br>- **Nguyên tắc cô lập và chống treo spinner**: Mọi trạng thái hay lỗi của Places TUYỆT ĐỐI không làm ẩn, mất, hay thay đổi thông tin món thắng ở phía trên. Khi gặp lỗi, hệ thống lập tức thoát khỏi trạng thái loading và hiển thị thẻ lỗi kèm nút "Thử lại". | Hiện thực trong `NearbyPlacesSection.tsx` và `LiveDishResultScreen.tsx`. `fetchNearbyPlaces` được gọi bất đồng bộ không chặn luồng vinh danh; khi thất bại hoặc ngoại lệ, component chuyển sang trạng thái lỗi `error` hoặc `offline` kèm nút "Thử lại" mà không ảnh hưởng tới món thắng hay bị khóa spinner vô hạn. Đã kiểm chứng qua unit test REP-15, REP-16 và component test SCR-06, SCR-09. | **Pass (Code & Component Test) / Not run (Android Visual)** |

---

## 2. Kiến trúc Luồng Dữ liệu và Phân tầng

```mermaid
flowchart TD
    subgraph Route ["Route Layer (/room/result?roomId=...)"]
        R["mobile/src/app/room/result.tsx"] --> E["DishResultEntry (mode='real', key=roomId)"]
    end

    subgraph UI ["Feature UI Layer"]
        E --> L["LiveDishResultScreen"]
        L --> F["DishResultFlow"]
        F --> P["ResultPodium (Node 330:3075 & 617:1671)<br/>Top 3 & Dense Rank Ties"]
        F --> N["NearbyPlacesSection (Node 379:1478)<br/>Loading / Ready / Error / Permission"]
        F --> C["CelebrationModal & Companions"]
    end

    subgraph Service ["Repository Layer"]
        L --> Repo["LiveResultRepository"]
        Repo --> Cache["In-Memory Terminal Result Cache<br/>(Key: identity:roomId:contractVersion)"]
        Repo --> M1["mapRawToScoredResult<br/>(Strict Validation & Bounds Check)"]
        Repo --> M2["mapSnapshotMembersToCompanions"]
        Repo -.-> Places["placesFetcher<br/>(Places Isolation Wrapper)"]
    end

    subgraph Backend ["Supabase RPC Layer"]
        Repo -->|dish_session('result', ...)| RPC["public.dish_session<br/>gm20_canonical_private.result_projection"]
    end
```

---

## 3. Các quy tắc chuẩn hóa và xử lý biên

1. **Bảo tồn thứ hạng và điểm số máy chủ (Server Authority)**:
   - Điểm số `score` và thứ hạng `rank` do server tính toán và lưu trữ (`finalized_at`).
   - Client tuyệt đối không chạy lại thuật toán tính điểm $2 \times \text{WANT} + \text{OK}$ hay xếp lại thứ tự mảng `topDishes`.
2. **Kiểm tra trần điểm tối đa và phiên bản hợp đồng**:
   - Nếu payload trả về điểm của bất kỳ món nào vượt quá $2 \times \text{round1BallotCount}$ (số điểm lý thuyết tối đa khi tất cả thành viên vote WANT ở Vòng 1), client từ chối payload và trả về lỗi `MALFORMED_RESPONSE`.
   - Bắt buộc đầy đủ 4 phiên bản hợp đồng (`contractVersion`, `policyVersion`, `scoreVersion`, `rankingVersion`). Từ chối các phiên bản không hỗ trợ như `unsupported-v99`.
   - Bắt buộc `roundDishId` không rỗng trên món thắng và mọi món Top 3, không tự ý fallback về `dishId`.
3. **Cặp trạng thái và lý do kết thúc (Status / Reason Pairing)**:
   - `DECIDED` + Vòng 1 bắt buộc có lý do `UNANIMOUS_WANT`.
   - `DECIDED` + Vòng 2 bắt buộc có lý do `ACCEPTABLE_FINAL`.
   - `NO_CONSENSUS` + Vòng 1 bắt buộc có lý do `EMPTY_INTERSECTION`, món thắng `null`, `topDishes` rỗng.
   - `NO_CONSENSUS` + Vòng 2 bắt buộc có lý do `ALL_REMOVED`, món thắng `null`, `topDishes` rỗng.
   - Bất kỳ sự sai lệch nào giữa status, round và reasonCode đều bị coi là vi phạm contract và trả về `MALFORMED_RESPONSE`.
4. **Vòng đời bộ nhớ đệm và bảo mật phiên (Cache Invalidation & Session Loss)**:
   - Bộ nhớ đệm phân vùng theo `${identity}:${roomId}:${contractVersion}`.
   - Khi server trả về mã lỗi quyền hạn (`NOT_MEMBER`, `AUTH_REQUIRED`, `ROOM_EXPIRED`, `PERMISSION_DENIED`), client lập tức dọn dẹp cache của phòng tương ứng và tăng generation counter, ngăn cản các phản hồi trễ (late in-flight responses) khôi phục dữ liệu trái phép.
5. **Chống rò rỉ ngữ cảnh khi chuyển phòng (Context Switching Hygiene)**:
   - Khi `roomId` thay đổi, `LiveDishResultScreen` lập tức thiết lập lại trạng thái nội bộ (`effectiveInput = null`, `effectiveReadState = 'loading'`), bảo đảm thông tin phòng cũ không hiển thị nhấp nháy trên phòng mới.
   - `DishResultEntry` gắn `key={roomId}` để buộc React tái khởi tạo component sạch hoàn toàn.
6. **Hỗ trợ kết quả legacy (`legacy-unscored-v1`)**:
   - Đối với các phiên bản lịch sử chưa có hệ thống tính điểm, client chuyển đổi sang capability `unscored-v1`, ẩn điểm số và thứ hạng một cách an toàn mà không làm sập ứng dụng.
7. **Độc lập hoàn toàn với Google Places**:
   - Quá trình tải danh sách quán gần bạn diễn ra độc lập sau khi kết quả đã sẵn sàng.
   - Bất kỳ lỗi nào (từ chối quyền vị trí, lỗi mạng, lỗi provider) lập tức chuyển sang trạng thái thẻ lỗi kèm nút "Thử lại", không làm gián đoạn bục vinh danh và không bị khóa spinner vô hạn.
8. **Tính trung thực của dữ liệu giá (Price Truthfulness)**:
   - Khi `sourceRef` và `source` vắng mặt, client gán `priceReference = null`, không tự ý bịa đặt nhãn "Menu".

---

## 4. Giới hạn nghiệm thu

- **Thiết bị Android vật lý**: `Not run`. Kiểm thử tự động trên Jest/RTL đã kiểm chứng các kịch bản logic khoanh vùng, hợp đồng RPC v4 và hành vi component. Đo lường kích thước pixel, độ tương phản và kiểm tra TalkBack thực tế trên thiết bị vật lý chờ reviewer nghiệm thu.
- **Backend Staging trực tiếp**: `Not run`. Toàn bộ dữ liệu kết nối đã được kiểm chứng bằng hợp đồng RPC v4 và dữ liệu synthetic chuẩn.
