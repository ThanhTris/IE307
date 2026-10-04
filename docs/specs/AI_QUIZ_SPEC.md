# Đặc tả AI quiz bằng Gemini — Manabi

Truy vết: FR-14/15, NFR-01/04/05/06/09/10; [DATA_PRIVACY](DATA_PRIVACY_SPEC.md), [AUTH_SYNC](AUTH_SYNC_SPEC.md), [SRS](SRS_SPEC.md).

> Trạng thái: **Proposed — chờ owner và reviewer phê duyệt**. Tài liệu này chưa cho phép triển khai hoặc thay đổi lịch ôn production. Chỉ áp dụng cho deck học tiếng Nhật; không mở rộng sang môn học khác.

**Cổng sử dụng Gemini Free Tier:** xem [đánh giá điều khoản và hạn mức](../research/GEMINI_FREE_TIER_FEASIBILITY.md). Chỉ thử Free Tier bằng card demo không nhạy cảm, trong đối tượng/vùng được phép. Không bật Gemini cho app có khả năng được người dưới 18 truy cập theo điều khoản hiện tại; dữ liệu deck riêng tư không tự động đủ điều kiện gửi lên Free Tier dù đã có API key.

## Mục tiêu và ranh giới

- Tạo câu hỏi trắc nghiệm từ **card tiếng Nhật người dùng đã học**: một đáp án đúng và ba đáp án nhiễu, sau đó phản hồi đúng/sai và giải thích có nguồn từ card.
- Gemini hỗ trợ tạo câu dẫn, đề xuất ba đáp án nhiễu từ tập ứng viên và diễn đạt lời giải. **Đáp án đúng do card/sense đã được xác nhận quyết định**, không lấy từ câu trả lời của model.
- Đây là chế độ `ai_quiz`, tách với Four Choices tạo bằng quy tắc cục bộ trong [GAMES_SPEC.md](GAMES_SPEC.md). Four Choices tiếp tục hoạt động khi không có mạng hoặc Gemini hết hạn mức.
- Không tạo câu hỏi từ toàn bộ deck một cách mặc định; chỉ dùng card đủ điều kiện trong nhóm người dùng chọn/đã ôn. Không dùng AI để tự sửa nội dung card.

## Điều kiện đầu vào

1. Deck có mapping rõ cho cặp trường hỏi–đáp, chẳng hạn `term` → `meaning` hoặc `meaning` → `term`; card tuân thủ [CARD_JSON_SPEC.md](CARD_JSON_SPEC.md) và schema của deck.
2. Card đã học, không archive, có nội dung được người tạo xác nhận và có **một nghĩa/sense mục tiêu xác định**. Nếu một field chứa nhiều nghĩa hoặc bản dịch phụ chưa tách được sense, bỏ qua card đó.
3. Ba đáp án nhiễu lấy từ những card hợp lệ khác trong tập ôn đã học hoặc tập ứng viên được người dùng cho phép; cùng hướng hỏi–đáp và không trùng/đồng nghĩa với đáp án đúng trong ngữ cảnh. Nếu không đủ ba ứng viên an toàn, **không tạo câu**; không bịa thêm để đủ số lượng.
4. Câu dẫn phải chứa đủ kanji hoặc ngữ cảnh để phân biệt đồng âm/đa nghĩa. Ví dụ `はし` riêng lẻ không đủ để hỏi nghĩa của `橋`; có thể dùng `橋を渡る` nếu ví dụ này nằm trong card đã xác nhận. Câu dẫn do AI tự viết phải qua duyệt nội dung trước khi được dùng chung.

## Luồng tạo và duyệt

