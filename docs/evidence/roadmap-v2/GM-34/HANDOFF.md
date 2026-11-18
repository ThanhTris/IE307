# GM-34 — Bàn giao APK và smoke test

Nhận [pilot GM-33](../GM-33/ANDROID_PILOT.md) và [hồ sơ release](RELEASE.md). Checkout đúng SHA, cài lockfile và chọn JDK 17 cho phiên build. Dùng SDK đã cài và ABI thiết bị. Tạo Android project trong checkout thử nghiệm bằng `npx --no-install expo prebuild --platform android --no-install`. Đặt URL và publishable key của QA trong phiên build. Chạy `gradlew.bat :app:createBundleReleaseJsAndAssets --rerun-tasks -PreactNativeArchitectures=x86_64` rồi `gradlew.bat :app:assembleRelease -PreactNativeArchitectures=x86_64` cho AVD. Nếu cần HTTP nội bộ, cấu hình riêng loopback cho bản test. Không lưu khóa, keystore hoặc config QA có credential lên Git.

Đọc package và signature bằng build-tools, tính `Get-FileHash -Algorithm SHA256` trên APK đã cài. Kiểm mở app khi Metro tắt, launcher icon/splash, guest/Auth và một lượt create/join/đọc kết quả. Chỉ dùng QA đã xác minh trong [GM-03](../GM-03/RUNBOOK_QA.md).

Trên Windows nên dùng checkout thử nghiệm ở đường dẫn ngắn ngay từ bước prebuild. Nếu đổi đường dẫn sau prebuild, tạo lại cache CMake và phần autolinking trong checkout đó. Ghi riêng NDK thực tế của bản QA và các thay đổi có mặt trong generated project.

Quay về bản trước bằng artifact cùng package/signing đã được duyệt. Giữ nguyên dữ liệu của DB ứng dụng và migration đã áp dụng. Nếu cần sửa nghiệp vụ, mở thay đổi riêng theo task sở hữu. Đọc [CHECKS](CHECKS.md) và [FIGMA_PARITY](FIGMA_PARITY.md) trước khi nhận làm căn cứ cho GM-38.

Kiểm 18/11/2026: checker đọc đủ bộ hồ sơ local, GM-38 trả `READY_TO_CLAIM` khi không yêu cầu nhánh đích. Đối chiếu với `origin/main` tại `0b34900` vẫn `BLOCKED_ON_BASE` vì hồ sơ chưa có trên GitHub. Kết quả checker xác minh file và dependency, còn kiểm release thực tế theo CHECKS.
