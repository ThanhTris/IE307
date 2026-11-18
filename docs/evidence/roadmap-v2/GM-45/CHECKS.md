# GM-45 — Kiểm Realtime phiên bản phòng

Baseline `0b349001291a0152eef71d01ddaae0c8d6b490c8`, schema `0.31.6`, migration `0061`, contract `GM-45.1`. Ngày kiểm 18/11/2026. Node 24.15.0, Supabase CLI 2.120.0. QA `gm45-room-realtime` kiểm luồng gốc. QA `gm45-review-fixes` kiểm bản cập nhật sau review `2647b8c`. Cả hai có Auth, REST, Realtime và worker, dữ liệu synthetic.

| Kiểm | Kết quả thực tế |
| --- | --- |
| Auth/REST/SQL/Realtime | 22 assertion đạt trên bản cập nhật. Hai JWT member nhận cùng version, refetch được snapshot, outsider không nhận event. |
| Worker và transaction | R1 timeout chuyển R2 do worker phát đúng version đã commit. Rollback không ghi/phát version mới. ACK replay không tăng version. |
| Quyền | RLS ẩn SELECT của outsider/kicked, subscription bị kick không nhận sự kiện removal cuối. Client không ghi bảng, anon và sender không có SELECT. Chỉ bảng hai trường được publish. |
| Retention sau review | Gọi cleanup thật trên phòng quá hạn. Phòng và dòng tín hiệu bị xóa. Hai kênh wildcard của outsider và người bị kick nhận được cập nhật hợp lệ sau đó và ghi nhận 0 DELETE. Publication bật INSERT/UPDATE. Sáu assertion inbox ADR-026 đạt. |
| AVD mặc định | Android API 37, Expo Go 58.0.5 nối QA 54375. Lobby tự nhận ready của thành viên và tự mở Vòng 1 khi host start bên ngoài app. Worker đưa app qua R2 và kết quả dù AVD chưa gửi phiếu. |
| Mất Realtime và reconnect | Dừng riêng container Realtime QA, host sửa giờ. AVD cập nhật giờ qua snapshot fallback. Khởi động lại Realtime, host start được AVD nhận tự động. Background/foreground ở R2 vẫn theo đúng kết quả worker. |
| Fallback sau review | Trên AVD bản sửa, đo 4 lần đọc snapshot trong 52,8 giây khi Realtime tắt và REST còn chạy. Lobby hiện giờ mới. Sau khi bật Realtime, hai đăng ký INSERT/UPDATE được tạo lại và app tự vào R1 khi host start. [Số lượt đọc](review-avd-polling.json) · [Ảnh fallback](artifacts/review-fallback.png) · [Ảnh reconnect](artifacts/review-reconnected-round-one.png) |
| Không polling snapshot khi khỏe | Trong 12 giây app nằm yên ở lobby, `pg_stat_statements` ghi số lượt HTTP RPC dish_session giữ nguyên 91 → 91. Xem [idle measurement](avd-idle.json). |
| Cleanup | Sau khi app chuyển đến kết quả, số dòng đăng ký bảng tín hiệu trong `realtime.subscription` bằng 0. |
| Mobile đầy đủ | Bản sửa chạy `npm run check` đạt typecheck, lint, architecture và 1.496 test Jest, một test skip. |
| Gate merge | Sau fetch main, checker trả `READY_FOR_MERGE_REVIEW` với `--verify-outputs`. QA owned đã cleanup worker, stack và network. |

Mobile unit/component kiểm raw signal, duplicate/version cũ, burst/single flight, late token, missing capability, lease sau kick và regression snapshot/submit. Các test review mô phỏng mất mạng khi làm mới token trong 60 giây, xác nhận cả hai retry tiếp tục và socket khôi phục. Test riêng kiểm dừng khi Auth trả AUTH_REQUIRED và nhịp 2,5/5/10/30 giây khi REST vẫn thành công qua nhiều lần reconnect. [Lệnh chạy](HANDOFF.md) · [Ảnh AVD](FIGMA_PARITY.md) · [Assertions QA](qa-results.json)

Regression Python ban đầu chạy 691 test trên Windows, có 2 skip và một lỗi quyền symlink `WinError 1314` ở test GM-40. Nhóm 15 test manifest, bao gồm symlink, chạy đạt trên WSL. Bản sửa chạy lại 25 test contract/worker, validator repository và indexes.

Review lobby sau `e234605`, cập nhật từ main `5a69b56`. Hai test tái hiện trạng thái `ready` bị ghi đè khi request tải ban đầu trả `TIMEOUT` hoặc bị transport reject sau snapshot Realtime. Sau sửa, cả hai giữ nguyên `ready` và snapshot đã nhận, kể cả khi không có sự kiện tiếp theo. Hai ca kiểm khác xác nhận lỗi tải hiện hành vẫn hiển thị và snapshot cũ không mở lại lobby sau `NOT_MEMBER`. Cả 72 test liên quan đạt. [Test hồi quy](../../../../mobile/tests/component/lobbySnapshotLifecycle.test.tsx)
