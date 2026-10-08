# Cache, outbox và đồng bộ — v0.2

2026-10-07 • FR-09/16 • GM-24, GM-25, GM-26 • [RPC](../architecture/API_CONTRACT.md).

## Dữ liệu và trạng thái

Local SQLite: snapshot của phòng user tham gia + fetchedAt/version, draft phiếu của chính user, outbox và history đã consent. Auth token ở secure storage. Không cache phiếu người khác hoặc tọa độ. Không tự coi SQLite mã hóa; adapter phải có review bảo vệ file/backup. Draft/outbox xóa sau terminal reconcile hoặc tối đa 24h; snapshot 24h; history tối đa 30 ngày theo consent. Logout/mất auth xóa dữ liệu private theo user, không để tài khoản khác replay queue.

DRAFT → QUEUED → SENDING → ACKED. Nhánh lỗi: UNKNOWN_DELIVERY, CONFLICT, EXPIRED, CANCELLED_LOCAL. Chỉ DRAFT sửa tự do. QUEUED chưa từng truyền có thể hủy rõ; sau SENDING/UNKNOWN khóa payload tới reconcile, không thay phiếu đã có thể nộp. UI khác nhau: Đã lưu nháp / Đã lưu trên máy, chờ gửi / Đang kiểm tra xác nhận / Server đã nhận / Không còn hợp lệ.

## Trình tự gửi

1. Người dùng bấm Gửi: validate đủ pool, persist submissionIntentId, authUserId, roomId, round/poolVersion, immutable payload/hash, requestId/expectedVersion và attempt trước network. Nháp chưa Gửi không auto-submit.
2. Offline chỉ báo pending local; không tăng submittedCount, không có winner local. Unknown delivery giữ nguyên requestId/payload để retry ACK cũ.
3. Khi foreground/resume/có mạng: kiểm session, đọc snapshot/ownSubmission, membership, round/pool/expiry. Nếu đã nhận đúng intent/hash thì ACKED. Nếu payload khác thì conflict cần người dùng xử lý, không ghi đè server.
4. VERSION_CONFLICT đã bị từ chối rõ: refetch, còn cùng room/round/pool và chưa submitted thì tạo attempt requestId mới cho cùng payload + version mới. Không dùng lại requestId với payload/version khác.
5. Room terminal/expired, round/pool/auth đã đổi hoặc mất membership: đánh dấu stale/expired và thông báo, không replay sang phiên mới. Retry giới hạn/backoff jitter, dừng khi unmount/terminal; không lặp vô hạn.
6. Queue hoạt động khi app chạy/resume. Không cam kết background send khi OS kill. Retry không nới deadline server.

## Cache và realtime

Cache có nhãn Dữ liệu lần đồng bộ gần nhất; không dùng nó cho start/finalize. Realtime chỉ event version/progress tổng; refetch snapshot bằng quyền user. Bỏ event cũ/trùng; polling fallback có backoff. Terminal server thắng cache. Replay xử lý ACK trước version; no lost update khi final submit/cancel đồng thời.

## AC

SYNC-01 queue sống qua kill/restart; chưa Gửi không tự nộp. SYNC-02 timeout trước/sau commit trả ACK một lần, cùng resultId. SYNC-03 stale round/pool/auth bị chặn. SYNC-04 pending không cộng progress. SYNC-05 logout/TTL clear private cache; history consent tách raw draft. SYNC-06 2/4/8 clients nhận cùng snapshot qua retry/reconnect.

Test T-09/16; evidence ghi mạng/thiết bị/steps, không payload phiếu thật/token. Native dependencies chờ GM-02 và reviewer.
