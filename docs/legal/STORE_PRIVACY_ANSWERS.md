# Bản đối chiếu dự thảo — Google Play Data safety và Apple App Privacy

**Không phải câu trả lời đã nộp.** Bảng này là kiểm kê theo mã nguồn và phạm vi release v1 hiện có. Trước khi trả lời form, đối chiếu đúng APK/AAB, Supabase production, các SDK bật trong build và cấu hình của store. Không chọn câu trả lời “không thu thập” chỉ vì dữ liệu không xuất hiện ở máy chủ chính.

## Google Play — Data safety (dự thảo)

| Nhóm form | Có trong ứng dụng? | Căn cứ / xử lý cần rà trước khi nộp |
| --- | --- | --- |
| Personal info: name | Có | Tên hiển thị/biệt danh giữ tới khi tài khoản bị xóa; tên trong phòng giữ tới cleanup (24 giờ sau terminal/expiry); được gửi tới Supabase |
| Personal info: email address | Có, với tài khoản email | Email giữ tới khi tài khoản bị xóa; Supabase Auth dùng đăng nhập/khôi phục; khách có thể dùng mà không nhập email |
| Personal info: user IDs | Có | ID gắn hồ sơ/phòng tới khi tài khoản bị xóa; ID phiên cục bộ hết hạn hoặc bị xóa khi logout; xử lý qua Supabase/Auth |
| Location: precise location | Có khi người dùng chủ động tìm quán và cấp quyền | Tọa độ hiện tại được gửi trực tiếp tới Google Places trong yêu cầu; không gửi Supabase. Xác nhận mục Data safety “shared” theo định nghĩa Google và luồng build thực tế |
| Photos and videos | Camera được dùng để quét QR; không tải ảnh/video | Thường không khai báo là dữ liệu được thu thập nếu chỉ xử lý QR tại thiết bị; kiểm lại hành vi SDK/build và định nghĩa form |
| App activity / other user-generated content | Có | Sở thích tồn tại tới khi sửa/xóa tài khoản; ballot/phòng tới 24 giờ sau terminal/expiry; lịch sử có đồng thuận tới 30 ngày. Chọn đúng loại con trong form hiện hành sau khi đối chiếu định nghĩa |
| App info and performance / diagnostics | Chưa xác nhận cho bản phát hành | Sentry là hạng mục release đang triển khai; khai báo nếu SDK/DSN bật trong APK/AAB, nếu không thì không gán hành vi tương lai cho bản hiện tại |
| Device or other IDs / push token | Không trong phạm vi v1 đã chốt | Push từ xa bị hoãn, cài đặt push ẩn. Nếu build có đăng ký token thì cập nhật trước khi nộp |
| Financial info, contacts, messages, browsing history, ads | Không theo phạm vi release và mã nguồn đã rà | Không có thanh toán/quảng cáo/danh bạ/SMS trong app |

Mục đích dự kiến: chức năng ứng dụng, quản lý tài khoản, tương tác xã hội/phòng, cá nhân hóa theo lựa chọn người dùng, và tìm quán gần khi người dùng yêu cầu. Không bán dữ liệu, không dùng quảng cáo. Email hỗ trợ là kênh liên hệ do người dùng khởi tạo, không phải tự động chia sẻ danh bạ.

## Google Play — xóa dữ liệu

- App hỗ trợ tạo tài khoản email và cần có đường dẫn web công khai để yêu cầu xóa tài khoản/dữ liệu, ngoài luồng xóa trong ứng dụng.
- URL dự kiến sau khi Pages bật: `https://thanhtris.github.io/IE307/delete-account/`.
- Trang yêu cầu xóa hướng người dùng gửi email tới 23521645@gm.uit.edu.vn; thao tác backend thủ công, xác minh yêu cầu, xử lý phòng hoạt động và phản hồi hoàn tất. URL chưa hoạt động cho tới khi GitHub Pages được bật.

## Google Play — phân loại đối tượng và nội dung (dự thảo)

