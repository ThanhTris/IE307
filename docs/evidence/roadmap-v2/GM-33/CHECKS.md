# GM-33 — Kết quả kiểm Android và backend

Lượt ngày 18/11/2026, source `0b349001291a0152eef71d01ddaae0c8d6b490c8`, Android Emulator API 37 (`Medium_Phone_API_37.0`, x86_64), 1080 × 2400, 420 dpi và font 1,0 ở cấu hình gốc. Lượt USB trước được ghi riêng trong [ANDROID_PILOT](ANDROID_PILOT.md).

| Tầng | Thao tác và assertion | Kết quả |
| --- | --- | --- |
| QA | Dựng và kiểm manifest, ledger đến `0060`, API loopback, worker có heartbeat | Pass |
| API-only | Tạo/refresh guest và đọc identity bằng Auth/REST thật; kiểm hai ca từ chối request thiếu/sai JWT theo runner hiện có | 7/7 |
| API-only | Runner canonical với Auth/REST/SQL, kiểm pool, R1/R2, winner/điểm/Top 3, no-consensus, history/inbox và tìm phòng | Pass, 246 assertion và 1.221 envelope |
| API-only | Suite GM-07.B kiểm lifecycle, ballot, consent và giới hạn người | Lượt song song ban đầu trả 409 `INSUFFICIENT_DISHES` khi hai runner thay catalogue active. Chạy lại GM-07.B sau khi canonical kết thúc đạt **172 assertion, 755 envelope**. |
| AVD | Android boot và ADB đọc được API, kích thước, mật độ và font | Pass ở tầng thiết bị |
| AVD / APK | Mở splash, màn chào, điều hướng đến form tên khách | Pass trên APK nội bộ được ghi hash ở [RELEASE](../GM-34/RELEASE.md) |
| AVD / UI–API | Tạo guest tổng hợp, bỏ qua quyền tùy chọn và vào Home | Pass sau khởi động lại AVD và gắn lại ADB reverse. Supabase ghi nhận signup HTTP 200 và có đúng một danh tính guest của lượt retry. Ảnh `avd-home.png` |
| AVD / UI–API | Host đặt bữa trưa, 10 món, lưu khẩu vị; guest độc lập qua REST join và lưu khẩu vị | Pass. App và snapshot của guest thứ hai đều có hai thành viên và pool 10. Ảnh `avd-lobby-two.png` |
| AVD / UI–API | Host bấm bắt đầu và thấy bộ 10 món. Đối chiếu trạng thái server | Pass chuyển vào R1. SQL thấy `ROUND_1`, version 4, trong hạn. Ảnh `avd-r1.png` |
| AVD / khôi phục phiên | Force-stop đúng package QA, mở lại app và kiểm danh tính cùng phòng đang chơi | Pass giữ guest và hiển thị đúng phòng với nút Quay lại. Ảnh `avd-force-stop-home.png` |
| AVD / UI–API | Gửi phiếu qua app, chờ ACK, đi tiếp tới R2 hoặc kết quả và đọc history | Not run phần còn lại. Cửa sổ AVD thu nhỏ sau lượt khôi phục và công cụ thao tác không đọc được cửa sổ |
| Visual | Reference Figma Home, Kết quả, logo và ảnh AVD Home, Lobby, R1 | Có ảnh để đối chiếu từng phần; parity đa viewport, chữ 200% và TalkBack chưa chạy |
| USB/Native | FCM, camera QR vật lý, Places với cấu hình thật | Not run trong lượt AVD. Xác nhận đã kiểm của Trí chưa kèm log và hash build để truy vết các ca này. |

Log local: `review-results/gm3334-978613047/`. Không dùng HTTP hoặc trạng thái Project Done làm bằng chứng một ca Android đã chạy.

Lượt đầu tạo guest bị chặn trước signup; retry sau reboot và khôi phục reverse đạt. Sau reboot, thao tác tạo phòng ban đầu trả 503 khi worker mất heartbeat. Sealed manifest phát hiện catalogue drift do fixture shortage của lượt canonical. Đã xác minh ownership, dọn đúng fixture test không active và khởi động lại worker; tạo phòng retry đạt. DB ứng dụng và QA phiên khác giữ nguyên.
