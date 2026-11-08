# GM-13.2 — bước 2: podium và kết quả

Đã bổ sung variant podium vào ResultPodium dùng chung, giữ variant cards
mặc định cho consumer cũ. Có DishResultFrame/Screen, artwork/fallback và
card Cùng ăn nhận roster đã được cấp quyền từ composition.

Bục cùng rank có cùng chiều cao; tên không cắt numberOfLines, score lấy
nguyên từ projection. Nhãn Món được chọn đặt dưới podium trong luồng
layout, không chồng lên card Cùng ăn. Vị trí trang trí podium theo Figma
2–1–3 khi chỉ có một rank1; không mutate/sort dữ liệu hoặc tính lại rank.
Các món đồng hạng giữ thứ tự đầu vào. Đây là ánh xạ vị trí trình bày,
không đổi persisted result order/score/winner.

Đã tách6 artwork nhỏ từ PNG user cung cấp:3 ảnh món, laurel, bowl và
map illustration. SOURCE.md và script tái lập ghi tọa độ/provenance.
Ảnh món chỉ được bootstrap mock cung cấp; dữ liệu thật thiếu artwork
vẫn fallback. Không dùng cả screenshot làm UI, không bịa URI.

Kiểm: TypeScript Pass; component + shared regression28 tests Pass;
lint tập trung Pass; PNG pixel34/34 Pass, kiểm alpha/ink/dimensions của
6 asset mới và28 baseline. Đã mở/composite artwork để kiểm silhouette
và crop; ảnh món contain, không tint; chỉ laurel là glyph được tint.

Chưa nối route sản phẩm; chưa đo visual trên Android/Expo Go. Typography,
geometry và chuyển động native tiếp tục kiểm trong bước7.
