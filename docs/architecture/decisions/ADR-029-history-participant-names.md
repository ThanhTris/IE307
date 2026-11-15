# ADR-029 — Tên người cùng ăn trong lịch sử

GM-42 áp dụng consent lịch sử nhóm theo phương án đã chốt trong chat. Mỗi người trong roster khóa phải bật consent nhóm và có grant còn hiệu lực lúc khóa phòng và lúc chốt kết quả.

- Chụp tên trong phòng và vai trò theo thứ tự roster khóa. Danh sách có 2–20 người, giữ tên trùng. Trả `displayName` và `role` cho mỗi người.
- Giữ snapshot trong schema private. Snapshot đã chốt gắn với bản lịch sử nhóm hiện có. RPC chỉ đính kèm snapshot vào lịch sử cá nhân hoặc nhóm mà caller đã được phép đọc, khi caller cũng còn quyền đọc bản lịch sử nhóm đó.
- Khi lịch sử nhóm bị xóa hoặc thu hồi quyền, xóa snapshot theo bản lịch sử hoặc audience tương ứng. Kiểm thời hạn ở mỗi lần đọc. Cleanup lịch sử nhóm dọn snapshot đã hết hạn. Lịch sử cá nhân còn quyền tiếp tục hiển thị kết quả.
- Tên tạm lúc khóa được dọn khi grant thay đổi, phòng kết thúc hoặc bị dọn. Bật lại consent chỉ áp dụng cho lần khóa phòng về sau. Các bản ghi cũ hoặc phòng đã khóa trước migration tiếp tục trả history item với các field hiện có.
