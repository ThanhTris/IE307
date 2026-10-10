# GM-06 — Sửa review PR #102

2026-10-10; owner Tâm, reviewer Trí; changes prepared, independent re-review Pending.
[Comment review](https://github.com/ThanhTris/IE307/pull/102#issuecomment-6099597593)
đối chiếu head `b6690708a04850593300c8af2166d997d5b038a3`.
Nhận main `fc092aa86ed12aa1181f230d85950bbb93913620` bằng merge chưa commit;
không rewrite/push head PR hoặc tự Approved/Done. Bản sửa chưa có commit mới,
file SHA256 ở [SQL](sql-results.json) và [verification](verification.json).

## P1 — Concurrent JSON/array reference

Tái lập bằng 2 session PostgreSQL17.11 trên migration b669070, có early
SET CONSTRAINTS ALL IMMEDIATE: writer A insert dish trỏ JSON source mới,
writer B delete source và commit trước A. Hai transaction commit,1 dangling ref.
[Baseline](review-baseline.json) giữ actual và hash migration trước sửa.

Một private row `gm06_private.reference_epoch` được UPDATE bởi BEFORE STATEMENT
trigger trước mọi INSERT/UPDATE/DELETE ở bảng có outgoing/incoming reference_guard.
Trigger lấy từ catalog của các deferred guards, không chép danh sách thiếu parent.
Khóa giữ tới commit, kể cả sau early constraint flush. READ COMMITTED deferred
checks thấy writer trước đã commit; REPEATABLE READ với snapshot cũ nhận40001 từ
tuple update. Advisory lock/SELECT FOR UPDATE đơn thuần không đủ cho snapshot cũ.
Missing epoch fail closed; row private bật/force RLS, revoke client privileges;
publisher không có quyền UPDATE epoch. Auth.users có cùng trigger; down xóa đúng
trigger riêng và epoch, không CASCADE. Parent stable key update vẫn bị chặn.

67 pgTAP assertions,16 real races JSON/UUID-array × INSERT/UPDATE × RC/RR ×
source/parent trước; B có snapshot trước mutation A, quan sát wait_event_type=Lock
trước commit A, không dựa chỉ vào sleep. Mỗi race1 commit/1 reject/0 dangling.
Lịch vẫn2 races Pass. Fresh/down/reapply và unrelated sentinel đều đạt.

Tradeoff: coarse serialization làm giảm throughput write liên quan, gồm auth;
transaction nên ngắn,40001/40P01 retry toàn TX. Downstream đo workload thực và
review normalized FK trước tối ưu; không bỏ lock để tăng tốc. Field contract,
public table count, schema0.1.0 không đổi; private table không có wire field.

## P2 — UTF-8 locale

Mọi repo read_text dùng encoding=utf-8; report write_text dùng utf-8 và newline LF.
Cả subprocess.run/Popen cho SQL đều explicit UTF-8 để Windows stdin/stdout cũng
không phụ thuộc cp1252. Auth DDL copy loại bỏ cả constraint và statement trigger
GM-06 trước apply lại trên disposable DB.

Hai regression dùng cp1252 default mô phỏng để đọc template có tiếng Việt và
subprocess byte-stream Unicode thật. Mac và Linux locale ASCII utf8Mode0 đều
đạt; [Linux log](encoding-linux.txt). Windows thật chưa chạy: owner xác nhận
chưa có môi trường. Không gọi mô phỏng là Windows acceptance.

Full Linux runner có workflow Ubuntu trên native Docker host của GitHub Actions,
không mount host Docker socket vào container; upload actual SQL report theo run.
Workflow chưa chạy cho bản sửa trước commit/push, không ghi Pass CI giả.

## Quy trình / blocker còn lại

Reviewer xác nhận dependency đã đạt theo checker Project mới. Quy tắc main
ADR-011 đã nhận. Giữ task metadata backlog/proposed như baseline PR; owner đã
nhận và Trí đã tham gia review được ghi riêng, chưa Approved/Done. Local live gate thiếu read:project nên ghi
BLOCKED_PROJECT_UNVERIFIED. Không dùng local/cache/Issue Closed thay live gate.

Auto-review từ chối phương án full runner trong Docker CLI container có socket
host vì quyền điều khiển rộng container/host. Thay bằng Linux encoding container
không socket/mạng và Ubuntu CI native Docker; không mở rộng credential hoặc bypass.

[CHECKS](CHECKS.md) và [HANDOFF](HANDOFF.md) ghi actual/limits. Trí kiểm lại
revision mới, artifact hashes, CI Linux và Windows Not run trước quyết định merge.
