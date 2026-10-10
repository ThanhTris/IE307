# ROOM SPEC — vòng đời phòng

food-v1 • 2026-10-07 • FR-01..03, FR-09 • [API](../architecture/API_CONTRACT.md).

## State machine

`LOBBY → ROUND_1 → ROUND_2 → DECIDED` hoặc `NO_CONSENSUS`.

ROUND_1 có thể đi thẳng DECIDED (tất cả WANT) hoặc NO_CONSENSUS (không món nào mọi người chấp nhận). LOBBY/ROUND_1/ROUND_2 có thể đi CANCELLED hoặc EXPIRED. Trạng thái kết thúc không quay lại vòng cũ.

- Mã gồm 6 ký tự bỏ ký tự dễ nhầm; code được server sinh và kiểm uniqueness. Đây là mã mời, không phải quyền truy cập dữ liệu.
- Giới hạn đề xuất 2–8 thành viên. Host cũng bỏ phiếu như mọi người. Vào nhiều lần bằng cùng user không chiếm thêm ghế.
- Host chọn sáng/trưa/tối/ăn nhẹ; mọi thành viên thấy lựa chọn. Thay buổi/context làm reset ready của cả nhóm; timeHint/budget/avoidRecent được mọi người thấy.
- Loại món là sở thích từng người; thay preferences làm reset ready của người đó. Mọi người phải ready, đủ 2 người trước start.
- Start khóa roster, catalogueVersion, pool món, buổi ăn/context, history consent và preferences trong transaction. Late join bị từ chối.
- Phiên hết hạn sau 60 phút từ lúc tạo (đề xuất); dùng giờ server. RPC kiểm expiry kể cả cleanup chưa chạy.

## Người rời phòng và mất mạng

- Trong lobby: member có thể rời; host rời thì hủy phòng. Người mới vào đặt ready=false.
- Đã bắt đầu: disconnect không xóa member; chờ reconnect tới expiry. Không tự biến phiếu thiếu thành OK, không tự tính lại với nhóm nhỏ hơn.
- Chủ động rời sau start phải xác nhận hủy phiên cho cả nhóm. Không có host migration trong MVP; UI nêu hệ quả trước khi rời.
- Host không thể sửa phiếu người khác, tự ý bỏ người khỏi roster đã khóa hoặc finalize khi thiếu phiếu.
- UI hiện “đang chờ 1 người”, không hiện ai đã NO món nào. Có nút hủy phiên với xác nhận.

## Acceptance criteria

- ROOM-01: hai request join cuối cùng tranh một ghế chỉ một request thành công; tổng <=8.
- ROOM-02: start đồng thời join không làm pool/roster khác nhau giữa máy.
- ROOM-03: guest retry join tạo đúng một membership.
- ROOM-04: gửi vote sau expiry hoặc terminal bị từ chối, không đổi version/result.
- ROOM-05: reconnect vào trạng thái hiện tại; không hiện phòng chờ cũ hoặc tự nộp vòng cũ.
- ROOM-06: thành viên không nằm trong roster không start/submit/read result được.

## Invites và network v0.2

QR/link cần user confirm, room invite kiểm accepted pair/expiry/capacity. Context/history được server tính lại khi roster thay trước start. Offline disconnect giữ member; chỉ ACK tăng submittedCount. [Push/link](NOTIFICATIONS_LINKS_SPEC.md), [outbox](OFFLINE_SYNC_SPEC.md), [context/history](CONTEXT_HISTORY_SPEC.md).

## Eligibility food-v1 trước start

GM-19 nhận context anchor công cộng/radius/desiredAt/buổi và gọi GM-18 trên dataset GM-08. Mọi người thấy cùng điểm ăn và giờ trước ready; không tự lấy GPS host. Context/pool/version đổi reset ready. Start kiểm giờ chưa qua, nguồn/giờ/quán/buổi còn hợp lệ và snapshot nhất quán; nếu khác pool đã ready thì báo CONTEXT_CHANGED để xác nhận lại. Không start khi empty/ngoài coverage/unknown. Sau start giữ pool/result; offering đổi do GM-27 báo/refetch, không reroll. [Food spec](FOOD_DATA_SPEC.md).