1. Backend nhận tập `cardId`, hướng hỏi và idempotency key; xác thực quyền đọc deck, kiểm tra consent gửi nội dung card đến Gemini, schema và số ứng viên. Chỉ gửi các field tối thiểu cần thiết; coi mọi text của người dùng là **dữ liệu**, không phải lệnh cho model.
2. Backend lập bản chụp nguồn có hash/version và khóa đáp án đúng theo `sourceCardId`, `senseId` (nếu có), `answerFieldKey` và nội dung trường đã xác nhận. Gemini chỉ trả về **bản nháp** câu dẫn, ba `candidateCardId` cho đáp án nhiễu, thứ tự trình bày và lời giải có tham chiếu nguồn. Backend tự ghép đáp án đúng từ nguồn và gán `correctOptionId`; model không được chọn hoặc sửa đáp án đúng.
3. Dùng structured output JSON cho hình dạng dữ liệu; tiếp tục validate bằng JSON Schema nội bộ trước khi lưu. JSON đúng cú pháp **không chứng minh** câu hỏi đúng ngữ nghĩa.
4. Validator kiểm tra id thuộc tập ứng viên, đúng một đáp án đúng, đủ bốn option phân biệt, đúng hướng/field, hash nguồn còn hiệu lực, không lộ đáp án trong câu dẫn và không có trùng lặp sau chuẩn hóa. Kiểm tra tiếng Nhật/nghĩa/đồng nghĩa khó xác định chắc bằng quy tắc phải chuyển sang trạng thái `needs_review` hoặc `rejected`.
5. Pilot dùng card demo và câu hỏi được người biết tiếng Nhật duyệt độc lập trước khi phân phối. Người học có thể xem/sửa/bỏ bản nháp cá nhân, nhưng vì đã thấy đáp án, lượt chơi ngay sau khi duyệt không là bằng chứng nhớ lại độc lập và không tác động SRS. Không có cộng đồng/deck chia sẻ trong phạm vi. Có nút báo lỗi; câu reported dừng phân phối tới khi kiểm tra lại. Không hiển thị bản nháp chưa duyệt như câu hỏi đã kiểm chứng.
6. Sau khi người dùng trả lời lần đầu, hiển thị đáp án và lời giải gắn với card nguồn; cho mở card để đối chiếu. Lựa chọn sau khi đã xem đáp án không tạo learning signal.

## Hợp đồng dữ liệu dự kiến

Mỗi câu hỏi lưu các trường có thể truy vết sau; schema chính thức và migration là task triển khai riêng:

| Nhóm | Trường tối thiểu |
| --- | --- |
| Nguồn | `deckId`, `sourceCardId`, `sourceCardVersion`, `sourceHash`, `senseId` nếu có, `questionFieldKey`, `answerFieldKey`, `candidateCardIds` |
| Nội dung | `stem`, `options` (bốn `optionId` và nội dung), `correctOptionId` do backend gán, `explanation`, `locale` |
| Kiểm soát | `schemaVersion`, `promptVersion`, `modelVersion`, `validatorVersion`, `reviewStatus`, `reviewerId` nếu có, `createdAt`, `updatedAt` |
| Kết quả | `attemptId`, `questionId`, `questionVersion`, `firstOptionId`, `isCorrect`, `answeredAt`, `signalEligibility` và lý do |

- Cache theo hash nội dung nguồn + tập ứng viên + hướng hỏi + phiên bản prompt/model/validator. Khi card, sense hoặc mapping deck thay đổi, câu liên quan trở thành `stale` và không phát cho lượt ôn mới; bản attempt cũ vẫn giữ version để truy vết.
- Không log toàn văn deck hoặc API key. Đặt quota người dùng/project, giới hạn batch và retry có backoff; khi lỗi mạng, hết quota hoặc câu bị reject thì quay về Four Choices cục bộ, không chặn phiên ôn. Giá/hạn mức của Gemini thay đổi theo project và model, cần kiểm tra trước demo/release.
- API key chỉ ở backend/secret store; **không đóng gói trong app mobile**. Backend kiểm tra auth, quyền deck, input length, rate limit và idempotency. Việc gửi nội dung deck sang nhà cung cấp AI cần thông báo rõ và consent riêng; chưa có consent thì không gọi Gemini.

## Key admin, hạn mức và cache

