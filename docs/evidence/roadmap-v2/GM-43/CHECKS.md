# GM-43 — Kết quả kiểm trên QA

Đã chạy trên Supabase QA `gm4243-pinned`, CLI `2.120.0`, baseline `1e232dc`, migrations `0058` và `0059`. DB và worker chạy cô lập trên loopback. Dữ liệu hoàn toàn synthetic.

| Ca | Expected | Actual |
| --- | --- | --- |
| `DECIDED` và `NO_CONSENSUS` trên v4 baseline | RPC inbox cuối trả đúng ba field metadata mới và hai ref cho host/member | Pass qua HTTP. Outsider không thấy event. |
| Retry submit | Cùng ACK, một event theo result | Pass qua HTTP và SQL. |
| Sender | Service claim lấy đúng metadata. Payload chỉ có type/ref/status/version | Pass qua SQL claim và serializer thật với token synthetic. |
| Canonical writer | Event, audience và metadata khớp outbox qua submit, host/worker và race | Pass trong regression producer. |
| Inbox và notification ACL | Hành vi kết bạn, quyền claim/read và publication | 49 pgTAP assertion đạt trong bốn suite notification/ADR-026. |

Suite kết hợp đạt 226 assertion và validate 1.073 envelope. Xem [kết quả từng ca GM-43](qa-results.json) và [cách chạy](HANDOFF.md). Remote push thiết bị nằm ngoài GM-43. Suite Python toàn repo chạy 690 test với hai skip và một lỗi môi trường `WinError 1314` khi test GM-40 tạo symlink.

QA riêng `gm-43-independent` từ `origin/main` đạt 217 assertion và kiểm 969 envelope. DB chỉ nhận migration của GM-43.
