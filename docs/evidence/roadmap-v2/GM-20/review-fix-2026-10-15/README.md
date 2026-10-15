# GM-20 — sửa review ngày2026-10-15

Review input: [comment Trí](https://github.com/ThanhTris/IE307/pull/115#issuecomment-6182634572),
commit2c1b023. Owner yêu cầu sửa và push lại PR115. Schema0.5.0/contractGM-20.3
không đổi shape;0023 vẫn là migration draft chưa merge, không sửa migration upstream.

## Snapshot hủy vòng2

Dùng max(round_dishes.round) từ rows khóa, fallback1. Trả cùng vòng cho pool,
ownVotes, ownSubmission và hasSubmitted; không dùng poolVersion hoặc result reason
để đoán vòng. Fresh ballot sau cancel kiểm cùng vòng persist và bị ROOM_TERMINAL;
accepted retry giữ ACK, không tạo submission/result mới.

Hai runtime ca độc lập: vào round2/allOK rồi cancel trước phiếu, và sau một host
KEEP. Kiểm đúng toàn bộ pinned pool/row IDs, poolVersion, receipt/own votes và
privacy của member còn lại, không result/event/seed, không tăng counts khi retry
hoặc gửi mới. Ca thứ ba đổi context lobby làm poolVersion2 nhưng snapshot round1.
[Initial HTTP](initial-http.json) có22 nhóm; report cuối sau reset ở thư mục cha.

## CLI portability

Dùng Node entrypoint của Supabase thông qua helper cliArgs nền. Official wrapper
map win32→windows và kiến trúc/libc; không thêm alias package hoặc sửa lockfile.
Test chạy executable thật --version và so với version lock/package hiện có.
[Local runner/CLI](runner-cli-local.txt) là20 tests Pass trên darwin/arm64, trong đó
CLI launch không gọi API (0 API case, không dùng làm API Pass).

Workflow GM-20 CLI portability chạy npm ci/Node24 và launch CLI trên ba OS.
[CI native](cli-ci.json) đã Pass trên Windows x64, Linux x64 và macOS ARM64
ở commit7622fad, [run38669720375](https://github.com/ThanhTris/IE307/actions/runs/38669720375).
Mỗi job thực sự launch Supabase2.120.0 qua Node entrypoint; [summary](cli-ci.txt).
Full SQL/HTTP dùng PostgreSQL disposable trên macOS, không tuyên bố đã kiểm
HTTP/SQL trên Windows hoặc Android.

## Kết quả và giới hạn

SQL/HTTP22 nhóm, parity140 và pgTAP11; regression GM1932 HTTP/15pgTAP;
Python550; domain169; root/CLI20. Xem CHECKS/manifest và reports cuối.
Một lần local CLI bị sandbox chặn ~/.supabase telemetry và package metadata bị
OneDrive evict; đã restore đúng lockfile từ cache và chạy lại với quyền cache bình
thường. Không đổi dependency hoặc coi lượt lỗi là Pass.

Expo compatibility jobs được reviewer chấp nhận riêng trong comment, không phải
all checks passed hoặc approval merge. Chưa thay DB ứng dụng, publish/deploy,
Bruno desktop, Android/native hoặc Windows full HTTP. Trí vẫn review revision mới.