- Một project/key admin dùng chung ở backend. Quota nhà cung cấp theo project/model/tier; thêm key trong project không tăng sức chứa. Hạn mức thật và model Free Tier được admin kiểm tra trên AI Studio trước demo; chưa có số đo tài khoản thì không cam kết số người dùng.
- Giới hạn sản phẩm: **10 câu mới đã duyệt được cấp/người/ngày Asia/Ho_Chi_Minh**. Server xác định quota date bằng fixed IANA timezone, không tin timezone/clock thiết bị; timestamps lưu UTC. UI hiển thị số còn lại/thời điểm reset. `approvedQuestionAssignmentId` unique khóa mỗi lần cấp mới; replay cùng assignment không trừ lại. Chơi lại câu cache không tính câu mới. Reset RPD của Google theo Pacific là hạn mức nhà cung cấp riêng, không đồng nhất ngày quota sản phẩm.
- Backend reserve slot bằng transaction trước khi tạo/cấp để `reserved + approved ≤ 10` dù request đồng thời. Rejected không tính câu cấp; pending review giữ reservation tới approve/reject/expiry có policy/version rõ. Quota request/token theo người/toàn project vẫn tính provider call/retry/nháp lỗi để tránh bù lỗi vô hạn.
- Một request thông thường yêu cầu tối đa 5 bản nháp theo số slot/input token budget; tối đa hai lượt tạo/user/ngày. Đây là regular `generateContent`, không phải Gemini Batch API. Không ép đủ 10 nếu thiếu card/nhiễu hoặc bản nháp bị loại. Tối đa một retry tạm thời có backoff/request, vẫn tính ngân sách provider; không tạo lượt bù lỗi semantic vô hạn.
- `requestId`/idempotency chỉ một execution đang chạy; trạng thái queued/running/needs_review/ready/rejected/expired rõ. Pilot có thời gian duyệt nên không hứa mọi câu tạo tức thời. Cache theo nguồn và versions; câu approved cũ chỉ reuse nếu sourceHash/review vẫn hợp lệ.
- Global daily cap request/input-output token và RPM queue cấu hình phía server từ quota project thật, đặt thấp hơn quota provider. Cạn budget, auth/consent không hợp lệ hoặc 429 thì trả lỗi ổn định + Four Choices local, không chặn học. Không gọi model khi flip/chơi lại quiz.

Ví dụ lập kế hoạch: nếu 10 người đều cần 10 câu mới/ngày và mỗi lời gọi tạo 5 nháp được duyệt, cần tối thiểu 20 calls/ngày; 50 người cần tối thiểu 100. Thực tế tăng theo tỷ lệ reject/retry/token và giới hạn RPM/TPM/RPD. Thống kê chi phí phải chia cho câu được duyệt, không chỉ lời gọi thành công.

## Độ chính xác và tiêu chí chấp nhận

- Tạo bộ đánh giá do người biết tiếng Nhật duyệt, bao phủ kanji đồng âm, nhiều nghĩa, từ vựng có ví dụ/không ví dụ, câu mẫu, mức JLPT và deck ít card. Tách tập đánh giá khỏi tập dùng để điều chỉnh prompt.
- Báo cáo tỷ lệ câu có **đúng một đáp án đúng**, tỷ lệ mơ hồ, chất lượng/độ hợp lý của đáp án nhiễu, tỷ lệ reject/stale, tỷ lệ phải sửa, latency và chi phí trên **câu được duyệt**. Ghi cả ví dụ thất bại, không chỉ tỷ lệ trung bình.
- Mục tiêu pilot đề xuất theo NFR-06: toàn bộ câu demo được duyệt độc lập và tập holdout tối thiểu 100 bản nháp; chưa phải số đo chất lượng. Ngưỡng phát hành/mức chấp nhận lỗi chốt bằng kết quả pilot trước khi bật rộng; chưa đạt thì bản nháp có duyệt hoặc feature flag tắt.
- Kiểm thử: JSON sai, id ngoài tập, thiếu/trùng/đồng nghĩa, `はし` mơ hồ, source sửa giữa tạo, request/assignment lặp, quota đồng thời/reset Asia/Ho_Chi_Minh/device clock spoof/rejected slot release/global cap, consent revoke/age-region gate, offline/429, explanation sai và report sau phát. Câu đã xem đáp án lúc duyệt không tạo signal của lượt ngay sau đó.
- Quiz attempt chỉ được gửi làm tín hiệu SRS theo [SRS_SPEC.md](SRS_SPEC.md) khi `reviewStatus=approved`, nguồn còn hiệu lực và lượt trả lời hợp lệ. Đáp án đúng ngẫu nhiên có thể xảy ra; kết quả trắc nghiệm không tương đương tự nhớ khi lật flashcard.

## Nguồn chính thức và căn cứ

- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output): JSON Schema giúp kiểm tra cấu trúc, không thay thế thẩm định ngữ nghĩa.
- [Gemini API key security](https://ai.google.dev/gemini-api/docs/api-key): không để khóa ở mobile, gọi qua backend.
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): hạn mức thay đổi theo project/model/tier.
- [Anki Manual — FSRS và review ratings](https://docs.ankiweb.net/deck-options.html#fsrs): lịch ôn dựa trên đánh giá khả năng nhớ; quiz nhận diện không được coi tự động là cùng loại rating.
- [Smith & Karpicke, 2014](https://learninglab.psych.purdue.edu/downloads/2014/2014_Smith_Karpicke_Memory.pdf): các định dạng short-answer và multiple-choice cần được đánh giá như các tín hiệu học tập khác nhau.
