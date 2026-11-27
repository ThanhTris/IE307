# GM-51 · Bàn giao catalogue hosted v1

[Issue #187](https://github.com/ThanhTris/IE307/issues/187)  ·
[PR draft #209](https://github.com/ThanhTris/IE307/pull/209)  ·
Tâm thực hiện, Trí review. Track DATA, stage import. Nhánh
`codex/gm-51-hosted-catalogue`, target `main`. Contract task
`release-v1/2026-11-20/GM-51.1`. Spec
[RELEASE_V1_CATALOGUE_SPEC](../../../data/RELEASE_V1_CATALOGUE_SPEC.md).

| Input | Artifact và bản merge có trên `origin/main` | Kiểm trong GM-51 |
| --- | --- | --- |
| GM-08 | Food provenance và import, [#103](https://github.com/ThanhTris/IE307/pull/103), `3076c3deb2937223a007b82211a61a2d61b63c84` | Đối chiếu dependency và manifest dự án |
| GM-40 | Catalogue và importer QA, [#144](https://github.com/ThanhTris/IE307/pull/144), `ac428b202176df93f2742197fdbcbb83966e5dae` | Guard QA và nạp lại bản demo 39 món |
| GM-41 | Bundle/taxonomy 1.1.0, [#201](https://github.com/ThanhTris/IE307/pull/201), `0174746a2c2e132c96e973b3af7730fd97b73839` | Build đối chiếu SHA upstream, schema và taxonomy |
| GM-47 | Bản 1.4.5 đã nối ảnh, [#217](https://github.com/ThanhTris/IE307/pull/217), `35c60f1c73ba3276da3bfcb4aeb34684376446bd` | 253 mô tả đã duyệt, 188 URL tra dữ kiện, 300 object, toàn bộ floor đạt |

## Output

- [Importer hosted](../../../../supabase/seed/import_hosted_catalogue.py) cung cấp
  `hosted-build`, `hosted-import`, `hosted-readback`, `hosted-rollback`.
  Đường nạp QA hiện hữu vẫn dùng importer GM-40.
- [Migration GM-51](../../../../supabase/migrations/0067_gm51_hosted_catalogue.sql)
  cho phép release hosted có version trong bảng private hiện hữu. Bản ghi giữ
  cùng schema, RLS, ràng buộc bất biến và tối đa một release active. Schema registry `0.31.10`. Số migration
  phụ thuộc thứ tự merge thực tế.
- [Runbook](../../../data/CATALOGUE_RELEASE.md) có lệnh dựng, nạp, rollback, và smoke
  tạo phòng cho cả bốn bữa với hai tài khoản. Bản `1.5.0` dùng GM-41 schema
  `1.1.0`, projection `GM18.2` và runtime `dish-session-v4/roadmap-v2/GM-07.B`.
- [Manifest staging](staging-manifest.json) và [release floor](staging-release-floor.json).
  Release ID `dish-catalogue-v1:1.5.0:gm18.2`, SHA
  `83965ae6d50848c58420ac2c99d1ebf5a5ac8b9be1ea8fcf05a2fa31e378bb7f`.
  Bản staging có 253 món gồm 136 ảnh chụp và 117 minh họa nhóm.
  Xem [CHECKS](CHECKS.md) để đối chiếu kết quả và giới hạn.

## Bước còn lại

Trí phối hợp GM-52 để áp đúng migration trên staging, nạp theo SHA đã review,
chạy readback và smoke staging, rồi ghi kết quả dưới cùng revision PR. GM-52
nhận release/hash cho parity và GM-64 nhận `linked-artwork.json` theo UUID
để nối ảnh chính, ảnh nhỏ và thông tin ghi công. Trước production, cần receipt
300 object của bucket production và SHA riêng đã review. Draft giữ mở trong
khi chờ kết quả hosted và review của Trí.
