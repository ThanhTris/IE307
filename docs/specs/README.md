# Spec index food-v1

> **Ngữ cảnh hiện hành 2026-10-25:** [phạm vi BE/Data](../project/BE_DATA_ONLY_SCOPE_2026-10-25.md), [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md), [ADR-020](../architecture/decisions/ADR-020-public-top-three-result.md) và [audit source/UI](../project/UI_BE_DATA_SYNC_AUDIT_2026-10-25.md) ưu tiên cho phần bổ sung mới: max20 người, pool đầu10–20 độc lập quán/GPS, không ready, R2 thật với N>=1/cap30% min1, canonical Top3/history. Runtime B chưa triển khai. Nội dung food-v1 bên dưới là baseline cho truy vết/phiên legacy; không dùng luật8 người/ready/quán bắt buộc để triển khai policy mới. FE giữ scope cũ tới khi Trí giao riêng.

2026-10-07, spec index baseline food-v1; GM-01 được Trí duyệt ngày2026-10-10. Phần bổ sung theo nguồn hiện hành ở trên. [Mô tả hệ thống](../product/SYSTEM_OVERVIEW.md) trước, [FR](../product/FUNCTIONAL_REQUIREMENTS.md) sau.

- [ROOM_SPEC](ROOM_SPEC.md): vòng đời/ready/roster/expiry.
- [CATALOG_PREFERENCES_SPEC](CATALOG_PREFERENCES_SPEC.md): danh mục/category/pool.
- [DECISION_SPEC](DECISION_SPEC.md): decision-v2, score/veto/hai vòng/tiers.
- [UI_SPEC](UI_SPEC.md) & [UI_DESIGN_SPECIFICATION](UI_DESIGN_SPECIFICATION.md): UI-01..16, design tokens, component mapping, double-tap/accessibility.
- [IDENTITY_PRIVACY_SPEC](IDENTITY_PRIVACY_SPEC.md): guest/pair/ACL/consent/retention.
- [OFFLINE_SYNC_SPEC](OFFLINE_SYNC_SPEC.md): cache/outbox/retry/reconnect.
- [NOTIFICATIONS_LINKS_SPEC](NOTIFICATIONS_LINKS_SPEC.md): push/inbox/incoming link.
- [CONTEXT_HISTORY_SPEC](CONTEXT_HISTORY_SPEC.md): giờ/budget/history và context khu vực core.
- [FOOD_DATA_SPEC](FOOD_DATA_SPEC.md): taxonomy/quán–món/lịch bán/coverage/eligibility P0; weather/mood P2.
- [SOCIAL_DISCOVERY_SPEC](SOCIAL_DISCOVERY_SPEC.md): avatar quick invite và review/location.
- [RELEASE_SPEC](RELEASE_SPEC.md), [EXTENSIONS_SPEC](EXTENSIONS_SPEC.md): bàn giao và OCR/AI/weather–mood P2.

[Traceability](TRACEABILITY.md) · [data](../architecture/DATA_MODEL.md) · [RPC](../architecture/API_CONTRACT.md) · [task summary](../project/TASK_SUMMARY.md).
