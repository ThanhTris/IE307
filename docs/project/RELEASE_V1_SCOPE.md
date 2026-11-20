# Phạm vi release v1 — đăng Google Play và App Store

Ngày chốt: 2026-11-20, theo chỉ dẫn của chủ dự án Trí (ThanhTris). Mục tiêu: đưa app lên cả hai store sớm, sau đó mới bổ sung tính năng. Trạng thái, assignee và Deadline của từng task đọc trực tiếp trên [Project #2](https://github.com/users/ThanhTris/IE307/projects/2); tài liệu này không ghi approval.

## Quyết định đã chốt

- **Nền tảng:** Android và iOS. Nhóm có iPhone, máy Mac và tài khoản Apple Developer. Tài khoản Google Play là cá nhân, nên phải chạy thử kín với ít nhất 12 tester trong 14 ngày liên tục trước khi lên production (kiểm lại điều kiện hiện hành trên Play Console).
- **Frontend dừng ở luồng tài khoản** (GM-35 của Tuấn) kèm xóa tài khoản và liên kết pháp lý (GM-53). BE làm đủ đến mức đó, gồm GM-46.
- **Data dừng ở** GM-41 (món đa nhãn, độ phủ theo bữa, ăn vặt) và GM-47 (mô tả, ảnh có quyền), rồi phát hành catalogue production ở GM-51.
- **Backend:** Supabase gói miễn phí, một project staging và một project production. Một workflow gọi định kỳ để project không bị tạm dừng; phần chuyển vòng khi hết giờ chạy bằng pg_cron (GM-48), không còn phụ thuộc worker chạy trên máy.
- **Places** giữ ở mức miễn phí: khóa key theo app và API, đặt quota mỗi ngày dưới hạn mức miễn phí (GM-54, GM-59, GM-60).
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
| Cấu hình app | [GM-54](../../tasks/backlog/GM-54.md) | Trang | Android/iOS, `eas.json` dùng chung, cổng phiên bản, Places |
| Kiểm thử | [GM-55](../../tasks/backlog/GM-55.md) | Trí | Bộ test case, truy vết, xuất Excel |
| Kiểm thử | [GM-56](../../tasks/backlog/GM-56.md) | Trang | Test tự động phía app cho ca còn thiếu |
| Kiểm thử | [GM-57](../../tasks/backlog/GM-57.md) | Trang | Test SQL/HTTP và script E2E hai client |
| Kiểm thử | [GM-58](../../tasks/backlog/GM-58.md) | Vinh | Chạy toàn bộ test case trên release candidate |
| Phát hành Google Play | [GM-59](../../tasks/backlog/GM-59.md) | Trí | Build AAB, hồ sơ Play, kiểm thử kín 14 ngày, đăng |
| Phát hành App Store | [GM-60](../../tasks/backlog/GM-60.md) | Tâm | Build IPA, TestFlight, hồ sơ App Store, gửi App Review |
| Chốt release | [GM-61](../../tasks/backlog/GM-61.md) | Trí | Xác nhận hai store, ghi phiên bản đã phát hành |

Thứ tự gợi ý (dependency Done trên Project vẫn là điều kiện bắt buộc):

1. Đợt 1, song song: GM-35, GM-41, GM-46, GM-47, GM-48, GM-49, GM-50, GM-55.
2. Đợt 2: GM-51, GM-52, GM-53, GM-54, GM-56, GM-57.
3. Đợt 3: GM-58.
4. Đợt 4: GM-59 (Trí, Google Play) và GM-60 (Tâm, App Store) chạy song song; kiểm thử kín 14 ngày trên Google Play chạy cùng lúc với App Review của Apple.
5. Đợt 5: GM-61 chốt release khi cả hai store xong.

## Hoãn sau khi lên store

Các mục sau được đóng tạm trên GitHub (nhãn `priority:later`) và mở lại ở đợt bổ sung tính năng:

- [GM-36](../../tasks/backlog/GM-36.md) OCR menu, [GM-37](../../tasks/backlog/GM-37.md) AI hiểu sở thích, [GM-38](../../tasks/backlog/GM-38.md) weather và mood. Nhánh và PR của GM-36, GM-38 giữ ở trạng thái draft.
- Thông báo đẩy từ xa (FCM, EAS project, `push-sender`): bản đầu ẩn mục cài đặt thông báo đẩy; hộp thư và banner trong app vẫn chạy.
- Google Sign-In (frame có trong Figma, GoTrue local chưa cấu hình): bản đầu chỉ có đăng nhập email và khách, nên chưa cần Sign in with Apple.
- Cập nhật OTA bằng EAS Update (cần Trí duyệt dependency `expo-updates`), nâng gói Supabase trả phí.

## Phân công theo store

Hai store do hai người phụ trách và không sửa file của nhau. `mobile/eas.json`, `app.config.ts`, cổng phiên bản và Places là phần dùng chung, thuộc [GM-54](../../tasks/backlog/GM-54.md) của Trang, nên cả hai nhận cùng một cấu hình.

| | Google Play | App Store |
| --- | --- | --- |
| Task | [GM-59](../../tasks/backlog/GM-59.md) | [GM-60](../../tasks/backlog/GM-60.md) |
| Người làm | Trí | Tâm (có iPhone và Mac) |
| Tài khoản phải tạo | Google Play Console cá nhân (xác minh danh tính) | Apple Developer Program cá nhân (phí hằng năm), bản ghi app trong App Store Connect |
| Build | EAS profile `production-android` → AAB, Play App Signing | EAS profile `production-ios` → IPA, EAS giữ chứng chỉ |
| Bản cho GM-58 | Track Internal testing | TestFlight nội bộ, iPhone thật và Simulator |
| Giới hạn key Places | Tên gói `vn.gicungduoc.mobile` + SHA-1 chữ ký app | Bundle identifier |
| Khai báo quyền riêng tư | Data safety, URL xóa tài khoản | App Privacy, privacy manifest |
| Thử nghiệm | Closed testing ≥ 12 tester × 14 ngày liên tục | TestFlight nội bộ (không chờ Apple duyệt) |
| Gửi duyệt | Apply for production, staged rollout | App Review, phát hành thủ công sau khi duyệt |
| Thư mục hồ sơ | `docs/release/google-play/` | `docs/release/app-store/` |

Điều phối hai bên:

- Bước đầu của mỗi store (tài khoản, build, bản thử nội bộ) không chờ [GM-58](../../tasks/backlog/GM-58.md), vì GM-58 cần chính các bản release candidate này để chạy test. Từ bước hồ sơ và gửi duyệt trở đi mới chờ GM-58 đạt.
- Hai task dùng chung quota Places mỗi ngày (Trí đặt trên Google Cloud) và dùng chung `docs/legal/STORE_PRIVACY_ANSWERS.md` của [GM-50](../../tasks/backlog/GM-50.md).
- Task cuối [GM-61](../../tasks/backlog/GM-61.md) của Trí chỉ chốt khi cả hai store xong.

## Checklist store

Các điều kiện dưới đây theo hiểu biết tại thời điểm viết; cần kiểm lại trên Play Console và App Store Connect trước khi nộp.

### Google Play (Trí, GM-59)

| Hạng mục | Task |
| --- | --- |
| Tài khoản developer cá nhân, xác minh danh tính | GM-59 (Trí làm tay) |
| AAB, Play App Signing, tự tăng versionCode | GM-54 (`eas.json`), GM-59 |
| targetSdk theo yêu cầu hiện hành | GM-54 |
| URL chính sách quyền riêng tư, form Data safety | GM-50, GM-59 |
| Xóa tài khoản trong app và đường dẫn web | GM-49, GM-50, GM-53 |
| Quyền camera và vị trí chỉ khi dùng, không chạy nền | GM-54 |
| Phân loại nội dung, khai báo không quảng cáo, đối tượng người dùng | GM-59 |
| Closed testing 12 tester × 14 ngày | GM-59 |
| Hướng dẫn truy cập và video cho người review | GM-59 |
| Giới hạn key Places theo gói và SHA-1, quota ngày | GM-59 |
| Backend luôn sẵn sàng khi review | GM-52 |
| Không crash, không ANR | GM-58 |

### App Store (Tâm, GM-60)

| Hạng mục | Task |
| --- | --- |
| Apple Developer Program, App ID, bản ghi App Store Connect | GM-60 (Tâm làm tay) |
| Bundle ID, privacy manifest, khai báo mã hóa, iPhone-only | GM-54 |
| Chứng chỉ và provisioning (EAS), TestFlight nội bộ | GM-60 |
| App Privacy labels, URL chính sách và hỗ trợ | GM-50, GM-60 |
| Xóa tài khoản trong app (5.1.1(v)) | GM-49, GM-53 |
| Rà hướng dẫn 1.2 (tên hiển thị người dùng), không cần Sign in with Apple | GM-60 |
| Ảnh chụp iPhone, ghi chú review, tài khoản review, video | GM-60 |
| App hoàn chỉnh khi review (2.1): phòng cần ít nhất hai người | GM-57, GM-58, GM-60 |
| Giới hạn key Places theo bundle identifier | GM-60 |

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
- Trí: tài khoản Play Console, ≥ 12 tester Google Play, quota Places trên Google Cloud, mời Tâm vào tổ chức Expo.
- Tâm: tài khoản Apple Developer và App Store Connect; bundle identifier iOS (đề xuất cùng `vn.gicungduoc.mobile` với Android, chốt cùng Trang ở GM-54).
- Duyệt ADR-029 (xóa tài khoản) khi GM-49 mở PR, và dependency mới nếu GM-54 cần `expo-build-properties`.
