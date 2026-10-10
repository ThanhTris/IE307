# GM-03 — kết quả kiểm dữ liệu (draft)

Clock lịch sử: `2026-10-10T03:00:00Z`; fixture validationAt: `2026-10-08T00:00:00Z`.

Structure valid: **True**; lỗi: 0; cảnh báo: 9.
Review: Pending. Không xác nhận publish, freshness hiện tại hoặc thuật toán GM-30.

| Kiểm | Kết quả |
|---|---|
| base-manifest | Pass |
| owner-mapping-lossless-replay | Pass |
| taxonomy-registry | Pass |
| form-empty | Pass |
| form-examples | Pass |
| editorial-manifest | Pass |
| editorial-contract-source-price-replay | Pass |
| fixture-manifest | Pass |
| fixture-contract-expected-replay | Pass |

## Lỗi

```json
[]
```

## Giới hạn

- `review_gate`: GM-28 review, accepted assignment and independent Tâm review remain pending.
- `catalogue_target`: 39 base dishes; the 60–80 target is not met.
- `artwork`: 0 selected artworks; 28 metadata candidates do not prove visual suitability or permission review.
- `missing_fields`: 5 descriptions missing; cuisine/meal/flavor/origin/ingredients remain mostly unknown. See editorial statistics.
- `price_scope`: 247 snapshot prices from 21 branches; menu_item_unspecified, portion/expiry unknown; no current or per-person price claim.
- `source_rights_freshness`: 24/27 draft sources have unknown usage rights; 3 reference-text sources record licenses. All lack expiry/reviewer. Historical audit does not establish current freshness or reuse permission.
- `real_offerings`: Real venue/offering/schedule/coverage arrays are empty; GM-27 must supply verified selling data.
- `algorithm`: Fixtures validate input/expected integrity only; GM-30 execution and TypeScript/SQL parity not run.
- `runner`: Notebook tested through Python exec, not a Jupyter kernel; native/SQL and human review not run.

Số liệu, inventory SHA-256 và nguồn/license chi tiết nằm trong report.json cùng thư mục.
