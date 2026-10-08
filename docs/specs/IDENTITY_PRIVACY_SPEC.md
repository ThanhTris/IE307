# Identity, privacy và security — food-v1

2026-10-07 • FR-01/05/11/12/14/16/17. Supabase vẫn đề xuất ở ADR-001; không đã deploy.

## Identity và bạn quen

Guest anonymous auth có auth.uid, session secure storage; không client tự khai userId. Mất session/cài lại có thể mất bạn/server history. Account link/recovery/sync nhiều máy là P1 GM-28, lỗi phải giữ guest session. Không SMS có phí.

Kết bạn/inbox/avatar quick room là P0 GM-15. Canonical pair key unique, pending chỉ accepted bởi recipient. Mời phòng kiểm accepted pair khi tạo và khi accept; không auto join/ready. Unfriend chặn invite mới và accept invite cũ chưa dùng; không sửa result terminal. Khách có quan hệ bạn trong session hiện tại nhưng không hứa recover đổi máy.

## Quyền bảng/RPC

Catalogue published được đọc. Người ngoài không list room/code/results/history/invitations/tokens; mã/link chỉ giúp gửi join request. Member chỉ đọc own votes/submissions; host không có quyền raw votes người khác. Shared snapshot có roster/progress/context/resultTier, không private preferences theo user hoặc vote matrix. ownBallot chỉ chính caller.

Client không trực tiếp ghi state/result/membership/submission. Privileged RPC kiểm current auth, membership, state/version/expiry, lock room, fixed search_path và schema qualified. REVOKE mặc định/GRANT tối thiểu. Service key chỉ trusted sender/server, không app hoặc log.

Realtime báo version/state/progress, không publish bảng phiếu hoặc push tokens. ACL subscription không thay quyền read/RPC. Room invites đọc theo recipient/sender với trường tối thiểu, history đúng user/group có consent.

## Dữ liệu và retention

| Dữ liệu | Giới hạn đề xuất để review |
| --- | --- |
| Votes/submissions/membership chi tiết | dọn sau 24h từ terminal/expiry; expiry chặn ngay dù cleanup trễ |
| Snapshot/draft/outbox local | 24h tối đa; reconcile terminal hoặc logout/auth change xóa private; không gửi queue stale |
| Personal/group history summary | opt-in, 30 ngày; local tối đa 50 mục; group chỉ khi mọi người consent; xóa/rút consent ngừng chống lặp nhóm |
| Pair links | giữ khi đang kết bạn; unfriend xóa link, invalid pending room invites |
| Pending friend/room invitations | friend invite tối đa 7 ngày, room invite không quá expiresAt phòng; terminal/reject/expiry purge trong 24h |
| Push token/event | token inactive 30 ngày/invalid/logout thì vô hiệu; event/ticket 7 ngày |
| GPS cá nhân | foreground tạm trên máy, không gửi server/room/history/log/queue; không background tracking |
| Điểm ăn công cộng | anchorId nhóm xác nhận trong room, TTL cleanup phòng 24h sau terminal/expiry đề xuất; không history mặc định |

Scheduler/quota/TTL phải có evidence trước pilot thật. Xóa summary không chỉ ẩn UI. History không giữ raw votes để suy gu; chỉ sở thích tự khai. Không gửi sang AI mặc định. SQLite không mặc định mã hóa; review backup/file protection và không lưu token trong SQLite. Log/evidence không token, raw vote, tọa độ thật hoặc thông tin nhạy cảm.

## Consent và rò rỉ suy luận

Xin quyền vị trí lần đầu theo chủ dự án, giải thích và deny không chặn chọn món. Notification permission hỏi lúc dùng mời; độc lập. Geocoding ngoài thiết bị cần nêu provider/bên nhận trước sử dụng, chỉ search khu vực tổng quát ra nền tảng. Không chia vị trí host hoặc mọi thành viên mặc định.

matchTier/lý do tiết lộ tổng hợp; ở nhóm nhỏ có thể đoán phiếu người khác. Không nêu count/user matrix, không hứa ẩn danh hay end-to-end encryption. [History/context](CONTEXT_HISTORY_SPEC.md), [outbox](OFFLINE_SYNC_SPEC.md), [push/link](NOTIFICATIONS_LINKS_SPEC.md).

## AC

SEC-01 A/host không đọc ghi vote B. SEC-02 outsider không room/result/history/invites/tokens. SEC-03 terminal/expiry không vote/overcapacity. SEC-04 auth spoof thất bại, service key không bundle/log. SEC-05 TTL/cleanup theo server time có output, guest restore thật. SEC-06 pending invitation không tạo pair, unfriend/accept race đúng; account lỗi giữ guest. SEC-07 history consent/group boundaries/delete; SEC-08 token owner/notification leak/local account isolation.

## Food-v1

[FOOD_DATA_SPEC](FOOD_DATA_SPEC.md) giới hạn server input là anchor công cộng/radius/desiredAt, không GPS user. Shared snapshot chỉ context đã xác nhận; preferences cuisine/temperature/flavor vẫn riêng. Publisher dataset cần quyền server, reviewedBy khác enteredBy trước publish; nguồn/license/freshness có evidence. GM-01 review privacy mới trước code. Weather/mood GM-31 opt-in/mặc định không history/AI; chỉ share lý do tổng hợp không danh tính/mood cá nhân.
