# Kiểm thay đổi quy trình Project Done — 2026-10-10

Scope: chỉ checker/workflow, module/config/ADR/docs/templates/index notices và tests liên quan theo yêu cầu trực tiếp chủ dự án; không triển khai GM-06 hoặc tự nghiệm thu task khác. Các thay đổi phân công/lịch local từ trước đã bỏ theo yêu cầu, có bản sao phục hồi local ngoài Git. Không thay assignee, deadline, dependency graph, task map hoặc trạng thái trên GitHub Project.
Tested revision: working tree chuẩn bị commit trên main d9e83d9c091b4487f7188bdfb7906e8f950db378 (đã nhận PR #62). Không phải bằng chứng thay đổi checker đã push tại thời điểm chạy test.
Environment: Windows; bundled Python 3.12.14. Người dùng đã đăng nhập GitHub CLI với quyền đọc Project; Git credential helper được cấu hình dùng credential đó. Không lưu token trong repo/evidence.

## Phép kiểm và kết quả thật

| Phép kiểm | Actual | Kết quả / giới hạn |
| --- | --- | --- |
| python -m unittest discover -s tests -p test_project_gate.py | 29 tests, OK, 10.520s | Pass; Project responses là fixture synthetic, không là approval thật |
| python -m unittest discover -s tests -p "test_*.py" (ngoài sandbox, thư mục tạm Windows mặc định) | 464 tests, 459 đạt, 5 errors, 68.919s | Không tuyên bố toàn bộ regression Pass: 5 test taxonomy pipeline dùng khóa fcntl, yêu cầu Linux/macOS/WSL; code/tests đó không đổi so với main d9e83d9 |
| Regression trong sandbox / với thư mục tạm trong repo | 464 tests, lần lượt 40 / 7 errors | Giới hạn môi trường: quyền ghi temp sandbox; thư mục temp trong repo bị guard export của data từ chối. Lần ngoài sandbox phía trên loại các lỗi này, còn 5 lỗi nền tảng |
| python scripts/validate_repository.py | documents/links/manifest/dependencies/traceability OK | Pass cấu trúc offline, không xác minh Done live |
| python scripts/task_readiness.py --check-docs | Task indexes match task metadata | Pass indexes offline |
| git diff HEAD --check | Không lỗi whitespace, chỉ cảnh báo Git LF/CRLF ở một số file | Pass |
| git diff HEAD -- data-preparation mobile supabase tasks/task-id-map.json tasks/backlog/GM-04.md tests/test_repository_validator.py tests/test_vilao_catalogue.py | Không có diff | Không sửa data/UI/BE, task-map hoặc các test data đã có trên main |
| python scripts/task_readiness.py --task GM-06 --base-ref origin/main (API thật) | READY_TO_CLAIM; exit 0 | Pass start dependencies + artifact/version target; snapshot Project đọc 2026-10-10T15:44:50.465462+00:00 |
| python scripts/task_readiness.py --task GM-06 --gate merge --base-ref origin/main (API thật) | READY_FOR_MERGE_REVIEW; exit 0 | Pass đầu vào; snapshot Project đọc 2026-10-10T15:44:56.918293+00:00; target d9e83d9. Không nghiệm thu implementation/AC của GM-06 |

Trước khi người dùng cấp quyền, API thật từng bị chặn vì thiếu read:project. Sau đăng nhập, hai gate live đã đọc được Project và đạt đầu vào GM-06. Không coi Issue Closed hoặc cache là Done; không tự đổi quyền hay trạng thái Project. origin/main là ref vừa fetch trong lần kiểm này, checker không tự fetch.

5 lỗi regression ngoài sandbox đều ở tests/test_vilao_catalogue.py: test_bad_evidence_gets_one_retry_and_raw_is_retained, test_contract_change_invalidates_cache_namespace, test_crash_after_response_recovers_missing_item_cache, test_full_export_and_replay_no_api_calls_preserve_source, test_network_error_checkpoint_then_resume. RuntimeError xuất phát từ single_run trong data-preparation/scripts/vilao_catalogue.py khi không có fcntl trên Windows. Không sửa/mocking/bỏ các test này để báo xanh; cần chạy lại pipeline trên môi trường được hỗ trợ. Toàn bộ tests checker/readiness/validator trong suite không có failure/error.

Test fixture bao phủ: Done mở dependency dù Markdown backlog/review và thiếu REVIEW local; Todo/Issue Closed không mở; issue mapping đúng repo/ID; draft/PR/archived/duplicate/redacted/malformed response; pagination đầy đủ; permission/network failure không fallback; thiếu output/HANDOFF vẫn chặn; merge đợi merge-only dependencies, target artifact/contract/manifest khác vẫn chặn và báo path cụ thể. Fixtures không sửa task thật.

## Bàn giao

[Hướng dẫn chạy và quyền đọc](../../../project/PROJECT_READINESS.md) · [ADR-011](../../../architecture/decisions/ADR-011-project-done-readiness.md).

Checker mặc định --approval-source project; indexes/validator vẫn offline. --approval-source local chỉ chẩn đoán lịch sử, không cho phép vượt gate. Người dùng yêu cầu chỉ push checker/quy trình; không đổi Project/issue status hoặc ghi Approved/Done. Khi chuyển giao phải đưa module/config/docs/tests cùng checker; nhánh làm việc vẫn cần nhận artifact upstream đúng phiên bản trước code/tích hợp. Chủ dự án review thay đổi quy trình/code riêng; báo cáo test này không là Decision Approved.
