## Thay đổi

GM-10 — UI thiết lập phòng và khẩu vị dish-only, related issue #71.
Nhánh `codex/gm-10-figma-update` → `main`, owner Tuấn, reviewer Trí
(`ThanhTris`), revision `ui-figma-final/2026-10-25/GM-10.2`.

Luồng mock Home → Tạo phòng dùng UI xanh/kem theo PNG Figma: chọn buổi,
giờ UTC+7, 10–20 món, ngân sách, bạn và khẩu vị riêng. Bổ sung wheel/lịch,
chọn nhiều, nhiệt độ/4 vị/consent, lỗi/nháp/retry, sửa và xác nhận hủy.
Giữ đường real/legacy còn consumer; route real mới có guard, chưa có
adapter dish-only. Không đổi package, API, SQL, schema hoặc engine.

## Bàn giao và validation

- Handoff: `docs/evidence/roadmap-v2/GM-10/figma-update/FINAL_HANDOFF.md`.
  Có port read/write, mapping trách nhiệm GM-24/25/11/31, routes,
  retry/ACK/readback/privacy và checklist kiểm lại.
- Source `c514bc0`: 47 suites/878 tests, TypeScript, lint
  src/tests/scripts, architecture, PNG 28/28 và Android export Pass.
- Người dùng xác nhận hoàn thiện chung; chưa có kết quả riêng từng
  viewport/a11y/native case. Không nghiệm thu API/SQL/lobby/outbox thật.
- Giới hạn cũ: full lint vướng 4 import QA local; Python vướng quyền
  symlink Windows. Chi tiết revision cuối: `FINAL_REVIEW_CHECKS.json`.
- Đã fetch main `1939d35`; merge gate live 2026-11-02 trả
  READY_FOR_MERGE_REVIEW. Nhánh có đủ main này; trước merge kiểm lại gate.

## Reviewer Trí

- [ ] Kiểm diff, AC/visual/device còn thiếu, artifact/version upstream
  trên target và source/tests đúng revision cuối.
- [ ] Kiểm gate hiện hành và các giới hạn test; quyết định nghiệm thu,
  merge và trạng thái Project. Handoff/checker không tự cấp approval.

Rollback bằng revert thay đổi UI qua review; không cần thay database.
