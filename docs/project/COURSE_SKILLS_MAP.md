# Đối chiếu kỹ thuật môn học với dự án

Ngày lập: 2026-11-23. Nguồn: slide IE307 chương 1–9 (ThS. Phạm Nhật Duy, UIT), khóa học "The Best React Native Course 2026" (22 phần, trên Drive của môn) và đề tài Seminar-IE307 ([repo](https://github.com/ThanhTris/Seminar-IE307)). Dự án trước đây làm theo kinh nghiệm; tài liệu này ghi kỹ thuật nào đã có, kỹ thuật nào được đưa vào task nào, và kỹ thuật nào cố ý không áp dụng. Slide không có rubric chấm đồ án; chương 9 (bài 1b) chỉ yêu cầu nhóm lập kế hoạch áp dụng bài học vào đồ án, và đây là kế hoạch đó.

Trạng thái đọc trực tiếp trên [Project #2](https://github.com/users/ThanhTris/IE307/projects/2); tài liệu này không ghi approval. Quy ước nguồn: `slide chN` là chương N của slide, `khóa học bài N` là số bài của khóa học Drive (có thể chỉ có phụ đề tự động nên lệnh được ghi lại theo ngữ cảnh).

## Kỹ thuật được áp dụng

| Kỹ thuật | Nguồn | Hiện trạng trong repo | Áp dụng ở |
| --- | --- | --- | --- |
| Error Boundary cho route, màn thử lại | slide ch09 | Không có; lỗi render gây màn trắng | [GM-62](../../tasks/backlog/GM-62.md) |
| Báo crash có release, source map, lọc dữ liệu nhạy cảm | slide ch09, ch06 | Không có; chỉ 3 `console.warn` trong `roomRepository.ts` | GM-62 (Trí duyệt `@sentry/react-native`) |
| Kiểm thử E2E trên thiết bị bằng Maestro, selector `testID` | slide ch09 | Không có; `scripts/e2e/two_client_flow.mjs` chỉ gọi REST | [GM-63](../../tasks/backlog/GM-63.md) |
| `FlatList` có `keyExtractor`, `memo`, `getItemLayout`, `windowSize` | slide ch02 | 25 file dùng `ScrollView`; 2 `FlatList` chưa chỉnh | [GM-64](../../tasks/backlog/GM-64.md) |
| `expo-image` (cache, `contentFit`, ảnh nhỏ), ảnh thay thế khi lỗi | slide ch03, ch09 | `Image` lõi trong `ResultDishArtwork.tsx` | GM-64, [GM-47](../../tasks/backlog/GM-47.md) (ảnh nhỏ) |
| Đo hiệu năng trên bản release, máy thật, báo trung vị | slide ch09 | Chưa có số liệu | GM-64 (`PERFORMANCE.md`), [GM-58](../../tasks/backlog/GM-58.md) (`am start -W`) |
| `react-hook-form` + `zod`, một schema cho nút, ô nhập và submit | slide ch06; khóa học bài 150–153 | Form viết tay (`shared/ui/forms`, `validation.ts`) | [GM-53](../../tasks/backlog/GM-53.md) (form mới; không đổi form của GM-35 đang review) |
| Map lỗi theo mã 401/403/409/429/5xx, không lộ tài khoản có tồn tại | slide ch06 | Có mapping lỗi ở `client/transport.ts`, chưa áp cho form xóa tài khoản | GM-53 |
| Chặn rời màn khi đang gửi (`usePreventRemove`) | slide ch04 | Chưa dùng | GM-53 |
| Môi trường dev/staging/production bằng profile EAS, `EXPO_PUBLIC_APP_ENV` | slide ch05 | Chưa có `eas.json` | [GM-54](../../tasks/backlog/GM-54.md), [GM-52](../../tasks/backlog/GM-52.md) |
| Biến `EXPO_PUBLIC_*` bị nhúng vào bundle, không chứa bí mật; kiểm APK | slide ch05, ch06 | Quy tắc đã có trong AGENTS.md, chưa có kiểm APK | GM-52 (giải nén APK/AAB), GM-54 |
| `eas init`, `eas build:configure`, `npx expo install --check`, build APK (`preview`) và AAB (`production`) | khóa học bài 187–189 | Chưa có `eas.json`; `bundle:android` chỉ xuất JS bundle | GM-54, [GM-59](../../tasks/backlog/GM-59.md) |
| Icon, adaptive icon, `expo-splash-screen`; splash chỉ thấy trên bản build | khóa học bài 185–186 | `app.config.ts` chưa có adaptive icon và splash | GM-54 |
| Giá trị điền sẵn của form chỉ khi `__DEV__` | khóa học bài 188 | Cần kiểm; route `dev/*` đã chặn bằng `__DEV__` | GM-54 (test build release) |
| Chuỗi xin quyền trung thực, hỏi đúng ngữ cảnh, đủ nhánh từ chối/bị chặn | slide ch07 | Có hỏi lần đầu và hỏi lại khi dùng | GM-54, GM-58 |
| Key Places giới hạn theo gói và chứng chỉ; keystore release khác debug | slide ch07 | Header ứng dụng chưa gửi, chưa có cache | GM-54, GM-59 |
| Deep link: cold start, warm, link sai, phòng không tồn tại, không có quyền | slide ch04 | Có `join/[code].tsx` và `+native-intent.ts` | GM-58 |
| Phiên đăng nhập: token hết hạn, nhiều 401 đồng thời (single-flight), đăng xuất, offline | slide ch06 | `data/auth/session.ts` đã có restore/refresh | GM-58 (kiểm); không viết lại |
| Trợ năng: Reduce Motion, TalkBack, chữ 200%, 320dp | slide ch03, ch08 | Đã dùng nhiều thuộc tính a11y; chưa có `maxFontSizeMultiplier` | GM-58, GM-64 |
| Mẫu `BUILD_MANIFEST` (SHA-256, chữ ký, versionCode) cho gói nộp | Seminar-IE307 | Chưa có | GM-59 |
| Thử force-stop, đưa app xuống nền rồi quay lại: kích hoạt ≠ chạy ≠ ghi kết quả | Seminar-IE307 | Đã có ca force-stop trong bộ test case | GM-58 |

## Kỹ thuật đã có sẵn trong dự án

Đối chiếu để báo cáo, không cần làm thêm:

- Expo Router với route mỏng, deep link `join/[code].tsx`, `+not-found.tsx`; route `dev/*` chặn ngoài `__DEV__` (slide ch04).
- Session và token trong SecureStore (`gcd.auth.gm16.v1`, `WHEN_UNLOCKED_THIS_DEVICE_ONLY`), SQLite cho outbox và cache có TTL (slide ch06; khóa học bài 174–184 dạy AsyncStorage và `redux-persist`, dự án dùng SecureStore và SQLite nên đúng hơn cho dữ liệu nhạy cảm).
- Client Supabase RPC có `AbortController` và timeout, retry chỉ cho phần xác thực, guard schema phản hồi, guard epoch khi đổi tài khoản (slide ch05, ch06).
- Realtime qua WebSocket kèm đọc bù khi mất kết nối (slide ch05).
- Theme sáng/tối bằng token, `useColorScheme`, Inter qua `expo-font` (slide ch03).
- Kiểm tra kiến trúc (`check-architecture.mjs`), ESLint, Jest (`jest-expo`, RNTL 14) trên CI (slide ch09).
- Test case có mã, truy vết và báo cáo (GM-55..GM-57).

## Cố ý không áp dụng trong release v1

| Kỹ thuật | Nguồn | Lý do |
| --- | --- | --- |
| i18n (`i18next`, `expo-localization`) | khóa học bài 166–173 | App chỉ có tiếng Việt, chưa có yêu cầu đa ngôn ngữ |
| Redux Toolkit, Zustand, TanStack Query | slide ch05; khóa học bài 102–112, 143–148 | Dự án đã có repository và store riêng (`useSyncExternalStore`); đổi lớp trạng thái ngay trước khi nộp rủi ro lớn hơn lợi ích |
| `redux-persist`, AsyncStorage cho phiên | khóa học bài 174–184 | Đã có SecureStore và SQLite |
| NativeWind | slide ch03 | Đã có token theme và `StyleSheet` nhất quán |
| Reanimated, Gesture Handler, Lottie, Skia, bottom sheet thư viện | slide ch08 | Đang dùng `Animated` và `PanResponder` với native driver, đã có thay thế bằng nút; thêm thư viện làm tăng rủi ro build |
| Reactotron, Firebase, RN CLI, Stallion OTA, Google Sign-In | khóa học phần 11, 15–17, 20 | Dự án dùng Expo, Supabase và EAS; OTA và Google Sign-In đã hoãn |
| Certificate pinning, Play Integrity | slide ch06 | Cần hạ tầng và rủi ro khóa người dùng; để sau khi có bản trên store |
| Push từ xa và tác vụ nền (`expo-background-task`) | slide ch07; Seminar-IE307 | Đã hoãn (xem RELEASE_V1_SCOPE); Seminar là bản Kotlin native, dùng làm thiết kế tham chiếu cho đợt sau |
| iOS và App Store | khóa học bài 192–193 | Thầy chỉ đăng Google Play (GM-60 hoãn) |

## Đề tài seminar áp dụng vào đồ án

Seminar-IE307 (chủ đề 12: tìm nạp nền và thông báo đẩy im lặng, trên Android) có ba kết luận đã được kiểm trên emulator và OPPO Find X9: chu kỳ nền tối thiểu 15 phút và không chính xác; Doze trì hoãn công việc; force-stop không vượt qua được. Kết luận chưa có: so sánh push với periodic (chưa chạy E02, E05, các ô chính còn NOT_RUN).

Áp dụng vào đồ án theo phạm vi release v1:

1. **Đưa vào ngay:** mẫu `BUILD_MANIFEST` và quy tắc đóng gói (một gói, file lớn để Drive, không secret) cho gói bàn giao GM-59; nguyên tắc "kích hoạt ≠ chạy ≠ ghi kết quả" thành các ca kiểm ở GM-58 (force-stop rồi mở lại, đưa app xuống nền rồi quay lại thì hộp thư và trạng thái phòng phải bắt kịp). Guard phiên bản đơn điệu của seminar tương ứng guard version phòng đã có.
2. **Không đưa vào v1:** mã Kotlin (WorkManager, `FirebaseMessagingService`) vì đồ án là Expo; push từ xa đang hoãn và đề tài này đúng là phần bị hoãn.
3. **Đợt sau:** khi mở lại push, dùng FCM data-only ưu tiên thường, `expo-notifications` và `expo-background-task` (phía Expo), kiểm trên máy thật có tối ưu pin (OPPO), không hứa thời gian giao chính xác.

## Việc cần Trí duyệt

- Dependency mới (đã duyệt 2026-11-23): `@sentry/react-native` (GM-62), `expo-image` (GM-64), `react-hook-form` + `zod` (GM-53, form mới); công cụ ngoài app: Maestro (GM-63).
- Chỗ lưu ảnh món và cách ghi công ảnh trong app (mục 9 của `RELEASE_V1_CATALOGUE_SPEC.md`).
