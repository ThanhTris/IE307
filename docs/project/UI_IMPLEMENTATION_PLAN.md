# Kế hoạch UI v0.2

2026-10-07. Yêu cầu thiết kế/native; prototype HTML cũ chưa đại diện đủ v0.2. [UI spec](../specs/UI_SPEC.md) là bảng màn/hành động/state; [mô tả hệ thống](../product/SYSTEM_OVERVIEW.md) giúp đọc bối cảnh.

## Flow

Home/guest/first-location-permission → create hoặc code/QR/link hoặc avatar invite → context/preferences/history consent → lobby/ready → round1 cards/double-tap → result hoặc round2 keep/remove → result/no consensus → Maps/review/history. Inbox/push có thể đưa vào invitation hoặc result nhưng luôn restore auth/refetch. Offline cache không cho chốt room.

| Chặng | Màn | Task | Đầu ra và gate |
| --- | --- | --- | --- |
| W1–2 | UI foundation | GM-01/02 | Tokens/primitives, Android build, permission/empty/error states, TalkBack/font200 |
| W3 | UI-01..05 | GM-05/07..10 | Guest/context/join/lobby hai máy; avatar entry chưa tự giả invite |
| W4 | UI-06..09/11 | GM-12..15/17 | Card double-tap, 3 nút, two rounds, tier/lý do, bạn quen/inbox cơ bản |
| W5 | UI-10/12 | GM-16/25 | Pending vs ACK, restart/reconnect, permission push và cold/warm tap |
| W6 | UI-03/08/13 | GM-18/20 | Incoming link/QR, vị trí/review return, history consent/delete/offline |
| W7–8 | UI-01..13 | GM-19/21/22 | Native screenshots/recordings, left/right one-hand, 2/4/8 máy, regression |
| Sau core | UI-14/15 | GM-26/27 | Account/radius pilot P1; chưa vẽ như tính năng có sẵn |

## Card và gesture

Ảnh có quyền, tên/category/mô tả/tag/giá nullable có đơn vị/nguồn. Double-tap chọn WANT, không toggle/submit; vertical drag không vote; horizontal swipe optional phải WANT/trái NO; OK button. Chạm đơn không tự vote hoặc mở modal cạnh tranh; chi tiết nút riêng. Scroll hủy tap. Có hướng dẫn, label phản hồi/undo trước Gửi. TalkBack sử dụng ba nút chuẩn.

## Bắt buộc mọi màn

Loading/empty/error/retry, offline fetchedAt, font200/dark/reduced motion/TalkBack; safe area/touch48 và không overflow 320/390/768dp. Nháp/queued/unknown/ACK copy khác nhau; không tiết lộ votes qua avatar. Back active room giải thích hủy phiên; result không reroll. Geocoding/location/push deny không chặn core. Screen mỏng qua use case/repository, không tự score winner hoặc mở tùy ý QR URL.

Checklist: đủ UI-01..13, từng trạng thái quan trọng có native evidence; T-06/09/10/11/12/16/17/18/20/21/22. P1/P2 có nhãn chưa triển khai. Review thiết kế không thay reviewer code/native.
