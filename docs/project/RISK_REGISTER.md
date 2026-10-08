# Rủi ro và cách xử lý

| Rủi ro | Mức | Owner đề xuất | Hành động / điểm kiểm |
| --- | --- | --- | --- |
| Ý tưởng đã có nhiều app | Cao | Trí | Nêu cải thiện có kiểm chứng, không tuyên bố độc quyền; GM-26 thử nhóm |
| Giữ kín phiếu chỉ bằng UI | Cao | Trí/Tâm | RLS + RPC + test gọi API trái quyền trước UI integration |
| Submit đồng thời tạo hai winner | Cao | Trí | Lock room, idempotency, fixture/concurrency test |
| Cặp người chọn khác loại không thấy món | Vừa | Vinh | Category mềm, đa nhãn, cùng pool snapshot |
| Guest mất session | Vừa | Trung | Secure storage, thông báo, account link P1; không giả khôi phục |
| Mất mạng/host rời | Cao | Tuấn/Trí | Snapshot/version, hủy rõ, không tự loại người |
| Free tier pause/quota | Vừa | Trí | Kiểm trước demo, tắt log/ảnh nặng, không tự mua gói |
| Catalogue ít/sai hoặc ảnh thiếu quyền | Vừa | Vinh | Biên soạn có review, demo icon, không tuyên bố allergy safety |
| OCR/AI làm trễ | Cao | Trung/Tâm | P2 chỉ sau release; không chặn core |
| 8 tuần nhưng chưa biết lịch từng người | Vừa | Trí | Estimate theo tuần; dời P1 trước khi cắt test core |
| Prototype bị hiểu thành app đã chạy | Vừa | Trang | Banner mô phỏng, evidence native tách biệt |
| Suy luận sở thích trong nhóm hai người | Vừa | Tâm | Không raw votes, copy không hứa ẩn danh tuyệt đối |
| Outbox replay sai vòng/auth hoặc lost ACK | Cao | Trí/Tâm | Immutable payload, snapshot trước replay, TTL/logout isolation T-16 |
| Push không tới/OS dừng app hoặc trùng | Vừa | Trung/Trí | Spike sớm, receipt/retry/dedupe/inbox; không fake completed |
| Double-tap khó khám phá/nhầm TalkBack | Vừa | Trang/Tuấn | Hướng dẫn/ba nút/scroll cancel, native one-hand/TalkBack T-21 |
| History nhóm lộ dữ liệu hoặc consent stale | Cao | Tâm/Trí | Canonical roster, ACL, opt-in all, delete/TTL/recompute trước start T-20 |
| Link review bị hiểu là radius search | Vừa | Tuấn/Vinh | Copy rõ; core verified dataset GM-08 + eligibility GM-11, không giả lọc bán kính |
| Food-v1 có 27 task P0 kể cả gate GM-01 | Cao | Trí | Spike/cân tải tuần, dời P1/P2; scope core đổi phải chủ dự án chốt |
| Giờ món khác giờ quán/qua đêm/nguồn stale | Cao | Tâm/Vinh | Schedule intersection/exceptions/timezone; FOOD-05/06/07, lịch kiểm lại GM-08 |
| Chưa phủ khu vực hoặc ít candidate | Cao | Vinh/Tuấn | Coverage rõ, manual anchor; không fallback sai tỉnh hoặc bịa menu |
| Done giả hoặc dependency chỉ checkbox | Cao | Trí | Gate đọc Approved/reviewer/date/evidence; CI regression, review thật vẫn bắt buộc |
| Vòng phụ thuộc location/result/release | Cao | Tâm/Tuấn | GM-10 location sớm, GM-11 eligibility, GM-08 core trước room; validator DAG |
