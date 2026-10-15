# Ma trận kiểm Android–API — roadmap-v2

2026-10-12. Chủ dự án yêu cầu kiểm API từ điện thoại, không chỉ từ máy tính. Đây là plan/AC bổ sung, **chưa có kết quả chạy hoặc approval**. Giữ nguyên 38 task cũ, assignee/Deadline/Status và dependency; GM-39 bổ sung riêng là chỉnh prototype HTML trước, không sửa app/gọi API thật và không thay ma trận nghiệm thu tích hợp. [Chuẩn output](../project/TASK_OUTPUT_REQUIREMENTS.md), [DoD](../project/DEFINITION_OF_DONE.md).

## Ba lớp kiểm và đúng thời điểm

1. **Server:** producer API kiểm HTTP/SQL/auth/ACL/state/race thật ngay trong task BE, kể cả khi chưa có app. Postman/curl/Bruno/runner đều hợp lệ ở lớp này.
2. **Adapter/native:** GM-16 kiểm session transport và SecureStore thật trên điện thoại qua harness nội bộ tối thiểu dùng shell GM-02; không cần màn sản phẩm GM-25. Unit tests có injected fetch/storage vẫn chỉ là unit/mock, kể cả đặt trong `mobile/tests`.
3. **App → API:** consumer GM-24..31 kiểm thao tác màn trên Android → transport/repository thật → response → UI và state server. GM-33 đối chiếu toàn bộ ma trận trên release candidate; GM-34 kiểm lại APK với backend cấu hình thật.

API server chạy đạt không tự chứng minh lớp 2/3 đạt. BE không phải chờ task UI số lớn để Done nếu lớp đó ngoài scope; nhưng AC native/expiry đã thuộc GM-16 vẫn cần đạt. Không đổi Not run thành N/A để né AC. Bàn giao cho task sau không là dependency ngược hoặc approval. Mock screens GM-09..14 và structure GM-02/03 vẫn nghiệm thu đúng stage, không bị ép kiểm API chưa có.

## Producer → consumer và người kiểm hiện hành

Các task consumer dưới đây là nơi kiểm chức năng tương ứng khi đủ input theo graph hiện hành, không thêm tất cả producer làm start dependency của mọi consumer. Assignee/Deadline trên Project là nguồn hiện hành; tên dưới đây đối chiếu phân công repo hiện tại, không là lịch mới.

| Producer API / người làm | Consumer Android / người làm | Case cần đối chiếu trên điện thoại |
| --- | --- | --- |
| GM-16 / Trí | GM-16 / Trí; GM-25 / Trang; GM-31 / Trung | Native auth harness: guest/persist/force-stop/restore/refresh/expiry/lost/logout; GM-25 composition root/session thực của app; GM-31 SQLite/outbox/cache logout và identity isolation đầy đủ |
| GM-17 / Trí | GM-25/26 / Trang; GM-28/31 / Trung | Caller JWT thật, outsider/member/host; forbidden/auth-required UI, không thấy phiếu/token/private history người khác; đổi identity không giữ quyền/cache cũ. SQL/forged payload/race vẫn kiểm ở BE/GM-32 |
| GM-18 / Tâm | GM-24/25/27 / Trang | Vị trí/manual/coverage, radius/desiredAt/timezone, ngoài vùng/empty/unknown, pool/offering hợp lệ. Không suy món nguồn gốc Bắc chỉ bán ở Bắc; không thay unknown bằng giá trị bịa |
| GM-19 / Trí | GM-25 / Trang | Create/join/ready/start, hai identity cùng snapshot, full/expired/cancel, context/roster reset-ready, timeout/retry/requestId |
| GM-20 / Vinh | GM-26/27 / Trang; GM-31 / Trung | Submit/finalize/round-two/result, ACK muộn/UNKNOWN/duplicate/stale/version, reconnect không reroll, một resultId; restart durable replay ở GM-31 |
| GM-21 / Tâm | GM-25 / Trang; GM-28/31 / Trung | Consent/recent/ready reset, history/delete/opt-out/ACL, refetch và cache TTL/logout không rò giữa identity |
| GM-22 / Trí | GM-28 / Trung | Hai identity invite/accept/reject/unfriend/room confirmation, expiry/full/locked/duplicate, không tự join/ready |
| GM-23 / Trí | GM-28/29 / Trung; GM-30 / Trang | Inbox khi deny push, register/unregister/logout, remote delivery/tap cold-warm/auth/refetch, duplicate/expired. Native links GM-30 kiểm khi ứng dụng gọi các API liên quan, không cấp quyền từ payload |

GM-32 (Vinh) tổng hợp server regression và phần device còn thiếu, **không thay** GM-33 (Vinh) nghiệm thu app. Task tích hợp tự kiểm phần của mình trước Done, không dồn tất cả lỗi tới QA.

## Thiết lập điện thoại → backend bắt buộc

- Cài và kiểm theo [baseline Expo hiện hành](../project/EXPO_BASELINE.md) trước chạy ma trận: npm ci + locked compatibility, ghi SDK/package-lock revision/runtime. Nâng package không tự tạo device evidence; native config/module đổi cần rebuild trước kiểm lại.

