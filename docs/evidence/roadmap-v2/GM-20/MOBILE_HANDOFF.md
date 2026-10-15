# GM-20 producer → Android consumers

Producer kiểm server SQL/HTTP qua client/guards GM-07 trên local fixture.
Các thao tác UI dưới đây là expected cho consumer, **chưa chạy Android**.
Endpoint/auth không secret trong `.http`; JWT/public key/control của local runner
chỉ ignored runtime. Không đưa token/evidence phiếu người khác vào screenshot/log.

| Consumer / thao tác | Request / expected server | Assertion consumer cần có |
| --- | --- | --- |
| GM-26: gửi khi còn UNSET | Không gọi submit; API gửi UNSET →400 INVALID_INPUT | Giữ nháp, không tự OK/KEEP |
| GM-26: gửi đủ pool hiện hành | submit_ballot round/poolVersion/expectedVersion/intent/request + từng roundDishId →200 receipt | Một accepted submission, receipt.requestId cùng envelope |
| GM-26: double tap/retry attempt | Cùng immutable request/body →200 cùng ACK | Không tạo intent/phiếu mới, không chốt hai lần |
| GM-26/31: version/pool/round cũ chưa được nhận |409 VERSION_CONFLICT | Refetch snapshot, xác nhận lại, không auto-submit nháp |
| GM-26/31: room hết hạn chưa nhận |410 ROOM_EXPIRED | Không chuyển nháp thành accepted; cho lựa chọn bắt đầu lại |
| GM-31: response mất sau commit | Retry exact attempt →same ACK/result | Một submission/result/event; xử lý UNKNOWN trước retry |
| GM-31: attempt mới cho accepted intent | Nội dung canonical same →ACK; receipt.requestId mới, causal version gốc | Reconcile snapshot riêng; ownSubmission có original requestId/intent |
| GM-27: đủ round1 chưa unanimous |200 stateROUND_2; snapshot poolVersion+1, row IDs mới | Reset draft theo new rows, giữ choice identity, không default KEEP |
| GM-27: còn một choice | ROUND_2 vẫn đợi đủ mọi KEEP/REMOVE | Không tự mở vòng3 hoặc bypass xác nhận |
| GM-27: unanimous/fallback | DECIDED, persisted resultId/winner/tier/reason | Không random lại client; pinned winner card |
| GM-27: NO trên mọi choice/REMOVE hết | NO_CONSENSUS với EMPTY_INTERSECTION/ALL_REMOVED | Không tạo winner giả hoặc tự nới pool |
| GM-27/31: reconnect terminal | snapshot dùng vòng cuối từ locked rows, kể cả CANCELLED ở round2 chưa có result | Giữ pool row IDs/poolVersion, ownVotes/ownSubmission/hasSubmitted vòng2; không hiển thị lại phiếu vòng1 |
| GM-26/31: outsider/switch account |403 NOT_MEMBER; JWT sai/mất401 | Xóa private cache đúng session; host không nhận phiếu người khác |
| GM-21/27: history opt-in nhưng thiếu scoped consent | Result vẫn chốt; không tạo history chưa được cấp quyền | Không tự cho phép group/personal history từ UI flag |

Consumer record theo MOBILE_API_TEST_MATRIX: build/commit/device/runtime,
thao tác→request/status/error→UI/state persisted/assertion; tokens redacted.
GM-31 còn persistent outbox/process restart/cache isolation; GM-23 sender/push
consent và delivery; GM-21 scoped grant/revoke/delete/history projection.
Không dùng server fixture này làm seed production hoặc evidence user approval.

Máy Android thật không dùng `127.0.0.1:54332` của máy tính. Dùng endpoint HTTPS test
đã được team cấu hình theo auth transport GM-16 và public-key placeholders; emulator
mapping/harness phải kiểm theo matrix. Không thay auth/TLS policy để vừa fixture.
Stage producer ở CHECKS không thay các device tests của task consumer.
