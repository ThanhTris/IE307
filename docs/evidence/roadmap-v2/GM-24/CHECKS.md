# GM-24 checks: UI–API preview pool và thiết lập dish-only

## Cập nhật sau review PR #151 — 2026-11-04 (Phản hồi Reviewer @ThanhTris)

Đã xử lý dứt điểm toàn bộ 6 mục theo comment review [PR #151 (Comment #6627750216)](https://github.com/ThanhTris/IE307/pull/151#issuecomment-6627750216):

1. **[P1] Giảm số món ở chế độ API thật (`confirmReduction`)**:
   - Loại bỏ hoàn toàn đường gọi cố định `previewDishPoolMock('exact_20_lunch')`.
   - `confirmReduction` và `loadPreview` sử dụng chung hàm nạp hợp nhất `executePreviewLoad(targetCount)` theo đúng `envMode` được chọn.
   - Khi ở `real_api`, thao tác giảm 20 → 15 gọi `previewDishPoolLive` với `dishCount: 15`. Nếu API thật lỗi, UI hiển thị đúng lỗi, không lấy món mock thay thế và không cho phép xác nhận bản nháp.
2. **[P2] Tránh kẹt trạng thái loading khi sửa thiết lập trong lúc request pending**:
   - `clearPreviewState` tăng `generationRef` đồng thời lập tức đặt `previewLoading(false)` và `previewError(null)`.
   - Khi request A đang chờ mà người dùng sửa form hoặc chọn thiết lập mới, nút tải không bị vô hiệu hóa vĩnh viễn. Response của request cũ đến trễ bị hủy bỏ và không làm thay đổi trạng thái của request mới.
3. **[P1] Khởi tạo API thật đầy đủ public key và session abstraction**:
   - Bổ sung cấu hình `publicKey` (`EXPO_PUBLIC_SUPABASE_ANON_KEY`) vào `FetchTransport`.
   - Hỗ trợ tiêm (inject) `apiClient`, `transport` và `sessionManager` (GM-16) qua tham số của hook để kiểm thử và tích hợp sạch sẽ, không dùng ép kiểu `(client as any).transport`.
   - Không ghi token hoặc public key thực tế vào mã nguồn hay evidence.
4. **[P2] Adapter `previewDishPoolLive` kiểm tra nghiêm ngặt phản hồi theo GM-18.2**:
   - Kiểm tra phiên bản hợp đồng: Bắt buộc khớp chính xác `'dish-catalogue/roadmap-v2/GM-18.2'`.
   - Kiểm tra số lượng món chính xác: Từ chối phản hồi nếu `dishes.length !== requestedCount` (loại bỏ lỗi chấp nhận 1 món khi yêu cầu 20).
   - Kiểm tra định danh: Bắt buộc từng món có `dishId` và `name` hợp lệ; từ chối khi phát hiện mã món trùng lặp.
   - Không tự ý bịa đặt (fabricate) ID, không tự gán `usageRights: 'granted'` cho ảnh, không ép tiền tệ sang `'VND'` hay đơn vị sang `'portion'` nếu server trả về `null`.
5. **[CI] Sửa lỗi ESLint trên Mobile**:
   - Loại bỏ `useEffect` gây lỗi `react-hooks/set-state-in-effect`. Khởi tạo state bằng hàm khởi tạo và xử lý thay đổi môi trường/kịch bản qua callback chuyên biệt.
   - Loại bỏ truy cập `generationRef.current` trong thân render của hook (`react-hooks/refs`). Giá trị `generation` được quản lý đồng bộ qua state.
   - Tránh gọi `Date.now()` trực tiếp trong thân render (`react-hooks/purity`).
   - Kết quả: `0 lỗi, 0 cảnh báo` trên toàn bộ tệp GM-24 (`useDiscoveryContext.ts`, `DiscoveryContextScreen.tsx`, `roomSetup.ts`).
6. **Đồng hồ môi trường thật**:
   - Ở chế độ `mock`, giữ nguyên mốc thời gian kiểm thử cố định (`2026-10-15T11:30:00.000Z`).
   - Ở chế độ `real_api`, đồng hồ tự động cập nhật theo thời gian thực (wall clock) hoặc thời gian máy chủ, khắc phục hiện tượng kẹt vào ngày cũ khi mở ứng dụng ở các ngày khác nhau.

---

## Bảng kết quả kiểm tra xác minh (Verification Matrix)

| STT | Hạng mục kiểm tra | Lệnh / File kiểm | Kết quả kỳ vọng | Kết quả thực tế | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | **Unit Test: roomSetup service** | `npm --prefix mobile test -- tests/unit/roomSetup.test.ts` | 61 unit tests: mock scenarios, adapter từ chối 20→1, kiểm tra số món chính xác, từ chối ID trùng/thiếu, từ chối version sai, giữ null trung thực, 409 shortage | 61/61 passed | **Pass (automated unit)** |
| 2 | **Component Test: DiscoveryContextScreen** | `npm --prefix mobile test -- tests/component/contextScreen.test.tsx` | 13 component tests: bao phủ 6 Figma nodes, stepper min/max, live reduction, in-flight cancellation, past time recovery, audit panel | 13/13 passed | **Pass (automated component)** |
| 3 | **ESLint & Code Standards** | `npm --prefix mobile run lint` | 0 lỗi và 0 cảnh báo trên toàn bộ các tệp nguồn GM-24 | 0 errors trên GM-24 | **Pass** |
| 4 | **TypeScript Strict Compilation** | `npx --prefix mobile tsc --noEmit` | 0 lỗi TypeScript trên toàn bộ các tệp nguồn và kiểm thử của GM-24 | 0 errors trên GM-24 | **Pass** |
| 5 | **Repository Integrity Validator** | `python scripts/validate_repository.py` | Kiểm tra tài liệu, links, JSON task manifest, dependencies và FR traceability | Gi Cung Duoc repository validation OK | **Pass** |
| 6 | **Git Diff Whitespace Check** | `git diff --check` | Không có lỗi whitespace, trailing space hoặc conflict markers | Clean | **Pass** |
| 7 | **Figma Parity Verification** | `docs/evidence/roadmap-v2/GM-24/FIGMA_PARITY.md` | Đối chiếu 6 nodes Figma với các thành phần UI, trạng thái stepper, shortage cards, receipt | 100% đối chiếu thành công | **Pass** |
| 8 | **Thiết bị Android vật lý / Expo Go thực tế** | Chạy Expo Go trên máy thật | Trải nghiệm vuốt chạm, font Inter, Dark mode trên thiết bị thực | Chờ reviewer @ThanhTris kiểm tra trực tiếp trên thiết bị vật lý | **Not run (chờ thiết bị thật)** |

---

## Chi tiết các kịch bản kiểm thử mới bổ sung

1. **Giảm số món trên Live API (Review #1)**:
   - Request ban đầu 20 món nhận HTTP 409 Shortage 15.
   - Bấm nút "Giảm còn 15 món" gọi tiếp RPC với payload `dishCount: 15`.
   - Nếu request sau thất bại (ví dụ: mất mạng), màn hình hiển thị thông báo lỗi, danh sách món rỗng, không tự động sinh món mock và không cho phép xác nhận bản nháp.
2. **Hủy yêu cầu in-flight & Không kẹt loading (Review #2)**:
   - Gửi yêu cầu nạp danh sách phản hồi chậm. Nút hiển thị trạng thái `Đang xử lý…`.
   - Người dùng thay đổi thông số biểu mẫu (ví dụ: chuyển sang Bữa sáng).
   - Nút lập tức kết thúc trạng thái loading và mở khóa để người dùng tương tác tiếp.
   - Khi phản hồi của request cũ đến trễ, hệ thống nhận diện `generation` đã thay đổi và hủy bỏ toàn bộ kết quả cũ.
3. **Từ chối dữ liệu thiếu hoặc sai định dạng từ máy chủ (Review #4)**:
   - Yêu cầu 20 món nhưng máy chủ trả 1 món: Từ chối với mã lỗi `INVALID_PAYLOAD`.
   - Mã món ăn trùng lặp: Từ chối với mã lỗi `INVALID_PAYLOAD`.
   - Thiếu `dishId` hoặc `name`: Từ chối với mã lỗi `INVALID_PAYLOAD`.
   - Khác phiên bản hợp đồng `dish-catalogue/roadmap-v2/GM-18.2`: Từ chối với mã lỗi `INVALID_PAYLOAD`.
