# GM-34 — Hồ sơ APK nội bộ

## Revision và môi trường

- Source `0b349001291a0152eef71d01ddaae0c8d6b490c8`, app `0.1.0`. Node 24.15.0, Expo SDK 58 theo lockfile, JDK 17, Gradle 9.4.1, AVD Android API 37 x86_64.
- Supabase CLI 2.120.0, migration cuối `0060_gm44_active_room.sql` ghi schema patch `0.31.5`, app dùng wire B-supplement. Manifest QA gắn nhãn baseline GM-07.B / 0.9.2 và có ledger riêng cho các patch nối tiếp.
- Catalogue `dish-catalogue-v1:1.1.0`, 39 món draft/test demo, SHA-256 `776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`. Fixture tổng hợp 20 món riêng, SHA-256 `ecf56b267f0ae25f6480467d184efe4c14ea7bb4a7bb593d97fe5a58957af71b`.
- Generated native checkout có package QA `vn.gicungduoc.mobile.qa`, ngoại lệ HTTP chỉ cho loopback và cấu hình ký debug có sẵn của release variant. Đây là cấu hình APK kiểm nội bộ.
- NDK mặc định `27.1.12297006` lỗi CXX1101 vì thiếu `source.properties`. Lượt thử lại đặt `ext.ndkVersion = "27.2.12479018"` trong Android project sinh riêng cho QA. Override chỉ phục vụ lượt kiểm local.
- Lượt dùng NDK 27.2 trong checkout lồng dưới `.work` qua bước cấu hình NDK nhưng lỗi `ninja: error: mkdir(.../react-native-worklets/Common)`. Lượt tiếp theo đặt checkout ở `C:\gq` và sinh lại cache CMake cho worklets để giảm độ dài đường dẫn.
- Sau khi chuyển checkout cần sinh lại cả thư mục `build/generated/autolinking` của Android và app. Autolinking cũ dùng đường dẫn tuyệt đối và làm Gradle tìm worklets tại thư mục trước khi chuyển.
- Checkout ngắn đã qua bước Ninja của worklets. Target app vẫn báo object file của gesture-handler vượt 260 ký tự. Cờ `-DCMAKE_OBJECT_PATH_MAX=180` chưa rút ngắn được đường dẫn này. Dùng staging `C:\gq\b` và `-DCMAKE_OBJECT_PATH_MAX=245` đã sinh đường dẫn có hash, qua lỗi Ninja ở target app và tạo bundle 3.901 module với 57 assets. Cấu hình này chỉ nằm trong checkout QA.

## Trạng thái

Build release nội bộ x86_64 thành công sau khi sửa thuộc tính `includeSubdomains="false"` của cấu hình loopback và chạy lại release lint. APK export local tại `review-results/gm3334-978613047/gcd-qa-x86_64.apk`, SHA-256 `206475752193ca39214172571c6f23b3eae81418daa14e95bd2211cd302389eb`. Cài ADB báo Success. APK mở splash và màn chào độc lập với Metro.

Chưa có APK GM-34 từ lượt cũ truy vết được. Trí xác nhận đã kiểm và thấy ổn. Hash USB trong [GM-33](../GM-33/ANDROID_PILOT.md) thuộc pilot cũ và chỉ dùng cho các ca trên bản đó. Kết quả smoke và giới hạn xem [CHECKS](CHECKS.md). Cách build lại và hạ bản xem [HANDOFF](HANDOFF.md).
