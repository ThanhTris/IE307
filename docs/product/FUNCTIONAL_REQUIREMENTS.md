# Functional requirements

Draft v0.1. Mỗi ID phải truy vết tới spec, UI, task và test tại [ma trận](../specs/TRACEABILITY.md).

| ID | Mức | Yêu cầu có thể nghiệm thu |
| --- | --- | --- |
| FR-01 | P0 | Vào bằng khách, lưu session an toàn; tên 1–24 ký tự, không cần email |
| FR-02 | P0 | Tạo/vào phòng bằng mã 6 ký tự hoặc QR; báo mã sai/hết hạn/đã khóa/đầy; không vượt 8 người |
| FR-03 | P0 | Host chọn buổi ăn; từng người chọn nhiều loại món hoặc “Gì cũng được”; mọi người sẵn sàng trước khi khóa roster |
| FR-04 | P0 | Mỗi người xem cùng snapshot 8 món; có thể ưu tiên thứ tự riêng nhưng không thay tập món; UNSET chưa phải đồng ý |
| FR-05 | P0 | Mỗi món chọn WANT/OK/NO; sửa được trước khi nộp; sau nộp khóa vòng; không đọc phiếu của người khác |
| FR-06 | P0 | Khi tất cả hoàn tất vòng 1: chọn từ món tất cả WANT; nhiều món thì server chọn một lần, lưu kết quả |
| FR-07 | P0 | Nếu không có món tất cả WANT: vòng 2 chỉ gồm món mọi người đã chọn WANT hoặc OK; giữ/xóa thêm; không phục hồi NO |
| FR-08 | P0 | Nếu vòng 2 còn món: chốt theo điểm WANT vòng 1 cao nhất rồi bốc một lần khi hòa; nếu rỗng: báo chưa đồng thuận |
| FR-09 | P0 | Mất mạng không báo phiếu đã gửi; reconnect đọc snapshot/version; retry cùng requestId không tạo phiếu/kết quả trùng |
| FR-10 | P0 | Kết quả giống nhau trên các máy; giải thích chỉ dạng tổng hợp; link Maps theo món, không hứa quán có món/đang mở |
| FR-11 | P1 | Lời mời bạn ăn cùng được hai bên chấp nhận; tạo phòng nhanh vẫn cần đối phương tham gia, không tự bỏ phiếu |
| FR-12 | P1 | Liên kết tài khoản có đường khôi phục/lỗi; lịch sử chỉ giữ món và thời điểm, không giữ phiếu cá nhân lâu dài |
| FR-13 | P0 | Hỗ trợ nút bấm ngoài vuốt, font scaling, screen reader, theme hệ thống/sáng/tối; luôn có hành động xử lý empty/error |
