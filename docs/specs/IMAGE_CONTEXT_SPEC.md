# Đặc tả pilot ảnh đời sống — Manabi

Truy vết: FR-16, NFR-01/05/06/09/10; [DATA_PRIVACY](DATA_PRIVACY_SPEC.md), [PROGRESS](PROGRESS_SPEC.md). Pilot là bài tập có nguồn ảnh riêng; không lấy key Gemini miễn phí làm API ảnh.

**Trạng thái:** đề xuất cho pilot, chưa phải chức năng đã triển khai.
**Phạm vi:** chỉ dùng từ/cụm từ trong deck tiếng Nhật mà người học đã học; giữ nguyên Flashcard, Matching, Four Choices và Word Ninja. Tài liệu này không yêu cầu tìm ảnh cho mọi card.

## Vấn đề và quyết định sản phẩm

Một ảnh đời sống có thể giúp người học liên hệ từ với ngữ cảnh thực tế, nhưng kết quả tìm ảnh theo từ khóa không chứng minh ảnh thể hiện đúng **nghĩa của card**. Từ nhiều nghĩa, ảnh nhiều vật thể, chữ in trên ảnh tiết lộ đáp án, từ trừu tượng và tên riêng là các trường hợp dễ gây sai. Vì vậy pilot chọn bài tập **“Nhìn ảnh, chọn nghĩa tiếng Việt”**: hệ thống đưa một ảnh đã duyệt, có đối tượng chính rõ ràng, và đúng bốn nghĩa tiếng Việt; người học chọn nghĩa phù hợp. Đáp án chuẩn lấy từ card đã học và được người học xác nhận. Sau câu trả lời, mở chi tiết card (`term`, `reading`, `meaning`, `example` nếu có) và nguồn ảnh.

Đây là một biến thể học từ qua ngữ cảnh, không thay thế ôn thẻ trực tiếp. Chạm vào từng vật thể của ảnh hoặc tự nhận diện toàn cảnh là ý tưởng sau pilot vì cần chú giải vùng ảnh và kiểm chứng thêm.

## Điều kiện tham gia và luồng

1. Chỉ xét card có `term` tiếng Nhật, `meaning` đã được người dùng xác nhận, đã học, không archive và có nghĩa cụ thể có thể nhận ra bằng ảnh. Ví dụ: `傘` (かさ, ô) có thể tham gia; `しかし` (tuy nhiên) được bỏ qua.
2. Ánh xạ theo **card + nghĩa cụ thể** (`senseKey` hoặc bản chụp có version của `term`, `reading`, `meaning`), không chỉ theo chuỗi từ. `橋` (cầu) không được ghép với ảnh đôi đũa vì cùng cách đọc `はし`.
3. Backend tìm ảnh ứng viên qua API của kho ảnh có nguồn và điều kiện sử dụng kiểm tra được, dùng truy vấn tối thiểu theo nghĩa mục tiêu. Kết quả tìm kiếm chỉ là ứng viên. OCR và kiểm tra nội dung từ chối ảnh có chữ, nhãn, phụ đề hoặc chi tiết tiết lộ đáp án, nhiều vật thể gây mơ hồ, nội dung không phù hợp hoặc sai nghĩa. Người duyệt xác nhận ảnh thể hiện đúng nghĩa, rõ đối tượng chính và quyền sử dụng trước khi dùng làm câu hỏi chấm điểm.
4. API có thể đề xuất bốn phương án tiếng Việt, nhưng đáp án đúng phải khóa từ `meaning`/`senseKey` của card nguồn đã được người học xác nhận, đúng content version. Ba nhiễu là nghĩa của ba card đã học và đủ điều kiện, ưu tiên cùng miền chủ đề để có độ khó hợp lý. Kiểm tra schema, nguồn card, chuẩn hóa chữ và nghĩa; loại trừ lựa chọn trùng, đồng nghĩa, bao hàm đối tượng trong ảnh, cách diễn đạt khác của đáp án hoặc bất kỳ đáp án thứ hai hợp lý nào. Chỉ phát câu có đúng một đáp án và đủ ba nhiễu; nếu không đủ, bỏ qua câu này.
5. Ảnh/câu hỏi thiếu metadata quyền sử dụng, chưa duyệt, đã bị báo sai, lộ đáp án qua OCR/nội dung hoặc không tải được phải bị ẩn. Có thể chuyển sang câu chữ hoặc ôn thẻ thông thường; không chặn phiên học và không ghi lỗi học cho câu bị bỏ.
6. Lần chọn đầu tiên mới tạo `learningSignal`. Ghi `cardId`, `questionVersion`, `imageId`, đúng/sai, thời điểm và kiểu bài tập; không ghi hành vi chạm thô. Chính sách ảnh ảnh hưởng SRS, nếu có, phải được quyết định riêng trong `SRS_SPEC.md`; không tự tăng khoảng ôn chỉ vì chọn đúng một ảnh.

## Dữ liệu và quyền sử dụng ảnh

Một liên kết ảnh–nghĩa được duyệt phải lưu tối thiểu: `cardId`, `cardContentVersion`/`senseKey`, `provider`, `providerImageId`, `sourcePageUrl`, `displayUrl`, `creator`, `creatorUrl` nếu có, `licenseName`, `licenseUrl`, `attributionText`, `retrievedAt`, `checkedAt`, `reviewedAt`, `reviewer`, `reviewStatus`, `questionVersion`. Lưu kích thước, vùng chú ý/crop và ghi chú chỉnh sửa nếu ảnh được biến đổi. Câu hỏi lưu thêm bốn lựa chọn với `candidateCardId`/version, `correctOptionId` do backend gán từ card nguồn, kết quả OCR/kiểm tra nội dung, model/prompt/version bộ kiểm tra, trạng thái duyệt và lý do loại. Cache theo card/sense version, image ID, nguồn, tập ứng viên và các version xử lý; card hoặc nguồn đổi làm cache stale. Không lưu chung trong `fields` của card nếu metadata này thuộc câu hỏi/ảnh; thiết kế schema và migration riêng trước khi triển khai.

