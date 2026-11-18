# GM-34 — Kết quả build và smoke

Source `0b34900`, QA riêng và provenance trong [RELEASE](RELEASE.md).

| Ca | Actual và assertion | Kết quả |
| --- | --- | --- |
| Chuẩn bị build | `npm ci` hoàn thành, Expo prebuild tạo project Android, package.json không đổi | Pass |
| Runtime QA | Auth + REST kiểm danh tính guest, worker có heartbeat, ledger đúng revision | Pass |
| Kiểm APK | Gradle assembleRelease đạt. AAPT xác nhận package QA, version 0.1.0, ABI x86_64. apksigner xác minh chữ ký APK v2 bằng Android Debug. ADB install trả Success. Hash ghi trong RELEASE | Pass cho APK nội bộ |
| Khởi động và splash | APK mở độc lập, hiện splash logo rồi trang chào và nhập tên guest | Pass trên AVD |
| Smoke API từ APK | Sau khi khôi phục AVD/ADB reverse và worker, signup HTTP 200, vào Home, tạo phòng 10 món, peer độc lập join qua REST, host mở được vòng 1 | Pass cho phạm vi này trên AVD |
| Force-stop và mở lại | Home giữ phiên guest và tìm lại đúng phòng đang chơi. Ảnh `avd-force-stop-home.png` | Pass cho khôi phục phiên và tìm phòng. Gửi phiếu và kết quả cuối trận qua app chưa chạy xong |
| Cài APK và smoke trên USB | Lượt hiện tại dùng AVD. Chưa đối chiếu được APK/hash và log của lượt Trí đã kiểm | Not run trong lượt này |

Log local: `review-results/gm3334-978613047/`. Xem [FIGMA_PARITY](FIGMA_PARITY.md) cho các ca so hình.
