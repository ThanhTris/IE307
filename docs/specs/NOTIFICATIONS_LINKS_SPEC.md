# Push, inbox và incoming links — v0.2

2026-10-07 • FR-14/18 • GM-25/20. Android development build là môi trường nghiệm thu; credentials và package chưa được cấp/cài.

## Push tối thiểu

Hai event: ROOM_INVITED gửi đúng người được mời; ROOM_RESULT_READY gửi roster có consent notification. Server transaction ghi event sau khi ghi room invite/result; trusted sender lấy pending event, gửi Expo/FCM, lưu ticket/receipt/retry. Không gửi bằng service key trong client. Unique eventId + recipient ngăn duplicate event nội bộ; OS có thể giao trùng/muộn nên UI dedupe/refetch, không hứa exactly-once delivery.

Token đăng ký theo auth user/device; user chỉ quản token mình, bảng token/event không cho client list của người khác. Logout/unregister, DeviceNotRegistered thì vô hiệu token; token inactive quá 30 ngày cleanup. Event/ticket giữ tối đa 7 ngày, không raw votes/tọa độ trong payload/log. Notification body trung tính, chỉ eventId/invitationId hoặc roomId/resultId tối thiểu để navigate.

Hỏi notification permission khi dùng mời lần đầu, giải thích riêng. Deny/GPS permission độc lập; inbox trong app và realtime vẫn dùng được. Inbox lời mời đọc theo recipient, expiry và quan hệ bạn kiểm lại khi accept. Pending/outdated invite báo phòng hết hạn/đầy/đã khóa rõ; spam có server rate limit.

Chạm push cold/warm: restore auth → lấy invitation/snapshot server → kiểm quyền → mở đúng màn. Không auto-accept, không lấy winner từ payload, không đọc room nếu outsider. Push là thông báo, không thay realtime hoặc sự kiện chốt trong DB.

## Link vào phòng

Mã 6 ký tự, QR và link là ba cách mang lời mời, không thay membership. App đã cài có thể dùng scheme gi-cung-duoc://join?code=...; HTTPS App Links chỉ công bố khi có domain + association được kiểm. Nếu chưa có domain, share kèm mã và không hứa click web tự cài/join. Incoming parser allowlist scheme/host/path/query, độ dài/charset code, không mở arbitrary URL từ QR. Link không chứa bearer token hoặc service key.

Warm/cold link: restore session, hiển thị phòng/lời mời để user xác nhận; guest chưa auth thì hoàn tất identity rồi server join. Server kiểm state/expiry/capacity/rate limit; retry không chiếm ghế mới. Không tự ready hoặc đọc phiếu người khác. Quét QR lạ báo không hợp lệ.

## AC/test

T-17 push grant/deny/offline/duplicate/receipt/invalid token; cold/warm tap auth/member/result và inbox fallback. T-18 QR/link parser, absent app, full/locked/expired/outsider, mã fallback. Screenshot HTML/local notification không là evidence remote push. Package/credentials/quota được reviewer chốt trước triển khai.
