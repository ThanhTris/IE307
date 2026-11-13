# Toast, thông báo và trạng thái trong trang

Chốt với chủ dự án ngày 2026-11-12. Áp dụng cho mọi màn của app mobile.

## Ba loại phản hồi

| Loại | Khi nào dùng | Hiển thị | Ví dụ |
|---|---|---|---|
| **Toast** | Kết quả của chính thao tác người dùng vừa làm: lỗi API/BE, hoặc tạo/thêm/sửa/xóa thành công; cảnh báo ngoại tuyến hay dữ liệu cũ | Trượt xuống từ trên cùng, tự tắt sau 3 giây, chạm để tắt | "Đã gửi lời mời kết bạn", "Chưa gửi được phiếu", "Đang ngoại tuyến" |
| **Thông báo** | Sự kiện do **người khác** gây ra | Hộp thư + push; nếu app đang mở thì hiện thêm banner thông báo (nền trắng, icon chuông, 5 giây), chạm để mở nơi liên quan | Lời mời kết bạn, được chấp nhận kết bạn, mời vào phòng, phòng bắt đầu, có kết quả, phòng bị hủy |
| **Trạng thái trong trang** | Tình trạng của màn hình, không phải kết quả một thao tác | Chữ căn giữa trên trang (không khung, không toast), skeleton khi đang tải, nút hành động nếu cần | "Phòng đã kết thúc", "Chưa có bữa ăn đã lưu", "Cần cấp quyền vị trí" |

## Màu toast

| Tone | Màu | Dùng cho |
|---|---|---|
| `error` | Đỏ `#DC2626` | Máy chủ từ chối, lỗi mạng, không lưu/gửi được |
| `success` | Xanh lá `#16A34A` | Tạo, thêm, sửa, xóa thành công |
| `warning` | Vàng `#D97706` | Ngoại tuyến, dữ liệu có thể đã cũ, thao tác bị chặn cần bước khác (form chưa hợp lệ, phòng vừa thay đổi) |
| `notification` | Trắng, viền xanh `#15803D`, icon chuông | Banner thông báo từ người khác khi app đang mở |
| `info` | Xanh dương | Chỉ giữ để tương thích; không dùng cho code mới |

Mọi chỗ gọi toast phải truyền `tone` tường minh. `toneFromText` chỉ còn là đường dự phòng.

## Cách code

- `ToastNotice` / `useToast().show(...)`: toast. Truyền `tone`.
- `StatusNotice`: `tone="error"` thành toast đỏ (nút thử lại vẫn ở trên trang); mọi tone khác là chữ trên trang.
- `RequestBanner`: `offline`/`stale` thành toast vàng, `error` thành toast đỏ, `info` là chữ trên trang.
- `InboxBadgeProvider`: thông báo mới khi app đang mở hiện banner `notification`, chạm mở Hộp thư (hoặc Bạn bè với kết bạn).

## Rà soát ngày 2026-11-12

| Màn / thành phần | Trước | Sau |
|---|---|---|
| `StatusNotice` (toàn app) | Mọi trạng thái đều thành toast, kể cả "Phòng đã bị hủy", "Đang khôi phục phiên…" | Chỉ lỗi API là toast; còn lại là chữ trên trang |
| `InboxBadgeProvider` | Thông báo mới hiện toast xanh dương / xanh lá như kết quả thao tác | Banner thông báo riêng (chuông), chạm mở Hộp thư / Bạn bè |
| Thiết lập phòng, Khẩu vị | Tone đoán theo chữ; có toast "Đã tải lại trạng thái" và "Không đủ món" trùng với hộp thoại | Tone tường minh (`setupNoticeTone`); bỏ hai toast thừa |
| Phòng chờ | Tone đoán theo chữ; toast "Phòng chuyển sang vòng 1" | Tạo/sửa/xóa xanh lá, lỗi đỏ (`lobbyNoticeTone`); bỏ toast chuyển vòng; "Chưa thể bắt đầu" thành đỏ |
| Bạn bè | Một toast không tone cho cả thành công và lỗi | "Đã …" xanh lá, còn lại đỏ; lỗi tải lời mời thành đỏ |
| Hộp thư | Tone đoán theo chữ | Lỗi thao tác luôn đỏ |
| Cài đặt thông báo | Tiêu đề chung "Trạng thái thông báo" | Bật/tắt thành công xanh lá, bị từ chối quyền vàng, lỗi đỏ |
| Lịch sử | Tiêu đề chung "Kết quả máy chủ" | "Đã xóa" xanh lá / "Chưa xóa được" đỏ |
| Quán ăn gần đây | Mọi trạng thái là toast | Lỗi tải đỏ, ngoại tuyến vàng, còn lại (cần quyền, chưa tìm thấy) là chữ trên trang |
| Mã QR phòng | Toast "Đã sao chép" trùng với nút đổi chữ | Bỏ toast, nút đổi thành "Đã sao chép" |
| Trang chủ, Tiếp tục phiên | Lỗi kiểm tra phòng/phiên là toast vàng | Lỗi là toast đỏ; phòng không còn dùng được là chữ trên trang |

Còn lại cố ý giữ: cảnh báo vàng trong hộp sửa bữa ăn ở phòng chờ khi giờ hẹn không hợp lệ (form nằm trong sheet, không có chỗ hiện chữ). Các bố cục QA cũ của vòng 1/vòng 2 dùng `StatusNotice` nên tự theo quy tắc mới.
