# RPC contract — food-v1

> Cập nhật hướng đích 2026-10-25: [ADR-019](decisions/ADR-019-dish-first-room-policy.md) và [GM-07.B](DISH_SESSION_API_CONTRACT_B.md) là hướng contract mới: pool đầu đúng 10–20 món, host start, tối đa20 người, không ready, timer 60 giây theo transition vào chờ; chọn món độc lập quán/GPS. Ưu tiên winner vòng1; nếu chưa có thì survivors = pool ban đầu trừ hợp NO từ ballot vòng1 hoàn chỉnh đã ACK. N=0 kết thúc `EMPTY_INTERSECTION` ở R1; N>=1 luôn mở R2 thật. Cap REMOVE là max(1,floor(0.30*N)) với N=1..20; N=1 vẫn là lượt quyết định thật, không auto-finalize. Không bù món; loại hết chốt `NO_CONSENSUS/ALL_REMOVED`. Nội dung legacy bên dưới tiếp tục mô tả contract/mock cũ, không đổi nghĩa phiên cũ hoặc tự ghi test Pass.

> **GM-07.A historical / GM-07.B current proposal:** A remains at [DISH_SESSION_API_CONTRACT.md](DISH_SESSION_API_CONTRACT.md) and [dish-session-v4.schema.json](schemas/dish-session-v4.schema.json). New sessions target the forward-only [GM-07.B contract](DISH_SESSION_API_CONTRACT_B.md) and [schema](schemas/dish-session-v4b.schema.json), including the owner-approved Top 3 aggregate projection in [ADR-020](decisions/ADR-020-public-top-three-result.md). Neither A nor B is deployed; runtime v3 and legacy behavior remain unchanged until a reviewed forward migration and consumer land.

2026-10-07 • draft for independent review GM-01. Auth token xác định caller; mọi write có requestId, room mutation có expectedVersion. Các RPC discovery/join/accept_room_invite trước membership và register device không có room version; vẫn idempotency/auth/rate limit. Input schema validate, lỗi không expose SQL/token.

| RPC / mức | Input chính | Gate/output |
| --- | --- | --- |
| create_room P0 | displayName, anchorId/radiusM/desiredAt/serviceMode, mealSlot/timeHint, budget?, avoidRecent | auth/rate limit; room/code/version |
| join_room P0 | code, displayName | LOBBY/expiry/capacity; không expectedVersion trước khi biết room; không auto ready |
| get_room_snapshot P0 | roomId | member; context/version/roster/progress/pool/ownSubmission/resultTier; không raw votes người khác |
| update_preferences P0 | roomId/cuisineIds/categoryIds/temperature/flavor/historyConsent | own ready=false, LOBBY |
| update_context P0 | roomId/anchorId/radiusM/desiredAt/serviceMode/mealSlot/timeHint/budget/avoidRecent | host LOBBY; reset ready all |
| set_ready/start_round P0 | roomId/ready hoặc start | member/host; đủ người/ready; revalidate eligibility/dataset/desiredAt, reset ready nếu pool đổi; start snapshot roster/offerings/schedules/context/consent |
| submit_ballot P0 | roomId/round/poolVersion/intentId/votes[] | đủ pool; unique submission, lock, hash, finalize atomically |
| leave_room/cancel_room P0 | roomId/confirmCancel | đúng caller; active leave hủy với xác nhận; terminal immutable |
| get_my_social_identity/list_friends/invite_partner/accept_partner/reject_partner/unfriend P0 | caller hoặc friendCode/invitationId/partnerId | auth/pair ACL/expiry, recipient accept; không auto join; self projection chỉ displayName/friendCode/avatarSeed |
| list_partner_inbox P0 | cursor | own pairs/invites tối thiểu, không list user tùy ý |
| invite_to_room P0 | roomId/partnerId | accepted pair + member inviter, room LOBBY; unique idempotency/event |
| accept_room_invite P0 | invitationId/displayName | recipient/pair/expiry/capacity, lock room/invite; join unique; user confirm; không expectedVersion trước membership |
| register_push_device/unregister_push_device P0 | deviceId/token/permission | own user/device, không client list tokens |
| get_history/update_history_consent/delete_history P0 | scope personal/group, cursor/resultId | self/đúng roster/consent, rút consent xóa group summary, không raw votes |
| account_link/recovery P1 | provider proof/nonce | SDK auth + conflict recovery, không chỉ email nhập |
| get_discovery_context P0 | areaId?/anchorId?; cursor bounded | GM-06, GM-17 cung cấp published coverage/anchor lookup + serverTime; GM-08 data; auth/read/rate limit, không GPS input; GM-24 dùng trước room |
| preview_food_pool P0 | anchorId/radiusM/desiredAt/mealSlot/serviceMode, preference inputs hợp lệ | GM-18 read eligibility; dataset/evaluatedAt/reasonCodes; room integration GM-19 không tin pool client |
| get_result_offerings P0 | roomId/resultId | GM-19 member only, query GM-18 cho đúng winner/context; lịch mới không đổi result |

