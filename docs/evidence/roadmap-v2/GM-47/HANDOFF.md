# GM-47 · Bàn giao bổ sung biên tập

## Lô release v1 ngày 25/11/2026

Nhận [GM-41 bundle 1.3.0](../GM-41/HANDOFF.md) qua #210, gồm 253 UUID, trên target `6cd5e1a`. [Nguồn mô tả](../../../../data-preparation/editorial/gm47-release/descriptions.json) và [hồ sơ ảnh](../../../../data-preparation/editorial/gm47-release/artwork-candidates.json) được ghim vào SHA-256 của bundle đầu vào. Dựng candidate QA `1.4.2` vào `.work/gm47-release-editorial/` cùng manifest, báo cáo và danh sách nguồn mô tả.

```sh
python data-preparation/scripts/gm47_release_editorial.py
python -m unittest discover -s tests -p 'test_gm47*.py'
python scripts/release_catalogue_check.py --bundle .work/gm47-release-editorial/dishes.json --json .work/gm47-release-editorial/release-floor.json
```

Checker hiện đạt 32/33 mục. Kiểm readback trên [QA GM-03](../GM-03/RUNBOOK_QA.md) bằng `python scripts/gm47_catalogue_check.py --qa-manifest <manifest> --release-editorial`. Runner so projection với 1.3.0, kiểm import test-only, hash, 253 thẻ và release active. Trạng thái chạy nằm trong [CHECKS](CHECKS.md).

### Gói ảnh cho Trí và Tuấn

Gói cục bộ `.work/gm47-release-editorial/gm47-storage-handoff.zip` có 71 ảnh chính và 71 ảnh nhỏ do Tâm xác nhận, tổng 8.119.446 byte ảnh. Có thể tái tạo từ ảnh chính đã chuẩn bị bằng Python có Pillow 13.0.0 và WebP encoder cùng bản. Lệnh kiểm SHA nguồn, xuất gói và từ chối metadata không khớp.

```sh
python data-preparation/scripts/gm47_storage_handoff.py --images .work/gm47-release-editorial/images
```

- `images/<dishId>.webp` là ảnh chính. `thumbnails/<dishId>.webp` là ảnh danh sách 400×300 px. Đây là object key đề xuất để Trí dùng trong bucket công khai GM-52. Mỗi URL đích là URL gốc công khai của bucket tại môi trường tương ứng cộng object key. Xác nhận URL gốc và tải tệp trước khi gắn `artwork.url` và bàn giao URL ảnh nhỏ cho Tuấn. URL tệp Commons trong metadata dùng làm bằng chứng nguồn.
- Gói kèm `artwork-candidates.json` có tác giả, giấy phép, kích thước, số byte, SHA và `aiCheck` của từng tệp, cùng `ATTRIBUTION.md` để Tuấn triển khai màn Nguồn ảnh trong GM-64. Giữ giấy phép và ghi công cho cả hai bản dẫn xuất. Ảnh Chuối nếp nướng đã đổi SHA và tác giả. Nếu từng nhận gói cũ, chọn bản hiện tại khi upload.
- `artwork-assignments.csv` chia 181 món thiếu ảnh theo sáu batch GM-41 và nhóm UUID ban đầu. Ngoài ra, dòng Bánh crepe ngọt có trạng thái riêng `release_exclusion_requested`. Gói hiện tại đã rút ảnh của món này. Trí chốt đề xuất bỏ món khỏi bản phát hành. Với ảnh nhóm tự chụp, giữ bản gốc có EXIF và đường dẫn xác nhận cho phép dùng (`permissionEvidence`).

### Tâm xác nhận ảnh và mô tả

