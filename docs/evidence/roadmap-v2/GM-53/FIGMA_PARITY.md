# GM-53 — Đối chiếu thiết kế

Đã xem ảnh Figma qua MCP ngày 26/11/2026 ở kích thước 412dp. GM-53 dùng
pattern sẵn có của GM-35 để bổ sung trạng thái xóa và liên kết pháp lý.
Màn mới dùng header Back, vùng nội dung an toàn có cuộn, form và
nút của hệ thống thiết kế hiện hành.

| Frame tham chiếu | Trong app | Expected khi so trên AVD | Actual AVD |
| --- | --- | --- | --- |
| [Hồ sơ tài khoản, 260:1649](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1649) | `/profile`, thông tin ứng dụng và mục Xóa tài khoản | Xóa tài khoản là một hàng trong nhóm Tài khoản, có icon thùng rác và màu cảnh báo. Đăng xuất nằm sau nhóm Thông tin ứng dụng. | Thấy hàng Xóa tài khoản và nhóm Thông tin ứng dụng. Vị trí Đăng xuất đạt. Khác biệt ở thẻ hồ sơ, tên mục cài đặt và viền Đăng xuất có sẵn trên `main` theo đối chiếu của Trí. |
| [Đổi mật khẩu, 260:1857](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857) | `/account/delete-account`, form khách/email | Hai ô nhập dùng cùng nền và chiều cao theo theme. Khách chỉ nhập XÓA. Email có ô mật khẩu có che ký tự. Cảnh báo và nút xóa dùng token danger. | Khớp pattern tiêu đề, nhãn, ô viền bo và nút chính phía dưới. Form xóa thêm thẻ cảnh báo, nút đỏ và Hủy theo chức năng. Hai ô cùng màu nền trong chế độ tối ở lượt 27/11. |
| [Đổi mật khẩu, 260:1857](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857) | `/account/delete-account`, khôi phục mật khẩu | Dưới ô mật khẩu có gợi ý đăng nhập lại sau khi đặt mật khẩu và nút **Quên mật khẩu?** theo kiểu nút phụ của màn tài khoản. Khách không thấy nút. Khi đang gửi, nút khóa. Xen giữa ô nhập và cụm nút xóa/hủy, mọi thao tác vẫn cuộn tới được ở 320dp và chữ 200%. | Gợi ý và nút xuất hiện ở form email. Trọn luồng khôi phục, đăng nhập lại và xóa đạt ngày 27/11. TalkBack lấy được tiêu điểm của nút trong lượt email ngày 28/11. |
| [Đổi mật khẩu đang cập nhật, 801:9991](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9991) | `/account/delete-account`, đang gửi | Nút báo đang xử lý, form và Back khóa. Không nhảy layout. | Hành vi khóa và bố cục khớp. Figma tô nền ô xanh nhạt và giữ nút màu đậm. App giữ ô trắng và làm nhạt nút. Chữ trên nút nhìn nhạt, chưa đo tương phản. |
| [Đổi mật khẩu lỗi, 801:10030](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-10030) | Lỗi mật khẩu hoặc lỗi API | Sai mật khẩu có lỗi bên dưới ô và trường rỗng. Lỗi mạng giữ xác nhận và có nút Thử lại. | Sai mật khẩu báo dưới ô trong lượt 28/11. Figma đặt hộp lỗi ở trên form. Ca lỗi mạng với nút Thử lại chưa chụp lại trong lượt bổ sung. |

Nội dung mô tả xóa, màu nút xóa và ba hàng liên kết là phần bổ sung
theo AC. Đối chiếu trên 412dp, 320/360dp và font 200%, sáng/tối,
TalkBack, bàn phím và cả khoảng safe area. Ghi ảnh Figma/app cùng ca với
model thiết bị, font scale và revision. [Ca thủ công](HANDOFF.md#bước-5--kiểm-expo-go-trên-avd)

## Kiểm bàn phím ngày 27/11/2026

Trên Android API 37 và Expo Go 58.0.5, ở 320dp và chữ 200%, Trí xác
nhận bản sửa `ef6ee889` giúp thấy ô XÓA và cuộn tới cả hai nút khi bàn
phím mở. Ở cỡ gốc, hai nút nằm trên bàn phím. Đóng bàn phím không để
lại khoảng trống. Tuấn cũng xác nhận lỗi đã được sửa trên Expo Go
điện thoại thật. [Kết quả kiểm lại của Trí](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7207748920)

## Hai lượt AVD ngày 27 và 28 tháng 11

Lượt ngày 27/11 ghi ảnh 360dp, chữ 200% ở bề ngang thường, nền hai ô
trong chế độ tối và kiểm bàn phím ở Đăng nhập, Sửa hồ sơ và Đổi mật
khẩu tại 320dp, chữ 200%. [Ảnh và kết quả 27/11](avd-2026-11-27/RESULTS.md)

Ngày 28/11, Trí xem bốn node Figma ở chế độ trình chiếu 412×915 và
ghi các khác biệt trong bảng trên. Ảnh AVD đã lưu. Ảnh Figma cùng ca
và phép đo tương phản nút đang gửi chưa có.

TalkBack trên màn xóa đã kiểm thứ tự tiêu điểm, nhãn tiếng Việt, trạng
thái nút khóa và vùng chạm 48dp của Quay lại, Hiện mật khẩu. Lượt
email vuốt tới nút Xóa. Giọng đọc, nút Hủy ở lượt email và TalkBack
trên màn khác chưa kiểm. [Ảnh và kết quả 28/11](avd-2026-11-28/RESULTS.md)
