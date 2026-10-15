# GM-10 — xác nhận kiểm thủ công trên Expo Go

Ngày ghi nhận: 2026-10-15. Kết quả do người dùng báo trong cuộc hội thoại sau lượt sửa giao diện cuối; agent không trực tiếp thao tác điện thoại và không ghi approval thay Trí.

## Revision và nguồn xác nhận

- Người kiểm: người dùng trong cuộc hội thoại, chưa cung cấp tên riêng; không suy danh tính từ owner hoặc tài khoản GitHub.
- Xác nhận nguyên văn: “tôi đã kiểm tra và ổn thỏa, tiếp theo hãy viết các file md cần thiết trước khi commit lên git và merge request cho Trí review”.
- Nhánh: `codex/gm-10-context-and-preferences`; base HEAD `30ecb5675104f13c64580018cad118647fb3d601` + source/test working tree chưa commit tại thời điểm ghi nhận. [PATCH_MANIFEST](PATCH_MANIFEST.json) ghi SHA256 của 18 file source/test đã kiểm; không tự điền SHA commit chưa tạo.
- Contract: `food-v1/roadmap-v2/GM-10.1`; inputs GM-05.1 và GM-07.1. Mode Expo Go, dữ liệu mock.
- Model thiết bị, Android, phiên bản Expo Go và thời điểm thực hiện từng phép kiểm: chưa được cung cấp. Ngày trên là ngày ghi nhận xác nhận.
- Theo chỉ dẫn người dùng, không yêu cầu ảnh/video UI; lần bàn giao dùng xác nhận bằng văn bản.

## Kết quả và giới hạn

| Mục | Actual / nguồn | Trạng thái |
| --- | --- | --- |
| Mở và sử dụng GM-10 sau bản sửa cuối trên Expo Go | Người dùng xác nhận đã kiểm tra và ổn thỏa sau [DATE_UI_REVIEW](DATE_UI_REVIEW.md) | Pass theo xác nhận chung của người dùng; chưa là nghiệm thu của Trí |
| Tách ngày/giờ, chọn ngày, ngân sách card riêng, checkbox xanh | Ba sửa đổi thuộc bản vừa được xác nhận; không có báo lỗi còn lại trong xác nhận này | Nằm trong xác nhận chung; không tự tạo kết quả riêng cho từng thao tác |
| Light/dark, font200%, TalkBack, keyboard/hardware Back, reduced motion, vùng bấm từng vị trí | Chưa có kết quả tách riêng từng mục | Chưa xác nhận riêng; Trí đối chiếu khi review, không tự ghi Pass |
| Từng fixture manual/denied/outside/empty/stale/null-price/reset-ready, retry và ACK/refetch | Có assertion tự động trong [mobile check](DATE_UI_MOBILE_CHECK.txt); người dùng chưa liệt kê từng ca trên điện thoại | Pass tự động; chưa xác nhận riêng từng fixture trên thiết bị |
| API/GPS/permission/history thật, nhiều thiết bị, persistent outbox | Ngoài scope màn mock GM-10 | N/A cho lần kiểm này; task tích hợp kiểm riêng |

Xác nhận chung không thay kết quả chi tiết chưa báo. Các ca bắt buộc chưa có kết quả riêng cần Trí đối chiếu/kiểm bổ sung trước nghiệm thu; có thể gửi PR để review. Không mở rộng xác nhận này thành API/native integration Pass hoặc Done.

## Tái lập khi review

1. Checkout commit cuối PR; đối chiếu source/test với manifest và thay đổi phát sinh sau xác nhận nếu có.
2. Chạy Expo theo [HANDOFF](HANDOFF.md). Home → Công cụ kiểm thử → Chọn điểm ăn và khẩu vị.
3. Thử ngày/giờ riêng, chọn ngày, ngân sách riêng và chạm toàn hàng xác nhận; sửa context phải bỏ xác nhận/preview. Lưu context → chọn/lưu hoặc bỏ qua khẩu vị → biên nhận → chỉnh lại/Back/Home.
4. Đối chiếu các fixture và mục chưa xác nhận riêng trong bảng; ghi kết quả thực tế cho revision PR được review.

Owner task Tuấn (`mtuan2491`); reviewer cuối Trí (`ThanhTris`). Chỉ Trí được merge và chuyển Done trên Project #2.