Success write {ok:true,requestId,roomId?,version?,state?,data}. Reads không cần requestId. Snapshot result {resultId,winnerId?,reasonCode,matchTier,policyVersion,finalizedAt}; tiedIds/score matrix không public.

Errors: AUTH_REQUIRED, INVALID_INPUT, ROOM_NOT_FOUND/FULL/LOCKED/EXPIRED, NOT_MEMBER/HOST/READY, INCOMPLETE_BALLOT, INVALID_DISH, ALREADY_SUBMITTED, VERSION_CONFLICT, REQUEST_ID_REUSED, RATE_LIMITED, ROOM_TERMINAL, INVITE_EXPIRED/REJECTED/CANCELLED, NOT_PARTNER/NOT_RECIPIENT, CONSENT_REQUIRED, OUT_OF_COVERAGE, NO_ELIGIBLE_FOOD, AVAILABILITY_UNKNOWN, CONTEXT_CHANGED, DESIRED_TIME_PASSED. Các lỗi dùng messageKey, không tiết lộ room/member khi outsider.

Tra idempotency trước version. Cùng requestId/hash trả ACK cũ; khác body kể cả version phải REQUEST_ID_REUSED. Server lock serialize writes. VERSION_CONFLICT đã từ chối → refetch; nếu cùng vòng/pool/chưa nộp mới attempt requestId mới. Timeout chưa biết commit → giữ nguyên requestId/body hoặc ownSubmission reconcile. Chỉ intent bấm Gửi được queue/replay; terminal/stale/auth đổi không replay. [Outbox](../specs/OFFLINE_SYNC_SPEC.md).

Realtime roomId/version/state/progress tổng được ACL, events chỉ refetch; drop event cũ, polling backoff khi lỗi; terminal ngừng subscription. Inbox notification và push là kênh tiện ích, không chốt winner.

Final submit transaction tạo result/history opt-in/notification event; sender network sau commit. Sender không là public client RPC. Tests auth spoof, host đọc phiếu, race last-seat/start-join/final-submit/cancel-vote, retry ACK, invite/pair/unfriend, history/group consent/token ownership.

Food-v1: request context chỉ nhận public anchorId đã xác nhận, không raw GPS; radius/desiredAt có giới hạn cấu hình review ở GM-01, GM-18. Thiếu context chặn tạo pool thực tế; phòng lobby cho sửa trước start. Snapshot bổ sung datasetVersion/eligibilityVersion/evaluatedAt/offerings/lịch/ngày nguồn và khoảng cách tới anchor. Revalidation đổi pool thì CONTEXT_CHANGED/reset ready; không start trên ready cũ. Weather/mood RPC chỉ GM-38 P2 sau core. [Food spec](../specs/FOOD_DATA_SPEC.md).

