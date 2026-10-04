# Đặc tả luồng học thẻ — Manabi

Liên kết: FR-01/05/06, NFR-01/02/03/07; [DECK_CARD](DECK_CARD_SPEC.md), [SRS](SRS_SPEC.md). [Prototype](../../design/prototypes/manabi-vocabulary.html) là tham chiếu; native app chưa triển khai.

## Phiên học

Chọn deck, học mới/ôn đến hạn, số card tối đa và mặt thẻ. Domain tạo snapshot queue gồm card/version/template/due; front/back theo field key đã validate, không hard-code meaning cho mọi deck. Card thiếu required skip với số/lý do; deck rỗng/hết due có trạng thái rõ và hành động học mới/game.

Mặt trước chỉ nội dung mapping câu hỏi (với deck từ vựng mặc định là mặt chữ và cách đọc). Chạm/lệnh accessible lật sang mặt sau chỉ có nghĩa/ví dụ được mapping; không lặp lại mặt chữ/cách đọc như một phần đáp án. Chạm lần nữa trở về mặt trước. Bốn nút Again/Hard/Good/Easy **ẩn cho đến lần đầu mở mặt sau của từng card**; sau đó luôn hiện dù người học lật qua lại, và reset về ẩn khi chuyển card mới. Lựa chọn đầu ghi review event ID unique + cập nhật lịch trong một transaction. Double tap không ghi hai rating. Ghi lỗi giữ card và retry; không báo “đã lưu” trước commit.

Thoát/force-close lưu queue position để resume; card reveal có thể trở lại front, chưa rating thì không tự chấm. Card sửa/archive khi resume refresh/skip có giải thích. Cuối phiên đếm rating commit/duration, không gọi Good là số từ thuộc chắc chắn.

## Hợp đồng UI của màn học

- Header giữ tên **“Phiên học từ vựng”** ở giữa, không đè nút; nút quay lại ở trái, **xem lại thẻ trước** và menu tùy chọn ở phải. Nút xem lại thẻ trước không phải nút lật về mặt trước.
- Card đứng ổn định giữa vùng học khi lật. Nội dung dài làm card mở rộng về cả trên và dưới; hàng bốn nút luôn ngay dưới card. Dành sẵn chỗ cho hàng nút ngay cả khi chưa reveal để card không nhảy vị trí.
- Bốn nút gọn, bo góc, nền màu phân biệt và không có đường viền hoặc vạch màu sát mép. Ví dụ/ý nghĩa dùng nền trung tính, không tự tô nổi một câu chỉ vì nội dung chữ. Tag nằm ở vùng trên card, cách nội dung chính rõ ràng.
- Khi kéo ngang sau lần reveal, card đi theo ngón tay; phản hồi **“HỌC LẠI”** cho trái và **“NHỚ TỐT”** cho phải nằm cố định ở giữa vùng học. Thả qua ngưỡng thì chạy hiệu ứng rời card và ghi Again/Good; kéo chưa qua ngưỡng thì card trở về. Không có dòng hướng dẫn vuốt thường trực. Vuốt/rating trước reveal không được ghi kết quả.
- Menu tùy chọn của màn học gồm **Chỉnh sửa thẻ, Cài đặt ôn tập, Hẹn lại lịch ôn, Thông tin thẻ** theo prototype. Các khoảng thời gian hiện trên bốn nút của prototype là dữ liệu minh họa; app lấy interval thật từ scheduler cho card hiện tại.

## Thiết lập và thao tác

Core không yêu cầu tài khoản. Lưu local dark/system mode, giới hạn phiên, hướng hỏi/template và reduce-motion. Safe area, TalkBack label/state, font scaling, target hợp lệ. Không cần camera/microphone/notification để học thẻ. Notification nhắc ôn chỉ khi có task/consent riêng.

## Nghiệm thu

Airplane + restart vẫn học/rating; front/back custom; rating trước reveal bị chặn; sau reveal lật lại front vẫn thấy bốn nút, card mới lại ẩn nút; vuốt trái/phải theo tay và phản hồi ở giữa; undo mở thẻ trước; replay id không duplicate; force-close sau commit giữ event/due và trước commit không ghi giả; empty/invalid queue kết thúc; font 200%/dark không che nút; clock/timezone theo SRS.
