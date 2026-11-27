# GM-53 — Đối chiếu thiết kế

Đã xem ảnh Figma qua MCP ngày 26/11/2026 ở kích thước 412dp. GM-53 dùng
pattern sẵn có của GM-35 để bổ sung trạng thái xóa và liên kết pháp lý.
Màn mới dùng header Back, vùng nội dung an toàn có cuộn, form và
nút của hệ thống thiết kế hiện hành.

| Frame tham chiếu | Trong app | Expected khi so trên AVD | Actual AVD |
| --- | --- | --- | --- |
| [Hồ sơ tài khoản, 260:1649](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1649) | `/profile`, thông tin ứng dụng và mục Xóa tài khoản | Xóa tài khoản là một hàng trong nhóm Tài khoản, có icon thùng rác và màu cảnh báo. Đăng xuất nằm sau nhóm Thông tin ứng dụng. | Not run |
| [Đổi mật khẩu, 260:1857](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857) | `/account/delete-account`, form khách/email | Hai ô nhập dùng cùng nền và chiều cao theo theme. Khách chỉ nhập XÓA. Email có ô mật khẩu có che ký tự. Cảnh báo và nút xóa dùng token danger. | Not run |
| [Đổi mật khẩu, 260:1857](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857) | `/account/delete-account`, khôi phục mật khẩu | Dưới ô mật khẩu có gợi ý đăng nhập lại sau khi đặt mật khẩu và nút **Quên mật khẩu?** theo kiểu nút phụ của màn tài khoản. Khách không thấy nút. Khi đang gửi, nút khóa. Xen giữa ô nhập và cụm nút xóa/hủy, mọi thao tác vẫn cuộn tới được ở 320dp và chữ 200%. | Not run |
| [Đổi mật khẩu đang cập nhật, 801:9991](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9991) | `/account/delete-account`, đang gửi | Nút báo đang xử lý, form và Back khóa. Không nhảy layout. | Not run |
| [Đổi mật khẩu lỗi, 801:10030](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-10030) | Lỗi mật khẩu hoặc lỗi API | Sai mật khẩu có lỗi bên dưới ô và trường rỗng. Lỗi mạng giữ xác nhận và có nút Thử lại. | Not run |

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

Lượt đầu đã xem chế độ tối ở màn Xóa tài khoản, Trang chủ và Cá nhân.
Ảnh còn trên máy người review. Đối chiếu từng node trong bảng, 360dp,
chữ 200% ở bề ngang thường, TalkBack và so nền ô XÓA với ô mật khẩu
trong chế độ tối vẫn Not run. [Báo cáo AVD](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7206330070)
