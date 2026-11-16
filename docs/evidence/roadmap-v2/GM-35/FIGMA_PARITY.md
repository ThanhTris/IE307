# GM-35 — Đối chiếu Figma

Đã đọc design context và ảnh render của các frame ngày 2026-11-16. Trạng thái giao diện trên Expo chờ người dùng kiểm và xác nhận. Kích thước tham chiếu 412dp, font scale chuẩn. Android tự vẽ status bar và thanh điều hướng hệ thống.

| Frame | Route / trạng thái | Kỳ vọng để đối chiếu trên Expo |
| --- | --- | --- |
| [Đăng nhập](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=261-1639), [Đăng ký](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=261-1687) | `/account/sign-in`, `/account/sign-up` | Hero xanh, logo app và SVG từ Figma. Form dùng component, font và màu giao diện của app. |
| [Xác minh email](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=263-1705), [Email đã được dùng](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=382-8626) | `/account/sign-up`, `/account/link` | Nhập mã và gửi lại. Email trùng khi liên kết báo lỗi từ GoTrue. Đăng ký giữ thông báo chung theo tài liệu provider. |
| [Quên mật khẩu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=263-1664), [Đã gửi email](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=264-6293), [Đặt mật khẩu mới](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=382-8566) | `/account/recovery` | Nhập email, nhận OTP, nhập mật khẩu mới, về đăng nhập. Giữ pattern header, badge và nút chính. |
| [Cá nhân · Khách](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=232-349), [Cá nhân · Đã đăng nhập](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1649) | `/profile` | Thẻ danh tính, tab Cá nhân và hành động theo loại phiên. Tài khoản hiển thị email thật và avatar chữ cái. |
| [Sửa hồ sơ](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=261-1731), [G04 đang lưu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9899), [G04 lưu lỗi](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9939) | `/account/edit-profile` | Chặn bấm lặp khi pending, giữ tên nhập nếu lỗi, báo đã lưu sau ACK. |
| [Đổi mật khẩu](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=260-1857), [G05 đang cập nhật](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-9991), [G05 lỗi](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=801-10030) | `/account/change-password` | Chặn bấm lặp khi pending. Khi provider trả lỗi, cả ba ô trống và có thể nhập lại. |

## Khác biệt do backend

- Figma có Google Sign-In. GoTrue local hiện có email và khách, chưa có cấu hình Google. Luồng tài khoản dùng email.
- Figma mô tả liên kết đặt lại mật khẩu. QA dùng mã sáu chữ số trong Mailpit để thực thi trực tiếp trong Expo Go. Liên kết phiên khách yêu cầu xác minh email rồi đặt mật khẩu theo GoTrue. [Supabase Auth](https://supabase.com/docs/guides/auth/auth-anonymous) · [Mẫu email](https://supabase.com/docs/guides/auth/auth-email-templates)
- Thẻ Figma dùng avatar mẫu. Hồ sơ hiển thị chữ cái từ tên thật của tài khoản. Storage local đang tắt. Các công tắc ngoài phạm vi tài khoản trong frame Cá nhân không có trong luồng GM-35.
