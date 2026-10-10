## Task và phạm vi

Task Markdown / owner / reviewer khác owner:
Mã hiện hành roadmap-v2 / mã cũ nếu đối chiếu issue (xem docs/project/TASK_RENUMBERING.md):
Assignment accepted / baseline / spec / ADR:
Branch / target / PR cha (nếu stacked):
Scope và phần ngoài scope:

## Start gate — trước viết phần độc lập

- [ ] Đã chạy `python scripts/task_readiness.py --task GM-XX`; start_dependencies Done trên Project, nhận đủ output/HANDOFF đúng version.
- [ ] Owner/reviewer nhận việc; patch/test plan và package/provider/license được review khi áp dụng.
- Contract/fixtures commit, input/output/errors/nullable/version và owner upstream:
- Task song song / interface / file mỗi người sở hữu:
- Phần làm trước bằng mock, phần đang chờ tích hợp và blocker:

## Merge gate — không bắt buộc hoàn tất khi mở draft PR

| Start/merge dependency | Task/PR upstream | Project Done / thời điểm checker | Merge/squash commit thực tế | Artifact/version trên target khớp? |
| --- | --- | --- | --- | --- |
| GM-XX | | | | |

- [ ] Ref target đã cập nhật; ghi tên ref/SHA/thời điểm kiểm bên dưới.
- [ ] `python scripts/task_readiness.py --task GM-XX --gate merge --base-ref origin/main` đạt; đổi ref nếu target khác.
- [ ] Người merge kiểm code/merge commit upstream thật trên target; không chỉ nhìn bản ghi Done/evidence.
- [ ] Cập nhật/rebase branch, retarget nếu stacked, diff chỉ còn scope task; integration tests thật chạy lại và đạt.
- Target ref / SHA / output / giới hạn kiểm:
- Thay đổi contract/schema/privacy / task bị ảnh hưởng / migration và rollback:

## AC và verification

| AC | Pass/Fail/Not run | Evidence/output/version/môi trường | Mock hay thật / giới hạn |
| --- | --- | --- | --- |
| | | | |

- [ ] `python scripts/validate_repository.py`
- [ ] `python -m unittest discover -s tests -p "test_*.py"`
- [ ] `python scripts/task_readiness.py --check-docs` (đổi task thì --write-docs trước)
- [ ] `git diff --check`
- Native/typecheck/lint/unit/SQL/RLS/race/Android/a11y/offline: lệnh và evidence thật, hoặc N/A có lý do với docs-only:
- Food data: source/license/coverage/menu-hours/freshness/unknown/overnight, fixture tách verified data:
- Artifact/commit/version bàn giao; task nhận đầu ra; blocker và owner:
- Evidence mới dùng docs/evidence/roadmap-v2/GM-XX/; không ghi đè folder evidence mã cũ.

## Review độc lập

- [ ] Reviewer kiểm AC, cả hai gate và evidence cho revision PR hiện tại; AI không tự tick.
- [ ] Trí nghiệm thu/chuyển Done trên Project; lưu review revision/evidence. Khi chuyển Markdown thành done vẫn cần review fields thật và sinh indexes; không bắt đồng bộ Markdown để mở downstream. Thay code sau review phải review lại.

READY_FOR_MERGE_REVIEW không là quyền tự merge. Checker đọc GitHub Project và đối chiếu artifact/version nhưng không tự fetch hoặc chứng minh PR/commit đã merge. Done không đồng nghĩa đã vào target. Mock/CI/docs validator không thay native/SQL/data thật. Draft PR được giữ checklist merge chưa đạt.

## Artifact bàn giao roadmap-v2

Track / stage / mock UI hay API/native thật:

| Input task | Artifact + version/commit | Có trên target/nhánh? | Smoke đã kiểm |
| --- | --- | --- | --- |
| | | | |

Output paths / contract-schema-dataset version / lệnh chạy / expected result / task nhận:
HANDOFF.md: docs/evidence/roadmap-v2/GM-XX/HANDOFF.md

- [ ] Scope UI mock được nghiệm thu riêng; không ghi API/native pass từ fixture.
- [ ] Đầu vào thực tế đủ để tiếp tục, không tự tạo lại scaffold/contract hoặc bỏ prerequisite.

## Output chạy được — UI / BE / Data

Theo docs/project/TASK_OUTPUT_REQUIREMENTS.md và TASK_OUTPUT_CHECKLIST.md. CHECKS.md: docs/evidence/roadmap-v2/GM-XX/CHECKS.md, tested commit/version/environment:

| Screen/component hoặc endpoint/field | Cách mở Expo / request/lệnh | Input | Expected + assertion | Actual + evidence thật | Mock/thật / Pass-Fail-Not run |
| --- | --- | --- | --- | --- | --- |
| | | | | | |

- [ ] UI mở được trên Expo và hiển thị/tương tác các mục trong scope; giới hạn Expo Go/native ghi rõ, có screenshot/video thật.
- [ ] API có Postman/curl/runner request suite và HTTP/body/error/state/version assertions; nền/contract/domain kiểm scope riêng, không đòi API task sau.
- [ ] Data đủ field/schema/template/FK/unit/null/privacy/version và valid/invalid fixture; SQL/import/query thật khi task yêu cầu, BE không phải đoán field.
- [ ] Output/evidence che secret/GPS/phiếu thật; AC bắt buộc chưa chạy/không đạt vẫn là blocker, không lấy CI/docs thay nghiệm thu.