- Mở ảnh, trang nguồn và thông tin license cho từng UUID. Sau khi Tâm xác nhận ảnh đúng món và đúng nguồn gốc, ghi tên Tâm vào `aiCheck.checkedBy`, thời điểm UTC thực tế vào `aiCheck.checkedAt` và `real_photo` vào `aiCheck.verdict`. Bản ghi chờ có `pending_human_review`. Kết quả rà bằng công cụ nằm trong `assistance`.
- Với mô tả, đối chiếu từng câu với URL và các dữ kiện ghi ở `factReview.facts`. Sau khi Tâm xác nhận, ghi tên Tâm và thời điểm vào `factReview.checkedBy` và `factReview.checkedAt`. Nếu sửa nội dung hoặc URL, phải rà lại và cập nhật `factReview.textSha256` của bản mới trước khi xác nhận.
- Theo quyết định của Trí, GM-51 dùng mô tả do nhóm biên tập và URL để đối chiếu dữ kiện. CSV chỉ ghi `team_authored_fact_reference` khi tất cả mô tả dùng URL đó đã được người kiểm xác nhận. Các cột `prechecked_dish_ids` và `reviewed_dish_ids` ghi kết quả rà. Tâm đã xác nhận 62 mô tả. Có 13 URL đạt và 171 URL còn `needs_confirmation`. Xem [CHECKS](CHECKS.md).

### Sau khi Trí xác nhận upload

Cần URL công khai của bucket staging, object key đã chốt, và thông tin lô đã upload. [Runbook draft GM-52](https://github.com/ThanhTris/IE307/pull/216) ghi bucket `dish-images` và ảnh chính ở gốc dưới dạng `<dishId>.webp`. Nếu Trí xác nhận cách đó, thêm `--image-prefix ''` khi tạo receipt. Xác nhận riêng thư mục ảnh nhỏ và truyền qua `--thumbnail-prefix` nếu khác `thumbnails`.

Dùng lệnh dưới để GET từng ảnh, so số byte và SHA-256. Receipt chỉ sinh khi cả cặp khớp và mục ảnh có xác nhận của người kiểm. Có thể chọn UUID đã upload và đã xác nhận bằng `--dish-id` lặp lại khi thử theo lô.

```sh
python data-preparation/scripts/gm47_storage_receipt.py --bucket-url "$GM47_PUBLIC_BUCKET" --candidate-version 1.4.3
python data-preparation/scripts/gm47_release_editorial.py --storage-receipt .work/gm47-release-editorial/storage-receipt.json
python scripts/release_catalogue_check.py --bundle .work/gm47-release-editorial/with-storage/dishes.json
python scripts/gm47_catalogue_check.py --qa-manifest "$GM47_QA_MANIFEST" --release-editorial --storage-receipt .work/gm47-release-editorial/storage-receipt.json
```

Lệnh dựng giữ artwork chính trong bundle. Báo cáo `with-storage/editorial-report.json` lưu URL ảnh nhỏ theo UUID cho GM-64. Cần PASS cả 33 mục trên bản đủ ảnh, QA đọc lại đúng bundle và xác nhận quyền nguồn mô tả trước phát hành GM-51.

## Lô ngày 20/11/2026

Task [GM-47](https://github.com/ThanhTris/IE307/issues/176), Tâm thực hiện, Trí review. Đầu vào GM-40 qua PR #144 và GM-41 qua PR #201. Dùng UUID GM-41 để ghép thành bản 1.2.1 `test_demo`. GM-51 nhận overlay, nguồn và báo cáo theo bữa để rà quyền và phát hành bản hosted.

1. Chạy `python data-preparation/scripts/gm47_catalogue.py`. Bundle và báo cáo sinh trong `.work/gm47-editorial/`. SHA dự kiến: `5d3781917df1d6d44f046e9b302006c6d9960c7021bc272f09c236c007154075`.
2. So 5 UUID cùng sourceRef và các quyết định ảnh trong [hồ sơ dữ liệu](../../../data/DISH_DESCRIPTIONS_ARTWORK.md). Kiểm SHA 1.1.0 và 1.2.0 trước khi phối hợp gộp bản kế tiếp với Vinh.
3. Dùng [QA GM-03](../GM-03/RUNBOOK_QA.md) và runner bên dưới. Runner nạp candidate dạng test-only, kiểm thẻ projection trên DB và giữ catalogue đang active của QA.

```sh
npm ci
python -m pip install -r scripts/ci-requirements.txt
npm run qa:start -- --run-id gm47-review --api-port 55471 --db-port 55472
python scripts/gm47_catalogue_check.py --qa-manifest .work/qa/gm47-review/manifest.json
npm run qa:stop -- --run-id gm47-review
```

Trong GitHub Actions, job GM-47 tải lên `gm47-editorial-evidence`. Xem [CHECKS](CHECKS.md) để đối chiếu kết quả theo revision.
