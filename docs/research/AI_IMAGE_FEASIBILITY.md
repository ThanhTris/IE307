# Khả thi: dùng ảnh đời sống để ôn từ trong deck tiếng Nhật

**Ngày rà soát:** 2026-10-02. Đây là ghi chú nghiên cứu; quyết định tính năng nằm trong [IMAGE_CONTEXT_SPEC](../specs/IMAGE_CONTEXT_SPEC.md).

## Kết luận cho đồ án

Khả thi nếu làm **bộ ảnh nhỏ đã kiểm duyệt** cho các nghĩa cụ thể và dùng lại ảnh trong game “Nhìn ảnh, chọn từ tiếng Nhật”. Không khả thi để cam kết tự động tìm ảnh chính xác cho mọi từ trong deck người dùng. Khó khăn cốt lõi là liên kết ảnh với đúng *nghĩa*, lựa chọn ảnh có quyền dùng và xác nhận ba đáp án còn lại thực sự sai; Gemini chỉ hỗ trợ lọc ứng viên.

| Cách lấy ảnh | Dùng được cho pilot? | Điểm cần kiểm soát |
| --- | --- | --- |
| Wikimedia Commons | Có, ưu tiên ảnh đã duyệt thủ công | Mỗi tệp có giấy phép/attribution riêng; lấy URL và metadata qua `imageinfo`, đối chiếu trang tệp. Một số giấy phép yêu cầu share-alike khi sửa ảnh. |
| Unsplash API | Có, nếu tuân thủ API Guidelines | API demo hiện có hạn mức 50 request/giờ; yêu cầu hotlink URL ảnh API trả về và ghi công tác giả/Unsplash. Kiểm tra điều khoản hiện hành trước release. |
| Pexels API | Ứng viên phù hợp cho pilot có duyệt ảnh | API miễn phí hiện giới hạn 200 request/giờ và 20.000 request/tháng; tìm ảnh trả nhiều ứng viên có ID, URL và tác giả. Cần link Pexels, ghi công khi có thể và kiểm tra điều khoản/ảnh cụ thể trước dùng. Cache kết quả tìm kiếm để tránh tìm lại cùng nghĩa. |
| Gemini Vision | Hỗ trợ xác minh gợi ý, không cấp ảnh | Có thể mô tả/phân loại ảnh đầu vào; JSON Schema chỉ làm đầu ra đúng cấu trúc, không xác nhận ảnh đúng nghĩa hay quyền sử dụng. Gọi theo lô lúc biên tập rồi reviewer duyệt. |

Các nguồn trên là [tài liệu Gemini Vision](https://ai.google.dev/gemini-api/docs/image-understanding), [structured output](https://ai.google.dev/gemini-api/docs/structured-output), [MediaWiki Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo), [giấy phép Wikimedia Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia/licenses/en), [Unsplash API](https://unsplash.com/documentation), [Pexels API](https://www.pexels.com/api/documentation/) và [hướng dẫn cache Pexels](https://help.pexels.com/hc/en-us/articles/900006470063-What-steps-can-I-take-to-avoid-hitting-the-rate-limit).

Gemini có tính năng Image Search trong một số luồng tạo ảnh, nhưng [bảng giá API](https://ai.google.dev/gemini-api/docs/pricing) không cho Free Tier với luồng đó. [Điều khoản Grounding](https://ai.google.dev/gemini-api/terms) cũng hạn chế việc thu thập/cache kết quả hoặc liên kết để xây kho ảnh. Vì vậy phương án một key Gemini miễn phí của admin chỉ dùng tạo quiz, **không** dùng để tìm rồi lưu ảnh học tập.

## Kiểm chứng phải làm trước khi xây tính năng tự động

1. Lấy một mẫu 30–50 nghĩa cụ thể từ deck tiếng Nhật demo; ghi `term`, `reading`, nghĩa tiếng Việt, ví dụ và nghĩa nào được chọn. Trộn một số từ nhiều nghĩa để đo tỷ lệ phải loại.
2. Tìm 2–3 ảnh ứng viên/nghĩa từ nhà cung cấp đã chọn, ghi nguồn và điều kiện sử dụng. Người đọc tiếng Nhật duyệt mù ảnh/nghĩa và đánh dấu `đúng`, `mơ hồ`, `sai`, `không đủ quyền`.
3. Tạo câu ảnh với ba lựa chọn nhiễu từ card đã học, kiểm tra cả ảnh lẫn cả bốn lựa chọn. Ví dụ ảnh có `りんご` thì `果物` không phải đáp án nhiễu an toàn vì cũng đúng ở mức khái quát.
4. Đo công sức duyệt mỗi ảnh, tỷ lệ ảnh được duyệt, tỷ lệ card có thể dùng, độ trễ và số lượt gọi API. Nếu công sức/độ chính xác không đạt kỳ vọng của nhóm, giữ ảnh như minh họa card, không dùng để chấm điểm hoặc điều chỉnh SRS.

## Chi phí và dữ liệu

Chi phí tối thiểu cho demo là biên tập bộ ảnh nhỏ; lời gọi Gemini không cần xảy ra khi người học trả lời. Tìm ảnh theo **nghĩa mới cần duyệt**, không theo số lượt chơi. Ví dụ 100 người cùng học 10 từ đã có ảnh duyệt có thể cần gần 0 lượt tìm mới; 100 người mỗi ngày học 10 nghĩa chưa từng có ảnh có thể cần khoảng 1.000 lượt tìm/ngày, vượt 20.000 lượt/tháng của Pexels nếu kéo dài 30 ngày. Một request tìm kiếm có thể trả nhiều ảnh ứng viên nhưng không loại được công duyệt nghĩa. Hạn mức/giá thay đổi, nên kiểm tra lại trước release và cache theo điều khoản nguồn. Deck cá nhân không được đẩy nguyên bộ sang dịch vụ ngoài; nếu tìm theo yêu cầu, chỉ gửi từ khóa tối thiểu và giải thích rõ cho người dùng.

## Ngoài phạm vi pilot

Nhận diện và bấm vào vùng của mọi vật thể trong ảnh, tìm ảnh cho ngữ pháp/từ trừu tượng, dùng ảnh ngẫu nhiên để tính đúng sai, tự sinh ảnh bằng AI, scraping Google Images và đồng bộ ảnh người dùng tải lên đều cần nghiên cứu/thiết kế riêng. Không gộp chúng vào MVP chỉ vì model có khả năng nhận ảnh.
