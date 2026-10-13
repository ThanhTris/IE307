# ADR-015 — Retention độc lập với operational references

Date: 2026-10-13. Scope GM-17. Trí yêu cầu thực hiện plan và chốt giữ history
opt-in 30 ngày trong hội thoại hiện tại. Đây là quyết định thiết kế được giao,
không phải Approved/Done của code. Reviewer cuối: Trí / ThanhTris.

## Quyết định

Giữ TTL phòng/phiếu/context 24h từ terminal/expiry và history tối đa30ngày từ
finalized. Không giữ operational result/round_dishes/room chỉ vì history hoặc
ACK còn tham chiếu. Thêm private room/result/invitation/event reference tables,
mỗi row chỉ có UUID; không chứa phiếu, roster, context, token hoặc payload.

History.result_id trỏ sang result_refs. ACK JSON giữ nguyên shape và immutability,
hai generated UUID columns có FK sang room/result refs. Neutral event và invitation
reference dùng cùng cơ chế để hết hạn độc lập, không giữ parent hoặc gây circular
deletion. References được tạo cùng transaction với operational parent; cleanup
dọn reference khi không còn operational row/history/live ACK/event/invitation.

Consent được history tham chiếu giữ metadata, bỏ room_id lúc dọn room và đánh dấu
retention_detached. Khi history hết hạn/rút consent, metadata detached thừa bị dọn.
History ACL kiểm đúng user/group, scope, consent IDs và thời hạn trên mỗi read;
rút consent chặn ngay, cleanup vật lý theo worker. GM-21 sở hữu endpoint consent/
delete và việc tạo đúng group key/roster trong transaction.

Schema tăng0.1.0→0.2.0 bằng0004, không sửa0001..0003; food/core1.1.0 và DTO GM-07
không đổi. GM-06 mapping lịch sử giữ nguyên, supplement tại ACCESS_MATRIX và handoff
GM-17 mô tả physical references mới. GM-19/20/21/22/23 phải nhận supplement này.

## Cleanup và vận hành

Giờ database, terminal_at ổn định, advisory transaction lock chống overlap và
reference_epoch trước row locks. Client không gọi cleanup hoặc truyền thời gian.
Worker Node local chạy mỗi60giây qua guarded Docker psql, không package/provider
mới; chỉ chạy khi được start, không tự cài dịch vụ chạy nền. Trước pilot/deploy,
operator phải cấu hình scheduler liên tục trên môi trường đó và kiểm evidence
riêng. Hai cycles local không chứng minh production scheduler hoặc load/quota.

GoTrue quản auth users/JWT/session. GM-17 không tự xóa identity hoặc auth schema;
logout/unregister/DeviceNotRegistered invalidation vẫn thuộc GM-23/consumer.

## Rollback

Đây là migration nâng cấp có backfill. Không có down migration tự động: sau khi
cleanup operational rows, không thể tái tạo live parents từ UUID reference.
Trước áp dụng vào môi trường dùng chung phải backup và review schema0.2.0; test
dùng database disposable, không reset volume hoặc sửa migration đã bàn giao.
