# scripts/

Công cụ chạy backend, kiểm tra theo task và tiện ích CI. **Không đổi tên hay di chuyển file trong thư mục này**: workflow CI (`.github/workflows`), `package.json`, `scripts/validate_repository.py` và bằng chứng đã đóng băng trong `docs/evidence/` tham chiếu đúng đường dẫn hiện tại.

## Chạy backend (dùng hằng ngày)

| Lệnh | File | Việc |
|---|---|---|
| `npm run backend:start` / `stop` / `status` / `test` / `reset:local` | `backend.mjs` | Supabase local một stack cho dev |
| `npm run qa:start -- --run-id <id>` / `qa:verify` / `qa:test` / `qa:stop` | `backend-qa.mjs` | Stack QA có manifest riêng (`.work/qa/<id>/`), seed catalogue thật + synthetic, bật tạo phòng hợp đồng supplement (ADR-021) |
| `npm run qa:worker-start` / `qa:worker-stop` | `backend-qa.mjs` | Worker chính sách món chạy kèm stack QA |

## Kiểm tra theo task (`gmNN_*`)

Mỗi file thuộc đúng một task; tên file giữ nguyên để khớp bằng chứng. Thường có các loại: `*_check.py` (kiểm SQL/schema), `*_http_check.mjs` / `*_canonical_http.mjs` (gọi API như app), `*_http_fixture.py` / `*_http_stop.mjs` (dựng/dọn dữ liệu), `*_regression.*` (chống hồi quy).

| Task | Chủ đề | File |
|---|---|---|
| GM-03 | BE: môi trường local, inventory hàm | `gm03_function_inventory.sql`, `gm03_qa_http_check.mjs` |
| GM-04 | Data: hợp đồng trường thông tin | `gm04_contract_model.py`, `gm04_use_cases.json` |
| GM-06 | Data: schema và migrations | `gm06_canonical_check.py`, `gm06_canonical_validation.py`, `gm06_isolated_http_check.py`, `gm06_schema_check.py`, `gm06_v4_compat.py` |
| GM-07 | BE: hợp đồng API | `gm07a_contract_check.py` |
| GM-08 | Data: nhập dataset thật | `gm08_import_check.py`, `gm08_prepare_draft.py`, `gm08_prepare_survey.py`, `gm08_prepare_survey_packet.py`, `gm08_real_bundle_check.py` |
| GM-16 | BE: guest auth, session | `gm16_auth_check.mjs`, `gm16_bruno_setup.mjs`, `gm16_rate_limit_setup.ps1` |
| GM-17 | BE: RLS, quyền RPC, retention | `gm17_access_check.py`, `gm17_bruno_cleanup.mjs`, `gm17_http_check.mjs`, `gm17_http_fixture.py`, `gm17_import_regression.py`, `gm17_retention.mjs` |
| GM-18 | BE: catalogue, lọc món khả thi | `gm18_dish_check.py`, `gm18_domain_check.mjs`, `gm18_eligibility_check.py`, `gm18_http_check.mjs`, `gm18_http_fixture.py` |
| GM-19 | BE: phòng, thiết lập, lobby | `gm19_bruno_reset.mjs`, `gm19_http_check.mjs`, `gm19_http_fixture.py`, `gm19_http_stop.mjs`, `gm19_runtime_files.mjs` |
| GM-20 | BE: nộp phiếu, hai vòng, chốt kết quả | `gm20_canonical_check.py`, `gm20_canonical_http.mjs`, `gm20_gm19_regression.mjs`, `gm20_http_check.mjs`, `gm20_http_fixture.py`, `gm20_http_stop.mjs` |
| GM-21 | BE: lịch sử, consent, chống lặp | `gm21_access_regression.py`, `gm21_canonical_check.py`, `gm21_canonical_http.mjs`, `gm21_history_check.py`, `gm21_http_check.mjs`, `gm21_http_fixture.py`, `gm21_lifecycle_check.mjs`, `gm21_upstream_regression.mjs` |
| GM-22 | BE: bạn bè, lời mời phòng | `gm22_admission_check.py`, `gm22_http_check.mjs`, `gm22_http_stop.mjs` |
| GM-23 | BE: inbox, thiết bị push, sender | `gm23_canonical_check.py`, `gm23_canonical_http.mjs`, `gm23_cleanup_check.py`, `gm23_http_check.mjs`, `gm23_http_stop.mjs`, `gm23_sender_check.mjs`, `gm23_sender_worker.mjs`, `gm23_upgrade_check.py`, `gm23_upgrade_http.mjs` |
| GM-29 | UI: thiết bị push (HTTP) | `gm29_device_http_check.mjs` |
| GM-40 | Data: chuẩn hóa catalogue món | `gm40_catalogue_check.py`, `gm40_manifest_check.py`, `gm40_rich_projection_check.py` |
| v4 | Bộ kiểm HTTP chung cho hợp đồng dish-session v4 | `gm_v4_http_check.mjs` |

## Chính sách chọn món (decision / dish policy)

| File | Việc |
|---|---|
| `evaluate_dish_policy.mjs`, `evaluate_dish_policy_v4.mjs` | Chạy luật chọn món thuần (domain) trên fixture |
| `dish_policy_worker.py`, `dish_policy_sql_check.py` | Worker chính sách món phía DB và kiểm SQL tương ứng |
| `dish_v4_ci.py`, `validate_dish_v4_schema.py` | Dựng stack và kiểm schema v4 trong CI |

## Repo, hợp đồng dữ liệu và CI

| File | Việc |
|---|---|
| `validate_repository.py` | Kiểm tài liệu bắt buộc, link, metadata task |
| `task_readiness.py`, `github_project_status.py` | Trạng thái sẵn sàng của task / GitHub Project |
| `build_field_contracts.py`, `validate_field_contracts.py`, `build_gm18_contract.py` | Sinh và kiểm hợp đồng trường dữ liệu |
| `ci_job_report.py`, `ci-requirements.txt` | Báo cáo job CI, thư viện Python cho CI |
| `verify_prototype.cjs` | Kiểm prototype HTML trong `design/` |
| `sync-course-materials.ps1` | Đồng bộ tài liệu môn học (chạy tay, Windows) |
