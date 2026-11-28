# GM-53 · AVD Chặng 3A bổ sung ngày 28/11/2026 (Trí chạy, AI thao tác)

Head `e3f5ea47` (mã app trùng `9de4903a` của lượt 27/11) · Android API 37 · Expo Go · QA GM-03 riêng (Auth, REST, worker, Edge `delete-account` thật), catalogue test 39 món, đã `qa:stop`. Người chơi thứ hai và tài khoản email do script QA tạo; ảnh không chứa mật khẩu, OTP, token.

## Phòng và dữ liệu sau khi xóa

| Ca | Kết quả | Ảnh |
| --- | --- | --- |
| Khách vào phòng, vuốt thẻ, gửi phiếu vòng 1 | Pass | [r1](r1-vuot-3-the.jpg) [r2](r2-da-gui-phieu.jpg) |
| Xóa khi còn là thành viên phòng ở vòng 2 | Pass: báo rời/đợi phòng kết thúc, có Thử lại, tài khoản còn | [r4](r4-xoa-khi-con-trong-phong.jpg) |
| Phòng kết thúc rồi Thử lại | Pass: về Welcome, DB không còn user của khách | [r5](r5-ve-welcome.jpg) |
| Khách mới sau xóa, kể cả force-stop và mở lại | Pass: thẻ phòng `#YY5DA8` của khách cũ ([r3](r3-the-phong-cua-khach-cu.jpg)) không còn. Tab Lịch sử của khách luôn chỉ mời đăng nhập, nên [r7](r7-khach-moi-lich-su.jpg) không chứng minh được dữ liệu cũ đã xóa | [r6](r6-khach-moi-sau-mo-lai.jpg) |

**Nháp phiếu của tài khoản cũ (suy luận, không phải Pass trên máy):** server từ chối xóa khi phòng chưa kết thúc, còn nháp lựa chọn chỉ nằm trong bộ nhớ và mất khi đóng app. Phần outbox lưu trên máy chỉ được kiểm bằng unit test. Trí quyết có đóng mục này hay không.

Giới hạn: lựa chọn đang vuốt dở chỉ nằm trong bộ nhớ (`voteSessionState.ts`), đóng app là về 0/10, đúng như `main`. AVD không root và Expo Go không debuggable, nên **không đọc trực tiếp SecureStore/SQLite**; phần dọn kho cục bộ kiểm qua giao diện và test tự động.

## TalkBack (màn Xóa tài khoản, khách và email)

| Ca | Kết quả | Ảnh |
| --- | --- | --- |
| Chạm khám phá | Pass: mọi phần tử nhận tiêu điểm | [t1](t1-khach-cham-kham-pha.jpg) |
| Thứ tự vuốt phải, khách | Pass: Quay lại → tiêu đề → cảnh báo → nhãn → ô XÓA → Xóa → Hủy | [t2](t2-khach-thu-tu-vuot.jpg) |
| Thứ tự vuốt phải, email | Pass tới nút Xóa (lượt email không vuốt tới Hủy): thêm nhãn mật khẩu → ô → hiện mật khẩu → gợi ý → Quên mật khẩu? (khung lặp là cú vuốt không được nhận) | [t3](t3-email-thu-tu-vuot.jpg) [t4](t4-email-cuoi-man.jpg) |
| Nhãn, trạng thái khóa, vùng chạm (cây trợ năng) | Pass: nút có nhãn tiếng Việt; nút Xóa khai `enabled=false` khi chưa đủ; Quay lại và hiện mật khẩu 48dp. Nút hiện mật khẩu khóa khi ô trống là đúng thiết kế | — |

**Chưa kiểm:** nội dung giọng đọc (máy ảo chạy tắt tiếng; không nghe). Chỉ kiểm tiêu điểm, thứ tự và thuộc tính trợ năng. TalkBack chỉ chạy trên màn Xóa tài khoản.

## Lỗi và đang gửi

| Ca | Kết quả | Ảnh |
| --- | --- | --- |
| Sai mật khẩu | Pass: lỗi dưới ô, ô trống lại, ô XÓA giữ nguyên, phiên còn | [f1](f1-sai-mat-khau.jpg) |
| Đang gửi (tạm dừng container Auth QA) và Back phần cứng | Pass: "Đang xử lý…", mọi điều khiển khóa, Back không rời màn; chạy lại Auth thì xóa xong, DB không còn user | [f2](f2-dang-gui-va-back.jpg) [f3](f3-xong-sau-khi-gui.jpg) |

## Đối chiếu Figma (xem chế độ trình chiếu, không đăng nhập, 412×915)

Ảnh Figma **không lưu** trong thư mục này, nên chưa có cặp ảnh Figma/app cùng ca như FIGMA_PARITY yêu cầu.

| Node | Đối chiếu |
| --- | --- |
| 260:1857 Đổi mật khẩu (mẫu form) | Khớp mẫu: tiêu đề có Quay lại, nhãn trên ô, ô viền bo, nút chính ở đáy. Khác do đặc thù xóa: thẻ cảnh báo, nút đỏ, nút Hủy |
| 801:9991 Đang cập nhật | Khớp: nút báo đang xử lý, khóa form, không nhảy bố cục. **Lệch:** Figma tô nền ô xanh nhạt khi khóa và nút giữ màu đậm; app giữ ô nền trắng và làm nhạt nút. Nhìn bằng mắt thấy chữ trên nút nhạt khó đọc (chưa đo tương phản); nút Xóa đang khóa cũng cùng kiểu nên có thể đến từ component nút chung |
| 801:10030 Lỗi | Figma có hộp lỗi trên đầu form; app hiện lỗi dưới ô mật khẩu, đúng mô tả trong FIGMA_PARITY cho ca sai mật khẩu. Ca lỗi mạng với nút Thử lại không chụp lại trong lượt này |
| 260:1649 Hồ sơ tài khoản | #223 thêm hàng Xóa tài khoản, nhóm Thông tin ứng dụng, chuyển Đăng xuất xuống cuối (đối chiếu ảnh lượt 27/11). **Lệch có sẵn trên `main`, không do #223:** thẻ hồ sơ canh giữa và không có nút Sửa, tên mục cài đặt khác, thiếu "Hiện nút chọn món", nút Đăng xuất không viền đỏ |

## Ghi nhận thêm

Khi mở màn Xóa bằng deep link `/--/account/delete-account` lúc đang ở màn bình chọn, hộp thoại "Vào vòng 2" của màn bên dưới che màn Xóa và dừng ở "(0)". Người dùng không đi đường này; chưa xác định nguyên nhân và chưa kiểm trên `main`. Đi từ Cá nhân thì không gặp.
