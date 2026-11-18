# GM-33 — Android pilot

## Kết quả nhận lại

Trí xác nhận đã kiểm GM-33 và GM-34 và thấy ổn. Xác nhận này chưa kèm revision hoặc bản APK của lượt kiểm. Bằng chứng truy vết được là [PR #165](https://github.com/ThanhTris/IE307/pull/165), một lượt USB từng phần: app source `7a13ba3`, APK SHA-256 `6e389d7c136561bfbced1f29e7dea9617bf8e651c3a3624c445961d02bcbf18c`, RMX3710 API 35 và AVD API 37 dùng hai guest độc lập. Metadata ảnh trong PR có assessment `Unreviewed`.

| Thao tác | Kỳ vọng | Kết quả được PR #165 ghi nhận |
| --- | --- | --- |
| Setup với lunch/dinner | Pool đủ 20 món hoặc báo đúng số món sẵn có | 20 món lunch, shortage 7 món dinner |
| Join và lưu khẩu vị | Hai người vào cùng phòng, chỉ đọc lựa chọn riêng | Cold-confirm join, hai lựa chọn category riêng vẫn còn sau refetch |
| R1 và R2 khi chỉ host gửi | Thành viên chưa gửi vẫn theo được chuyển vòng và kết quả server | Hai client thấy Miến / 1 điểm, một canonical result, hai ballot host và không có ballot member |
| Force-stop và Inbox | Khôi phục đúng guest và đọc lại kết quả | Guest/result được giữ, Inbox refetch được |
| FCM, QR camera thật, Places thật, parity và các ca biên còn thiếu | Có kết quả theo đúng capability và build | Không nhận kết quả Pass từ PR #165 |

Xem [kết quả bản main hiện hành](CHECKS.md), [ma trận visual](FIGMA_PARITY.md) và [cách chạy lại](HANDOFF.md).
