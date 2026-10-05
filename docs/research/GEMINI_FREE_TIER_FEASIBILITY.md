# Khả thi của Gemini API Free Tier cho Manabi

Rà soát ngày 02/10/2026. Đây là đánh giá cho đề tài flashcard tiếng Nhật, không phải cam kết rằng Gemini sẽ miễn phí hoặc phù hợp điều khoản cho mọi bản phát hành. Giá, model và hạn mức phải kiểm tra lại trước demo/release.

## Kết luận

**Khả thi về kỹ thuật cho pilot nhỏ có kiểm soát ở Việt Nam**: Gemini Developer API có Free Tier cho một số model văn bản và Việt Nam nằm trong danh sách vùng hỗ trợ. Có thể tạo câu hỏi từ bộ thẻ demo không nhạy cảm, cache câu được duyệt và chỉ gọi model khi cần tạo mới. Free Tier là quota chung của project, không phải mỗi người dùng có quota riêng. Hạn mức theo request/token/phút/ngày thay đổi theo model, tier và project; kiểm tra trực tiếp trong Google AI Studio. Khi hết quota, app phải dùng Four Choices cục bộ hoặc flashcard, không chặn học.

**Chưa thể coi Free Tier là cơ sở bảo đảm cho app học tiếng Nhật phát hành rộng rãi**. Điều khoản Gemini API hiện yêu cầu người dùng API từ 18 tuổi trở lên và cấm dùng dịch vụ trong app hướng tới **hoặc có khả năng được người dưới 18 truy cập**. Đây là cổng sản phẩm quan trọng đối với ứng dụng học tập; chỉ giới hạn người dùng ở Việt Nam không giải quyết điều kiện tuổi. Nếu phát app cho người dùng EEA, Thụy Sĩ hoặc Anh, điều khoản yêu cầu Paid Services. Owner phải xác định đối tượng tuổi/vùng phân phối hoặc chọn một dịch vụ khác phù hợp trước khi bật Gemini cho người dùng công khai. Trả phí **không tự xóa** hạn chế về tuổi trong điều khoản này.

## Dữ liệu, khóa và chi phí

- Với Unpaid Services, Google nêu rằng nội dung gửi và phản hồi có thể được dùng để cải thiện sản phẩm; người duyệt có thể đọc/ghi chú input/output. Google yêu cầu không gửi dữ liệu nhạy cảm, bí mật hoặc cá nhân. Vì vậy pilot Free Tier chỉ dùng card demo/được phép chia sẻ, không tự gửi deck riêng tư, ghi chú cá nhân hay toàn bộ lịch sử học. Consent riêng vẫn cần, nhưng consent một mình không biến dữ liệu nhạy cảm thành phù hợp với Free Tier.
- Không đóng gói Gemini API key trong APK. Luồng Supabase Edge Function đã đề xuất trong ADR 003 giữ key ở server, kiểm quyền và cache câu. Firebase AI Logic cũng có proxy giữ key trên server, App Check và rate limit theo người dùng; đây là phương án cần đánh giá tương thích Expo/React Native và kiến trúc hiện tại trước khi thay đổi ADR, không phải dependency đã chọn.
- Firebase AI Logic tự nó miễn phí; Gemini Developer API Free Tier trên Firebase Spark có thể bắt đầu không cần phương thức thanh toán. Điều đó không tăng quota Gemini và không trả phí thay cho các dịch vụ khác nếu dự án vượt mức miễn phí.
- Ví dụ **minh họa**, không phải quota thực tế: 20 người học, mỗi người yêu cầu 10 câu mới/ngày, nếu mỗi request tạo 5 câu thì đã cần khoảng 40 request/ngày trước retry, câu bị loại và kiểm thử. Nếu gọi một request cho mỗi câu thì khoảng 200 request/ngày. Cache câu đã duyệt làm giảm lời gọi lặp, nhưng không bảo đảm đáp ứng giờ cao điểm hoặc quota/ngày của project.
- Manabi dự kiến dùng **một key admin, tối đa 10 câu mới được duyệt/người/ngày**, mỗi lượt tạo tối đa 5 nháp, tối đa 2 lượt tạo thường/người/ngày. Nếu 10/50/100 người đều dùng hai lượt thì cần 20/100/200 request tạo thường/ngày trước retry, kiểm thử và các dịch vụ khác. Đây là request tạo nội dung thông thường, không phải Gemini Batch API. Draft bị loại vẫn tiêu ngân sách nhà cung cấp và không bảo đảm có đủ 10 câu được duyệt. Tối đa một retry tạm thời/request phải qua ngân sách global; server kiểm reserved + approved ≤ 10 theo ngày Asia/Ho_Chi_Minh, cùng cap request/token toàn project. Nhiều key trong cùng project không nhân quota.
- Chỉ gọi Gemini lúc tạo/duyệt câu; người dùng trả lời câu đã cache không cần gọi AI. Structured JSON chỉ giúp đúng định dạng, còn validator/người duyệt phải kiểm một đáp án đúng và ba nhiễu hợp lệ.
- Ảnh là luồng riêng: tìm theo từ/nghĩa **mới** rồi lưu liên kết đã duyệt để nhiều người dùng dùng lại, không tìm ảnh mỗi lần trả lời. Free Tier Gemini không phải nguồn Image Search thích hợp để xây kho ảnh; xem [đánh giá nguồn ảnh](AI_IMAGE_FEASIBILITY.md).

## Cổng quyết định trước khi code/phát hành

1. Owner xác nhận đối tượng tuổi và vùng phân phối phù hợp điều khoản; nếu app có khả năng được người dưới 18 truy cập, không bật Gemini API theo điều khoản hiện tại. Core flashcard/game vẫn chạy độc lập.
2. Chọn tập card demo không chứa dữ liệu bí mật/cá nhân cho thử nghiệm Free Tier; quyết định riêng cách xử lý deck riêng tư trước khi mở tính năng cho mọi người.
3. Chọn model có Free Tier tại thời điểm thử, ghi quota project trong AI Studio, đặt giới hạn request/token, đo tỷ lệ câu bị loại và chi phí trên **câu được duyệt**.
4. Kiểm thử 429, timeout, mất mạng và fallback. Khi dùng Google Play công khai, không tuyên bố AI miễn phí vô hạn.

## Nguồn chính thức

- [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing): Free Tier chỉ cho một số model; input/output miễn phí trong hạn mức.
- [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits): RPM/TPM/RPD cấp project, hạn mức thực tế xem AI Studio và không được bảo đảm.
- [Gemini API Additional Terms](https://ai.google.dev/gemini-api/terms): tuổi, vùng, Paid Services ở EEA/CH/UK và cách dùng dữ liệu Unpaid Services.
- [Vùng hỗ trợ](https://ai.google.dev/gemini-api/docs/available-regions): có Việt Nam.
- [Bảo vệ API key](https://ai.google.dev/gemini-api/docs/api-key): không đưa key vào mobile production.
- [Firebase AI Logic overview](https://firebase.google.com/docs/ai-logic), [pricing](https://firebase.google.com/docs/ai-logic/pricing) và [quotas](https://firebase.google.com/docs/ai-logic/quotas): proxy/App Check, điều kiện Spark Free Tier và quota.
