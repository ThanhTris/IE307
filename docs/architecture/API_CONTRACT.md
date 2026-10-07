# RPC contract — v0.2

2026-10-07 • draft for independent review. Auth token xác định caller; mọi write có requestId, room mutation có expectedVersion. Các RPC discovery/join/accept_room_invite trước membership và register device không có room version; vẫn idempotency/auth/rate limit. Input schema validate, lỗi không expose SQL/token.

| RPC / mức | Input chính | Gate/output |
| --- | --- | --- |
| create_room P0 | displayName, mealSlot/timeHint, budget?, avoidRecent | auth/rate limit; room/code/version |
| join_room P0 | code, displayName | LOBBY/expiry/capacity; không expectedVersion trước khi biết room; không auto ready |
| get_room_snapshot P0 | roomId | member; context/version/roster/progress/pool/ownSubmission/resultTier; không raw votes người khác |
| update_preferences P0 | roomId/categoryIds/historyConsent | own ready=false, LOBBY |
| update_context P0 | roomId/mealSlot/timeHint/budget/avoidRecent | host LOBBY; reset ready all |
| set_ready/start_round P0 | roomId/ready hoặc start | member/host; đủ người/ready; start snapshot roster/catalogue/context/history consent |
| submit_ballot P0 | roomId/round/poolVersion/intentId/votes[] | đủ pool; unique submission, lock, hash, finalize atomically |
| leave_room/cancel_room P0 | roomId/confirmCancel | đúng caller; active leave hủy với xác nhận; terminal immutable |
| invite_partner/accept_partner/reject_partner/unfriend P0 | friendCode hoặc invitationId/partnerId | auth/pair ACL/expiry, recipient accept; không auto join |
| list_partner_inbox P0 | cursor | own pairs/invites tối thiểu, không list user tùy ý |
| invite_to_room P0 | roomId/partnerId | accepted pair + member inviter, room LOBBY; unique idempotency/event |
| accept_room_invite P0 | invitationId/displayName | recipient/pair/expiry/capacity, lock room/invite; join unique; user confirm; không expectedVersion trước membership |
| register_push_device/unregister_push_device P0 | deviceId/token/permission | own user/device, không client list tokens |
| get_history/update_history_consent/delete_history P0 | scope personal/group, cursor/resultId | self/đúng roster/consent, rút consent xóa group summary, không raw votes |
| account_link/recovery P1 | provider proof/nonce | SDK auth + conflict recovery, không chỉ email nhập |
| search_pilot_venues P1 | dishId/coarse search center/radius | dataset coverage, không log/user-coordinate persist; chỉ reviewed P1 |

Success write {ok:true,requestId,roomId?,version?,state?,data}. Reads không cần requestId. Snapshot result {resultId,winnerId?,reasonCode,matchTier,policyVersion,finalizedAt}; tiedIds/score matrix không public.

Errors: AUTH_REQUIRED, INVALID_INPUT, ROOM_NOT_FOUND/FULL/LOCKED/EXPIRED, NOT_MEMBER/HOST/READY, INCOMPLETE_BALLOT, INVALID_DISH, ALREADY_SUBMITTED, VERSION_CONFLICT, REQUEST_ID_REUSED, RATE_LIMITED, ROOM_TERMINAL, INVITE_EXPIRED/REJECTED, NOT_PARTNER, CONSENT_REQUIRED. Các lỗi dùng messageKey, không tiết lộ room/member khi outsider.

Tra idempotency trước version. Cùng requestId/hash trả ACK cũ; khác body kể cả version phải REQUEST_ID_REUSED. Server lock serialize writes. VERSION_CONFLICT đã từ chối → refetch; nếu cùng vòng/pool/chưa nộp mới attempt requestId mới. Timeout chưa biết commit → giữ nguyên requestId/body hoặc ownSubmission reconcile. Chỉ intent bấm Gửi được queue/replay; terminal/stale/auth đổi không replay. [Outbox](../specs/OFFLINE_SYNC_SPEC.md).

Realtime roomId/version/state/progress tổng được ACL, events chỉ refetch; drop event cũ, polling backoff khi lỗi; terminal ngừng subscription. Inbox notification và push là kênh tiện ích, không chốt winner.

Final submit transaction tạo result/history opt-in/notification event; sender network sau commit. Sender không là public client RPC. Tests auth spoof, host đọc phiếu, race last-seat/start-join/final-submit/cancel-vote, retry ACK, invite/pair/unfriend, history/group consent/token ownership.
