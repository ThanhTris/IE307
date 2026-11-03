# GM-13.2 — bước 4: read states và chưa đồng thuận

Đã có DishResultFlow kiểm capability/projection trước trình bày, phân
biệt loading/finalizing/error/unknown/invalid với kết quả terminal.
Invalid không vinh danh, không podium/Places và không tự suy winner.

Hai màn NO_CONSENSUS dùng bowl illustration và copy theo mẫu: R1
EMPTY_INTERSECTION không mở R2; R2 ALL_REMOVED không còn món. Không
winner/điểm/roster/Places hoặc vòng3, không có câu chữ ready ở UI mới.
Legacy winner-only có màn riêng, không tạo điểm hoặc Top3 giả.

Nút Thử lại chỉ gọi read callback; Home/Tạo phòng mới là callback riêng,
không evaluate/reroll kết quả. Overlay chỉ cho winner đã kiểm hợp lệ.
Components nhận input riêng, chưa nối route mặc định trước bước6.

TypeScript/lint tập trung Pass;8 tests read-state/terminal/legacy Pass
trong lượt regression đã chạy. Source render cùng token/Inter, text lớn
cuộn được; kiểm native/visual cụ thể vẫn bước7.
