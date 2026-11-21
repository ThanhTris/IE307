# GM-35 — Đối chiếu Figma

Đã đọc design context và ảnh render của các frame tài khoản ngày 2026-11-16. Các sửa đổi Cài đặt tham chiếu ảnh export mục 16–17. Người kiểm thử xác nhận đã hoàn thành lượt kiểm Expo Go ngày 2026-11-19. Ảnh AVD đã có cho đăng ký, G04, một nhánh lỗi G05 và Cài đặt ở cỡ chữ lớn trên các revision trước. Kích thước thiết kế tham chiếu 412dp, font scale chuẩn. Android vẽ status bar và thanh điều hướng hệ thống. Xem [CHECKS](CHECKS.md) để phân biệt kết quả tự động và lượt thử thủ công.

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

## Bàn giao lượt AVD cho Trí

Trí thực hiện và ghi bằng chứng AVD nối Auth, REST và worker QA local trên HEAD của PR #182 sau khi nhận code và migration `1a5d335`. Trước lượt kiểm, xác nhận Metro đã sẵn sàng và Expo Go tải được bundle, rồi xác nhận API và Mailpit của phiên QA đang chạy. Tất cả các ca trong bảng chờ bằng chứng trên revision này. [Cách dựng QA](HANDOFF.md#kiểm-thử-trên-expo-go-với-mã-mailpit) · [Kết quả đã ghi](CHECKS.md)

| Hạng mục trên AVD nối QA thật | Bằng chứng trước khi ghép `main` | Bằng chứng cần ghi trên HEAD |
| --- | --- | --- |
| Đăng nhập, xác minh đăng ký và recovery | Đăng ký và xác minh OTP đã chạy. Recovery đã gửi OTP. Đăng nhập lại bằng mật khẩu và hoàn tất recovery từ UI vẫn chờ. | Đăng xuất rồi đăng nhập bằng mật khẩu. Dùng thư Mailpit để xác minh đăng ký và hoàn thành đặt lại mật khẩu từ UI, sau đó đăng nhập bằng mật khẩu mới. Ghi SHA app, thiết bị/Android/API, phiên Expo Go/SDK và run ID QA. |
| G04 pending, lỗi, thử lại | Có ảnh pending, lỗi 503 giữ tên và lần retry cập nhật được tên trong QA. | Kiểm chặn gửi lặp, tên giữ nguyên sau lỗi có kiểm soát và lần thử lại đến GoTrue có ACK. Chụp các trạng thái đối chiếu G04 ở 412dp. |
| G05 pending và lỗi | Đã kiểm một request trong lúc pending. Nhánh Auth từ chối mật khẩu hiện tại có ảnh cả ba ô trống. | Kiểm một request khi bấm lặp trong lúc pending. Sau lỗi API 503 ở bước ghi, chụp cả ba ô trống và nút lưu mở lại. Giữ mật khẩu ngoài ảnh và log. |
| Ảnh đối chiếu 412dp | Đã có một số ảnh app ở 412dp. Sai khác G04 về vị trí toast và nút cần Trí xác nhận. | Ghép ảnh app với frame Figma theo từng ca tài khoản, G04 và G05. Ghi viewport theo dp và sai khác quan sát được. |
| 320dp, 360dp, chữ 200%, bàn phím, Back và safe area | Đã kiểm riêng Cài đặt ở 320dp với chữ 200% trên `3675d42`. | Ghi 320dp và 360dp với chữ chuẩn và 200%. Kiểm trường và nút còn tới được khi cuộn, nội dung tránh thanh hệ thống, bàn phím và Back khi đang nhập hoặc chờ phản hồi. |
| TalkBack | Chưa có kết quả. | Kiểm thứ tự focus, nhãn ô nhập, đọc lỗi và trạng thái nút cập nhật khi pending. |

Lượt 19/11/2026 trên `1561d90` đã boot AVD API 37, 1080 × 2400, 420 dpi, font scale 1,0 và xác nhận Expo Go 58.0.5. Metro QA chưa mở ở `8082`; bảng ca trên vẫn **Not run** cho lượt này và chưa có ảnh app tại 412/360/320dp. Lượt Expo Go thủ công đã ghi ở trên vẫn là bằng chứng của lần kiểm trước.

Lượt tiếp theo trên `7cb8d89` đã mở được app qua Metro QA. Có [ảnh đăng ký ở 412dp](avd-20261119/avd-signup-412.png) và [ảnh G04 sau retry ở 412dp](avd-20261119/avd-g04-readback-412.png). Ảnh bổ sung trên `3675d42` ghi [G04 đang lưu](avd-20261119/avd-g04-pending-412.png), [G04 sau 503](avd-20261119/avd-g04-error-412.png) và [G05 lỗi mật khẩu hiện tại](avd-20261119/avd-g05-invalid-current-412.png). G04 hiện toast phía trên và giữ nút lưu dưới form. Frame lỗi Figma dùng banner trong nội dung và đặt nút retry cuối màn. Sai khác này chờ Trí duyệt visual. [Kết quả hành vi](CHECKS.md#kiểm-bổ-sung-trực-tiếp-trên-avd)
