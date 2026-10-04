# Đặc tả tiến độ và lịch sử — Manabi

Liên kết: FR-10, NFR-02/03/05/10. Dữ liệu từ [SRS](SRS_SPEC.md), [GAMES](GAMES_SPEC.md), [AI_QUIZ](AI_QUIZ_SPEC.md), [DATA_STORAGE](DATA_STORAGE_SPEC.md).

## Chỉ số

- Tổng active/new/learning/review/relearning và đến hạn từ state/dueAt; archive không queue nhưng lịch sử truy vết.
- Review trực tiếp: event commit/rating/ngày hoạt động/thời lượng có định nghĩa; không suy ra mastered từ một Good/Easy.
- Game: session hoàn thành, accuracy = câu trả lời chủ động đầu đúng / câu trả lời chủ động đầu hợp lệ, hiển thị mẫu số. Word Ninja score/lives là gameplay, không gộp rating.
- AI/ảnh: attempts hợp lệ/accuracy/mẫu số, câu reported/stale/excluded. Attempt invalidated không nằm trong tín hiệu trí nhớ hoặc điểm chấm.

“Cần ôn thêm” lọc theo due hoặc lỗi nhiều attempts, ghi lý do (“đến hạn”, “sai trong quiz”), không nhãn “không biết từ”. Card/source xóa có tombstone/provenance tối thiểu theo retention để không vỡ history.

## Thời gian và dữ liệu

UTC events, nhóm ngày theo timezone profile hiển thị rõ. Đổi timezone không nhân đôi event/streak; rederive từ event + timezone rule/version. Local-first, sync trễ không duplicate; không cần raw history gửi Gemini.

## Nghiệm thu

Fixture review/game/approved-stale-reported quiz/archive/sync duplicate; mẫu số đúng; 0 attempts “chưa có dữ liệu”, không chia 0; duplicate giữ count; UTC/day boundary; sửa card không viết lại lời giải cũ; rebuild stats cùng kết quả; offline đạt NFR-02.
