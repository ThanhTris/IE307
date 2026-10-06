# IDENTITY, PRIVACY & SECURITY SPEC

Draft v0.1 • FR-01, FR-05, FR-09, FR-11..12.

## Khách và tài khoản

Khách dùng Supabase anonymous sign-in để có auth.uid; không dùng userId do client tự khai. Lưu refresh session qua adapter secure storage được kiểm tra trên Android. Mất session khách hoặc gỡ app có thể mất quyền vào phiên/bạn cũ; UI nói rõ trước khi xóa dữ liệu.

Tài khoản và liên kết guest là P1; không dùng SMS có phí. Kiểm xung đột tài khoản đã có và lỗi liên kết; không chuyển quyền phòng chỉ bằng email nhập vào form.

## Quyền dữ liệu

- Public catalogue chỉ đọc bản published. Người chưa tham gia không đọc phòng/members/results qua query trực tiếp.
- Room code chỉ dùng với join RPC; không cho list room codes. Rate limit join/create và số phòng active trên server; code ngẫu nhiên không thay auth.
- Members đọc trạng thái phòng và tên hiển thị; phiếu chỉ đọc bởi người sở hữu. Host không đọc được raw votes của người khác, kể cả gọi REST trực tiếp.
- Client không INSERT/UPDATE kết quả, state, membership hay ready bằng bảng trực tiếp; RPC kiểm quyền và transition.
- RPC đặc quyền cần kiểm auth.uid, membership, state/version, lock hàng room; fixed search_path và tên bảng qualified. REVOKE quyền mặc định, GRANT rõ cho authenticated; không đặt service_role trong mobile.
- Realtime chỉ phát trường được phép: state/version/progress tổng hợp. Không đưa bảng phiếu vào subscription/broadcast công khai. Nếu read policy phức tạp, dùng snapshot RPC và sự kiện version để refetch.

## Retention

Đề xuất phiếu thô và membership phiên được dọn sau 24 giờ từ terminal/expiry. Join/vote từ chối ngay sau expiry dù dọn trễ; member chỉ đọc snapshot tối thiểu cho trạng thái hết hạn, không tiếp tục đọc phiếu. Kết quả đã chốt đọc được trong cửa sổ retention; P1 muốn giữ lâu hơn cần history snapshot theo consent. GM-06 phải chọn và kiểm chứng cơ chế dọn server tự động trong quota hiện tại; không ghi đã xóa chỉ vì UI ẩn. Nếu không có scheduler hợp lệ, không đưa dữ liệu cá nhân thật vào pilot và ghi blocker release.

P1 history chỉ giữ winner, buổi ăn, timestamp, member IDs cần thiết theo consent; cho xóa lịch sử cá nhân. Không gửi raw votes cho AI hoặc analytics. Nhật ký QA dùng fixture, không token.

## Bạn ăn cùng — P1

Lời mời được bên nhận chấp nhận; pair có đúng 2 user, canonical key chống trùng. Tạo nhanh phòng không có nghĩa người kia đã vào/ready. Hủy kết bạn chặn lời mời nhanh nhưng không sửa kết quả phiên đã kết thúc. Không cần upload danh bạ hay vị trí nền.

## Acceptance criteria

- SEC-01: anonymous authenticated user A không đọc/ghi vote của B, host cũng bị chặn.
- SEC-02: outsider không đọc room/result khi đoán được UUID hoặc code.
- SEC-03: expired/cancelled room không nhận vote; member không thể tăng số lượng ghế bằng payload.
- SEC-04: RPC dùng current auth; spoof userId thất bại; privileged key không có trong bundle/log.
- SEC-05: test dọn dữ liệu dùng server time và báo số hàng; guest/session restore được kiểm thực tế.
- SEC-06: P1 invitation chưa được chấp nhận không tạo pair; account link lỗi không làm mất guest session đang dùng.
