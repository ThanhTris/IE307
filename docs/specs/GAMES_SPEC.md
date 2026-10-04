# Đặc tả ba trò chơi — Manabi

Truy vết: FR-07/08/09/10, NFR-01/02/03/07; [SRS](SRS_SPEC.md), [PROGRESS](PROGRESS_SPEC.md). Logic tạo câu/điểm ngoài screen. Mọi game core dùng local, không gọi Gemini.

## Dữ liệu đầu vào chung

Chỉ card đã học, không bị archive, có đủ field theo game mapping và không trùng normalized answer trong cùng lượt.

Mapping được chọn từ fieldSchema và cùng một hướng hỏi–đáp trong session. Card nhiều nghĩa/đồng nghĩa/distractor mơ hồ loại khỏi câu chấm điểm; normalized value chỉ bắt trùng hình thức, không chứng minh khác nghĩa. Thiếu card an toàn thì thông báo số tối thiểu/học thêm, không tạo đáp án bịa. Session lưu source versions; nếu card đổi trong lúc chơi, không dùng source mới để chấm câu cũ.

## Matching

- 3-4 cặp; pair id nội bộ không lộ đáp án.
- Cặp sai đóng lại sau phản hồi; lần chọn đầu lưu signal.
- Kết thúc khi tất cả cặp đúng; tính accuracy và duration.
- Pair content thuộc cùng card/sense snapshot; reshuffle vị trí không đổi pair ID. Deck chỉ đủ ba cặp thì dùng ba, ít hơn dừng trước khi chơi. Không tính lần tự mở/auto-complete thành lần nhớ đúng.

## Four Choices

- Một correct answer, ba distractor khác nhau.
- Không chọn distractor có normalized value bằng đáp án.
- Chỉ lựa chọn đầu tiên quyết định đúng/sai.
- Đây là game tạo bằng quy tắc local từ card hợp lệ; vẫn chơi được offline, không phụ thuộc Gemini. Quiz AI dùng chế độ `ai_quiz` và quy trình duyệt riêng trong [AI_QUIZ_SPEC.md](AI_QUIZ_SPEC.md), không thay thế Four Choices.
- Shuffle seed tái lập cho fixture, correctOptionId được domain gán trước khi shuffle. Reveal có lời giải từ card; chọn sau reveal không thêm signal. Người học có thể mở card nguồn và báo câu mơ hồ.

## Word Ninja

- Ba mạng; tốc độ tăng có giới hạn.
- Chém sai hoặc bỏ lỡ target đúng mất mạng.
- Bom/tim/power-up chỉ ảnh hưởng gameplay; auto-hit không tạo learning signal.
- Có reduce-motion hoặc chế độ đơn giản để bảo đảm accessibility/performance.
- Pause khi app background không làm mất mạng do target tiếp tục chạy. Session resume kiểm source còn tồn tại; touch gesture chỉ gameplay, không lưu raw trajectory. Chế độ đơn giản dùng điều khiển có nhãn/cỡ chạm hợp lệ thay phản xạ chém nhanh.

## Kết quả

Mỗi session lưu game type (`matching`, `four_choices`, `word_ninja`; `ai_quiz` nếu được duyệt), deck, start/end, accuracy, score, duration và danh sách signal tối thiểu cần thiết. Không lưu raw touch trajectory. `ai_quiz` lưu thêm question/attempt version và tình trạng duyệt để có thể loại tín hiệu khi câu hỏi sai hoặc hết hiệu lực; tác động SRS tuân theo [SRS_SPEC.md](SRS_SPEC.md).

Game signals không giả dạng flashcard review hoặc tăng reps/lapses. Tác động lịch nếu có cần policy đã review; MVP lưu riêng, không tự áp dụng. Commit session idempotent: reload/double tap chỉ một session record. Bỏ dở phân biệt completed/abandoned, không chia accuracy trên các target chưa trả lời.

## Nghiệm thu

Card chưa học/archive/thiếu field excluded; ít card/double meaning/duplicates không sinh câu lỗi; Matching first choice accuracy; Four Choices correct ID sau shuffle/reveal; Ninja bomb/miss/auto-hit excluded khỏi SRS, pause/background không mất mạng; session replay dedup; offline cả ba; reduce-motion/font 200% và NFR-02 benchmark.