Chính sách lưu/cache phải theo từng nhà cung cấp. Với Wikimedia Commons, kiểm tra trang tệp và điều kiện giấy phép của **từng ảnh**; dữ liệu `imageinfo`/`extmetadata` hỗ trợ lấy metadata nhưng không thay việc duyệt giấy phép, và giá trị HTML cần xử lý an toàn. Với Unsplash API, tuân thủ yêu cầu hiển thị trực tiếp URL ảnh do API trả về và ghi công theo API Guidelines; không tự tải về làm kho ảnh chung. Không dùng ảnh chỉ lấy từ Google Images hay các trang lyric/social khi chưa rõ quyền tái sử dụng. Có nút xem tác giả, giấy phép và trang gốc trong UI.

Pexels là ứng viên nguồn miễn phí cho pilot theo [nghiên cứu ảnh](../research/AI_IMAGE_FEASIBILITY.md): xác minh quota/terms/ghi công tại thời điểm tích hợp. Cache response theo điều kiện provider; việc khuyến khích cache truy vấn không tự cho phép sao chép toàn bộ media vô thời hạn. Một query/nhóm ảnh ứng viên cho mỗi **nghĩa mới**, duyệt rồi dùng lại mapping đã hợp lệ; không query mỗi người dùng/mỗi lượt mở ảnh. Cap ảnh tách khỏi 10 câu AI/ngày, vì API/provider/quota khác nhau.

Deck và ví dụ học của người dùng có thể riêng tư. Không gửi toàn bộ deck, tiến độ học, ghi chú cá nhân hoặc PII sang Gemini/nhà cung cấp ảnh. Nếu sau này cho người dùng chủ động tìm ảnh, chỉ gửi truy vấn tối thiểu sau khi giải thích dữ liệu được gửi; khóa API nằm phía server và phải có giới hạn lượt. Người dùng được báo ảnh sai/gỡ ảnh khỏi bài học. Nếu cho người dùng tải ảnh riêng, cần luồng quyền/consent và lưu trữ riêng trước khi mở tính năng đó.

## Vai trò của Gemini và ranh giới chất lượng

Gemini Vision có thể mô tả/đánh giá ảnh ứng viên, hỗ trợ OCR/kiểm tra nội dung và đề xuất nhiễu; structured output có thể định dạng kết quả, nhưng **không phải kho ảnh có giấy phép, không tạo đáp án chuẩn và không bảo đảm đúng nghĩa**. Pilot ưu tiên kho ảnh đã duyệt, gọi model lúc biên tập hoặc thử nghiệm theo lô, không gọi mỗi lần mở bài tập. Kết quả model chỉ là gợi ý; backend kiểm tra card/ảnh/quyền/đáp án và người duyệt xử lý trường hợp ngữ nghĩa chưa chắc chắn trước trạng thái `approved`. Nếu không có mạng/Gemini hoặc hết quota, các liên kết và câu đã duyệt vẫn dùng được theo điều kiện cache/quyền; các game cũ vẫn hoạt động, không sinh câu hỏi ảnh mới khi không có nguồn tin cậy.

## Tiêu chí nghiệm thu pilot

- Dùng bộ nhỏ do nhóm chọn trước (đề xuất 30–50 nghĩa cụ thể) và có nhật ký ảnh được duyệt/từ chối kèm lý do. Người dùng không bị hứa hẹn rằng mọi từ trong deck đều có ảnh.
- Kiểm tra thủ công toàn bộ câu trong bộ demo: mỗi ảnh đúng nghĩa mục tiêu, OCR/nội dung không tiết lộ đáp án, bốn lựa chọn tiếng Việt có một nghĩa chuẩn từ card xác nhận và ba nhiễu cùng miền nghĩa nhưng không cùng đúng; mỗi ảnh có nguồn/giấy phép/ghi công hiển thị được.
- Có test cho chọn card đủ điều kiện, loại trùng/đồng nghĩa/mơ hồ, không đủ ba nhiễu, từ nhiều nghĩa, chữ trên ảnh tiết lộ đáp án, hết nguồn ảnh, mất mạng, đổi nội dung card/ảnh và vô hiệu hóa cache/câu hỏi cũ; câu sai bị báo cáo sẽ dừng dùng ngay.
- Đánh giá trên tập ảnh chưa dùng khi biên tập: tỷ lệ liên kết được duyệt, tỷ lệ câu bị loại vì mơ hồ, lỗi nghĩa được reviewer phát hiện, tỷ lệ ảnh thiếu quyền, độ trễ tải và số lần gọi API. Ghi failure cases; không lấy điểm chơi làm bằng chứng độ chính xác của nhãn ảnh.

## Nguồn tham khảo chính thức

- [Gemini image understanding](https://ai.google.dev/gemini-api/docs/image-understanding)
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [MediaWiki Imageinfo API](https://www.mediawiki.org/wiki/API:Imageinfo)
- [Wikimedia Commons: điều kiện dùng lại theo giấy phép](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en)
- [Unsplash API documentation](https://unsplash.com/documentation)
- [Pexels API documentation](https://www.pexels.com/api/documentation/)
