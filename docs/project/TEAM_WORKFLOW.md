# Workflow — nhận đủ đầu vào, dựng nền trước rồi tích hợp

Roadmap-v2 theo [ADR-009](../architecture/decisions/ADR-009-foundation-first-task-slicing.md) và [lộ trình](IMPLEMENTATION_ROADMAP.md). Task Markdown là nguồn scope/status; task map lưu producer/input/output. GitHub có thể còn mã/scope cũ.

## Trước bắt đầu

1. Chọn đúng task roadmap-v2 và xem bảng đầu vào. UI cần shell → components → contract/mock trước màn; BE cần structure/field/contract trước API; Data cần fields → schema → import.
2. Chạy `python scripts/task_readiness.py --task GM-XX`. Start deps phải Done/Approved; checker kiểm file output cần nhận. Sau fetch đúng remote, có thể thêm `--base-ref origin/main` để đối chiếu task/evidence và artifact trên target.
3. Đọc HANDOFF upstream: file/commit/version, lệnh chạy, expected output, limitations; cập nhật nhánh nhận đúng code. Thiếu file hoặc contract thì báo blocker cụ thể, không tự dựng lại hoặc đoán response.
4. Owner/reviewer xác nhận nhận việc, chốt patch/test plan và file ownership; dùng nhánh riêng, mặc định `codex/gm-xx-mo-ta`.
5. Thực hiện phần đã có đầu vào. GM-09..14 là màn mock có thể hoàn thành độc lập; task INTEGRATION mới nghiệm thu API/native thật. Không gộp gallery/capability test vào việc dựng màn mẫu.

GM-01 đã được ghi nhận duyệt theo xác nhận và ủy quyền trực tiếp của chủ dự án ngày 2026-10-10, xem [evidence](../evidence/roadmap-v2/GM-01/REVIEW.md); GM-00 chỉ approval v0.2. Chủ dự án đã chốt cấu trúc, bộ package nền và yêu cầu Codex hỗ trợ GM-02/03, giữ nguyên owner/reviewer. Vẫn chạy start/merge gate; approval baseline không tự duyệt code hoặc AC task sau. Review sandbox không chuyển sang scope mới.

## Đầu ra phải chạy và kiểm được

Theo [chuẩn đầu ra](TASK_OUTPUT_REQUIREMENTS.md) và [checklist 38 task](TASK_OUTPUT_CHECKLIST.md): UI mở trên Expo và hiển thị/điều khiển được các mục trong scope; API có Postman/curl/runner request-response-assertions thật; Data đủ field/schema/template/fixture/version cho BE nhận làm song song. Task nền/contract/domain kiểm đúng scope, không chờ API/tính năng của task sau. Native ngoài Expo Go có guard và evidence development build riêng.

Mỗi task bàn giao CHECKS.md theo [mẫu checks](../../tasks/templates/CHECKS_TEMPLATE.md) và HANDOFF, có đường mở/gọi/lệnh từ clone sạch, input/expected/actual/Pass-Fail-Not run và artifact thực tế đã che secret. Không ghi Done nếu AC bắt buộc còn Not run/Fail; file tồn tại hoặc docs validator xanh không thay phép kiểm thật. [Plan GM-02/03](FOUNDATION_IMPLEMENTATION_PLAN.md) ghi root BE tooling/mobile tooling và các phép smoke nền.

## Hai gate và song song

Start dependency chặn phần dùng đầu vào đó. Merge dependency là phần chỉ cần khi tích hợp/nghiệm thu task; merge luôn cộng start deps. Ví dụ GM-07 soạn client/mock sau dictionary và cấu trúc, đối chiếu schema GM-06 trước merge. GM-24 có thể soạn adapter native theo contract rồi nghiệm thu cùng auth/eligibility API sau.

Mọi dependency có ID nhỏ hơn task hiện tại. Merge tăng dần 01..38 luôn hợp lệ; không cần chờ task không liên quan nếu chọn merge theo graph. `parallel_with` chỉ cặp phối hợp: khác owner, không có start ancestor, có thể có quan hệ merge trước/sau. Chỉ chạy song song khi đủ input, có người và tách file rõ. Cùng owner xếp ca.

## File ownership

| Phần dùng chung | Task điều phối |
| --- | --- |
| Mobile package/lockfile/config/runner/routes shell | GM-02 |
| BE config/local tooling/runner | GM-03 |
| Dictionary/template/validation rules | GM-04 |
| Tokens/shared UI/component props | GM-05 |
| Schema/migration numbering/constraints | GM-06 |
| API DTO/errors/client/mock/transport | GM-07 |

Task màn thêm route và feature file của mình, dùng components/repository sẵn có. Từng API có migration/test tên riêng, không sửa migration đã merge. Đổi contract cập nhật spec và báo owner upstream/downstream, review lại revision. Không thêm package/provider khi chưa review.

## Trước merge

1. Cập nhật ref nhánh đích; chạy `python scripts/task_readiness.py --task GM-XX --gate merge --base-ref origin/main`.
2. Kiểm cả start/merge dependencies đúng scope, task/evidence/version và file bàn giao trên target. Checker không tự fetch, không chứng minh file chạy đúng hoặc thay việc kiểm PR/commit upstream thật.
3. Điền PR/merge hoặc squash commit và artifact path trong [mẫu PR](../../.github/pull_request_template.md). Kiểm ancestry khi phù hợp; branch đã nhận đúng code, không chỉ bản ghi Done.
4. Rebase/update/retarget stacked branch khi cần, diff chỉ scope mình; chạy tests tương ứng sau tích hợp. Task màn kiểm mock/visual; API/native/data kiểm đúng môi trường của chúng.
5. Reviewer khác owner duyệt AC và [DoD](DEFINITION_OF_DONE.md) cho revision hiện tại. Sau Approved mới chuyển task done và sinh indexes. Done không đồng nghĩa code đã vào target.
6. Bàn giao [HANDOFF](../../tasks/templates/HANDOFF_TEMPLATE.md) và tag task nhận tiếp trong báo cáo/PR; thiếu đầu ra thì downstream vẫn bị chặn.

Không bắt nghiệm thu production/APK cho task shell/mock. Mock không đóng AC của task API/native. P1/P2 merge sau GM-34, không chặn release.

## Evidence và kiểm tra repo

Evidence mới ở `docs/evidence/roadmap-v2/GM-XX/`; giữ evidence roadmap-v1 nguyên trạng. Reviewer ghi:

```text
Reviewed-by: tên khớp reviewer khác owner
Reviewed-at: YYYY-MM-DD
Decision: Approved
Review-evidence: docs/evidence/roadmap-v2/GM-XX/REVIEW.md
```

```text
python scripts/task_readiness.py --write-docs
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff --check
```

Generator cập nhật indexes/links, không đổi approval/assignment. --all là báo cáo; Pass tooling không phải Pass app. Không tự commit/push/sync issue nếu chưa có yêu cầu.
