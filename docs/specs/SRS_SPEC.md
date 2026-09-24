# Đặc tả ôn tập ngắt quãng

## Phạm vi MVP

Scheduler deterministic với bốn rating Again, Hard, Good và Easy. Công thức cụ thể phải được đóng gói trong domain service, có fixture và version để có thể nâng cấp sau.

## Dữ liệu chuẩn hóa

- `state`: new, learning, review, relearning.
- `dueAt`, `lastReviewedAt`.
- `stability`, `difficulty` hoặc các tham số tương đương theo scheduler được chọn.
- `reps`, `lapses`, `schedulerVersion`.

## Quy tắc

- Mọi rating tạo review event append-only.
- Cùng eventId không được áp dụng hai lần.
- Đồng hồ thiết bị sai không được làm card biến mất vĩnh viễn; backend canonical time khi sync.
- Game signal chỉ điều chỉnh nhỏ sau khi có đủ lần lặp, không thay thế self-recall rating.
- Bom, miss do thao tác và auto-complete không tạo review event.

## Kiểm thử

Fixture bao gồm card mới, Again liên tiếp, Hard/Good/Easy, ngày chuyển múi giờ, offline nhiều ngày, event trùng và nâng scheduler version.
