# GM-45 — Kiểm Realtime phiên bản phòng

Baseline `0b349001291a0152eef71d01ddaae0c8d6b490c8`, schema `0.31.6`, migration `0061`, contract `GM-45.1`. Ngày kiểm 18/11/2026. Node 24.15.0, Supabase CLI 2.120.0. QA `gm45-room-realtime` cô lập có Auth, REST, Realtime và worker, dữ liệu synthetic.

| Kiểm | Kết quả thực tế |
| --- | --- |
| Auth/REST/SQL/Realtime | 17 assertion đạt trong `scripts/gm45_realtime_check.mjs`. Hai JWT member nhận cùng version, refetch được snapshot, outsider không nhận event. |
| Worker và transaction | R1 timeout chuyển R2 do worker phát đúng version đã commit. Rollback không ghi/phát version mới. ACK replay không tăng version. |
| Quyền | RLS ẩn SELECT của outsider/kicked, subscription bị kick không nhận sự kiện removal cuối. Client không ghi bảng, anon và sender không có SELECT. Chỉ bảng hai trường được publish. |
| AVD mặc định | Android API 37, Expo Go 58.0.5 nối QA 54375. Lobby tự nhận ready của thành viên và tự mở Vòng 1 khi host start bên ngoài app. Worker đưa app qua R2 và kết quả dù AVD chưa gửi phiếu. |
| Mất Realtime và reconnect | Dừng riêng container Realtime QA, host sửa giờ. AVD cập nhật giờ qua snapshot fallback. Khởi động lại Realtime, host start được AVD nhận tự động. Background/foreground ở R2 vẫn theo đúng kết quả worker. |
| Không polling snapshot khi khỏe | Trong 12 giây app nằm yên ở lobby, `pg_stat_statements` ghi số lượt HTTP RPC dish_session giữ nguyên 91 → 91. Xem [idle measurement](avd-idle.json). |
| Cleanup | Sau khi app chuyển đến kết quả, số dòng đăng ký bảng tín hiệu trong `realtime.subscription` bằng 0. |
| Mobile đầy đủ | `npm run check` đạt typecheck, lint, architecture và 1.493 test Jest, một test skip. Nhóm 7 test Realtime đã chạy lại sau chỉnh gộp event và dọn retry timer. |
| Gate merge | Sau fetch main, checker trả `READY_FOR_MERGE_REVIEW` với `--verify-outputs`. QA owned đã cleanup worker, stack và network. |

Mobile unit/component kiểm raw signal, duplicate/version cũ, burst/single flight, bounded retry, late token, missing capability, lease sau kick và regression snapshot/submit. Kết quả cuối và lệnh chạy xem [HANDOFF](HANDOFF.md). [Ảnh AVD](FIGMA_PARITY.md) và [assertions QA](qa-results.json).

Regression Python chạy 691 test trên Windows, có 2 skip và một lỗi quyền symlink `WinError 1314` ở test GM-40. Nhóm 15 test manifest, bao gồm symlink, chạy đạt trên WSL. Validator repository, indexes và test source worker đã đạt.
