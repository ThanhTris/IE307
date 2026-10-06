# ADR-002 — Hai vòng, server chốt

Status: Proposed. Ngày 2026-10-06.

Hoàn tất một vòng trước khi finalize để mọi máy nhất quán. Thiếu phiếu không thành OK. Vòng 2 chỉ loại dần tập tất cả chấp nhận; không nới NO, không reroll.

Đánh đổi: chờ người cuối; không bảo đảm có món. UI cần chờ/hủy/expiry. [Policy](../../specs/DECISION_SPEC.md) có invariant và test. Công bằng qua nhiều bữa là P2 vì phải định nghĩa đo “nhường” đáng tin cậy.
