# ADR-017 — Quyền sở hữu đăng ký push và vòng đời delivery

## Quyết định

GM-23 dùng Expo Push qua trusted sender sau commit. Một Expo token chỉ có một
đăng ký active; khi identity khác đăng ký cùng token, đăng ký cũ bị vô hiệu và
delivery pending của generation cũ bị chặn. `device_id` chỉ là khóa opaque của
cài đặt, không phải khóa truy cập dữ liệu của identity khác.

Đăng ký chỉ active khi permission là `granted`, token có dạng Expo hợp lệ và
JWT còn session hợp lệ. `denied`, `provisional` và `unknown` không lưu token để
gửi. Unregister xóa token, tăng generation và expire delivery chưa gửi. Server
giữ metadata lease/ticket/receipt trong schema private; client chỉ nhận DTO
inbox và response `data:null`.

## Retention và retry

Worker claim tối đa 100 delivery bằng `FOR UPDATE SKIP LOCKED`, lease 120 giây,
commit trước khi gọi mạng và timeout provider 15 giây. Retry tối đa 5 lần với
backoff 1/2/4/8 phút, tôn trọng `Retry-After`; receipt được hỏi sau 15 phút.
Sự kiện và delivery không vượt TTL nguồn hoặc 7 ngày, token inactive dọn theo
retention 30 ngày của GM-17. Duplicates do crash/provider timeout được xử lý
bằng eventId/generation và UI refetch; không hứa exactly-once.

## Phạm vi kiểm

SQL/HTTP và fake transport thuộc GM-23. Remote Expo trên Android, permission,
logout và tap/deep-link nhận bởi GM-29/GM-30. Không đưa service key hoặc token
vào mobile, log hay evidence.
