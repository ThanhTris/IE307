# GM-44 — Kết quả kiểm

Baseline `a7c2201`, migration `0060`, schema `0.31.5`, GM-44.1. QA cô lập `gm44-active-room-v2` với fixture synthetic, Auth/REST local và worker đã xác minh ledger, hash migration và heartbeat.

| Phạm vi | Kết quả |
| --- | --- |
| SQL và HTTP bằng JWT | 246 assertion đạt, gồm 19 ca GM-44. Schema kiểm 1.219 envelope. Xem [assertion GM-44](qa-results.json). |
| Nhiều phòng, phá hòa, leave/kick, expiry, terminal | HTTP xác minh phòng hợp lệ mới nhất và trả `null` khi không còn phòng phù hợp. |
| R1/R2 và quyền đọc | HTTP xác minh cả hai trạng thái waiting, R1 rejoin giữ version, R2 trả ROOM_LOCKED khi thử join, outsider không đọc được phòng và predecessor không cấp EXECUTE cho client. |
| AVD với Auth + REST + worker | Expo Go 58.0.5 trên Android API 37. Một tài khoản guest synthetic chưa từng mở phòng trên AVD được thêm vào phòng bằng RPC từ fixture QA bên ngoài app. Join, Home và Continue tìm đúng phòng. Nút quay lại vào Lobby và Vòng 1. Sau cold start ở R2, Home hiện thẻ khóa và Continue vô hiệu hóa nút quay lại. Xem [ảnh và bước kiểm](FIGMA_PARITY.md). |
| Kiểm độc lập quyền | HTTP dùng ba tài khoản Auth riêng. Mobile test đổi tài khoản khi request cũ còn đang chạy. |
| App và repo | Expo baseline, typecheck, architecture, lint các file thay đổi, 65 mobile test và validator/indexes đều đạt. Gate merge trả `READY_FOR_MERGE_REVIEW` trên `origin/main`. |

Chạy lại theo [HANDOFF](HANDOFF.md). Lần regression Python Windows có một lỗi kỳ vọng danh sách lệnh schema và một lỗi quyền tạo symlink `WinError 1314`. Đã cập nhật test schema và chạy lại nhóm 22 test đạt. Nhóm 15 test manifest, gồm ca symlink, đạt khi chạy trên WSL.
