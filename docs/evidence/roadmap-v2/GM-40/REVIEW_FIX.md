# PR #129 — Sửa validator sau review Trí

Ngày 2026-10-22; owner Vinh, reviewer Trí. Chưa Approved/Done. Nhận comment
[hai lỗi admission](https://github.com/ThanhTris/IE307/pull/129#issuecomment-6321616549)
và [bổ sung phạm vi](https://github.com/ThanhTris/IE307/pull/129#issuecomment-6335584774).
Head bị review `58890c274ebf5c67f370d946421f303762921141`; đã rebase main
`d8245a02c85d5b3bc4888a826589e99c1dc58a6d` trước patch.

## Thay đổi

- Kiểm taxonomy.code với vocabulary theo type cuisine/origin/category; category
  phải đúng namespace family/preparation. FK đúng UUID không miễn kiểm code.
  Lỗi TAXONOMY_CODE ghi chính xác entities.taxonomy[i].code.
- Kiểm uniqueness cả price ID và (dishId,sourceMenuItemId,snapshotSha256).
  Kiểm UUIDv5 đúng công thức đã công bố; builder và validator dùng cùng helper.
  Không sửa công thức, key hoặc UUID đã xuất. Lỗi DUPLICATE/IDENTITY theo row/field.
- Tests dùng giá hoàn toàn mô phỏng với golden UUID độc lập; kiểm sai UUID đơn lẻ,
  trùng tuple khác amount/UUID, trùng ID, khác snapshot và khác menu vẫn riêng.
  Kiểm --input thực từ subprocess để chặn lỗi trên đường admission CLI.
- Bổ sung HANDOFF bảng endpoint/profile/version/consumer: RPC mốc B chỉ là đề xuất,
  public create_room/RoomContext chưa hết phụ thuộc anchor/radius. ADR-019 điều phối
  consumer riêng, không gom policy/room/UI hoặc phone tests vào patch offline.

## Kiểm

Contract suite **31 tests, OK** trên macOS/Python 3.12.14; bundle thật, fixture,
template và mọi code trong registry hiện hành Pass. 5 artifact build offline vẫn
stale=[]; bundle/schema/manifest không đổi byte. Full regression và gate được ghi
trong CHECKS sau lượt chạy. Không gọi lại nguồn/AI, thêm package, sửa registry,
snapshot, migrations hoặc runtime. SQL/API và Android vẫn Not run, ADR-018 Proposed.

Source hashes/kết quả cuối ở [review results](review-fix-results.json);
input–expected–actual ở [cases](review-fix-cases.json). Full regression 583/583,
contract 31/31 và repo/index/diff đạt. Không dùng docs này làm approval Trí.

Đã nhận thêm main PR131 `0d571b7316c0443bc766dca564407fd0abf521ac` trước push.
HANDOFF phân biệt dish_session đã merge với RPC catalogue đề xuất; mốc B phải nhận
immutable private release/runtime đã có, không dựng lại modules hoặc kích hoạt data.