## Chủ sở hữu endpoint theo roadmap-v2

GM-07 chốt request/response/error/version từ dictionary GM-04, đối chiếu schema GM-06 và xuất client/transport/mock interface. Đây là API scaffold để UI dùng; các task dưới hoàn thiện xử lý trên database và data đã nạp.

| Endpoint / module | Task BE | UI dùng mock trước | Task nối API thật |
| --- | --- | --- | --- |
| guest session/restore/refresh/logout | GM-16 | GM-09 | GM-25 |
| get_discovery_context / preview_food_pool / get_result_offerings | GM-18 | GM-10/13 | GM-24/25/27 |
| create/join/snapshot/preferences/context/ready/start/leave/cancel | GM-19 | GM-09/10/11 | GM-25 |
| submit_ballot / round transition / finalize | GM-20 | GM-12/13 | GM-26/27 |
| get_history / consent / delete / recent input | GM-21 | GM-10/14 | GM-25/28 |
| partner / invite / accept_room_invite | GM-22 | GM-09/11/14 | GM-28/30 |
| inbox / register/unregister push device / sender | GM-23 | GM-14 | GM-28/29 |

GM-17 bảo vệ tables/RPC/retention, từng task API thêm auth/membership/version/expiry/lock/idempotency đúng endpoint. Client không import SQL/SDK vào UI; production không fallback sang mock khi API lỗi. Lệnh smoke/API example và response mẫu là bắt buộc trong HANDOFF.

GM-17.1 implementation supplement (schema0.2.0): [ACCESS_MATRIX](ACCESS_MATRIX.md)
và [ADR-015](decisions/ADR-015-retention-reference-identities.md) chốt column grants,
RLS, private transaction guard và retention references. Client không SELECT *
hoặc serialize base rows; direct REST errors42501/HTTP401/403 không tự là ApiError
envelope. Endpoint owner ánh xạ lỗi, tra ACK trước version, giữ lock order đã bàn
giao. History summary và ACK giữ stable IDs sau khi live room/result bị dọn;
không join tới live parents để dựng history. DTO GM-07 không đổi, producer-specific
business RPC và Android wiring vẫn thuộc các task phía dưới.

## Chi tiết Contract Projection & Parity GM-04 / GM-06 (GM-07)

### Bổ sung auth/session GM-16.1

`createAuthenticatedApiClient` inject `SessionManager` vào `ApiClientImpl`.
createGuestSession/restoreSession/logout dùng GoTrue `/auth/v1/signup`, `/user`,
`/token?grant_type=refresh_token`, `/logout?scope=local`; không là SQL RPC phát JWT.
Scaffold/mock GM-07 giữ interface cho consumers chưa tích hợp. Real client auth
phải dùng composition này, public publishable/anon key và private cleanup callback.

SessionResponse/error envelope GM-07 không đổi. Refresh token chỉ lưu nội bộ
StoredSession/secure storage; không xuất vào UI, room DTO, SQLite, outbox hoặc log.
SessionUser.id/isGuest từ response xác minh GoTrue; metadata userId/client userId
không làm quyền. Display name tối đa24 ký tự, không rỗng/control chars.

Restore xác minh server user trước expose identity; gần expiry refresh serialized,
persist rotation trước publish. Logout/auth loss vô hiệu response đang chạy và
clear memory/secure store/private-cache port. Cleanup lỗi chặn đổi identity;
network restore/refresh lỗi giữ credential cho thử lại chủ động. Verify retry tối
đa2 lần, respect Retry-After, không giảm thời gian server yêu cầu. Signup/refresh
không blind retry vì GoTrue không dùng requestId idempotency của business RPC;
unknown signup outcome chặn signup tiếp đến khi logout/reset local rõ ràng.

