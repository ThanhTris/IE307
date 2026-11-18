# GM-35 — Đối chiếu Figma

Đã đọc design context và ảnh render của các frame tài khoản ngày 2026-11-16. Các sửa đổi Cài đặt tham chiếu ảnh export mục 16–17. Người kiểm thử xác nhận đã hoàn thành lượt kiểm Expo Go ngày 2026-11-19. Hồ sơ chưa có ảnh app, thiết bị và viewport để đối chiếu từng frame. Kích thước thiết kế tham chiếu 412dp, font scale chuẩn. Android vẽ status bar và thanh điều hướng hệ thống. Xem [CHECKS](CHECKS.md) để phân biệt kết quả tự động và lượt thử thủ công.

| Frame | Route / trạng thái | Kỳ vọng để đối chiếu trên Expo |
| --- | --- | --- |
| [Đăng nhập](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=261-1639), [Đăng ký](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=261-1687) | `/account/sign-in`, `/account/sign-up` | Hero xanh, logo app và SVG từ Figma. Lỗi nhập liệu hiện dưới ô. Khi máy chủ từ chối thông tin đăng nhập, app hiện toast ở trên, giữ email và xóa mật khẩu. |
| [Xác minh email](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=263-1705), [Email đã được dùng](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=382-8626) | `/account/sign-up`, `/account/link` | Nhập mã và gửi lại. Email trùng khi liên kết báo lỗi từ GoTrue. Đăng ký giữ thông báo chung theo tài liệu provider. |
| [Quên mật khẩu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=263-1664), [Đã gửi email](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=264-6293), [Đặt mật khẩu mới](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=382-8566) | `/account/recovery` | Nhập email, nhận OTP, nhập mật khẩu mới, về đăng nhập. Giữ pattern header, badge và nút chính. |
| [Cá nhân · Khách](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=232-349), [Cá nhân · Đã đăng nhập](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1649) | `/profile` | Thẻ danh tính và hành động theo loại phiên. Khách hiện tiêu đề Khách, tên đã nhập, tùy chọn Giao diện/Cỡ chữ và luồng liên kết email. Tài khoản hiện email từ GoTrue và mục Cài đặt đầy đủ. |
| [16 · Cá nhân / Hồ sơ / Tài khoản](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3083), [17 · Cài đặt / Trợ năng / Đăng xuất](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=330-3085) | `/profile`, bảng chọn, xác nhận xóa hoặc đăng xuất | Cài đặt gồm công tắc Thông báo/Lưu lịch sử, bảng chọn Giao diện/Cỡ chữ và xác nhận xóa lịch sử cá nhân. Đăng xuất về màn mở đầu, hộp thoại ghi có thể tiếp tục với tài khoản khách. |
| [Sửa hồ sơ](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=261-1731), [G04 đang lưu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9899), [G04 lưu lỗi](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9939) | `/account/edit-profile` | Chặn bấm lặp khi pending, giữ tên nhập nếu lỗi, báo đã lưu sau ACK. |
| [Đổi mật khẩu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857), [G05 đang cập nhật](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9991), [G05 lỗi](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-10030) | `/account/change-password` | Chặn bấm lặp khi pending. Khi provider trả lỗi, cả ba ô trống và có thể nhập lại. |

## Khác biệt do backend

- Figma có Google Sign-In. GoTrue local hiện có email và khách, chưa có cấu hình Google. Luồng tài khoản dùng email.
- Figma mô tả liên kết đặt lại mật khẩu. QA dùng mã sáu chữ số trong Mailpit để thực thi trực tiếp trong Expo Go. Liên kết phiên khách yêu cầu xác minh email rồi đặt mật khẩu theo GoTrue. [Supabase Auth](https://supabase.com/docs/guides/auth/auth-anonymous) · [Mẫu email](https://supabase.com/docs/guides/auth/auth-email-templates)
- Thẻ Figma dùng avatar mẫu. Hồ sơ hiển thị chữ cái từ tên thật của phiên. Storage local đang tắt. Công tắc Hiện nút chọn món trong mẫu trợ năng nằm ngoài phần cài đặt được giao trong lần sửa này.
- Theo phản hồi khi thử, khách vẫn thấy Bạn bè và Lịch sử ở footer nhưng mở đến màn mời đăng nhập. Hộp thư, push và Kèo nhanh dành cho tài khoản đã đăng nhập. Đây là hành vi bổ sung được yêu cầu sau lượt đối chiếu ban đầu.

## Bằng chứng AVD sau review #182

Lượt review lại xác định ADB hoạt động nhưng `adb devices -l` trả danh sách rỗng. Workspace và các vị trí cài đặt SDK trên máy chưa có Android Emulator/AVD có thể chạy. Vì vậy chưa có Android/Expo runtime, viewport hay ảnh để đối chiếu nhánh sửa. Giữ kết quả Expo Go thủ công ngày 2026-11-19 ở đầu tài liệu. [Thiết lập AVD cho Expo Go](https://docs.expo.dev/get-started/set-up-your-environment/?device=simulated&mode=expo-go&platform=android).

| Hạng mục trên AVD nối QA thật | Bằng chứng cần ghi |
| --- | --- |
| Đăng nhập, xác minh đăng ký và recovery | Ghi SHA app, phiên Android/API, phiên Expo Go/SDK và mã lần chạy QA. Dùng thư Mailpit để xác minh và đặt lại mật khẩu, rồi đăng nhập bằng mật khẩu mới. Chụp các màn ở 412dp. |
| G04 pending, lỗi, thử lại | Ghi đầu vào tên mới và lỗi có kiểm soát trên đường tới QA. Chụp pending, lỗi vẫn giữ tên và lần thử lại có ACK. Đối chiếu các frame G04 ở 412dp. |
| G05 pending và lỗi | Bấm lưu lần hai khi lần đầu còn pending, kiểm một lần gửi. Khi lần đầu lỗi, chụp cả ba ô đã xóa và nút lưu hoạt động lại. Đối chiếu các frame G05 ở 412dp, giữ mật khẩu ngoài ảnh và log. |
| 320/360dp, chữ 200%, TalkBack, bàn phím, Back | Ghi kết quả thực tế theo từng cấu hình. Kiểm trường và nút còn tới được khi cuộn, nhãn/lỗi được đọc, nút Back khi bàn phím mở và khi đang gửi, nội dung tránh thanh hệ thống. |
