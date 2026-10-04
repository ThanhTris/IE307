# Đặc tả ôn tập ngắt quãng — Manabi

Truy vết: FR-05/06/10/14, NFR-01/03/08; [FLASHCARD](FLASHCARD_SPEC.md), [PROGRESS](PROGRESS_SPEC.md). Scheduler/các hệ số chưa lựa chọn là quyết định cần review, không mô tả hiện có FSRS production.

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
- Game và AI quiz tạo **tín hiệu phụ** riêng; không ghi chúng thành Again/Hard/Good/Easy, không tăng `reps`/`lapses`, không tự chuyển `state`, và không đưa vào lịch sử huấn luyện/hiệu chỉnh scheduler như một lần tự nhớ.
- Bom, miss do thao tác và auto-complete không tạo review event.
- Lưu timestamp UTC; timezone profile dùng để nhóm ngày/hiển thị. Queue dueAt so bằng thời gian clock abstraction; đồng hồ/clock skew được báo và không tự trì hoãn vô hạn. Review event + scheduling update commit cùng transaction; failure không thông báo lưu thành công.
- Lưu event có source/contentVersion, ratedAt, rating, schedulerVersion và before/after scheduling đủ để replay. Không sửa lịch sử cũ khi card đổi nghĩa; có policy reset content learning do người học chọn, không tự coi nghĩa mới đã thuộc.

## Đề xuất tác động của AI quiz lên lịch ôn — chờ review

Người dùng muốn câu đúng/sai của quiz ảnh hưởng thời điểm ôn lại. Đây là bài trắc nghiệm nhận diện với bốn lựa chọn nên có khả năng đoán đúng; một lần đúng/sai **không đủ** để khẳng định card đã nhớ/quên. Theo [AI_QUIZ_SPEC.md](AI_QUIZ_SPEC.md), chỉ `firstOptionId` của quiz đã duyệt, nguồn còn hiệu lực và không bị báo lỗi mới là tín hiệu đủ điều kiện.

1. Lưu `quiz_attempt` append-only, có `attemptId`, `questionVersion`, `sourceCardId`, kết quả, thời điểm, `signalEligibility` và lý do loại trừ. Event trùng id không được áp dụng hai lần. Không ghi quiz attempt thành `review_event` flashcard.
2. Phiên bản đầu chạy **shadow mode**: tính tác động dự kiến nhưng không đổi `dueAt`; so sánh với các lần tự nhớ sau đó. Bật điều chỉnh chỉ sau khi reviewer phê duyệt pilot, tham số và mức sai lệch chấp nhận được.
3. Khi bật, policy phiên bản hóa chỉ sử dụng nhiều attempt đủ điều kiện ở các phiên/ngày khác nhau; ngưỡng bằng chứng và biên điều chỉnh lấy từ đánh giá thực nghiệm, không hard-code tùy ý. Câu đúng có thể kéo dài nhẹ, câu sai có thể rút ngắn nhẹ **lần hẹn kế tiếp**; kết quả mâu thuẫn hoặc độ tin cậy thấp thì giữ nguyên. Dùng hàm xác định, có giới hạn trên/dưới và không cho card bị trì hoãn vô hạn hoặc vượt qua giới hạn ôn trong ngày.
4. Rating flashcard trực tiếp luôn có ưu tiên cao hơn: scheduler tính `stability`, `difficulty`, `state` và ngày hẹn gốc từ rating đó. Modifier quiz chỉ là lớp phụ có version; rating trực tiếp tiếp theo xóa/tính lại modifier theo policy và không để tín hiệu quiz cũ phủ quyết lần tự nhớ mới. Nếu dùng FSRS về sau, không đưa quiz attempt vào optimizer như grade FSRS khi chưa có mô hình được hiệu chỉnh riêng.
5. Đổi policy/scheduler phải replay được từ event, có fixture nâng version và rollback. UI phân biệt “lịch ôn từ thẻ” với “điều chỉnh nhẹ do quiz”; cho người học tắt tín hiệu quiz mà không mất lịch sử.

Đây là **đề xuất**, không phải thông số sản phẩm đã duyệt. [Anki Manual](https://docs.ankiweb.net/deck-options.html#fsrs) mô tả việc FSRS dùng rating về khả năng nhớ và thời gian ôn; [nghiên cứu so sánh dạng kiểm tra](https://learninglab.psych.purdue.edu/downloads/2014/2014_Smith_Karpicke_Memory.pdf) là lý do cần đánh giá riêng tín hiệu trắc nghiệm. Ngưỡng và hệ số chỉ được chốt sau pilot trên dữ liệu tiếng Nhật của dự án.

## Kiểm thử

Fixture bao gồm card mới, Again liên tiếp, Hard/Good/Easy, ngày chuyển múi giờ, offline nhiều ngày, event trùng và nâng scheduler version. Với quiz, thêm chuỗi đúng/sai ở nhiều phiên, một đáp án đúng do đoán, câu bị báo lỗi/stale, attempt trùng, quiz sau rating trực tiếp, thay đổi policy version, bật/tắt modifier và so sánh shadow mode với lịch ôn gốc.

Mỗi fixture có seed/clock/input/expected schedule và version; không dựa realtime để test. Queue New/Learning/Review không biến mất sau force-close; atomic failure rollback; cùng event replay 1.000 lần giữ nguyên reps/lapses/due; hai thiết bị đồng bộ ratings không duplicate và conflict policy không last-write-wins im lặng.
