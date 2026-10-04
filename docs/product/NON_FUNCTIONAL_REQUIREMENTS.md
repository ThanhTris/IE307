# Yêu cầu phi chức năng — Manabi

Ngày 02/10/2026. Các ngưỡng dưới đây là **mục tiêu nghiệm thu đề xuất**, chưa được đo, cần reviewer xác nhận thiết bị/dữ liệu trước benchmark. Không dùng làm claim marketing. Báo cáo ghi build, Android/API level, thiết bị/RAM, dữ liệu, cách đo, số lần lặp, p50/p95 và failure cases.

Thiết bị mục tiêu đề xuất: Android 10 trở lên, RAM 4 GB, compact 360 dp; thử thêm medium/expanded và máy yếu thực tế. Dataset: 50 deck, 10.000 card tiếng Nhật, 50.000 review event tổng cộng; đo release, không dùng prototype/development mode làm kết quả mobile.

| ID | Yêu cầu/mục tiêu đề xuất | Evidence nghiệm thu |
| --- | --- | --- |
| NFR-01 | Deck/card/flashcard/SRS/ba game/tiến độ/backup dùng ở airplane mode sau restart; Gemini/backend unavailable không chặn core | E2E mất mạng/restart/429/5xx và session kết thúc an toàn |
| NFR-02 | Cold start core usable p95 ≤ 3 s; danh sách/due/search local p95 ≤ 300 ms; flip/rating phản hồi UI ≤ 100 ms; Word Ninja mục tiêu 60 fps, p95 frame ≤ 33 ms với reduce-motion | Benchmark release trên thiết bị/fixture, RAM và dropped frames |
| NFR-03 | Không mất rating đã báo lưu khi force-close; 0 duplicate trong replay 1.000 lần; import/restore lỗi rollback; conflict không mất nội dung im lặng | Transaction/crash/replay/conflict fixtures và hashes |
| NFR-04 | 0 cross-user read/write trong negative auth/RLS tests; 0 API secret trong bundle/log/backup; secure token storage, TLS, payload limit | Threat model, secret scan và user A đọc/sửa B |
| NFR-05 | Không gửi PII/private deck/history mặc định; 100% API pilot call có consent/điều kiện hợp lệ và payload tối thiểu; purge cached account data khi user chọn xóa | Network inspection, revoke/delete tests theo DATA_PRIVACY |
| NFR-06 | 100% quiz demo được người biết tiếng Nhật duyệt độc lập: một đáp án + ba nhiễu và provenance; 100% ảnh pilot có quyền/mapping duyệt; câu lỗi không chấm | Review toàn bộ demo + holdout ≥ 100 bản nháp báo reject/ambiguity/correction; không gọi tỷ lệ duyệt là độ chính xác tuyệt đối |
| NFR-07 | Font 200% không mất thao tác chính; TalkBack label/state/focus; target ≥ 48 dp; contrast text thường ≥ 4.5:1; dark/reduce-motion và ba cỡ layout | Screenshot + tương tác; Word Ninja có lựa chọn accessible |
| NFR-08 | TypeScript strict, any có lý do review; domain ngoài screen; JSON/migration versioned; task/evidence canonical Markdown và tái tạo báo cáo DOCX done/chưa làm/lỗi trước push | Typecheck/domain/migration fixture và quy trình [TEAM_WORKFLOW](../project/TEAM_WORKFLOW.md) |
| NFR-09 | reserved + approved ≤ 10 câu mới/user/ngày Asia/Ho_Chi_Minh, atomic/server-derived; tối đa 2 lượt tạo × 5 nháp; cap request/token toàn project; tối đa 1 retry tạm thời/request; không gọi AI khi chơi lại cache | Quota concurrency/idempotency/day-boundary tests, request/token/reject/cost thực tế |
| NFR-10 | Log metadata redacted: request ID/version/latency/quota/error; không card text/raw prompt/key; errors truy vết task/evidence | Log audit, latency/cost trên câu duyệt, stale/fallback/cache-hit rate |
| NFR-11 | Android release chạy thiết bị mục tiêu, compact/medium/expanded/font scales; từ chối permission không cần không phá core | Ma trận thiết bị/API, signed build/smoke test; iOS không bắt buộc |
| NFR-12 | Backup JSON version/manifest, roundtrip preserve 100% records hỗ trợ; corrupt/unsupported version không ghi DB | Roundtrip/count/hash, oversized/format fixtures, không secret |

## Quality gates

NFR-01/03/04/05/08/12 bắt buộc với chức năng tương ứng; NFR-06/09/10 thêm khi bật pilot. Chưa có số đo NFR-02/07/11 thì ghi “chưa đo” và giữ review mở. Đổi mục tiêu sau benchmark phải cập nhật spec/task và reviewer chấp thuận. Không hứa miễn phí mãi mãi, mọi thiết bị hay schema bảo đảm semantic đúng.
