# GM-02 — Báo cáo bản nháp trên sanbox

Ngày 2026-10-08. Người thực hiện: Codex theo yêu cầu chủ dự án tiếp tục task 2 và giao phần test/báo cáo. Baseline main `1b9e156c22f33f2965286cb1cc9685702811516f`; patch chưa commit/push. Đây là báo cáo thực hiện, không là review độc lập; GM-02 chưa hoàn tất AC/Approved/Done.

## Đầu ra

- Expo Router SDK 57, React Native 0.86.3, TypeScript strict; package/lockfile khóa exact, ESLint/Jest và CI workflow kiểm source. GitHub CI chưa chạy vì chưa push.
- Routes layout/index/join/native-intent mỏng; feature bootstrap và parser domain tách SDK/UI/network.
- Màn spike có manual code và camera QR, màn kiểm tra link không join server; SQLite counter vô danh; permission và local notification. Có trạng thái lỗi/từ chối, retry và cảnh báo giới hạn remote push.
- Android CNG từ app.config.ts; generated android/ios/build/cache ignored. Không tạo backend, session/auth, phiếu hoặc phòng giả.
- Sau khi chủ dự án thử `npm run android` và gặp thiếu SDK/adb, bổ sung `npm run start:go` để xem bằng Expo Go qua LAN. Log người dùng xác nhận Expo Go SDK 57 crash khi import `expo-notifications`; đã chuyển import notification sang lazy loader và bỏ import tĩnh lúc startup, đồng thời route index/join dùng default export trực tiếp. Expo Go sẽ hiển thị hướng dẫn development build cho notification thay vì crash. Metro bundle cuối exit 0; chưa có kết quả trên điện thoại. Custom scheme/app riêng/remote push tiếp tục cần development build. Validator/69 regression/indexes/diff kiểm lại đạt sau bổ sung hướng dẫn này.
- [Phần test cho bạn](USER_TEST.md), [dependency/license và audit](DEPENDENCIES.md), [kế hoạch/ngoại lệ start](IMPLEMENTATION_PLAN.md). Kết quả dưới đây khác với checklist native chưa chạy.
- Đã tạo [QR fixture mẫu](qr-sample-ABC234.svg) với payload `gi-cung-duoc://join?code=ABC234` để kiểm camera/parser trên Expo Go. Đây là evidence local, không phải QR phòng thật và không nằm trong manifest source/config.
- Ô nhập mã thủ công tự chuyển chữ thường thành in hoa ngay khi nhập hoặc dán; test UI xác nhận giá trị hiển thị là `ABC234` trước khi mở màn kiểm tra.
- [Manifest SHA-256 của 28 file source/config](SOURCE_MANIFEST.json) xác định patch chưa commit để review; không bao gồm generated output hoặc approval. Expo CLI xóa expo-env.d.ts khi không dùng typed routes; file này được coi generated/ignored, không bắt giữ trong manifest.

## Kết quả kiểm thực tế

| Lệnh/phần | Kết quả |
| --- | --- |
| npm ci --no-audit --no-fund; lần cuối thêm --offline | Exit 0 trên lockfile cuối, 1.056 packages; cài lại được từ cache, còn deprecation warnings của tooling |
| npm run check | Exit 0 sau sửa log: TypeScript strict, ESLint không lỗi, 5 suites/53 tests đạt, domain boundary đạt; [output](AUTOMATED_CHECKS.txt) |
| npm run check:expo | Exit 0 qua endpoint online sau khi khóa @types/react 19.2.4: Dependencies are up to date; [output](EXPO_CHECK.txt) |
| npm ls --all --json | Exit 0, problems = []; không có missing/invalid peer trong cây đã cài |
| npm run prebuild:android | Exit 0; manifest scheme đúng, audio/storage permissions bị remove, system UI automatic; không là Gradle build |
| npm run bundle:android | Exit 0 sau sửa route/lazy notification: 1.349 modules, 27 assets, Hermes .hbc ~2,9 MB; đây là bundle, không phải APK |
| npm run android -- --no-install | Exit 1: thiếu Android SDK mặc định/ANDROID_HOME và adb; chưa build/cài APK; [error thực tế](NATIVE_BUILD_ATTEMPT.txt) |
| npm audit --json | Exit 1: 64 affected-package entries (49 high/15 moderate/0 critical), 5 advisory gốc; [JSON](NPM_AUDIT.json), cần xử lý/review, không claim an toàn |
| Repo validator/regression | Validator đạt; 69 Python tests đạt (24,222 giây); task indexes khớp và git diff --check đạt |

Tests mock SDK gồm parser sai scheme/host/query/code, manual fallback, lỗi SQLite/init/retry/reopen, permission deny, local scheduling lỗi, không xin quyền khi mở app, camera deny vẫn manual và callback QR lặp chỉ navigate một lần. Mock reopen không chứng minh SQLite qua process restart thật. Không lấy coverage làm bằng chứng native/remote push.

Bộ npm run check đã chạy lại sau thay đổi chuẩn hóa mã in hoa: typecheck, lint, 5 suites/53 tests và architecture boundary đều đạt. Regression repo có lần chạy trước khi tạo xong REPORT.md bị broken links; đã bổ sung file và kiểm lại validator/69 tests đạt, không sửa test để bỏ qua lỗi.

Môi trường: Windows, Node 24.15.0, npm 11.12.1, JDK 17.0.12. Jest cần chạy ngoài restricted sandbox vì Windows realpath EPERM; Hermes cũng có lỗi ghi temp trong sandbox. Không sửa app để bỏ test/bytecode nhằm vượt lỗi môi trường.

## AC và phần còn lại

| AC | Đánh giá |
| --- | --- |
| Android build thật, version/license/env | Version/lock/license metadata/env có; build APK và thiết bị chưa đạt vì thiếu SDK/adb; audit/license review chưa chấp thuận |
| Routes mỏng/domain độc lập/không secret bundle | Source và kiểm architecture/typecheck đạt; app.config không đọc secret/env, spike không lấy token; chưa là chứng minh runtime ACL/backend |
| Spike phân biệt thật/thiếu credentials | Source/UI/docs ghi rõ SDK native calls, local notification và mock tests; remote push/FCM/server chưa có credentials; native smoke vẫn Not run |

GM-01 vẫn Pending và readiness GM-02 BLOCKED. Chủ dự án đã yêu cầu tiếp tục bản nháp; không tự đổi owner/reviewer/assignment của Tuấn/Trí hoặc Approved/Done. Giữ task metadata backlog để gate không giả thành sẵn sàng. Trước merge cần review baseline, assignment/package/license/audit, Android build và test thiết bị đúng revision. Task downstream chưa được mở gate từ bản nháp này.

Để tiếp tục native: cung cấp đường dẫn Android SDK nếu đã cài ở ổ khác, hoặc chuẩn bị Android Studio/SDK Platform 36 + platform-tools và thiết bị/emulator theo test card. Push remote sau này cần project/FCM/trusted sender, không gửi secret qua chat/client. Không EAS upload/deploy trong lần này.
