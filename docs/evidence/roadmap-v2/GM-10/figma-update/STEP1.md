# GM-10.2 — bước 1: đầu vào và phạm vi thực thi

Ngày2026-11-02, base1939d35, branch `codex/gm-10-figma-update`.
Start gate live10:15:53Z: READY_TO_CLAIM; owner Tuấn/reviewer Trí.
Chỉ là chuẩn bị triển khai, không là approval hoặc visual acceptance.

Nguồn/frame/state: [bảng kiểm PNG](FIGMA_REFERENCE_AUDIT.md),
[kế hoạch](PLAN.md). Áp dụng quyền người dùng: PNG Figma là tham khảo,
bổ sung state còn thiếu bằng pattern hiện có; không bỏ AC để khớp ảnh.
MCP live chưa truy cập được; chưa xác minh revision Copy/variables live.

## Artifact đã nhận

- GM-05 token/component trên base1939d35: primary238633, nềnFFFCF3,
  Inter qua AppFontProvider, AppHeader/AppButton/DishCount/SheetDialog,
  StatusNotice; không đổi token nền hoặc package.
- GM-07 TypeScript contracts hiện tại là food-v1/GM-07.1: RoomContext vẫn
  bắt buộc anchor/radius/serviceMode; không dùng nó để encode dish-only.
- GM-07.B/supplement có spec/schema và HANDOFF28/10 trên base, nhưng chưa
  có client mobile dish-only tương ứng. Chỉ định nghĩa UI port/intent và
  mock ở composition; consumer GM-24/25 nhận adapter/version sau.
- Khẩu vị tái dùng UserPreferences (cuisine/category/flavor/temperature/
  historyConsent); IDs chỉ lấy taxonomy đã bàn giao, giữ unknown/null.
  Mặc định tài khoản và snapshot phòng tách biệt qua input của UI port;
  không tự ghi preferences tài khoản từ bản sửa trong phòng.

## Route và file ownership

- `/room/create-entry`: GM-09 presentation, inject callback mở setup mock.
- `/room/setup`: màn flow dish-only mock dùng form mới; state/provider giữ
  draft/room/version khi chuyển thiết lập và khẩu vị. Tách screens/hooks/
  components/services, route chỉ composition.
- `/room/context`, `/room/preferences`: có consumer legacy GM-24/25 thật;
  không xóa trước khi chuyển các caller/tests. Luồng mock sản phẩm được
  chuyển sang form mới; compatibility legacy được phân biệt qua roomId và
  entry QA khi cần. Không biến API error thành fallback mẫu.
- Màn phòng chờ thuộc GM-11: nhận callback/room handle sau ACK, không tạo
  lobby hoặc roster giả để trông như consumer thật đã tích hợp.

## Gap và quyết định

1. Unknown taxonomy, ACK unknown/stale/refetch lỗi: bổ sung notice/retry và
   khóa thao tác theo contract, giữ nháp và intent. Không sửa semantics BE.
2. Nhãn ngân sách mỗi người là ưu tiên UI; không quy đổi giá món/observation.
   Port nhận lựa chọn, mapping wire phải do adapter xác minh đơn vị hỗ trợ.
3. Slot ảnh minh họa có một số icon chưa có asset rời; tái dùng đúng glyph
   GM-09, bổ sung masks từ export được người dùng cấp khi cần, không emoji.
4. Chỉ hiện taxonomy ID thật nhận từ caller. Khác số lượng/nhãn so với
   Figma phải nói rõ dữ liệu khả dụng, không chế ID Hàn/Thái/Âu hay món.
5. Native screenshot/Expo Go, Samsung IME, font200/TalkBack: Not run.
   Python ở bước lập kế hoạch lỗi do môi trường, chưa coi regression Pass;
   dùng dependency test đã có trong workspace nếu phù hợp, không sửa test
   hoặc cài/nâng dependency app để vượt lỗi.

## Cách kiểm từng bước

TS/lint/architecture + test tương tác đúng phần sửa; không tăng timeout.
Sau baseline install kiểm locked Expo. Bước6 chạy full mobile regression,
validator/index/diff và Python trong môi trường phù hợp. Các ca native và
visual chạy trên thiết bị ở bước7, không suy Pass từ Jest/export.
Commit từng bước, chưa push; dừng báo người dùng khi lỗi nghiêm trọng.