| Câu hỏi rà soát | Câu trả lời đề xuất | Căn cứ cần xác nhận trên APK/AAB |
| --- | --- | --- |
| App có quảng cáo không? | Không | Release scope không có quảng cáo/SDK quảng cáo |
| Đối tượng mục tiêu có gồm trẻ em không? | Không thiết kế hướng tới trẻ em | Release handoff quy định không hướng tới trẻ em; xác nhận lựa chọn tuổi thực tế trong Play Console |
| Nội dung tình dục, bạo lực, ngôn từ thô tục, chất cấm hoặc cờ bạc? | Không | App chọn món và tham gia phòng; không có loại nội dung này theo scope hiện hành |
| Người dùng tương tác với nhau? | Có, trong phòng nhóm, qua bạn bè và lời mời | Không có chat tự do; tên hiển thị, lời mời, lựa chọn và trạng thái phòng được chia sẻ theo quyền |
| Người dùng chia sẻ ảnh/video/tệp hoặc nội dung tự do? | Không theo scope hiện hành | Camera chỉ quét QR trên thiết bị; không upload media, không có chat hay bài đăng tự do |
| Mua hàng số hoặc tính năng cờ bạc? | Không | App không có thanh toán hoặc mua hàng trong ứng dụng |

Không tự điền mức tuổi IARC: Play Console tạo mức xếp hạng sau khi người vận hành hoàn tất questionnaire chính thức. Cần trả lời theo đúng bản build và cập nhật khi nội dung/tính năng đổi. App Store/iOS đang hoãn theo release scope, nên phần xếp hạng Apple chưa được khai báo.

## Apple App Privacy — mapping dự thảo

**Chỉ dùng làm tài liệu tham khảo.** Phát hành iOS/App Store đang hoãn theo GM-60 và không nằm trong hồ sơ phát hành v1 hiện tại. Không nộp bảng mapping này cho App Store Connect cho tới khi kế hoạch iOS được mở lại và nội dung được đối chiếu với build iOS thực tế.

| Khai báo Apple | Dữ liệu | Liên kết danh tính / dùng tracking? |
| --- | --- | --- |
| Contact Info — Name | Tên hiển thị | Gắn với tài khoản/phòng; không dùng tracking |
| Contact Info — Email Address | Email tài khoản | Gắn với tài khoản; không dùng tracking |
| Identifiers — User ID | ID Supabase Auth | Gắn với tài khoản để xác thực và cung cấp dịch vụ; không dùng tracking |
| Location — Precise Location | Tọa độ khi tìm quán | Chuyển tới Google Places cho yêu cầu do người dùng khởi tạo; không quảng cáo/tracking |
| User Content — gameplay/other user content | Preferences, nội dung lựa chọn/phòng | Dùng để vận hành tính năng và history có đồng thuận; không tracking |
| Diagnostics | Chờ kiểm build release | Chỉ khai báo nếu Sentry hoặc crash reporting thực sự được bật |

Không có tài khoản/ID dùng theo dõi người dùng trên ứng dụng, website hoặc dịch vụ khác; không bán dữ liệu. Xác nhận câu trả lời này bằng cấu hình quảng cáo/analytics và privacy manifest của đúng build.

## Việc phải xác nhận trước khi nộp

1. So sánh dependency tree, Expo config, permissions và `EXPO_PUBLIC_*` của commit phát hành; đặc biệt push token và Sentry.
2. Xác nhận Supabase production region, backup/restore retention, logging và subprocessors; thay mô tả dự thảo nếu cấu hình thật khác.
3. Xác nhận Google Places key, field mask, coordinate handling, quota, attribution và chính sách Google hiện hành.
4. Chọn loại mục form chính xác từ giao diện Play Console/App Store Connect tại thời điểm nộp; các nhãn trong bảng là nhóm rà soát, không phải câu trả lời đã gửi.
5. Trí duyệt bản cuối và nhập câu trả lời thủ công. Task này không gửi hoặc nộp form.

## Nguồn chính sách

- Google Play [User Data policy](https://support.google.com/googleplay/android-developer/answer/10144311)
- Google Play [Account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111)
- Google Play [Content ratings](https://support.google.com/googleplay/android-developer/answer/9898843) and [target audience and app content](https://support.google.com/googleplay/android-developer/answer/9867159)
- Apple [App Review Guidelines 5.1](https://developer.apple.com/app-store/review/guidelines/)
- Google [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
