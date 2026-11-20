# Phạm vi release v1 — đăng Google Play và App Store

Ngày chốt: 2026-11-20, theo chỉ dẫn của chủ dự án Trí (ThanhTris). Mục tiêu: đưa app lên cả hai store sớm, sau đó mới bổ sung tính năng. Trạng thái, assignee và Deadline của từng task đọc trực tiếp trên [Project #2](https://github.com/users/ThanhTris/IE307/projects/2); tài liệu này không ghi approval.

## Quyết định đã chốt

- **Nền tảng:** Android và iOS. Nhóm có iPhone, máy Mac và tài khoản Apple Developer. Tài khoản Google Play là cá nhân, nên phải chạy thử kín với ít nhất 12 tester trong 14 ngày liên tục trước khi lên production (kiểm lại điều kiện hiện hành trên Play Console).
- **Frontend dừng ở luồng tài khoản** (GM-35 của Tuấn) kèm xóa tài khoản và liên kết pháp lý (GM-53). BE làm đủ đến mức đó, gồm GM-46.
- **Data dừng ở** GM-41 (món đa nhãn, độ phủ theo bữa, ăn vặt) và GM-47 (mô tả, ảnh có quyền), rồi phát hành catalogue production ở GM-51.
- **Backend:** Supabase gói miễn phí, một project staging và một project production. Một workflow gọi định kỳ để project không bị tạm dừng; phần chuyển vòng khi hết giờ chạy bằng pg_cron (GM-48), không còn phụ thuộc worker chạy trên máy.
- **Places** giữ ở mức miễn phí: khóa key theo app và API, đặt quota mỗi ngày dưới hạn mức miễn phí (GM-54, GM-59).
- **Bộ test case** là mục quan trọng nhất cho báo cáo: GM-55 đến GM-58.

## Task trong release v1

Mọi task dưới đây mang nhãn `release:v1` và đều ở mức P0 (bắt buộc để lên store). GM-35, GM-41, GM-46 và GM-47 vốn là P1; được nâng lên P0 vì validator không cho task P0 phụ thuộc task P1.

| Nhóm | Task | Người làm | Nội dung |
| --- | --- | --- | --- |
| Đang làm | [GM-35](../../tasks/backlog/GM-35.md) | Tuấn | Tài khoản, hồ sơ và khôi phục mật khẩu |
| Đang làm | [GM-41](../../tasks/backlog/GM-41.md) | Vinh | Món đa nhãn và độ phủ theo bữa |
| Đang làm | [GM-46](../../tasks/backlog/GM-46.md) | Trí | Cờ `hasRecentHistory` |
| Đang làm | [GM-47](../../tasks/backlog/GM-47.md) | Tâm | Mô tả và ảnh có quyền cho catalogue |
| Hạ tầng | [GM-48](../../tasks/backlog/GM-48.md) | Tâm | Lịch tick pg_cron trên Supabase hosted |
| Hạ tầng | [GM-52](../../tasks/backlog/GM-52.md) | Trí | Dựng Supabase staging và production |
| Bảo mật, pháp lý | [GM-49](../../tasks/backlog/GM-49.md) | Trí | Xóa tài khoản và dữ liệu cá nhân |
| Bảo mật, pháp lý | [GM-50](../../tasks/backlog/GM-50.md) | Trung | Chính sách quyền riêng tư, điều khoản, trang hỗ trợ |
| Bảo mật, pháp lý | [GM-53](../../tasks/backlog/GM-53.md) | Tuấn | Màn xóa tài khoản và liên kết pháp lý trong app |
| Data | [GM-51](../../tasks/backlog/GM-51.md) | Tâm | Catalogue production và import cho hosted |
| Cấu hình app | [GM-54](../../tasks/backlog/GM-54.md) | Trang | Android/iOS, cổng phiên bản, Places |
| Kiểm thử | [GM-55](../../tasks/backlog/GM-55.md) | Trí | Bộ test case, truy vết, xuất Excel |
| Kiểm thử | [GM-56](../../tasks/backlog/GM-56.md) | Trang | Test tự động phía app cho ca còn thiếu |
| Kiểm thử | [GM-57](../../tasks/backlog/GM-57.md) | Trang | Test SQL/HTTP và script E2E hai client |
| Kiểm thử | [GM-58](../../tasks/backlog/GM-58.md) | Vinh | Chạy toàn bộ test case trên release candidate |
| Phát hành | [GM-59](../../tasks/backlog/GM-59.md) | Trí | Build EAS, hồ sơ store, kiểm thử kín, gửi duyệt |

Thứ tự gợi ý (dependency Done trên Project vẫn là điều kiện bắt buộc):

1. Đợt 1, song song: GM-35, GM-41, GM-46, GM-47, GM-48, GM-49, GM-50, GM-55.
2. Đợt 2: GM-51, GM-52, GM-53, GM-54, GM-56, GM-57.
3. Đợt 3: GM-58.
4. Đợt 4: GM-59. Kiểm thử kín 14 ngày trên Google Play chạy song song với App Review của Apple.

## Hoãn sau khi lên store

Các mục sau được đóng tạm trên GitHub (nhãn `priority:later`) và mở lại ở đợt bổ sung tính năng:

- [GM-36](../../tasks/backlog/GM-36.md) OCR menu, [GM-37](../../tasks/backlog/GM-37.md) AI hiểu sở thích, [GM-38](../../tasks/backlog/GM-38.md) weather và mood. Nhánh và PR của GM-36, GM-38 giữ ở trạng thái draft.
- Thông báo đẩy từ xa (FCM, EAS project, `push-sender`): bản đầu ẩn mục cài đặt thông báo đẩy; hộp thư và banner trong app vẫn chạy.
- Google Sign-In (frame có trong Figma, GoTrue local chưa cấu hình): bản đầu chỉ có đăng nhập email và khách, nên chưa cần Sign in with Apple.
- Cập nhật OTA bằng EAS Update (cần Trí duyệt dependency `expo-updates`), nâng gói Supabase trả phí.

## Checklist store

Các điều kiện dưới đây theo hiểu biết tại thời điểm viết; cần kiểm lại trên Play Console và App Store Connect trước khi nộp.

| Store | Hạng mục | Task |
| --- | --- | --- |
| Google Play | Tài khoản developer cá nhân | Trí làm tay |
| Google Play | AAB, Play App Signing, tự tăng versionCode | GM-59 |
| Google Play | targetSdk theo yêu cầu hiện hành | GM-54 |
| Google Play | URL chính sách quyền riêng tư, form Data safety | GM-50 |
| Google Play | Xóa tài khoản trong app và đường dẫn web | GM-49, GM-50, GM-53 |
| Google Play | Quyền camera và vị trí chỉ khi dùng, không chạy nền | GM-54 |
| Google Play | Phân loại nội dung, khai báo không quảng cáo | GM-59 |
| Google Play | Closed testing 12 tester × 14 ngày | GM-59 |
| Google Play | Hướng dẫn truy cập và video cho người review | GM-59 |
| Google Play | Backend luôn sẵn sàng khi review | GM-52 |
| Google Play | Không crash, không ANR | GM-58 |
| App Store | Bundle ID, chứng chỉ, TestFlight | GM-54, GM-59 |
| App Store | Privacy manifest | GM-54 |
| App Store | App Privacy labels, URL chính sách | GM-50 |
| App Store | Xóa tài khoản trong app (5.1.1(v)) | GM-53 |
| App Store | Ảnh chụp, ghi chú và video cho App Review | GM-59 |
| App Store | App hoàn chỉnh khi review (2.1): phòng cần ít nhất hai người | GM-57, GM-58, GM-59 |

## Môi trường

| Môi trường | Dùng cho | Ghi chú |
| --- | --- | --- |
| QA local (GM-03) | Test tự động, E2E hai client, AVD | Có worker mô phỏng tick; không dùng cho store |
| Supabase staging | Thử migration, release candidate, chạy test case | Nhận mọi thay đổi trước production |
| Supabase production | Người dùng thật | Chỉ nhận bản đã qua staging; không reset hay sửa migration đã áp |

Quy tắc chung: không đưa `service_role` hay secret vào repo hoặc app; chỉ publishable key đặt qua EAS secrets; không log phiếu bầu hay token.

## Tương thích ngược sau khi phát hành

Khi đã có bản app trên store, người dùng không cập nhật cùng lúc với backend. Vì vậy:

- Migration mới phải chạy được với app bản cũ, hoặc luật mới chỉ áp cho phiên mới (có version policy riêng) và đi kèm cổng phiên bản tối thiểu của GM-54.
- Không sửa migration đã áp; thêm migration mới. Thứ tự số migration phải tăng theo thứ tự merge để `db push` không chèn bản cũ hơn bản đã áp.
- Bản đầu phải có sẵn cổng phiên bản tối thiểu; nếu không, sau này không buộc được người dùng cập nhật.

## Điều kiện hoàn thành release v1

- Mọi task trong bảng trên ở **Done** trên Project #2, do Trí nghiệm thu.
- Bộ test case ([GM-55](../../tasks/backlog/GM-55.md)) có kết quả thật cho mọi ca P0 trên bản release candidate nối staging ([GM-58](../../tasks/backlog/GM-58.md)); không còn Not run ở phạm vi bắt buộc.
- Mọi hạng mục trong checklist store có bằng chứng.

## Việc cần Trí cung cấp hoặc quyết

- Email liên hệ và tên pháp nhân hiển thị trên chính sách (GM-50); bật GitHub Pages (Settings → Pages, source GitHub Actions).
- Bundle identifier iOS (đề xuất cùng `vn.gicungduoc.mobile` với Android), tài khoản Play Console và App Store Connect.
- Duyệt ADR-029 (xóa tài khoản) khi GM-49 mở PR, và dependency mới nếu GM-54 cần `expo-build-properties`.
- Nhóm tester Google Play: 12 người trở lên, giữ tham gia liên tục 14 ngày.
