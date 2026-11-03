# GM-13.2 — bước 5: Places/map presentation

Đã có khung map trong app với card quán, danh sách chọn quán, attribution,
thời điểm đọc và nhãn cached. Mock dùng riêng minh họa map; real chỉ dùng
map renderer/capability được inject, không lấy ảnh minh họa làm map thật.

Có loading/ready/empty/error/offline/permission/denied/blocked/location-off/
unsupported, retry/request permission/open settings và Maps/TikTok/YouTube.
Không tự xin GPS, gọi Places hoặc mở ứng dụng ngoài từ mock. Lỗi Places
không đổi projection; chỉ xuất hiện sau DECIDED hợp lệ. Dữ liệu khác
result/winner bị ẩn; external target dùng đúng winner, không gắn quán sai.

Action async có lock chống bấm trùng, feedback lỗi và scope theo result;
response của scope cũ không cập nhật màn mới. Public place projection
loại ID trùng/sai, giữ tọa độ/khoảng cách thiếu là null, không ép về0.
Adapter/Google key/restrictions/native map/API thật vẫn thuộc GM-27/30.

TypeScript Pass; lint exit0 có2 cảnh báo import trùng được gộp ở bước6.
Unit/component17 tests Pass19.357s, gồm
10 state, mismatched identity, NO_CONSENSUS gating, renderer, cached-error
và pending double action. Không thêm native package/lockfile.
