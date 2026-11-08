# GM40.2 — nhận projection GM18 và bàn giao Data

Owner Vinh; reviewer Trí. Base main e3f7058 (GM20#143 đã merge), branch
codex/gm-40-rich-projection. Đây là implementation candidate, không Approved/Done.
GM40 dùng gate GM04/06/07/08/18; không thêm dependency lên GM19/20/21.

## Artifact và version

| Lớp | Version / cách dùng |
| --- | --- |
| Source catalogue | dish-catalogue-v1 schema1.0.0, dataset1.1.0;39 UUID/18 GM08 IDs,247 giá,151 evidence; hash776b1e49…117a2f giữ nguyên |
| Producer nhận | GM18#139,0033/schema0.11.0; contract dish-catalogue/roadmap-v2/GM-18.2; source/path/hash trong MANIFEST |
| Adapter Data | data-preparation/scripts/catalogue_projection.py; GM40.2, không SQL/RPC mới |
| Release rich | dish-catalogue-v1:1.1.0:gm18.2; cùng source SHA, card/schema/projection có checksum riêng |
| Artifact mới | supabase/seed/catalogue/gm18.2/{projection,manifest,coverage}.json |
| Stage schema/template | supabase/seed/templates/dish-catalogue-gm18-stage.{schema,template}.json; schema artifact1.0.0, không thay schema nguồn hoặc API |
| Notebook | data-preparation/notebooks/prepare_catalogue_projection.ipynb; offline,7 code cells |

CLI tái dùng importer GM18 và owned/verify/transaction/activation/restore upstream.
Legacy importer mặc định vẫn tạo release không suffix/card7 trường. Rich importer
không overwrite release đó,18 món legacy hoặc bundle. Dictionary có bảng source→
storage→API và phân biệt source provenance bắt buộc với nullable runtime metadata.
Aliases/origin/timeHints/preparation/evidence vẫn nằm trong source được stage; card
GM18 chưa có các field này nên không tự thêm vào RPC. Không suy thêm nhãn từ tên.

## Chạy offline, không gọi AI/network/DB

```sh
python data-preparation/scripts/dish_catalogue.py --check
python data-preparation/scripts/catalogue_projection.py build --check
python data-preparation/scripts/catalogue_projection.py validate
python data-preparation/scripts/catalogue_projection.py stage --directory data-preparation/datasets/gm40-rich-stage
python -m unittest discover -s tests -p 'test_catalogue_projection.py' -v
```

Build không --check chỉ dùng khi chủ ý nhận thay đổi input/upstream, review diff/hash.
Không chỉnh source hoặc chạy build để che drift. Stage giữ bundle.json nguyên byte
và stage.json card rich. Notebook Run All làm khảo sát/stage/kiểm, không import DB.
Chọn Python kernel có jsonschema tooling hiện hành; đã kiểm cell qua Python runner,
chưa kiểm trực tiếp Jupyter kernel. Không cài package app hoặc gọi lại AI/crawl.

## Owned QA / HTTP

```sh
python scripts/gm40_rich_projection_check.py --report /tmp/gm40-rich-results.json
python scripts/gm18_dish_check.py --report /tmp/gm18-consumer-regression.json
```

Runner đầu mở rộng runner GM40 đã có: tạo DB gm08_check_<random> có owner marker,
áp toàn bộ migrations hiện hành trên DB đó, verify definitions/ledger, ký JWT cho
synthetic auth.users và tạo PostgREST loopback/worker riêng. App DB chỉ đọc auth DDL
và config trong bộ nhớ, không reset/migrate/copy user records; credential không ghi
vào evidence. Cleanup chỉ DB/REST/worker sở hữu. Đây là JWT SQL/HTTP thật với identity
mô phỏng; không phải GoTrue signup, Bruno desktop, Android hoặc production evidence.
CI chạy cùng adapter QA sau check deterministic artifact; dùng jsonschema pin đã có.

RPC nhận nguyên từ GM18: POST get_dish_catalogue / preview_dish_pool với
`{"payload":{"contractVersion":"dish-catalogue/roadmap-v2/GM-18.2",...}}`.
Wire/card guard/schema/error/ACL xem docs/architecture/GM18_DISH_CATALOGUE_API.md;
request placeholders xem supabase/tests/http/GM-40.http. Gateway cần public key +
caller JWT; direct PostgREST QA dùng JWT. Không dùng secret/service_role trong client.
Endpoint hết hiệu lực sau cleanup. Không giả endpoint app54321 đã được migrate.

Manual CLI sau khi đã có QA namespace hợp lệ:

```sh
python data-preparation/scripts/catalogue_projection.py import --database gm08_check_OWNED --namespace OWNER_UUID --activate
python data-preparation/scripts/catalogue_projection.py readback --database gm08_check_OWNED --namespace OWNER_UUID --release-id dish-catalogue-v1:1.1.0:gm18.2
python data-preparation/scripts/catalogue_projection.py activate --database gm08_check_OWNED --namespace OWNER_UUID --release-id PREVIOUS_TEST_RELEASE
```

Các placeholder không chạy nguyên dạng; runner tự cấp namespace đúng. Không tự tạo
marker trên DB app để vượt guard. CLI mặc định import inactive. Cùng release/hash/
card bytes là no-op; khác source hoặc projection cùng release bị từ chối. Import
và activation cùng transaction; failure không để candidate/active dở. Restore chỉ
đổi active của release test đã có, không xóa release hoặc đổi snapshot đã khóa.
Phiên1.1.1 trong test là candidate QA riêng, không phải phát hành dataset mới.

## Coverage và giới hạn

- 39 món, sáng14/trưa23/tối7/snack1,9 chưa biết bữa; không coi [] phù hợp mọi bữa.
- Preview trưa10/20 và sáng10 đủ; sáng20/tối10/20/snack10/20 trả shortage thực.
- Taxonomy term×meal là mô tả, không phải hard filter được RPC hỗ trợ. Preferences
  ranking vẫn UNSUPPORTED; Data không tính winner/score/rank hoặc bù món R2.
- 247 observation;17 món có giá hiển thị,22 tie ở timestamp mới nhất bị ẩn. Latest
  amount null/metadata không biểu diễn được theo B không fallback cũ, không thành0.
  Unit menu_item_unspecified giữ nguyên; không giá/người/trung bình hoặc claim hiện tại.
- 37 temperature unknown/null,39 flavor null,39 artwork null. Giữ nguồn/quyền ảnh,
  không bịa artwork hoặc suy an toàn dị ứng/thành phần từ tên.

CHECKS và MANIFEST pin source/upstream/migration/schema/hash/expected–actual. QA gồm
legacy v2/v3 snapshot/result/FK, rich import/HTTP/schema/shortage/restore và upstream
GM18 v4 regression. Không coi Data check là nghiệm thu mọi integration GM20/21,
Android/FE/Places hay production. Artifact bàn giao cho consumer theo version/hash;
Trí quyết định review/approval, agent không đổi Project Status hoặc Done.

Không có migration mới nên README migrations upstream giữ nguyên byte. Đường dẫn/
hash0033/0035 được pin ở manifest bàn giao này. Fixture R2 B dùng server tick đã
merge từ driver QA; không coi ca Data này là nghiệm thu timer/consumer mới.
