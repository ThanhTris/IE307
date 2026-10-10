# GM-15 — bổ sung review PR #101

Owner Vinh, reviewer đề xuất Trung trong repo; Trí đối chiếu PR theo comment.
Review/assignment/contract Pending. [Yêu cầu](https://github.com/ThanhTris/IE307/pull/101#issuecomment-6096995444).
Main0cf1dc0, parent GM-04 d428a80 (PR #62 còn mở). Gate GM-15 BLOCKED GM-04/07.
Owner đã cho làm draft độc lập; không dùng upstream chưa review để tự mở gate.

Engine decision-v2/1.0.0 candidate-only giữ nguyên logic; không thêm RNG trái
boundary owner đã chọn. AC seed/winner hiện hành còn gap, cần Trí review proposal
trong CONTRACT_MAPPING.md; không tự đổi AC hoặc Done. GM-07 DTO chưa có, không đoán DTO.

Patch:28 vectors bổ sung đủ roster2–8, giữ53 golden và fixtures lịch sử; parity
map tường minh; runner xuất input/expected/actual + repeat/permutation/frozen
assertions. CHECKS/HANDOFF/mapping mới; CI Node24 riêng chạy suite .test.mjs và
upload report để Jest GM-02 không bỏ sót. Không sửa package/lock/config của GM-02.

Test: Node domain104, report87 vectors, typecheck/lint/Jest/architecture từ
dependency đã khóa; Python regression/repository/index/diff trên parent mới.
Code không đọc clock/log phiếu/RNG/I/O. Rerun report byte-identical cùng revision/
runtime. No SQL/auth/transaction/concurrency/seed selector/persisted retry/API/
native tests; đó là boundary downstream, không cần triển khai task sau để test
domain. Điều kiện seed/winner của GM-15 vẫn ghi Not implemented, cần quyết định
reviewer chứ không đổi thành N/A để né AC.
