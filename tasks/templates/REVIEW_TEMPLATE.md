# Mẫu review và bàn giao hai gate

Task / owner / reviewer độc lập:
PR / revision / contract / dataset / migration version:
Loại review: draft phần độc lập hay nghiệm thu toàn task?

## Start dependencies

| Task trước | Project issue / Status Done / thời điểm checker | Contract version / phần được làm trước |
| --- | --- | --- |
| GM-XX | | |

Chạy `python scripts/task_readiness.py --task GM-XX`. Draft review được còn merge blocker; không được Approved toàn task nếu chưa đạt AC.

## Merge dependencies và target

| Task trước (gồm start deps) | Project Done / artifact và version khớp | Merge/squash commit | Ref target / SHA đã kiểm |
| --- | --- | --- | --- |
| GM-XX | | | |

Chạy `python scripts/task_readiness.py --task GM-XX --gate merge --base-ref origin/main` sau cập nhật ref. Checker đọc Project live và đối chiếu output/HANDOFF/version; người merge vẫn xác minh PR/commit upstream thật và chạy integration tests sau cập nhật branch. Thay contract/revision phải review lại downstream. Không bắt đồng bộ Approved trong Markdown để nhận dependency đã Done trên Project.

## Kết quả AC

| AC | Pass/Fail/Not run | Lệnh/output/môi trường/evidence | Mock hay thật / blocker |
| --- | --- | --- | --- |
| AC-… | | | |

Docs-only ghi N/A cho native/SQL có lý do. Với feature/data, mock/validator không thay native/SQL/nguồn thật; kiểm race/privacy/expiry/freshness khi áp dụng.

## Quyết định

Reviewed-by: tên đúng reviewer khác owner
Reviewed-at: YYYY-MM-DD
Decision: Pending
Review-evidence: docs/evidence/roadmap-v2/GM-XX/REVIEW.md (file thật từ repo root)

Chỉ reviewer đổi Approved khi mọi AC, cả hai gate và DoD đạt cho revision được ghi. Trí chuyển Done trên Project sau nghiệm thu; đó là nguồn gate downstream. Khi cập nhật task Markdown thành done, giữ approval/evidence thật và sinh indexes offline; không bắt bước này để mở downstream. Code đổi tiếp cần review lại. AI không tự Approved/Done. Done không chứng minh PR đã merge; downstream phải kiểm target riêng.

## Bàn giao

Task nhận đầu ra / version / PR / commit:
Lệnh tái hiện / migration / rollback:
Giới hạn, blocker và người xử lý:
