# GM-13.2 — ghi nhận kiểm thử Expo của người dùng

Ngày 2026-11-03, implementation gần nhất trước báo kiểm xong `9373b80`.
Nguồn: xác nhận trực tiếp trong hội thoại, agent không tự thao tác điện thoại.
Người dùng: “tôi đã kiểm thử expo xong”. Khi bổ sung môi trường:
“Android 13, tôi không biết TalkBack là gì, có chế độ tối, cỡ chữ không
chắc bao nhiêu nhưng nhìn rõ”.

| Mục | Actual được cung cấp | Trạng thái ghi nhận |
| --- | --- | --- |
| Expo smoke UI GM-13 sau các lượt sửa | Người dùng báo kiểm thử xong, Android13 | Pass theo báo cáo người dùng ở mức tổng quát; không tự chia thành từng AC Pass |
| Cỡ chữ hiện tại | Nhìn rõ, không biết fontScale | Đã có xác nhận đọc được; không phải kiểm200% |
| Chế độ tối | Người dùng cho biết có chế độ tối | Chưa có kết quả từng screen/state; không ghi visual parity Pass |
| Model máy/Expo Go version/build commit thật | Chưa cung cấp; source gần nhất9373b80, lockfile SDK58.0.19 | Chưa xác nhận runtime/build cụ thể |
| TalkBack | Người dùng chưa biết tính năng | Not run/chưa xác nhận; cần reviewer/QA kiểm focus, tên control và đọc winner |
| Font200% và320/360/412dp | Chưa biết cỡ chữ/viewport | Chưa xác nhận; không suy từ chữ hiện tại rõ |
| Reduce Motion/safe area/Back/từng state riêng | Chưa có kết quả riêng sau sửa | Chưa xác nhận từng AC; component/router checks báo riêng |
| Ảnh Figma/app cùng viewport sau sửa | Chỉ có ảnh lỗi đầu vào, chưa có bộ ảnh sau sửa | Chưa có evidence đối chiếu cuối |
| Native map/Places/GPS/external apps/API | Bộ đang kiểm là mock | Ngoài execution GM-13; GM-27/30/33 nhận, không ghi Pass |

TalkBack là trình đọc màn hình Android cho người dùng khiếm thị. Cần kiểm
thứ tự focus, label điểm/hạng/winner, thao tác đóng vinh danh/Home/new
session/permission bằng điều hướng TalkBack, không chỉ bật tính năng.

Reviewer Trí quyết định nghiệm thu scope. Các AC bắt buộc chưa đủ evidence
không được tự đánh dấu Done/Approved. Bảng này không yêu cầu người dùng
thực hiện native integration ngoài scope để nhận handoff UI.
