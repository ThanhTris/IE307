# Design system v0.1

Tên: Gì Cũng Được. Tagline: “Chọn một món. Vui cả nhóm.” Cảm giác bàn ăn thân thiện, không ép quyết định.

| Token | Light | Dark | Vai trò |
| --- | --- | --- | --- |
| background | #F7F3EC | #191D1A | nền |
| surface | #FFFFFF | #242B26 | card/panel |
| text | #222D27 | #F4F2EC | chữ chính |
| muted | #58665D | #B7C2B9 | chữ phụ |
| primary | #A83D25 | #F7A78D | CTA, text ngược theo theme |
| positive | #315947 | #9ED2B3 | muốn ăn/đã chốt |
| border | #D8DED6 | #516057 | phân tách |
| danger | #A42938 | #FFA8B2 | không ăn/lỗi |

Font hệ thống; title 28/34, section 22/28, body 16/24, label14/20. RN dùng semantic scale và allowFontScaling, không font pixel cố định. Spacing 4/8/12/16/24/32, radius 12/20/28. Card hạn chế shadow. Tap >=48dp; icon luôn có label khi cần phân biệt.

Components: AppButton(primary/secondary/quiet), ChoiceChip(selected), DishCard, VoteActions, MemberAvatar, RoomCode, Progress, InlineNotice, EmptyState, ConfirmSheet. Mỗi component có loading/disabled/focus/accessibilityState phù hợp; disabled không dùng làm thông báo duy nhất.

Không chỉ dùng màu: muốn ăn có tim + nhãn, ăn được có dấu kiểm + nhãn, không ăn có X + nhãn. Motion <=180ms, reduced-motion bỏ animation/rung. Không tự chạy pháo hoa dài che hành động.

Screen layout theo [UI spec](../docs/specs/UI_SPEC.md); prototype là tham chiếu, chưa là bằng chứng đạt contrast/font200% trên Android.