- Ghi riêng Metro URL và backend API origin: mở app được không có nghĩa điện thoại gọi backend được. `localhost`/`127.0.0.1` trên điện thoại không tự trỏ tới máy tính.
- HANDOFF có phương án kết nối tái lập: backend test HTTPS với certificate được thiết bị tin cậy, hoặc forwarding local được kiểm và ghi rõ phạm vi. Nếu dùng `adb reverse`, ghi port, lệnh setup/cleanup và kiểm đường đi thật; không tự public backend local/tạo tunnel hoặc deploy remote.
- Auth transport hiện ở PR #106 chỉ cho HTTPS hoặc HTTP loopback; HTTP tới IP LAN bị từ chối. Không hướng dẫn đổi URL sang IP LAN HTTP rồi giả định chạy được. Không bỏ TLS/certificate validation hoặc dùng service_role trên app để vượt lỗi.
- Ghi app runtime (Expo Go hay development/native/release build), phiên bản Android/model, API environment, schema/contract/dataset version, app/API commit đã kiểm. SecureStore/backup/push/SQLite phải chạy đúng runtime hỗ trợ; bundle thành công không chứng minh native đã chạy.
- Chỉ dùng identities/phiếu tổng hợp và dữ liệu test được phép. Không tự reset DB đang dùng; ghi setup/cleanup được giới hạn. Không lưu token/public credential value, phiếu thật, GPS, push token hoặc PII vào report/video/log; public-key placeholder đủ để hướng dẫn.

## Cases ngang bắt buộc theo scope

- **Kết nối thật:** cold start, một request thành công và một lỗi contract từ server qua transport thật; UI loading/empty/error tương ứng; không injected fetch, no-op repository hoặc fixture fallback ở chế độ tích hợp.
- **Auth:** restore cùng identity, refresh/expired/revoked/lost session, retry hữu hạn, logout/offline; không ghi expiry thật Pass từ clock giả. GM-16 chạy case native sở hữu; GM-25 kiểm wiring/lifecycle; GM-31 kiểm toàn bộ private persistent state.
- **Mạng/lifecycle:** tắt mạng rồi bật, timeout/response muộn, background/resume. Với write có requestId/version, kiểm server đã commit nhưng app chưa nhận ACK; retry không tạo thêm membership/ballot/result/event. Force-stop/reopen + durable replay thuộc GM-31, không ép task integration trước đó phụ thuộc GM-31.
- **Nhiều client:** ít nhất một điện thoại Android thật; client thứ hai có thể là điện thoại/giả lập/test runner với identity khác. Đối chiếu room snapshot/version/result. GM-33 vẫn có các kịch bản 2/4/8 hiện hành; không tuyên bố 8 điện thoại nếu dùng client tổng hợp.
- **Native đặc thù:** grant/deny/manual location ở GM-24, remote push/cold-warm ở GM-29, QR/link/auth/confirm ở GM-30, SecureStore + SQLite/outbox/identity isolation ở GM-31. Không áp case camera/push lên endpoint không có tính năng đó.

## Output và gate

Mỗi task liên quan bổ sung bảng này trong CHECKS.md, kèm HANDOFF cách chạy. Một dòng là một case/AC, không một chữ Pass chung cho toàn bộ API:

| Producer / consumer / case | Device/runtime/build + app/API commit | Endpoint/environment + thao tác/request (che secret) | Expected HTTP/error/UI/state server | Actual + artifact + assertion | Pass/Fail/Not run + owner |
| --- | --- | --- | --- | --- | --- |
| Chưa chạy | Chưa có evidence | Chưa chạy | Theo AC của task | Chưa có artifact | Not run |

Video/ảnh cho thao tác và state app; assertion/log đã che dữ liệu cho response/server state; cả hai phải khớp revision/case. Network inspector optional, không bắt mua/cài proxy và không bật raw-body logging để lộ dữ liệu. Thiếu thiết bị/endpoint/build/credential ghi Not run + người xử lý; task có case đó bắt buộc chưa được Done. Harness chỉ chứng minh adapter, không dùng thay màn app production.

GM-33 bổ sung bảng coverage từng API GM-16..23 → consumer/cases/device/evidence/outcome, đối chiếu build hiện hành; thiếu case bắt buộc chặn nghiệm thu/release. GM-34 giữ gate upstream và kiểm APK install/auth/API smoke, không copy Pass từ build khác.

## P1/P2 không chặn core

- GM-35: account link/recovery/provider return và history sync trên điện thoại với API thật.
- GM-38: Context mood/weather API thật, stale/timeout/timezone/TTL/opt-out/frozen-pool, không gửi dữ liệu riêng tư làm evidence.
- GM-36 OCR hiện là pipeline/import; GM-37 preference AI hiện là API draft. Chưa có UI consumer trong scope nên không tuyên bố mobile integration Pass. Nếu mở các tính năng này trên app, phải chốt consumer/scope và kiểm device upload hoặc input/confirmation/manual fallback/auth/privacy trước nghiệm thu phần tích hợp; không tự thêm camera/provider hoặc dependency ngược để đủ bảng.
