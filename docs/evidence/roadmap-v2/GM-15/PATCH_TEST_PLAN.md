# GM-15 — review fix 2026-10-11

Owner Vinh, Trí review cuối theo PR101; historical reviewer đề xuất Trung trong task không tự sửa assignment/approval. Scope owner đã cho: rebase main, sửa comment rồi commit/push PR; đã chốt bổ sung selector theo seed thay candidate-only và giữ AC. Contract task GM-15.2; evaluator1.0.0 không đổi hành vi; additive selector1.0.0.

Base3076c3d; đọc workflow/DoD, chạy readiness trước sửa. Gate local BLOCKED_PROJECT_UNVERIFIED vì token hiện có thiếu read:project; upstream files thật đã nhận, review comment xác nhận Project deps Done. Không dùng lỗi quyền Project để kết luận GM-07 chưa bàn giao, không tự approve.

Patch: selector deterministic pure với canonical seed, static vectors 2–8 người/tie/veto/rejection/invalid seed; explicit row→choice mapping và selected fields; narrow GM-07 result vocabulary/types/guard/mock theo DECISION_SPEC/schema, không viết lại mock multi-user semantics. Giữ historical fixtures/evidence, bổ sung runner+CI và ADR012; docs pin upstream thật và ghi kết quả mới riêng.

Tests: Node suites old+seeded, reporter input/expected/actual/repeat/permutation/frozen; Jest mapping/mock/guards và all mobile tests, tsc/lint/architecture; full Python bằng bundled3.12.14; repository/task indexes/diff checks. Test worktree /tmp dùng đúng patch và node_modules đã khóa vì root package.json/lockfile của OneDrive dataless đang chặn npm trong checkout chính. Không cài package hoặc đổi root/mobile lock/config. npm run check gặp Watchman sandbox; chạy Jest lại --watchman=false, không sửa timeout/config. Report dữ liệu mô phỏng, không live votes/GPT/crawl.

Expected độc lập từ fixtures spec cũ và explicit arithmetic vectors; không sinh expected bằng implementation. Native/API auth/SQL parity/race/persisted retry/entropy distribution not run, thuộc GM-20; nghiệm thu GM-15 không giả các phép này đã đạt.
