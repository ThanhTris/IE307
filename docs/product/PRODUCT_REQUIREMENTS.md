# Gì Cũng Được — yêu cầu sản phẩm

Phiên bản tài liệu 0.2 • 2026-10-07 • chờ review độc lập. [Mô tả dễ đọc](SYSTEM_OVERVIEW.md) là điểm bắt đầu cho thành viên mới. Spec/task v0.2 thay phần phạm vi v0.1 trong tài liệu hiện hành; không phải xác nhận triển khai.

## Vấn đề và giá trị

Nhóm 2–8 người cần quyết định ăn gì ngay trước bữa. Muốn ăn khác với ăn được; hệ thống tìm phương án thỏa hiệp tốt nhất trong tập mọi người chấp nhận và giải thích bằng luật rõ. Tối đa hai vòng, server chốt một lần, NO không thể là winner.

Chọn món trước rồi tìm quán. Mobile giúp vào phòng bằng camera/link, mời bạn quen/push, chọn một tay, khôi phục khi mạng yếu và mở Maps/review bằng vị trí. [Nghiên cứu 8 app](../research/LECTURER_APPS_REVIEW_2026-10-07.md) cho thấy swipe/ba mức/friends đã có tiền lệ; cải thiện phải chứng minh bằng độ đúng và thử nhóm.

## Phạm vi

| Mức | Bao gồm |
| --- | --- |
| P0 | Guest/session; 2–8 người; mã/QR/incoming link; buổi ăn gợi ý theo giờ, category mềm, budget tham khảo; pool tối đa 8; card ảnh/tag/giá; double-tap WANT/ba nút; hai vòng/scoring/4 nhãn kết quả; private votes; realtime; SQLite cache/outbox; kết bạn/avatar/inbox; push mời/kết quả; history tối thiểu/consent/chống lặp; vị trí foreground và Maps/YouTube/TikTok; a11y, QA/APK |
| P1 | Account link/recovery và history sync đa thiết bị; pilot venue–dish có bán kính trong vùng dữ liệu đã xác minh |
| P2 | OCR menu và AI phân loại sở thích có xác nhận; nghiên cứu fairness dài hạn |
| Ngoài scope | Đặt món/đặt bàn/thanh toán/chat/pantry; weather API; Bluetooth; AI tự chọn winner; dữ liệu quán toàn quốc hoặc tuyên bố allergy safety |

## Luồng và giới hạn

[Tổng quan](SYSTEM_OVERVIEW.md) mô tả 11 bước. Host chọn context, tất cả ready rồi server khóa roster/pool/context. Vòng 1 unanimous WANT có thể chốt ngay; nếu không, vòng 2 loại dần món không NO rồi tối đa hóa WANT. Chưa đồng thuận có kết thúc hoặc tạo phiên mới; không tự vòng 3/reroll. Người mất mạng không bị tự loại và phiếu chờ không được coi đã gửi.

Context chỉ dùng dữ liệu có nguồn. Location cơ bản phục vụ tìm quán sau chốt; lọc bán kính thật thuộc P1 cần mapping quán–món. Lịch sử dùng consent, không khai thác raw votes. Khách mất session có thể mất bạn/history trên server; account khôi phục là P1.

## Tiêu chí thành công cần đo

- Không winner có NO, không finalize thiếu phiếu, không có hai resultId khi race/retry.
- Queued vote sống qua restart và replay đúng vòng; các máy chuyển cùng result sau ACK.
- >=5 nhóm pilot, đo thời gian/số thao tác/chọn nhầm và mức công bằng; ghi cả No Consensus. Mục tiêu trung vị dưới 3 phút là mục tiêu, chưa có số đo.
- So sánh thuật toán với random trong tập không NO trên cùng bộ phiếu; thử bàn miệng/app theo thứ tự đảo để giảm hiệu ứng học.
- Native evidence cho QR/link/push/vị trí/gesture/TalkBack; HTML không thay kiểm chứng.

[FR](FUNCTIONAL_REQUIREMENTS.md) · [traceability](../specs/TRACEABILITY.md) · [plan](../project/PROJECT_PLAN.md).
