# Đặc tả luồng học thẻ — Manabi

Liên kết: FR-01/05/06, NFR-01/02/03/07; [DECK_CARD](DECK_CARD_SPEC.md), [SRS](SRS_SPEC.md). [Prototype](../../design/prototypes/manabi-vocabulary.html) là tham chiếu; native app chưa triển khai.

## Phiên học

Chọn deck, học mới/ôn đến hạn, số card tối đa và mặt thẻ. Domain tạo snapshot queue gồm card/version/template/due; front/back theo field key đã validate, không hard-code meaning cho mọi deck. Card thiếu required skip với số/lý do; deck rỗng/hết due có trạng thái rõ và hành động học mới/game.

Mặt trước chỉ nội dung mapping. Chạm/lệnh accessible để reveal mặt sau; sau reveal mới có Again/Hard/Good/Easy. Lựa chọn đầu ghi review event ID unique + cập nhật lịch trong một transaction. Double tap không ghi hai rating. Ghi lỗi giữ card và retry; không báo “đã lưu” trước commit.

Thoát/force-close lưu queue position để resume; card reveal có thể trở lại front, chưa rating thì không tự chấm. Card sửa/archive khi resume refresh/skip có giải thích. Cuối phiên đếm rating commit/duration, không gọi Good là số từ thuộc chắc chắn.

## Thiết lập và thao tác

Core không yêu cầu tài khoản. Lưu local dark/system mode, giới hạn phiên, hướng hỏi/template và reduce-motion. Safe area, TalkBack label/state, font scaling, target hợp lệ. Không cần camera/microphone/notification để học thẻ. Notification nhắc ôn chỉ khi có task/consent riêng.

## Nghiệm thu

Airplane + restart vẫn học/rating; front/back custom; rating trước reveal bị chặn; replay id không duplicate; force-close sau commit giữ event/due và trước commit không ghi giả; empty/invalid queue kết thúc; font 200%/dark không che nút; clock/timezone theo SRS.
