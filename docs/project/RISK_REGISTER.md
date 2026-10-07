# Rủi ro và cách xử lý

| Rủi ro | Mức | Owner đề xuất | Hành động / điểm kiểm |
| --- | --- | --- | --- |
| Ý tưởng đã có nhiều app | Cao | Trí | Nêu cải thiện có kiểm chứng, không tuyên bố độc quyền; GM-21 thử nhóm |
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
| Link review bị hiểu là radius search | Vừa | Tuấn/Vinh | Copy rõ; venue dataset P1 GM-27, không giả lọc bán kính |
| Core v0.2 tăng lên 23 task P0 | Cao | Trí | Spike/cân tải tuần, dời P1/P2; scope core đổi phải chủ dự án chốt |
