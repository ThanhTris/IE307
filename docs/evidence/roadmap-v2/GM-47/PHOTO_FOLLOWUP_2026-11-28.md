# GM-47 · Lô ảnh bổ sung ngày 28/11/2026

Tâm duyệt ba ảnh theo UUID, nguồn, giấy phép và SHA-256 của bản đã xem. Phở hải
sản tiếp tục dùng ảnh minh họa theo lựa chọn đã gửi. [File xác nhận](photo-followup-review-2026-11-28.json)

| Món | Tác giả | Giấy phép | Trang gốc |
| --- | --- | --- | --- |
| Cơm bò | Ceeseven | CC BY-SA 3.0 | [Wikimedia Commons](https://commons.wikimedia.org/wiki/File:Vietnamese_Beef_Cube_Red_Rice.jpg) |
| Bún nem nướng | Calgary Reviews | CC BY 2.0 | [Flickr](https://www.flickr.com/photos/51930963@N02/5095256061/) |
| Ốc len xào dừa | Coco Kim (phuongkim1981) | CC BY 2.0 | [Flickr](https://www.flickr.com/photos/phuongkim1981/12768000434/) |

Overlay [photo-additions-2026-11-28](../../../../data-preparation/editorial/gm47-release/photo-additions-2026-11-28.json)
ghim SHA inventory gốc và file xác nhận. Ảnh chính trong ZIP khớp ảnh Tâm duyệt.
ZIP có ba ảnh chính, ba thumbnail (293.054 byte ảnh), ghi công và hồ sơ từng giấy phép.
Importer chấp nhận ảnh Flickr CC BY/CC BY-SA khi mã ảnh trên trang nguồn và URL CDN khớp nhau.

## Kết quả QA

- Trên nhánh `codex/gm-47-photo-coverage` dựa vào `365f965`, dựng lại bundle
  `1.4.5` khớp SHA `2ec58cdcc81aba6df84656e5431d5e0465a40ffcf3e53ff8d61039db60cf5304`.
  Candidate `1.4.6` đổi ảnh đúng ba UUID, thêm ba bản ghi nguồn và giữ đầy đủ 253 món.
- Fixture receipt dùng 300 bản ghi Storage của lô trước và sáu tệp thật của ZIP.
  PostgreSQL 17.11 cô lập, tắt mạng, áp 52 migration. Nạp hai lần và đọc lại
  đúng một release `test_only`, SHA đúng và 253 thẻ khớp từng trường.
  [Readback SQL QA](qa-photo-followup-2026-11-28.json)
- 15 test GM-47 và 6 test checker đạt. Toàn suite đạt với 745 test được liệt kê,
  5 skip theo cấu hình. Bundle QA đạt 33/33 tiêu chí cơ bản.
  Lệnh kèm `--require-photo-ratio` còn 15 tiêu chí thiếu ảnh chụp.
- Sau khi lô này lên Storage, dự kiến 139/253 món có ảnh chụp, 114 món dùng
  minh họa. Còn 93 mục P1 theo danh sách Trí chốt. [CSV cập nhật](photo-gap-2026-11-28.csv)

| Nhóm có thay đổi | Món dùng minh họa sau lô | Giới hạn | Cần thêm |
| --- | ---: | ---: | ---: |
| Lẩu & Nướng | 22 | 3 | 19 |
| Cơm | 18 | 2 | 16 |
| Bún / Phở | 11 | 2 | 9 |
| Ốc & Hải sản | 9 | 1 | 8 |

## Bàn giao cho Trí

Gói cục bộ `.work/gm47-release-editorial/photo-additions/GM-47-anh-da-duyet-2026-11-28.zip`.
Tải ba ảnh chính lên gốc bucket theo UUID và ba thumbnail lên `thumbnails/`.
Sau khi tải, dùng verifier để kiểm lại toàn bộ 306 object công khai, gồm cả ảnh
mới, ảnh đã có và minh họa còn dùng. Cần receipt mới trước khi GM-51 ghim SHA
của bundle phát hành.

```sh
overlay=data-preparation/editorial/gm47-release/photo-additions-2026-11-28.json
out=.work/gm47-release-editorial

python3 data-preparation/scripts/gm47_storage_receipt.py \
  --bucket-url "$GM47_PUBLIC_BUCKET" --candidate-version 1.4.6 \
  --image-prefix '' --thumbnail-prefix thumbnails --with-illustrations \
  --photo-additions "$overlay"
python3 data-preparation/scripts/gm47_release_editorial.py \
  --storage-receipt "$out/storage-receipt.json" --photo-additions "$overlay"
python3 scripts/release_catalogue_check.py --bundle "$out/with-storage/dishes.json" \
  --require-photo-ratio
python3 scripts/gm47_catalogue_check.py --release-editorial \
  --qa-manifest "$GM47_QA_MANIFEST" --storage-receipt "$out/storage-receipt.json" \
  --photo-additions "$overlay"
```

Receipt công khai cho sáu object mới và QA theo manifest GM-03 chưa chạy.
GM-47 vẫn chờ đạt tỷ lệ ảnh chụp trước nghiệm thu.
