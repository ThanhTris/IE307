# GM-53 — Đối chiếu thiết kế

Đã xem ảnh Figma qua MCP ngày 26/11/2026 ở kích thước 412dp. GM-53 dùng
pattern sẵn có của GM-35 để bổ sung trạng thái xóa và liên kết pháp lý.
Màn mới dùng header Back, vùng nội dung an toàn có cuộn, form và
nút của hệ thống thiết kế hiện hành.

| Frame tham chiếu | Trong app | Expected khi so trên AVD | Actual AVD |
| --- | --- | --- | --- |
| [Hồ sơ tài khoản, 260:1649](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1649) | `/profile`, thông tin ứng dụng và mục Xóa tài khoản | Xóa tài khoản là một hàng trong nhóm Tài khoản, có icon thùng rác và màu cảnh báo. Đăng xuất nằm sau nhóm Thông tin ứng dụng. | Not run |
| [Đổi mật khẩu, 260:1857](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857) | `/account/delete-account`, form khách/email | Hai ô nhập dùng cùng nền và chiều cao theo theme. Khách chỉ nhập XÓA. Email có ô mật khẩu có che ký tự. Cảnh báo và nút xóa dùng token danger. | Not run |
| [Đổi mật khẩu đang cập nhật, 801:9991](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9991) | `/account/delete-account`, đang gửi | Nút báo đang xử lý, form và Back khóa. Không nhảy layout. | Not run |
| [Đổi mật khẩu lỗi, 801:10030](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-10030) | Lỗi mật khẩu hoặc lỗi API | Sai mật khẩu có lỗi bên dưới ô và trường rỗng. Lỗi mạng giữ xác nhận và có nút Thử lại. | Not run |

Nội dung mô tả xóa, màu nút xóa và ba hàng liên kết là phần bổ sung
theo AC. Đối chiếu trên 412dp, 320/360dp và font 200%, sáng/tối,
TalkBack, bàn phím và cả khoảng safe area. Ghi ảnh Figma/app cùng ca với
model thiết bị, font scale và revision. [Ca thủ công](HANDOFF.md#bước-5--kiểm-expo-go-trên-avd)
