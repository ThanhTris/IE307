# Functional requirements — v0.2

2026-10-07 • yêu cầu hiện hành chờ review. Mỗi ID được truy vết ở [ma trận](../specs/TRACEABILITY.md).

| ID | Mức | Yêu cầu nghiệm thu |
| --- | --- | --- |
| FR-01 | P0 | Khách có auth identity, tên 1–24 ký tự; session secure, restore sau restart; mất phiên báo giới hạn. |
| FR-02 | P0 | Tạo/vào phòng mã 6 ký tự hoặc QR; lỗi sai/hết hạn/đầy/đã khóa; tối đa 8 người, không join trùng. |
| FR-03 | P0 | Host xác nhận buổi/context; category từng người là ưu tiên mềm; đủ 2 người và mọi người ready mới start. |
| FR-04 | P0 | Cùng snapshot tối đa 8 món không trùng, cùng context/catalogue version; thiếu dữ liệu không nhân bản hoặc giả có món. |
| FR-05 | P0 | WANT/OK/NO mỗi món, UNSET chặn; sửa trước bấm Gửi, payload đã queue/sending khóa theo outbox; phiếu khác giữ kín. |
| FR-06 | P0 | Đủ mọi phiếu vòng 1: tập unanimous WANT được server chọn một lần, result ổn định. |
| FR-07 | P0 | Không unanimous WANT: vòng 2 chỉ từ món mọi người WANT/OK, Giữ/Loại thêm, không phục hồi NO. |
| FR-08 | P0 | Đủ vòng 2: tối đa score=2W+OK trong tập mọi người Giữ; hòa bốc một lần; 4 nhãn/lý do; rỗng kết thúc chưa đồng thuận. |
| FR-09 | P0 | Realtime/snapshot version và polling fallback; tiến độ chỉ tính ACK; reconnect giữ cùng result, không chốt offline. |
| FR-10 | P0 | Xin foreground location lần mở đầu; sau chốt lấy vị trí người bấm tạo Maps/YouTube/TikTok search; deny/error có fallback, không cam kết bán kính. |
| FR-11 | P0 | Kết bạn hai chiều; avatar gửi room invite/inbox, accept không nhập mã; không tự join/ready, unfriend/retry/expiry đúng. |
| FR-12 | P1 | Account link/recovery không mất phiên guest khi lỗi; sync history nhiều máy có consent/xóa và không raw votes. |
| FR-13 | P0 | Button thay gesture, font200/TalkBack/dark/reduced motion, touch48dp; mọi màn có loading/empty/error. |
| FR-14 | P0 | Push server event cho room invite và result; permission/inbox fallback, token auth, dedupe/receipt; tap đọc lại auth/snapshot. |
| FR-15 | P0 | Context giờ/buổi/category/budget/history có nguồn và giải thích, khóa khi start; không dùng khoảng cách khi thiếu mapping quán. |
| FR-16 | P0 | SQLite cache/outbox: chỉ queue sau Gửi, persist trước network; pending khác ACK; restart/replay/version conflict/expiry không gửi sai vòng hoặc trùng. |
| FR-17 | P0 | History tối thiểu theo consent, offline cache/xóa; chống lặp mềm theo đúng nhóm 3 phiên gần; thiếu consent dùng catalogue thường, không học raw votes. |
| FR-18 | P0 | Incoming link warm/cold start kiểm server và user accept; không auth token trong link; mã fallback; không hứa deferred linking khi chưa có hạ tầng. |
| FR-19 | P0 | Double-tap card chỉ WANT, không toggle/submit; vuốt dọc/scroll/chạm đơn không vote; chi tiết bằng nút; swipe ngang là shortcut tùy chọn. |
| FR-20 | P1 | Pilot venue–dish có nguồn/ngày xác minh; lọc radius trong vùng dữ liệu, phân biệt đường chim bay với đường đi và không biết với không có quán. |
