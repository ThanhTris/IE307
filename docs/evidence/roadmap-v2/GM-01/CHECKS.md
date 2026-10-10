# GM-01 — kiểm đầu ra tài liệu

2026-10-10. Mode: docs. Owner Codex; reviewer Trí. Contract `food-v1/roadmap-v2/GM-01.1`. Tested revision: working tree trên `4f154af714411e81351e7761ceca281b1436fa68`; Windows, Python 3.14. Không phải native/backend execution.

| Case | Lệnh/input | Expected | Actual | Kết quả |
| --- | --- | --- | --- | --- |
| Graph/đầu vào/scope | `python scripts/validate_repository.py` | 38 task; dependency nhỏ hơn; artifact producer hợp lệ | exit 0 trước ghi nhận approval | Pass |
| Regression gates/output | `python -m unittest discover -s tests -p "test_*.py"` | Test graph, start/merge, output contract/checks/API suite | 87 tests, OK | Pass |
| Indexes | `python scripts/task_readiness.py --write-docs` rồi `--check-docs` | Metadata khớp bảng task/handoff/output | exit 0 trước ghi nhận approval | Pass |
| GM-00 trên target local | `python scripts/task_readiness.py --task GM-01 --gate merge --base-ref origin/main` | Upstream review/artifact tồn tại đúng bản | READY_FOR_MERGE_REVIEW tại SHA nền trên | Pass |
| Mở app/API/DB | Ngoài scope tài liệu GM-01 | Không suy từ validator | Chưa chạy; GM-02/03 lưu evidence riêng | N/A |

Sau ghi nhận review và triển khai shell/BE phải chạy lại toàn bộ các lệnh repo, ghi kết quả cuối trong handoff. Các phép kiểm của GM-01 không đóng AC của task khác. Python có cảnh báo đường dẫn runtime nhưng các lệnh trên trả exit 0.

Review là xác nhận trực tiếp của chủ dự án tại [REVIEW.md](REVIEW.md); không dùng kết quả test để tự duyệt.
