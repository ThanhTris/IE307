# Context, lịch sử và chống lặp — v0.2

2026-10-07 • FR-15/17/20 • GM-03/10/18/27.

## Context phòng

Host xác nhận mealSlot trước ready. Đề xuất từ giờ host: 05:00–10:59 breakfast, 11:00–14:59 lunch, 15:00–17:59 snack, 18:00–21:59 dinner; còn lại dinner có tag late-night. Không thêm meal enum mới. Host được đổi và server khóa mealSlot/timeHint khi start; không mỗi máy tự lọc bằng giờ riêng.

Budget nullable là khoảng VNĐ/người tham khảo; không so sánh giá phần nhóm với giá một suất. Catalogue có priceMin/Max, currency VND, unit per_person, source/area/checkedAt hoặc null. Thiếu giá hiện Chưa có giá, không tự gán rẻ hoặc loại món. Budget mismatch chỉ giảm ưu tiên, không làm giá thành điều kiện an toàn/chốt.

Category mềm, không chọn category không thành NO. Pool có seed/catalogueVersion/contextVersion; cùng snapshot mọi máy thấy cùng tập tối đa 8. Xếp/xen theo meal → category đa dạng → budget có dữ liệu → recent penalty → seed. Nếu không còn món theo meal, host đổi bối cảnh ở lobby trước start, không tạo phiếu rỗng.

## History tối thiểu core

User bật lưu khi vào room; đổi consent trước start reset own ready. Server lấy consent snapshot cùng roster. Mỗi user opt-in có personal summary: dish/buổi/finalizedAt/matchTier và groupKey tối thiểu, không phiếu. Group summary chỉ tạo nếu mọi member opt-in, key từ roster canonical server và chỉ đúng thành viên truy cập. Không group summary khi thiếu consent; một phiên opt-out không sửa kết quả chốt.

Giữ history 30 ngày, tối đa cache 50 mục/user; user xóa personal history không ảnh hưởng lịch sử người khác. Khi rút group consent/xóa phần nhóm, xóa summary nhóm liên quan và không dùng nó chống lặp; không lộ user nào rút. Reset không cho raw votes sống lâu hơn retention. Query chống lặp chỉ server đúng nhóm authenticated; không nhận groupKey tùy client để truy xuất nhóm khác.

Tại create/lobby/start, đọc tối đa 3 kết quả gần của đúng roster/group trong 30 ngày. Khi start phải tính lại nếu roster/consent đổi, khóa recentSummary/contextVersion cùng pool. Nếu không có consent/history, pool như bình thường. Giảm ưu tiên mềm, không loại cứng hết catalogue và không thay điểm phiếu trong phiên. Sở thích lâu dài do người dùng tự khai, không học raw votes.

## Vị trí và quán

Core: foreground permission lần mở đầu; sau winner lấy vị trí người bấm, geocode khu vực rồi search Maps/review. Không background tracking, không lưu tọa độ room/history; thiếu location mở tên món. Search ngoài app không thực hiện radius filter.

P1 GM-27: bộ 20–30 quán/15–20 món trong vùng quanh trường, mapping venue–dish có nguồn/ngày kiểm, lat/lng của quán (không user). Haversine lọc đường chim bay, không route km. Hiển thị phạm vi và stale/unknown; không gọi không có quán khi dataset không phủ. Điểm hẹn chung cần consent riêng; không lấy mọi GPS hoặc dùng vị trí host mặc định.

## AC

T-19 giờ boundary/timezone/budget null/category xung đột/seed và roster reset; T-20 consent partial/delete/TTL/correct group/3 recent không phá diversity; T-23 radius chỉ trong coverage và distance units. Pilot không là dependency core.
