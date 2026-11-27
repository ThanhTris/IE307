# GM-51 · Kiểm thử catalogue hosted v1

Ngày 27/11/2026 (ICT). Kiểm trên nhánh `codex/gm-51-hosted-catalogue`, local
HEAD `6c810ed` cộng patch GM-51 chưa commit, base `origin/main`
`35c60f1c73ba3276da3bfcb4aeb34684376446bd`. Dataset staging `1.5.0`, SHA
`83965ae6d50848c58420ac2c99d1ebf5a5ac8b9be1ea8fcf05a2fa31e378bb7f`.
[Manifest](staging-manifest.json) · [Báo cáo floor JSON](staging-release-floor.json).

| AC | Trạng thái | Dữ liệu, lệnh và kết quả |
| --- | --- | --- |
| Floor, version, schema, coverage | Pass | `python3 scripts/release_catalogue_check.py --bundle .work/gm51-hosted-release/staging/dishes.json --json .work/gm51-hosted-release/staging/release-floor.json`. 33/33 tiêu chí, 253 món, sáng 68, trưa 100, tối 72, ăn vặt 114. 136 ảnh chụp và 117 minh họa nhóm. |
| Nguồn mô tả và ảnh | Pass | 253/253 mô tả do nhóm viết và được Tâm rà, 188/188 URL `team_authored_fact_reference` trong report. Bằng chứng checksum 300 WebP ảnh/thumbnail staging lấy từ [run GM-47](https://github.com/ThanhTris/IE307/actions/runs/45837612273). Ngày 27/11/2026 chạy lại verifier công khai, cả 300 object trùng với receipt đã ghim. Giữ nguồn, license và ghi công theo UUID. |
| Guard, dry-run, hash, QA cũ | Pass | `python3 -m unittest discover -s tests -p test_catalogue_release.py`. Sai đích/confirm, DSN trỏ DB lạ hoặc hạ TLS, hash/manifest/receipt sai đều bị chặn. Dry-run giữ offline. Guard GM-40 và bản demo 39 món được kiểm. |
| Nạp, readback, kích hoạt và rollback | Pass trên SQL QA | PostgreSQL thật 17.11, Supabase image, container tách mạng; áp 52 migration đến 0066, nạp demo 39 món rồi chạy 0067 lên schema 0.31.10 và kiểm bản demo còn nguyên. Nạp 253 món với `test_only=false`; SHA và count khớp. Lặp cùng release giữ một hàng. Sai active/SHA, ID trùng và lỗi sau kích hoạt đều bị từ chối hoặc rollback nguyên tử. Khôi phục bản cũ và trường hợp trước đó chưa có active. ACL app role và guard bất biến còn hiệu lực. |
| Tạo phòng từ bundle thật | Pass trên SQL QA | `GM51_QA_CONTAINER=ie307-gm51-local-qa-20261127 python3 -m unittest discover -s tests -p test_catalogue_release.py`. SQL gọi `public.dish_session` bằng role authenticated với hai tài khoản QA. Với 10 và 20 món trên cả bốn bữa, kiểm ACK, join, snapshot và đối chiếu release/hash, số món, UUID duy nhất và bữa. Toàn bộ phòng/tài khoản QA được rollback. |
| Readback, pool và rollback staging hosted | **Not run** | Trí chạy lệnh operator theo [runbook](../../../data/CATALOGUE_RELEASE.md) sau khi xác nhận migration, project và worker. Cần readback đúng 253/hash và kết quả smoke HTTP bốn bữa. |
| Bundle/receipt và kích hoạt production | **Not run** | Chờ receipt 300 object của bucket production, SHA production và review staging. |

SQL chạy trực tiếp trên PostgreSQL trong container tách mạng. Lớp HTTP hosted,
GoTrue và JWT thật chưa nằm trong kết quả QA. Review cuối và trạng thái Done
trên Project do Trí xác nhận.

Đã chạy `python3 scripts/validate_repository.py`, `python3 scripts/task_readiness.py --check-docs`,
`git diff --check` và toàn suite `python3 -m unittest discover -s tests -p 'test_*.py'`
(750 test, 6 skip theo cấu hình). Lượt GM-51 chạy riêng trên container QA đạt 8/8 test. Migration 0067 trong lượt này có SHA-256 `0aa55204aa1e8f1b970a86ef23af12e2d6ad058f75164e72af8870b483fafacc`.
Merge checker với `--gate merge --base-ref origin/main --verify-outputs` trả
`READY_FOR_MERGE_REVIEW` lúc 14:50 ICT. Bốn merge commit đầu vào là ancestor
của đúng SHA main trên GitHub. Kết quả này ghi nhận dependency và artifact.
Hai hàng hosted trong bảng vẫn chờ nghiệm thu.
