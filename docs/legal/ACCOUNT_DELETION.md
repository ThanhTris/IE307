---
layout: default
title: Yêu cầu xóa tài khoản và dữ liệu
permalink: /delete-account/
---

# Yêu cầu xóa tài khoản và dữ liệu

Gì Cũng Được cho phép người dùng yêu cầu xóa tài khoản và dữ liệu liên quan.

## Xóa trong ứng dụng

Khi tùy chọn này có trong bản cài đặt, mở **Hồ sơ → Xóa tài khoản**, đọc phần giải thích và xác nhận theo hướng dẫn trong ứng dụng. Yêu cầu được gửi tới backend sau khi xác thực; ứng dụng chỉ báo thành công khi máy chủ xác nhận.

Nếu tài khoản đang ở phòng chưa kết thúc, backend có thể từ chối tạm thời. Hoàn tất hoặc rời phòng rồi gửi lại yêu cầu. Không tạo tài khoản mới để thay thế trước khi biết yêu cầu cũ đã được xử lý.

## Yêu cầu từ web

Nếu không còn cài ứng dụng, gửi [email tới 23521645@gm.uit.edu.vn](mailto:23521645@gm.uit.edu.vn?subject=Y%C3%AAu%20c%E1%BA%A7u%20x%C3%B3a%20t%C3%A0i%20kho%E1%BA%A3n%20G%C3%AC%20C%C5%A9ng%20%C4%90%C6%B0%E1%BB%A3c) với tiêu đề **“Yêu cầu xóa tài khoản Gì Cũng Được”**. Trong email chỉ cung cấp địa chỉ email dùng cho tài khoản (nếu tài khoản có email) và/hoặc tên hiển thị để chúng tôi tìm cách xác minh yêu cầu. Không gửi mật khẩu, mã OTP, session token, ảnh giấy tờ tùy thân hoặc dữ liệu thanh toán.

Chúng tôi sẽ xác minh quyền sở hữu hợp lý trước xử lý. Yêu cầu sẽ được chuyển người vận hành để kiểm tra và xóa trên backend; đây là quy trình vận hành thủ công, không phải một biểu mẫu tự động trên trang web. Nếu tài khoản đang ở phòng hoạt động, yêu cầu sẽ được tạm hoãn cho đến khi phòng kết thúc hoặc người dùng có thể rời phòng. Chúng tôi sẽ phản hồi qua email khi hoàn tất hoặc nếu cần thêm bước xác minh.

## Dữ liệu bị xóa

Khi xóa thành công, chúng tôi xóa thông tin hồ sơ/tài khoản, bạn bè và lời mời, thiết bị push nếu có, preferences, đồng thuận, lịch sử cá nhân và các dữ liệu phòng đã kết thúc liên quan. Trong lịch sử nhóm còn hợp lệ của người khác, phần hiển thị của bạn được thay bằng nhãn **“Thành viên đã xóa”**; không giữ tên hoặc ID tài khoản của bạn. Dữ liệu sao lưu có thể được giữ theo lịch backup/retention của nhà cung cấp trước khi hết hạn.

Xem thêm [Chính sách quyền riêng tư](https://thanhtris.github.io/IE307/privacy/) hoặc [liên hệ hỗ trợ](https://thanhtris.github.io/IE307/support/).
