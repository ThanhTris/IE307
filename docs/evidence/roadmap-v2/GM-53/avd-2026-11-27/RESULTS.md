# GM-53 · AVD Chặng 3A ngày 27/11/2026 (Trí chạy)

Commit `9de4903a` · Android API 37 · Expo Go 58.0.5 · QA GM-03 riêng (Auth, REST, worker, Edge `delete-account` thật), đã `qa:stop` sau lượt kiểm. Tài khoản đều là tài khoản QA tạo trong lượt; ảnh không chứa mật khẩu, OTP hay token.

Lượt trước trên `261b4c7a` ở [PR #223 comment](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7206330070).

## Trọn luồng: email chưa có mật khẩu → Quên mật khẩu → xóa

| Bước | Kết quả | Ảnh |
| --- | --- | --- |
| Khách liên kết email, nhận OTP | Pass, email được che | [01](flow-01-lien-ket-email.jpg) [02](flow-02-otp-lien-ket.jpg) |
| Back ở màn Đặt mật khẩu mới | Pass. DB: `is_anonymous=false`, mật khẩu rỗng | [03](flow-03-man-dat-mat-khau.jpg) [04](flow-04-ca-nhan-sau-back.jpg) |
| Màn Xóa tài khoản có gợi ý và nút Quên mật khẩu? | Pass | [05](flow-05-man-xoa-co-quen-mat-khau.jpg) |
| Quên mật khẩu mở đúng luồng của tài khoản đang đăng nhập | Pass | [06](flow-06-quen-mat-khau.jpg) |
| Nhập email khác | Pass: báo "Nhập email của tài khoản đang đăng nhập.", Mailpit không nhận thư nào | [07](flow-07-email-khac-bi-chan.jpg) |
| OTP khôi phục, đặt mật khẩu mới | Pass. DB: đã có mật khẩu | [08](flow-08-otp-khoi-phuc.jpg) [09](flow-09-dat-mat-khau-moi.jpg) [10](flow-10-sau-khi-luu.jpg) |
| Đăng nhập bằng mật khẩu mới | Pass | [11](flow-11-dang-nhap.jpg) [13](flow-13-ca-nhan-email.jpg) |
| Xóa tài khoản | Pass: về Welcome, DB không còn user | [14](flow-14-xac-nhan-xoa.jpg) [15](flow-15-ve-welcome.jpg) |
| Đăng nhập lại bằng tài khoản đã xóa | Pass: Auth trả 400, toast "Chưa thể hoàn tất · Email hoặc mật khẩu chưa đúng.", ô mật khẩu được xóa (ảnh ghép khung hình từ video) | [m1](m1-dang-nhap-tai-khoan-da-xoa.jpg) |

## Các mục Not run của lượt trước

| Ca | Kết quả | Ảnh |
| --- | --- | --- |
| Phiên email hết hạn (thu hồi phiên qua DB QA) | Pass: báo hết phiên, user còn, có nút Đăng nhập lại. Nút đưa về màn chào mừng, không vào thẳng form đăng nhập | [m2](m2-phien-email-het-han.jpg) [m3](m3-nut-dang-nhap-lai.jpg) |
| Vị trí Đăng xuất (tài khoản email) | Pass: dưới Thông tin ứng dụng | [m4](m4-dang-xuat-duoi-thong-tin.jpg) |
| Điều khoản, Hỗ trợ hiển thị; Back về app | Pass cả hai trang; Back phần cứng về app | [m5](m5-dieu-khoan.jpg) [m6](m6-ho-tro.jpg) [m6b](m6-back-ve-app.jpg) [m7](m7-back-ve-app.jpg) |
| Đổi mật khẩu: 3 ô giống nhau, mật khẩu hiện tại sai | Pass: chỉ ô hiện tại báo "Mật khẩu hiện tại chưa đúng." | [m8](m8-doi-mk-hien-tai-sai.jpg) |
| Đổi mật khẩu: 3 ô giống nhau, mật khẩu hiện tại đúng | Pass: ô mới báo "Hãy chọn mật khẩu khác với mật khẩu hiện tại." | [m9](m9-doi-mk-trung-cu.jpg) |
| Bàn phím 320dp + chữ 200%: Đổi mật khẩu, Sửa hồ sơ, Đăng nhập | Pass: ô đang gõ nằm trên bàn phím, cuộn tới được nút | [đổi mk](k-doimk-2.jpg) [sửa hồ sơ](k-suahoso-3.jpg) [đăng nhập](k-dangnhap.jpg) |
| Màn Xóa tài khoản ở 360dp | Pass | [v1](v-360dp.jpg) [v2](v-360dp-cuon.jpg) |
| Chữ 200% ở bề ngang thường | Pass | [v3](v-200pct.jpg) [v4](v-200pct-cuon.jpg) |
| Chế độ tối: nền ô XÓA so với ô mật khẩu | Pass: cùng màu nền | [v5](v-toi-man-xoa.jpg) |
| Khách mới sau khi xóa | Lịch sử trống (khách không có lịch sử). Chỉ là kiểm sơ bộ | [m10](m10-khach-moi-lich-su.jpg) |

## Vẫn Not run

- TalkBack.
- Đối chiếu ảnh theo node Figma.
- Nháp phiếu và phòng của tài khoản cũ sau khi xóa (lượt này không tạo phòng cho tài khoản bị xóa).
