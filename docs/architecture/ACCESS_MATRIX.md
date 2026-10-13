# GM-17 — Access matrix / contract GM-17.1 / schema0.2.0

Owner/reviewer Trí. RLS lọc hàng; column grants chặn trường private. Không grant
table-wide SELECT cho app tables. Column allowlists chính xác nằm trong0004;
thêm cột mới không tự cấp quyền. Không SELECT * hoặc serialize toàn row vào DTO.

| Surface | anon | authenticated guest/member/host | trusted |
| --- | --- | --- | --- |
| Food tables + schedule_groups | Published, non-fixture fields | Như anon | gm06_publisher giữ food CRUD, không app/private CRUD |
| profiles | Deny | Own displayName/id/version/timestamps | Server |
| rooms/members/round_dishes/results | Deny | Active member, room chưa expiry; shared columns | Endpoint owner |
| preferences | Deny | Own user + membership | Endpoint owner |
| submissions/votes | Deny | Own member + membership; host chỉ own | Endpoint owner |
| consents | Deny | Own safe metadata | Endpoint owner |
| histories | Deny | Personal owner hoặc đúng group roster, valid scoped consents, <30days | Endpoint owner |
| friends/friend_invitations | Deny | Pair/sender/recipient, invitation TTL | Endpoint owner |
| room_invitations | Deny | Sender/recipient của accepted pair, LOBBY/expiry; không cần đã join | Endpoint owner |
| inbox | Deny | Own, còn expiry/<7days | Endpoint owner/sender |
| devices | Deny | Own safe id/platform/permission/active/time/version | Sender quản token |
| events/deliveries/idempotency | Deny | Deny direct | Trusted only |
| gm06_private/gm08_private/ref tables | Deny | Deny direct | Trusted only |

Không grant client INSERT/UPDATE/DELETE. Không public consent_snapshot,
history_consent của member khác, roster_user_ids/seed internal, tied_choice_ids,
payload_hash/intent_id, push_token/device_key, history consent/group bookkeeping
hoặc importer review/artifact locations. Private projections phải explicit columns;
HTTP403/42501 cho explicit forbidden columns. Authorized list có thể200/[] do RLS.
Anon private read thường401/42501; forged/expired JWT401 trước RLS.

Published predicates không promote draft/fixture. Freshness/coverage/eligibility
và published dataset consistency tiếp tục theo GM-08/18/19. Catalogue positive
test trong disposable SQL là mô phỏng, không verified publication. ADR-014 test
dataset exception không mở quyền draft cho public client.

## Privileged RPC checklist — GM-18..23

1. Auth từ verified JWT/auth.uid, không user metadata/body.userId.
2. Explicit request validation, own/pair/member/host và projection allowlist.
3. ACK lookup đúng user/operation/requestId/hash trước version; không sửa live ACK.
4. Dùng gm17_private.require_room(room,expectedVersion,hostOnly) trong transaction
   cho existing-member mutations. Guard lock reference_epoch rồi room; pre-membership
   join/discovery/invite acceptance cần gate riêng, không bỏ guard hoặc cấp helper
   cho client. Theo PostgreSQL17, host-only không được quyền vote người khác.
5. Guard trả AUTH_REQUIRED/PT401, NOT_MEMBER/PT403 (cả missing/outsider), NOT_HOST/
   PT403, ROOM_EXPIRED/PT410, VERSION_CONFLICT/PT409, ROOM_TERMINAL/PT409.
   Endpoint ánh xạ vào ApiError envelope GM-07; direct REST error không phải DTO đó.
6. Endpoint bổ sung valid state/pool/round, capacity, membership concurrency và
   idempotency riêng. SECURITY DEFINER fixed pg_catalog + schema-qualified SQL,
   owner trusted, revoke PUBLIC và grant từng endpoint cần thiết.
7. Business wrapper owner lấy reference lock trước room locks; retry whole TX
   khi40001/40P01. Client không được gọi require_room/cleanup trực tiếp.
8. Realtime chỉ allowlisted refetch hints; không publish app base tables. Local
   config vẫn disabled, không tuyên bố đã kiểm live subscription.
9. No secret/service_role, ballot hoặc token trong client/log/evidence.

## Retention/storage supplement

0004 thêm rooms.terminal_at (first terminal stable), consents.retention_detached,
idempotency.room_ref_id/result_ref_id generated và private *_refs(UUID only).
History và event reference không còn là FK tới operational result/room. Existing
FK/nested reference guards còn lại giữ nguyên. Parent INSERT đăng ký reference
cùng TX, FK deferred kiểm tại commit; ACK JSON/wire shape không đổi.

Cleanup dọn room graph24h kể từ earliest terminal/expiry; own read bị chặn ngay
ở expiry dù cleanup chưa chạy. History=min(expires_at,finalized+30days) và consent;
friend invite <=7days usable, terminal/expiry purge24h; room invite không được
usable ngoài LOBBY/room expiry. Events/inbox/deliveries <=7days/expiry, stale devices
30days; live ACK theo expires_at. Detached consent/ref IDs chỉ giữ khi còn cần.
GoTrue auth sessions không nằm trong cleanup. Client logout/server token invalidation
và producer-specific transitions vẫn là GM-16/23 và consumer task.
