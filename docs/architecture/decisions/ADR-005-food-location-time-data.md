# ADR-005 — Data món theo nơi bán và thời điểm ăn

Ngày 2026-10-07. Status: Proposed for independent review. Chủ dự án yêu cầu lập plan về cuisine/đặc tính món, lọc vị trí và giờ bán; thời tiết/tâm trạng nâng cao. Chủ dự án đã yêu cầu tiếp chuyển plan thành spec/task/dependency/quy trình PR. Tài liệu hiện hành food-v1 đã đồng bộ; GM-01 chờ review độc lập, chưa chấp thuận triển khai/provider/migration hoặc tự Accepted.

## Bối cảnh

Baseline v0.2 dùng location sau khi chốt món để mở tìm quán/review; venue radius GM-08 là P1 sau release. Yêu cầu mới cần lọc món có nơi bán phù hợp ngay khi tạo pool. Chỉ thêm region/giờ vào dishes không đủ: một món có nhiều quán/chi nhánh và lịch bán khác nhau; giờ mở quán khác giờ phục vụ món.

## Quyết định sản phẩm ghi nhận và đề xuất kỹ thuật

- Cuisine/nguồn gốc món tách khỏi địa điểm cung cấp thực tế; temperature tách flavor/intensity; meal_slot tách lịch quán/lịch món.
- Gợi ý thực tế trong vùng đã khảo sát cần offering quán–món còn hiệu lực, phù hợp bán kính tới điểm ăn chung và lịch phục vụ tại thời điểm nhóm xác nhận. Unknown/stale không coi là đã xác nhận bán; thiếu coverage báo thiếu dữ liệu.
- Lịch quán và offering có timezone, nhiều ca, qua nửa đêm, ngoại lệ ngày, last order nếu biết và nguồn/ngày kiểm. Lịch phù hợp chỉ cho biết dự kiến bán theo dữ liệu đã kiểm, không bảo đảm tồn kho live.
- Server tạo/khóa pool/context chung, tính lại eligibility trước start và reset ready nếu đổi. Sau start giữ pool/phiếu; result ổn định khi retry. Thay đổi nơi bán sau đó được thông báo, không tự reroll winner.
- Đề xuất GPS foreground giúp chọn khu vực/điểm công cộng trên thiết bị; server nhận anchor_id công cộng/bán kính đã xác nhận. Khoảng cách tính từ điểm ăn đó, không quảng cáo là khoảng cách GPS/đường đi. Manual fallback; không thu GPS mọi thành viên, không lấy GPS host làm điểm chia sẻ mặc định.
- Điểm ăn công cộng/context có TTL phòng, không giữ trong history mặc định; không persist/log/queue GPS cá nhân. Provider geocoding cần review riêng nếu dùng. Khoảng cách chính xác tới GPS hoặc điểm hẹn tọa độ tự nhập cần đặc tả privacy/API riêng trước code.
- Weather theo vùng/thời điểm và mood tự khai/opt-in là tín hiệu xếp hạng nâng cao; không ghi đè nơi bán/giờ bán/NO/REMOVE, không suy mood từ raw vote, không gửi sang AI mặc định.

## Tác động và đánh đổi

Core mới cần dữ liệu venue–dish/schedule trước pool; phải review chuyển phần thiết yếu từ GM-08/P1 vào các task core và tách location context sớm khỏi QR/review muộn của GM-30. Cần sửa spec/AC/dependency/lịch đồng bộ, tránh vòng dependency và không giả tự mở khóa. Đợt cập nhật tiếp theo: GM-08 thành P0; thêm GM-01 review gate, GM-24 location sớm, GM-18 eligibility và GM-38 weather/mood P2. Dependency/status được ghi trong task và chỉ mục tự sinh; task code vẫn backlog.

Dataset pilot giới hạn khu vực có nguồn/nhân lực kiểm; không tuyên bố coverage toàn quốc. Lọc dữ liệu verified có thể làm ít/rỗng candidate; cần đổi context rõ thay vì đề xuất sai vùng. Chi phí duy trì menu/giờ là công việc liên tục. Public anchor giảm việc xử lý GPS cá nhân nhưng khoảng cách tương đối với người đứng; cần kiểm UX/độ tiện dụng và thông báo bên nhận dữ liệu phù hợp.

## Điều kiện review trước code

Chốt vùng pilot, anchor/radius, lịch/unknown policy, nguồn/giấy phép/freshness, reviewer dữ liệu, privacy/TTL, tải nhóm và task dependency. Đối chiếu [food spec](../../specs/FOOD_DATA_SPEC.md), FOOD-01..14 và [dependency map](../../project/TASK_DEPENDENCIES.md). Chưa có data quán thật, provider được chọn, migration chạy hoặc native/backend evidence trong ADR này.

[ADR-003](ADR-003-location-external-discovery.md) và [ADR-004](ADR-004-mobile-consensus-improvement.md) mô tả baseline trước thay đổi. ADR-005 chưa Accepted và không tự thay trạng thái của hai ADR đó.