Logout clear local cả khi revoke network fail và trả lỗi để UI biết revoke chưa
xác nhận. Revoke refresh không bảo đảm access JWT hết hiệu lực ngay; quyền server/
expiry vẫn là căn cứ. Account linking/recovery, room/profile RPC, push-device
cleanup server và SQLite outbox thuộc task sau. HTTP auth tests và native secure
persistence phải có evidence riêng. HTTP chỉ loopback; LAN dev cần HTTPS setup
được review, không tự gửi token qua mạng HTTP không bảo vệ.

### 1. Chuẩn hóa phong bì lỗi (Error Normalization)
- RPC Supabase có thể trả HTTP 200 kèm business envelope `{ ok: false, error: { messageKey: '...' } }`.
- Client normalizer (`normalizeRpcResponse<T>()` trong `mobile/src/data/api/client.ts`) bảo toàn tuyệt đối cờ `ok`, `error.messageKey`, `requestId`, `version`, `state` và chỉ unwrap `data` khi `ok === true`.
- Nếu response thiếu cờ `ok` hoặc không đúng cấu trúc envelope: bắt buộc chuẩn hóa thành lỗi `{ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } }`, tuyệt đối không chuyển thành thành công.

#### Runtime validation của write payload (PR #104)

`normalizeWriteResponse` / alias `normalizeRpcResponse` nhận guard của endpoint; không cast JSON chưa kiểm thành DTO. Success typed write hỗ trợ `{ok:true,data:DTO}` và dạng flat `{ok:true,...DTO}`. Nếu key `data` có mặt, chỉ kiểm giá trị đó; `data:null`/sai kiểu không được fallback sang field flat. Field required thiếu/sai trả `MALFORMED_RESPONSE`.

| Endpoint | Payload thành công bắt buộc |
| --- | --- |
| create_guest_session | token, user.id/displayName/isGuest/createdAt, expiresAt; token chỉ lưu sau validation |
| create_room | roomId, code, version, expiresAt |
| join_room / accept_room_invite | roomId, code, version, memberId |
| submit_ballot | accepted, round (1/2), allMembersSubmitted, roomVersion; receipt/requestId optional nhưng phải đúng shape khi có |
| invite_partner | id, inviterUserId, inviterName, inviteeUserId, status, createdAt, expiresAt |
| invite_to_room | các field invite_partner cộng roomId và roomCode |
| write trả void | `data` vắng, undefined hoặc JSON null → client `data:undefined`; không yêu cầu object DTO; data object/primitive ngoài contract bị từ chối |

ID/token là string không rỗng; mã phòng (`code`/`roomCode`) là đúng 6 ký tự theo ROOM_SPEC, dùng charset không gây nhầm (`A-H`, `J-N`, `P-Z`, `2-9`), và server chịu trách nhiệm uniqueness. Version là số nguyên hữu hạn an toàn trong JavaScript, >=1 theo dictionary GM-04. Timestamp là ISO8601 có timezone và ngày/giờ hợp lệ. Invitation status dùng enum của DTO. Optional không tự tương đương nullable: receipt null là malformed vì DTO chỉ cho vắng, còn void data cho JSON null rõ ràng.

Metadata requestId/roomId/version/state được kiểm kiểu và enum khi có, giữ optional khi vắng. roomId/version ở envelope phải khớp payload và roomId của request khi có; không fabricate version/state. Ballot payload requestId phải khớp ACK requestId; receipt khi có phải khớp round của payload và requestId của ACK. Các guard chỉ kiểm contract GM-07, không chứng minh auth/membership, transaction hay RPC nghiệp vụ các task sau.

Read RPC hỗ trợ DTO/array trực tiếp hoặc `{ok:true,data:DTO}`. Cả 8 endpoint đọc phải kiểm required field, nested DTO, enum, timestamp, nullable/optional field và từng phần tử array trước success; payload thiếu/sai cấu trúc trả `MALFORMED_RESPONSE`. Danh sách rỗng `[]` hợp lệ; object `{}` không thay array. Business error hợp lệ được giữ, mã lỗi lạ thành `UNKNOWN_ERROR`. `restoreSession` chỉ lưu token sau khi `SessionUser` hợp lệ; dữ liệu lỗi giữ nguyên token đang có.

