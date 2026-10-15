# ADR-014 — Scope dữ liệu test và card baseline trên Project

Date: 2026-10-13
Status: quyết định trực tiếp của Trí trong hội thoại sau audit main `07bab51`; không tự nghiệm thu code/task khác.

## Quyết định của chủ dự án

1. Bỏ mục thiếu verified publish/coverage/public anchors khỏi yêu cầu nghiệm thu GM-08 ở giai đoạn test. Bundle thật `gm08-survey-v0.4.1` đã nạp/query/reimport/rollback trên DB test là đầu vào BE hợp lệ; không bắt thu thập thêm dữ liệu hoặc review độc lập để đóng GM-08. Lịch từng món và serviceMode chưa biết được giữ null theo schema, không tự suy từ lịch quán.
2. GM-18 và consumer nhận bundle/DB test cùng version/hash/counts/giới hạn thật, không phải chờ manifest verified có rows. Query dữ liệu thật và fixture parity được báo riêng; dữ liệu không đủ điều kiện lọc có thể trả empty/reasonCodes. Không lấy fixture làm dữ liệu thật hoặc bỏ lọc địa điểm/thời gian của sản phẩm. Coverage/anchor thiếu không là lý do mở lại GM-08 hoặc bắt Tâm bổ sung trong task này; positive coverage scenarios dùng fixture rõ nhãn để kiểm thuật toán, không tuyên bố đã có coverage thật.
3. Giữ nguyên importer production publish guards, ACL/privacy và manifest verified 0/null; chấp nhận dữ liệu test không biến draft thành verified/published, không cho phép client ghi hoặc production deploy. Quyền nguồn/ảnh chưa biết không được bịa; không thêm artwork không có quyền. Publish production là phạm vi riêng cần Trí giao, không là AC hiện hành của GM-08.
4. Trí xác nhận baseline card hiện dùng trên Project là **GM-00, issue #37**, không phải GM-01/#100. Pin `GM-01 → #37`, expected Project title `GM-00` trong `tasks/project-gate.json`: Done của card này xác nhận baseline đã được Trí duyệt. GM-01 vẫn giữ scope/contract/artifact roadmap-v2 riêng; không đổi số task hay kế thừa approval cho task khác. GM-00 lịch sử vẫn kiểm hồ sơ local. Không tạo card, đổi status hoặc tự duyệt.

## Kiểm tra và giới hạn

Checker vẫn đọc live đúng repo/project/issue/title; Todo/unset/archived/duplicate/missing/network errors đều chặn. Alias chỉ cho cặp baseline nêu trên, không phải cơ chế chấp nhận mọi task ID cũ. Trước tích hợp vẫn kiểm artifacts và contract trên target.

Lỗi đọc JSON theo encoding Windows trong `food_fixtures.py` là lỗi tooling thật, không phải cảnh báo. Tại thời điểm chốt quyết định này chưa sửa; sau đó Trí yêu cầu sửa ngay trong cùng ngày: các JSON reads dùng UTF-8 rõ ràng và regression kiểm cả CP1252/UTF-8 mode tắt. Không dùng kết quả chạy UTF-8 mode để tự ghi default-encoding regression là Pass.

Hồ sơ dữ liệu trước ngày này giữ nguyên làm lịch sử; phạm vi hiện hành tại ADR này, task GM-08 và DATASET_HANDOFF được ưu tiên khi khác yêu cầu xác minh/publish cũ.
