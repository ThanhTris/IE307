# GM-20.3 — submit, finalize và storage supplement

Baseline `c20f7c2a58bcce555a446722e744bd7f1f3ac1b6`, policy `decision-v2`,
evaluator/selector `1.0.0`, algorithm `u32-murmur3-rejection-v1`.
Forward migration0023, schema registry0.5.0; food/core interchange vẫn1.1.0.
Main đã nhận GM-22/schema0.4.0:0023 chạy sau0022, không sửa registry của GM-22.
Không sửa DTO/client GM-07 hoặc migration đã merge. Supplement chờ Trí review.

## Wire và định danh

RPC `submit_ballot(requestId,room_id,round,pool_version,intent_id,expected_version,votes)`
nhận JSON scalars/array, kiểm type trước chuyển sang storage. ID attempt/intent là
chuỗi opaque1–128 ký tự, không control. UUID storage suy ra riêng; wire giữ nguyên
trong private metadata và receipt. Room/roundDishId là UUID được cấp từ server.
`roundDishId → choiceId` từ row khóa; dish/offering không thay choice identity.
Phiếu exact pool, không trùng row, chỉ WANT/OK/NO ở vòng1, KEEP/REMOVE ở vòng2.
UNSET là nháp UI, không phải phiếu được nhận.

Attempt hash bao gồm requestId/body/version. Exact accepted ACK tra trước quota,
version/state/expiry. Cùng request khác payload → REQUEST_ID_REUSED409.
Semantic hash canonical room/caller/round/poolVersion + sorted row/vote pairs;
không gồm expectedVersion/attempt ID. Cùng accepted intent/nội dung với attempt
mới → ACK gốc cùng causal roomVersion/state, nhưng envelope và receipt.requestId
đều echo attempt mới. Một member/vòng đã submit khác intent/nội dung →409
ALREADY_SUBMITTED. ACK không thay snapshot hiện hành: consumer cần reconcile.
Không tự submit intent chưa từng được nhận khi version/expiry sai.

Các lỗi dùng vocabulary GM-07: INVALID_INPUT400, INVALID_DISH400,
INCOMPLETE_BALLOT400, NOT_MEMBER403, VERSION_CONFLICT409 (version/pool/round),
ROOM_EXPIRED410, ROOM_TERMINAL409, INVALID_ROOM_STATE409, RATE_LIMITED429.
JWT thiếu/sai401; lỗi transaction503 UNKNOWN_ERROR, không lộ SQL/phiếu.

## Transaction / kernel

Lock `gm06_private.reference_epoch → room` như GM-19. Mỗi accepted submission
làm room.version tăng đúng1; chuyển round/finalize nằm trong cùng lần tăng đó.
Kernel chỉ dùng roster/pool khóa và votes đã persist. Đợi đủ phiếu, M unanimous
chốt; A không NO rỗng →EMPTY_INTERSECTION; A còn →ROUND_2 kể cả một choice.
Round2 row UUID mới, giữ choiceId/variant/offering/card/giá/profile/lịch đã khóa,
poolVersion tăng1. Không refresh food hoặc tự tạo KEEP. REMOVE veto; surviving
score2W+OK = n+W; giữ top ties trước selector; tier theo tỷ lệ WANT vòng1.

Seed4 bytes pgcrypto riêng lúc finalize, không client seed/poolSeed. Numeric
modulo32bit tránh signed bigint overflow; rejection sampling giống GM-15.
Result + private seed/algorithm + history + event + inbox cùng submission/votes
và state/version trong transaction. Exception rollback toàn block. Unique room
result, ACK replay không gọi lại finalize; không hồi sinh history đã xóa.
Snapshot khóa đọc cùng thứ tự, lấy vòng mới nhất từ `max(round_dishes.round)`
của pool đã persist, fallback1 nếu chưa có row. Giữ round2 kể cả CANCELLED
không có result; poolVersion tăng ở lobby không đổi round. Kiểm vòng của phiếu mới
cũng theo locked rows, nên hủy round2 trả ROOM_TERMINAL cho phiếu mới đúng version.
Pool, ownVotes/ownSubmission/hasSubmitted cùng vòng; pinned winner không đổi.
Không public seed/ties/scores/matrices.

## Writer bàn giao GM-21

`gm20_private.write_history` chỉ ghi winner khi frozen `historyConsent=true`
và consent hiện hành đúng scope personal_history/group_history, enabled,
không revoked/hết hạn, grantedAt<=finalizedAt. Không cấp consent ngầm từ member
flag; GM-19 flag chưa thay actual scoped consent. Thiếu actual consent → không
có history. API consent/settings/delete tiếp tục thuộc GM-21.

Personal history theo từng owner; group chỉ khi đủ roster opted-in và scoped
consents. TTL=min(finalizedAt+30days, consent expiry). `consent_ids` giữ chính
các rows đã cho phép. Canonical group key:
`sha256(UTF8("gm21-group-v1:" + sorted(unique(UUIDs)).join(",")))`.
Không gọi helper migration0021 chưa có trên target. History ref retention dùng
GM-17; metadata card lấy pinned snapshot. Retry/reconnect không rewrite writer.

## Event bàn giao GM-23

Một `ROOM_RESULT_READY`/result, dedupe `gm20-result:<resultId>`, refs room/result
và locked roster recipients; một inbox/recipient/event, TTL7days. Không payload
phiếu/điểm/seed hoặc network trong transaction. Inbox access không là push consent;
sender GM-23 phải kiểm consent và delivery riêng sau commit.

## Producer / consumer

GM-26/27/31 nhận: accepted receipt, incomplete/stale/expiry/error, exact retry sau
mất response, current-round snapshot, round2 row/poolVersion mới, persisted result.
Producer runner kiểm server HTTP qua client GM-07. Chưa chứng minh Android
UI/outbox restart/reconnect/session isolation; xem HANDOFF và ma trận mobile.

### v4 account-consent supplement — schema 0.9.1 candidate, 2026-10-26

The rules above describe the earlier integration baseline where the writer received explicit room-scoped grants; do not interpret them as requiring users to opt in again for each room. For v4, account settings are inherited at admission and synchronized at start, then personal/group scopes are independently pinned per member. The result writer consumes only those pinned scopes and verifies that the corresponding account choice remains active at persistence. Personal history is written for each eligible owner; group history requires the full locked roster. A post-start grant cannot authorize the current session, and a pre-finalize revoke suppresses that scope. Stored history continues to reuse the immutable result/podium and existing TTL/ACL rules. Migration 0029 is local-QA-only and has not changed the merged GM-20.3 baseline or legacy v2/v3 sessions.
