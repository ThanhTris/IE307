# Đặc tả trò chơi

## Dữ liệu đầu vào chung

Chỉ card đã học, không bị archive, có đủ field theo game mapping và không trùng normalized answer trong cùng lượt.

## Matching

- 3-4 cặp; pair id nội bộ không lộ đáp án.
- Cặp sai đóng lại sau phản hồi; lần chọn đầu lưu signal.
- Kết thúc khi tất cả cặp đúng; tính accuracy và duration.

## Four Choices

- Một correct answer, ba distractor khác nhau.
- Không chọn distractor có normalized value bằng đáp án.
- Chỉ lựa chọn đầu tiên quyết định đúng/sai.

## Word Ninja

- Ba mạng; tốc độ tăng có giới hạn.
- Chém sai hoặc bỏ lỡ target đúng mất mạng.
- Bom/tim/power-up chỉ ảnh hưởng gameplay; auto-hit không tạo learning signal.
- Có reduce-motion hoặc chế độ đơn giản để bảo đảm accessibility/performance.

## Kết quả

Mỗi session lưu game type, deck, start/end, accuracy, score, duration và danh sách signal tối thiểu cần thiết. Không lưu raw touch trajectory.
