# Context, lịch sử và chống lặp — food-v1

2026-10-07 • FR-15/17/20 • GM-04, GM-19, GM-25, GM-21, GM-08, GM-24, GM-18; review GM-01.

## Context phòng

Host xác nhận mealSlot trước ready. Đề xuất từ giờ host: 05:00–10:59 breakfast, 11:00–14:59 lunch, 15:00–17:59 snack, 18:00–21:59 dinner; còn lại dinner có tag late-night. Không thêm meal enum mới. Host được đổi và server khóa mealSlot/timeHint khi start; không mỗi máy tự lọc bằng giờ riêng.

Budget nullable là khoảng VNĐ/người tham khảo; không so sánh giá phần nhóm với giá một suất. Catalogue có priceMin/Max, currency VND, unit per_person, source/area/checkedAt hoặc null. Thiếu giá hiện Chưa có giá, không tự gán rẻ hoặc loại món. Budget mismatch chỉ giảm ưu tiên, không làm giá thành điều kiện an toàn/chốt.

Category mềm, không chọn category không thành NO. Pool có seed/catalogueVersion/contextVersion; cùng snapshot mọi máy thấy cùng tập tối đa 8. Xếp/xen sau eligibility nơi bán/giờ/coverage → meal → category đa dạng → budget có dữ liệu → recent penalty → seed. Nếu không còn món theo meal, host đổi bối cảnh ở lobby trước start, không tạo phiếu rỗng.

## History tối thiểu core

User bật lưu khi vào room; đổi consent trước start reset own ready. Server lấy consent snapshot cùng roster. Mỗi user opt-in có personal summary: dish/buổi/finalizedAt/matchTier và groupKey tối thiểu, không phiếu. Group summary chỉ tạo nếu mọi member opt-in, key từ roster canonical server và chỉ đúng thành viên truy cập. Không group summary khi thiếu consent; một phiên opt-out không sửa kết quả chốt.

Giữ history 30 ngày, tối đa cache 50 mục/user; user xóa personal history không ảnh hưởng lịch sử người khác. Khi rút group consent/xóa phần nhóm, xóa summary nhóm liên quan và không dùng nó chống lặp; không lộ user nào rút. Reset không cho raw votes sống lâu hơn retention. Query chống lặp chỉ server đúng nhóm authenticated; không nhận groupKey tùy client để truy xuất nhóm khác.

Tại create/lobby/start, đọc tối đa 3 kết quả gần của đúng roster/group trong 30 ngày. Khi start phải tính lại nếu roster/consent đổi, khóa recentSummary/contextVersion cùng pool. Nếu không có consent/history, pool như bình thường. Giảm ưu tiên mềm, không loại cứng hết catalogue và không thay điểm phiếu trong phiên. Sở thích lâu dài do người dùng tự khai, không học raw votes.

## Vị trí và quán

Core food-v1: GM-24 foreground/manual gợi public anchor đã xác nhận trước tạo pool; server nhận anchorId/radius/desiredAt, không GPS cá nhân. Nhóm dùng một điểm ăn chung nhìn thấy trước ready. Review ngoài app mặc định dùng khu vực này; search URL không chứng minh nơi bán.

P0 GM-08: mục tiêu 20–30 chi nhánh/15–20 món thật trong coverage, offering/menu/lịch quán và món/ngoại lệ/source freshness/giá có đơn vị; chưa có data thật. GM-18 query Haversine từ public anchor (không route), giao lịch/timezone/qua đêm/last order và buổi; unknown/stale không giả đang bán. Ngoài coverage báo thiếu dữ liệu. [Food spec](FOOD_DATA_SPEC.md) quy định dữ liệu và rule chi tiết.

## AC

T-19 giờ boundary/timezone/budget null/category xung đột/seed và roster reset; T-20 consent partial/delete/TTL/correct group/3 recent không phá diversity; T-23/25 eligibility địa điểm/lịch và distance units là core. GM-38 weather/mood T-26 nâng cao không chặn core.

## Thời điểm ăn và snapshot

Ăn ngay lấy server now + buffer một lần, đặt giờ cụ thể không cộng thêm. desiredAt UTC có timezone hiển thị; quá giờ trước start yêu cầu xác nhận/reset ready. GM-19 revalidate dataset/offerings/context trong start transaction; thay pool so với ready phải reset và xác nhận lại. Sau start không đổi pool/phiếu/result; GM-27 refetch nơi bán đúng món và báo thay đổi, không reroll. History anti-repeat chỉ rank tập đã qua eligibility; history không lưu anchor/GPS/mood mặc định.