Mock lưu `ownPreferences`, `ownVotes`, `ownSubmission` theo roomId chuẩn + caller userId và chỉ chiếu dữ liệu caller hiện tại vào snapshot. Caller chưa có phiếu/receipt nhận ownVotes vắng và ownSubmission null; đổi về caller cũ khôi phục dữ liệu của người đó. Request và snapshot/receipt không dùng chung object private có thể bị UI sửa. Consensus scenarios vẫn mô phỏng peer submission để chạy UI; isolation mock không là nghiệm thu RLS/RPC production.

### 2. Idempotency & Bảo toàn RequestId khi Retry
- Mọi RPC ghi (`createRoom`, `setReady`, `startRound`, `submitBallot`, `registerPushDevice`) đều hỗ trợ `requestId?: string` do caller hoặc outbox truyền vào.
- Khi timeout mà chưa rõ server đã commit hay chưa, caller retry với **cùng requestId + cùng body**. Client không tự ý sinh lại ID mới cho cùng một attempt.
- Server và Mock tra cứu `requestId` **trước** khi kiểm tra trạng thái phòng (`room.state`) và phiên bản (`room.version`):
  - Cùng `requestId` + cùng payload signature: trả lại ACK thành công của lần trước.
  - Cùng `requestId` + khác payload signature: từ chối với mã lỗi `REQUEST_ID_REUSED`.

### 3. Bảng ánh xạ thuộc tính DTO và Cơ sở dữ liệu (GM-04 / GM-06)

| DTO Client (`contracts.ts`) | Kiểu dữ liệu / Đơn vị | Bảng & Cột Database (GM-06 / GM-04) | Quy tắc chuyển đổi / Nullability |
| :--- | :--- | :--- | :--- |
| `PoolDish.roundDishId` | `string` (UUID / slug) | `round_dishes.id` | Bắt buộc, định danh lượt vote |
| `PoolDish.dishId` | `string` (UUID) | `dishes.id` / `venue_dishes.dish_id` | Bắt buộc, tham chiếu món gốc |
| `PoolDish.name` | `string` | `dishes.name` | Bắt buộc (bảng `dishes` dùng cột `name`) |
| `PoolDish.priceMin` | `number \| null` (nguyên tệ) | `round_dishes.price.priceMin` / `venue_dishes.price_min` | Nullable khi quán chưa niêm yết |
| `PoolDish.priceMax` | `number \| null` (nguyên tệ) | `round_dishes.price.priceMax` / `venue_dishes.price_max` | Nullable khi món đồng giá hoặc chưa rõ |
| `PoolDish.currency` | `CurrencyCode \| null` | `round_dishes.price.currency` (enum `currency_code`) | Enum: `'VND'`, `'USD'`, `'THB'`, `'KRW'`, `'JPY'`, `'CNY'`, `'EUR'`, `'other'`. Nullable khi chưa rõ giá |
| `PoolDish.unit` | `PriceUnit \| null` | `round_dishes.price.unit` (enum `price_unit`) | Enum: `'portion'`, `'item'`, `'person'`, `'group'`, `'kg'`, `'menu_item_unspecified'`. Nullable khi chưa rõ |
| `PoolDish.servingSize` | `string \| null` | `round_dishes.price.servingSize` / `venue_dishes.serving_size` | Chuỗi mô tả khẩu phần (ví dụ: `'1 phần'`, `'2–3 người'`). Nullable |
| `PoolDish.price` | `DishPrice \| null` | `round_dishes.price` JSON object / `venue_dishes` pricing | Projection có cấu trúc cho UI |
| `PoolDish.temperature` | `'hot' \| 'warm' \| 'cold' \| 'ambient' \| 'unknown'` | `round_dishes.effective_profile.temperature` / `dishes.temperature` | Enum nhiệt độ chuẩn hóa |
| `RoomSnapshot.ownSubmission` | `SubmissionReceipt \| null` | `submissions` | Receipt nộp phiếu (`round`, `intentId`, `requestId`, `submittedAt`, `voteCount`) dùng reconcile sau timeout |
| `RoomSnapshot.datasetVersion` | `string` | Metadata / `food_datasets.version` | Phiên bản dataset hiện hành (ví dụ: `2026-10-11-core-01`) |
| `RoomSnapshot.eligibilityVersion`| `string` | Metadata eligibility | Phiên bản quy tắc eligibility (`1.0.0`) |
| `RoomSnapshot.evaluatedAt` | `string` (ISO8601) | Snapshot calculation time | Thời điểm đánh giá pool |
| `PushPermissionStatus` | `'granted' \| 'denied' \| 'provisional'` | `devices.permission` | Client dùng 3 trạng thái; lưu DB qua `toStoragePermission`: `'provisional' -> 'unknown'` |

