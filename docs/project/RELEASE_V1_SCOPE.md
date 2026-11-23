# Phạm vi release v1 — bàn giao bản build Android cho thầy đăng Google Play

Ngày chốt: 2026-11-20, theo chỉ dẫn của chủ dự án Trí (ThanhTris). **Điều chỉnh 2026-11-23:** thầy hướng dẫn là người tự upload lên Google Play, nhóm chỉ nộp file build và hồ sơ; App Store hoãn. Trạng thái, assignee và Deadline của từng task đọc trực tiếp trên [Project #2](https://github.com/users/ThanhTris/IE307/projects/2); tài liệu này không ghi approval.

## Quyết định đã chốt

- **Nền tảng và cách phát hành (2026-11-23):** chỉ Android. Nhóm nộp cho thầy 2–3 file: **AAB** (thầy upload lên Google Play), **APK** (cài thử trực tiếp) và chứng chỉ upload `.pem`, cùng một gói hồ sơ store tối thiểu. Nhóm **không** tạo tài khoản Play Console, không chạy closed testing 12 tester × 14 ngày, không gửi duyệt. iOS và App Store hoãn ([GM-60](../../tasks/backlog/GM-60.md)).
- **Khóa ký:** keystore do EAS giữ trong tài khoản Expo của nhóm. Thầy bật Play App Signing bằng chứng chỉ upload; sau khi upload thầy gửi lại SHA-1 chữ ký app để thêm vào giới hạn key Places.
- **Frontend dừng ở luồng tài khoản** (GM-35 của Tuấn) kèm xóa tài khoản và liên kết pháp lý (GM-53). BE làm đủ đến mức đó, gồm GM-46.
- **Data dừng ở** GM-41 (món đa nhãn, độ phủ theo bữa, ăn vặt) và GM-47 (mô tả, ảnh có quyền), rồi phát hành catalogue production ở GM-51.
- **Catalogue lên store (bổ sung 2026-11-21):** tối thiểu 250 món (mỗi bữa ≥ 60, ăn vặt ≥ 80, mỗi nhóm ≥ 10, mỗi miền ≥ 25, mỗi vị ≥ 15) và 100% món có ảnh có quyền dùng. GM-51 chỉ phát hành khi GM-41 và GM-47 Done. Yêu cầu chi tiết: [RELEASE_V1_CATALOGUE_SPEC](../data/RELEASE_V1_CATALOGUE_SPEC.md), kiểm bằng `python scripts/release_catalogue_check.py`.
- **Bổ sung từ môn học (2026-11-23):** kỹ thuật trong slide IE307 và khóa học React Native được đưa vào acceptance criteria của task đang mở và ba task mới GM-62..64. Bảng đối chiếu: [COURSE_SKILLS_MAP](COURSE_SKILLS_MAP.md). Trí đã duyệt thêm bốn gói/công cụ: Sentry (`@sentry/react-native`), Maestro (công cụ dòng lệnh, không thêm vào app), `expo-image`, `react-hook-form` + `zod` (zod chỉ cho form mới).
- **Backend:** Supabase gói miễn phí, một project staging và một project production. Một workflow gọi định kỳ để project không bị tạm dừng; phần chuyển vòng khi hết giờ chạy bằng pg_cron (GM-48), không còn phụ thuộc worker chạy trên máy.
- **Places** giữ ở mức miễn phí: khóa key theo app và API, đặt quota mỗi ngày dưới hạn mức miễn phí (GM-54, GM-59).
- **Bộ test case** là mục quan trọng nhất cho báo cáo: GM-55 đến GM-58.

## Task trong release v1

Mọi task dưới đây mang nhãn `release:v1`. Task bắt buộc để có bản nộp là P0. GM-35, GM-41, GM-46 và GM-47 vốn là P1, được nâng lên P0 vì validator không cho task P0 phụ thuộc task P1. GM-62..64 là P1 vì validator cũng không cho task P0 (GM-58, GM-59, GM-61) phụ thuộc task có số lớn hơn; chúng vẫn bắt buộc hoàn tất trước khi build bản nộp (xem GM-59, GM-61).

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
| Cấu hình app | [GM-54](../../tasks/backlog/GM-54.md) | Trang | Bản build Android (`eas.json`, APK + AAB), cổng phiên bản, Places |
| Chất lượng app (P1) | [GM-62](../../tasks/backlog/GM-62.md) | Trung | Error Boundary và báo lỗi crash (Sentry) |
| Chất lượng app (P1) | [GM-64](../../tasks/backlog/GM-64.md) | Tuấn | Hiệu năng danh sách và ảnh món (`FlatList`, `expo-image`) |
| Kiểm thử | [GM-55](../../tasks/backlog/GM-55.md) | Trí | Bộ test case, truy vết, xuất Excel |
| Kiểm thử | [GM-56](../../tasks/backlog/GM-56.md) | Trang | Test tự động phía app cho ca còn thiếu |
| Kiểm thử | [GM-57](../../tasks/backlog/GM-57.md) | Trang | Test SQL/HTTP và script E2E hai client |
| Kiểm thử | [GM-58](../../tasks/backlog/GM-58.md) | Vinh | Chạy toàn bộ test case trên APK release candidate (Android) |
| Kiểm thử (P1) | [GM-63](../../tasks/backlog/GM-63.md) | Vinh | Kiểm thử E2E bằng Maestro trên APK |
| Bàn giao | [GM-59](../../tasks/backlog/GM-59.md) | Trí | Build AAB + APK, gói hồ sơ, nộp cho thầy |
| Chốt release | [GM-61](../../tasks/backlog/GM-61.md) | Trí | Xác nhận đã nộp, ghi phiên bản và mã băm |

Thứ tự gợi ý (dependency Done trên Project vẫn là điều kiện bắt buộc):

1. Đợt 1, song song: GM-35, GM-41, GM-46, GM-47, GM-48, GM-49, GM-50, GM-55.
2. Đợt 2: GM-51, GM-52, GM-53, GM-54, GM-56, GM-57, và song song GM-62, GM-64 (P1).
3. Đợt 3: GM-58, GM-63 trên APK `preview` đã có đủ các task ở đợt 2.
4. Đợt 4: GM-59 build bản nộp và gom hồ sơ, chỉ khi mọi task `release:v1` khác đã Done.
5. Đợt 5: GM-61 ghi lại bản đã nộp cho thầy.

## Hoãn sau khi lên store

Các mục sau được đóng tạm trên GitHub (nhãn `priority:later`) và mở lại ở đợt bổ sung:

- [GM-36](../../tasks/backlog/GM-36.md) OCR menu, [GM-37](../../tasks/backlog/GM-37.md) AI hiểu sở thích, [GM-38](../../tasks/backlog/GM-38.md) weather và mood. Nhánh và PR của GM-36, GM-38 giữ ở trạng thái draft.
- [GM-60](../../tasks/backlog/GM-60.md) bản iOS và App Store (hạ P2, gỡ `release:v1`): thầy chỉ đăng Google Play. Cấu hình iOS (bundle ID, privacy manifest, `production-ios`) làm lại khi có yêu cầu.
- Thông báo đẩy từ xa (FCM, EAS project, `push-sender`): bản đầu ẩn mục cài đặt thông báo đẩy; hộp thư và banner trong app vẫn chạy. Thiết kế tham chiếu cho đợt sau: đề tài Seminar-IE307 (FCM data-only + WorkManager trên Android; `expo-background-task` phía Expo), tách bạch ba việc: kích hoạt, hệ điều hành cho chạy, ghi kết quả.
- Google Sign-In (frame có trong Figma, GoTrue local chưa cấu hình): bản đầu chỉ có đăng nhập email và khách.
- Cập nhật OTA bằng EAS Update (cần Trí duyệt dependency `expo-updates`), nâng gói Supabase trả phí.
- Không đưa vào v1 (đã cân nhắc): i18n (app chỉ tiếng Việt), Redux/Zustand/TanStack Query (đã có repository và store riêng), NativeWind, certificate pinning. Chi tiết trong [COURSE_SKILLS_MAP](COURSE_SKILLS_MAP.md).

## Bàn giao cho thầy

Nhóm nộp cho thầy, theo [GM-59](../../tasks/backlog/GM-59.md):

| Mục | Nội dung | Ghi chú |
| --- | --- | --- |
| AAB | Bản `production` để thầy upload lên Google Play | Ký bằng upload key do EAS giữ |
| APK | Bản `preview` để cài thử trực tiếp | Nối Supabase staging, cùng commit với AAB |
| Chứng chỉ upload | `.pem` xuất bằng `eas credentials` | Không nộp file `.jks` hay mật khẩu |
| `BUILD_MANIFEST.json` | Package, version, versionCode, SHA-256 từng file, SHA-1/SHA-256 chứng chỉ, commit, backend | Mẫu theo `BUILD_MANIFEST` của Seminar-IE307 |
| `README.md` | Các bước thầy làm trên Play Console | Trí đối chiếu với Play Console hiện hành |
| `LISTING.md`, `REVIEW_NOTES.md` | Mô tả, ảnh, icon, Data safety, tài khoản và video cho người review | Lấy từ GM-50 và STORE_PRIVACY_ANSWERS |

Quy tắc đóng gói: file build để trên Google Drive chia sẻ thầy, không commit vào git; gói tài liệu không chứa secret; thư mục hồ sơ là `docs/release/handoff/`.

## Checklist hồ sơ Google Play (thầy upload, nhóm chuẩn bị)

Các điều kiện dưới đây theo hiểu biết tại thời điểm viết; Trí kiểm lại trên Play Console hiện hành trước khi nộp.

| Hạng mục | Task |
| --- | --- |
| AAB, tự tăng versionCode, targetSdk theo yêu cầu hiện hành | GM-54, GM-59 |
| URL chính sách quyền riêng tư, nội dung form Data safety | GM-50, GM-59 |
| Xóa tài khoản trong app và đường dẫn web | GM-49, GM-50, GM-53 |
| Quyền camera và vị trí chỉ khi dùng, không chạy nền | GM-54 |
| Phân loại nội dung, khai báo không quảng cáo, đối tượng người dùng | GM-59 |
| Hướng dẫn truy cập và video cho người review | GM-59 |
| Giới hạn key Places theo gói và SHA-1, quota ngày | GM-59 |
| Backend luôn sẵn sàng khi review | GM-52 |
| Không crash, không ANR; báo lỗi crash | GM-58, GM-62 |
| Thẻ món có ảnh, ghi công ảnh | GM-47, GM-64 |

## Môi trường

| Môi trường | Dùng cho | Ghi chú |
| --- | --- | --- |
| QA local (GM-03) | Test tự động, E2E hai client, AVD | Có worker mô phỏng tick; không dùng cho store |
| Supabase staging | Thử migration, APK `preview`, chạy test case | Nhận mọi thay đổi trước production |
| Supabase production | AAB `production`, người dùng thật | Chỉ nhận bản đã qua staging; không reset hay sửa migration đã áp |

Mỗi profile EAS đặt `EXPO_PUBLIC_APP_ENV`; không dùng `NODE_ENV` để phân biệt môi trường. Quy tắc chung: không đưa `service_role` hay secret vào repo hoặc app; biến `EXPO_PUBLIC_*` bị nhúng vào bundle nên chỉ chứa giá trị công khai; không log phiếu bầu hay token.

## Tương thích ngược sau khi phát hành

Khi đã có bản app trên store, người dùng không cập nhật cùng lúc với backend. Vì vậy:

- Migration mới phải chạy được với app bản cũ, hoặc luật mới chỉ áp cho phiên mới (có version policy riêng) và đi kèm cổng phiên bản tối thiểu của GM-54.
- Không sửa migration đã áp; thêm migration mới. Thứ tự số migration phải tăng theo thứ tự merge để `db push` không chèn bản cũ hơn bản đã áp. Số đã dùng: 0062 (GM-46), 0064 (GM-49), 0065 (GM-48), 0066 (GM-35); GM-54 dùng 0067.
- Bản đầu phải có sẵn cổng phiên bản tối thiểu; nếu không, sau này không buộc được người dùng cập nhật.

## Điều kiện hoàn thành release v1

- Mọi task trong bảng trên ở **Done** trên Project #2, do Trí nghiệm thu.
- Bộ test case ([GM-55](../../tasks/backlog/GM-55.md)) có kết quả thật cho mọi ca P0 trên APK release candidate nối staging ([GM-58](../../tasks/backlog/GM-58.md)); ca iOS ghi Not applicable; không còn Not run ở phạm vi bắt buộc.
- Gói bàn giao đã nộp cho thầy, mã băm trong manifest khớp file thật và [GM-61](../../tasks/backlog/GM-61.md) ghi lại ngày nộp.

## Việc cần Trí cung cấp hoặc quyết

- Email liên hệ và tên pháp nhân hiển thị trên chính sách (GM-50); bật GitHub Pages (Settings → Pages, source GitHub Actions).
- Tài khoản Expo của nhóm cho EAS (mời Trang và người build); quota Places trên Google Cloud; tài khoản Sentry gói miễn phí và DSN cho GM-62.
- Hỏi thầy: chấp nhận gói nộp (AAB, APK, `.pem`, hồ sơ) và tên gói `vn.gicungduoc.mobile`; thầy có dùng Play App Signing hay giữ upload key riêng; hạn nộp.
- Đã chốt 2026-11-23: ảnh món lưu ở Supabase Storage (bucket công khai, GM-52) và ghi công bằng màn "Nguồn ảnh" trong Hồ sơ (GM-64); việc còn lại của Trí là tạo bucket và chia lô tìm hoặc chụp ảnh (mục 9 của `RELEASE_V1_CATALOGUE_SPEC.md`).
- Duyệt ADR-029 (xóa tài khoản) khi GM-49 mở PR, và dependency mới nếu GM-54 cần `expo-build-properties`.
