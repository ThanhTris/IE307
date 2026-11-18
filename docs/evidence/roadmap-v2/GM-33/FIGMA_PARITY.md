# GM-33 — Đối chiếu Figma và Android

Nguồn thiết kế là [bảng node của dự án](../../../design/UI_FIGMA_TASK_MAP.json). Mỗi phép so dùng cùng state/role/dữ liệu, kích thước nội dung và font scale. Tình trạng visual của lượt USB cũ tại 423,53dp, font 0,9 vẫn là chưa nghiệm thu parity.

| Phạm vi | Figma | Điểm mở app | Kiểm cần ghi |
| --- | --- | --- | --- |
| Home và tạo phòng | [Màn hình](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=33-2), [tình huống tạo](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=76-851) | Home, room/create, room/setup | Loading/error, thiếu món và thao tác tạo |
| Khẩu vị và lobby | [Khẩu vị](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=76-852), [lobby](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=76-853) | room/setup, room/lobby | Vai trò host/member, ready theo ADR-028 |
| Bình chọn, kết quả và kênh cá nhân | [Bảng node từng task](../../../design/UI_FIGMA_TASK_MAP.json) | room/vote, room/final-round, room/result, history, inbox | Hai vòng, lỗi/rỗng, chữ lớn, TalkBack, bàn phím và Back |

Các ca so từng frame ở 412/360/320dp, font 200% và TalkBack chỉ được đánh Pass khi có ảnh/app evidence cùng cấu hình. Xem [CHECKS](CHECKS.md) để biết phạm vi mới đã thực hiện.

Ngày 18/11/2026 đã lấy reference Figma Home `330:3067`, kết quả `330:3075` và logo `22:394`, lưu local trong `review-results/gm3334-978613047/`.