### 4. Quy tắc đồng thuận & Kịch bản Mock — decision-v2 legacy

Các quy tắc và scenario trong mục này mô tả baseline decision-v2/food-v1 và mock lịch sử. Không dùng chúng làm tiêu chí cho session v4; xem [DISH_SESSION_API_CONTRACT.md](DISH_SESSION_API_CONTRACT.md) cho policy mới.
- **NO không thể thành winner:** Bất kỳ món nào nhận dù chỉ 1 phiếu `NO` hoặc `REMOVE` lập tức bị loại khỏi tập ứng viên thắng cuộc.
- Policy kết quả là `decision-v2` (khác food interchange `1.1.0`). Result dùng reason `UNANIMOUS_WANT`, `ACCEPTABLE_FINAL`, `EMPTY_INTERSECTION`, `ALL_REMOVED` và tier `PERFECT`, `CONSENSUS`, `COMPROMISE`, `NO_CONSENSUS` theo DECISION_SPEC/schema GM-06. DTO và runtime guard kiểm vocabulary/quan hệ winner; không nhận `food-v1`, `TIER_1/2/NONE` hoặc `HIGHEST_SCORE` như decision-v2.
- Tập không NO rỗng ở vòng 1: winner null, `EMPTY_INTERSECTION/NO_CONSENSUS`; tất cả REMOVE vòng 2: winner null, `ALL_REMOVED/NO_CONSENSUS`.
- Mock hỗ trợ 3 kịch bản kiểm thử:
  - `unanimous`: Đồng thuận tuyệt đối vòng 1 (`UNANIMOUS_WANT` / `PERFECT`).
  - `no_consensus`: Bế tắc hoàn toàn, không có món thắng (`NO_CONSENSUS`).
  - `round_two`: Vòng 1 thiếu món khả thi, phòng tự động chuyển sang `ROUND_2` với tập món thu gọn.
- Các scenario mock là mô phỏng UI, không triển khai đầy đủ engine/ACK đa thành viên; không dùng để nghiệm thu GM-20. GM-15 nhận roster/pool khóa và phiếu đã chấp nhận phía server, không đọc `ownVotes` hoặc draft KEEP từ public snapshot.
- Choice identity: `BallotVoteItem.roundDishId` → `round_dishes.id` của đúng room/round → `choiceId` khóa. Winner choice từ selector ánh xạ ngược về row của vòng kết quả để điền `RoomResult.winnerRoundDishId`; `winnerDish` lấy toàn bộ metadata từ đúng row đó. `DECISION_SELECTED` chỉ là kết quả domain nội bộ; GM-20 persist mới tạo `RoomResult`/state `DECIDED`.
- Nộp phiếu khi phòng ở trạng thái ngoài vòng bầu chọn (`LOBBY`, `CANCELLED`, `DECIDED`, `NO_CONSENSUS`) sẽ bị từ chối với lỗi `INVALID_ROOM_STATE`.
