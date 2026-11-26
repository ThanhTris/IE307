# GM-47 · Bàn giao bổ sung biên tập

## Lô release v1 ngày 25/11/2026

Nhận [GM-41 bundle 1.3.0](../GM-41/HANDOFF.md) qua #210, gồm 253 UUID, trên target `6cd5e1a`. [Nguồn mô tả](../../../../data-preparation/editorial/gm47-release/descriptions.json) và [hồ sơ ảnh](../../../../data-preparation/editorial/gm47-release/artwork-candidates.json) được ghim vào SHA-256 của bundle đầu vào. Dựng candidate QA `1.4.4` vào `.work/gm47-release-editorial/` cùng manifest, báo cáo và danh sách nguồn mô tả.

```sh
python data-preparation/scripts/gm47_release_editorial.py
python -m unittest discover -s tests -p 'test_gm47*.py'
python scripts/release_catalogue_check.py --bundle .work/gm47-release-editorial/dishes.json --json .work/gm47-release-editorial/release-floor.json
```

Checker hiện đạt 32/33 mục. Kiểm readback trên [QA GM-03](../GM-03/RUNBOOK_QA.md) bằng `python scripts/gm47_catalogue_check.py --qa-manifest <manifest> --release-editorial`. Runner so projection với 1.3.0, kiểm import test-only, hash, 253 thẻ và release active. Trạng thái chạy nằm trong [CHECKS](CHECKS.md).

### Gói ảnh cho Trí và Tuấn

Gói tải lên `.work/gm47-release-editorial/gm47-storage-reviewed.zip` có **136 cặp đã duyệt**, tổng 16.914.034 byte ảnh, kèm `reviewed-dish-ids.txt` và metadata. Bản lô đầu được lưu riêng tại `.work/gm47-release-editorial/review-7157464470/gm47-storage-lot01-107.zip` gồm **107 cặp** như Trí dự kiến. Khi Trí xác nhận lô đã tải, dùng danh sách UUID lấy từ đúng ZIP của lô đó.

```sh
python data-preparation/scripts/gm47_storage_handoff.py --reviewed-only
```

Dựng bằng Python có Pillow 13.0.0 và WebP encoder cùng bản. Lệnh kiểm SHA và số byte. Có thể chạy với các ảnh trong thư mục mặc định `.work/gm47-release-editorial/images`. Lệnh chạy không có `--reviewed-only` xuất gói kiểm ảnh 136 cặp, cùng CSV các món chưa có ảnh.

- Trong ZIP, `images/<dishId>.webp` là ảnh chính và `thumbnails/<dishId>.webp` là ảnh danh sách 400×300 px. Khi upload theo quy ước dự kiến của GM-52, đặt ảnh chính ở gốc bucket và ảnh nhỏ trong `thumbnails/`. Receipt ánh xạ đường dẫn trong ZIP với object key thực tế. URL Commons trong metadata ghi nguồn ảnh.
- Gói tải lên kèm `reviewed-artwork.json` có tác giả, giấy phép, kích thước, số byte, SHA và `aiCheck` của từng tệp, cùng `ATTRIBUTION.md` để Tuấn triển khai màn Nguồn ảnh trong GM-64. Giữ giấy phép và ghi công cho cả hai bản dẫn xuất. Ảnh Chuối nếp nướng đã đổi SHA và tác giả. Nếu từng nhận gói cũ, chọn bản hiện tại khi upload.
- `artwork-assignments.csv` chia 117 món chưa có cặp ảnh theo sáu batch GM-41 và nhóm UUID ban đầu. Trí chốt giữ cả 253 món. Mứt gừng, Bánh phồng tôm, Bánh crepe ngọt và Nui có nước đã có xác nhận của Tâm. Xem [danh sách phân công đủ 117 món](PHOTO_ASSIGNMENTS.md).

### Tâm xác nhận ảnh và mô tả

- Mở ảnh, trang nguồn và thông tin license cho từng UUID. Sau khi Tâm xác nhận ảnh đúng món và đúng nguồn gốc, ghi tên Tâm vào `aiCheck.checkedBy`, thời điểm UTC thực tế vào `aiCheck.checkedAt` và `real_photo` vào `aiCheck.verdict`. Bản ghi chờ có `pending_human_review`. Kết quả rà bằng công cụ nằm trong `assistance`.
- Với mô tả, đối chiếu từng câu với URL và các dữ kiện ghi ở `factReview.facts`. Sau khi Tâm xác nhận, ghi tên Tâm và thời điểm vào `factReview.checkedBy` và `factReview.checkedAt`. Nếu sửa nội dung hoặc URL, phải rà lại và cập nhật `factReview.textSha256` của bản mới trước khi xác nhận. Trang duyệt cục bộ `.work/gm47-release-editorial/anh-dot-tiep/GM-47-duyet-anh-dot-tiep-1.4.4.html` hiển thị ảnh, nguồn, mô tả và tải được JSON chứa UUID cùng SHA của các mục đã chọn.
- Tâm đã chọn ảnh tham khảo cho 117 món còn thiếu cặp ảnh. Dùng [ảnh tham khảo theo UUID và lô](WEB_PHOTO_SELECTIONS.json) để nhận diện món khi tìm nguồn có giấy phép mở hoặc tự chụp. Ảnh tham khảo web nằm ngoài luồng bundle và Storage.
- Theo quyết định của Trí, GM-51 dùng mô tả do nhóm biên tập và URL để đối chiếu dữ kiện. CSV chỉ ghi `team_authored_fact_reference` khi tất cả mô tả dùng URL đó đã được người kiểm xác nhận. Các cột `prechecked_dish_ids` và `reviewed_dish_ids` ghi kết quả rà. Tâm đã xác nhận 253 mô tả. Đủ 188 URL đạt `team_authored_fact_reference`. Xem [CHECKS](CHECKS.md).

### Bộ minh họa theo nhóm cho bản nộp đầu

Theo [quyết định của Trí](https://github.com/ThanhTris/IE307/pull/217#issuecomment-7181026504), 117 món đang thiếu ảnh thật dùng 14 minh họa theo nhóm từ bộ icon có sẵn trong app. Gói tham khảo web tiếp tục chỉ dùng để nhận diện món. Lượt tìm ảnh thật có hai ứng viên chờ Tâm duyệt. [Kết quả rà 117 món](PHOTO_SOURCE_AUDIT.md)

```sh
python data-preparation/scripts/gm47_storage_handoff.py --reviewed-only --with-illustrations
```

Gói `.work/gm47-release-editorial/gm47-storage-with-illustrations.zip` chứa 136 cặp ảnh thật, 14 cặp minh họa, giấy phép Apache-2.0 và `illustration-assignments.json` theo UUID. Trí giữ nguyên đường dẫn `illustrations/<id>.webp` và `illustrations/thumbnails/<id>.webp` khi upload minh họa. Ảnh thật theo đường dẫn ảnh chính và ảnh nhỏ của lô đã chốt.

- Sau khi Trí xác nhận đã tải minh họa, thêm `--with-illustrations` vào lệnh receipt bên dưới. Receipt kiểm đủ hai tệp của mỗi nhóm có dùng. Bộ dựng chỉ gắn minh họa cho UUID đang thiếu ảnh thật. Khi có ảnh thật mới, tải theo UUID món và cập nhật receipt/bundle để giữ đúng nguồn và ghi công. Bộ minh họa dùng chung cho nhiều món.
- GM-64 nhận `linkedArtwork[dishId].kind` là `photo` hoặc `category_illustration`; mục minh họa có thêm `groupCode`, `groupLabel`, `thumbnailUrl`, nguồn và giấy phép. Ghi công trong bundle bắt đầu bằng “Ảnh minh họa nhóm” để tương thích contract hiện hành.

### Sau khi Trí xác nhận upload

Trí đã cung cấp [URL bucket staging](https://cijknqhnmzdsturkzyiz.supabase.co/storage/v1/object/public/dish-images/). Theo [runbook GM-52](https://github.com/ThanhTris/IE307/pull/216), đường dẫn dự kiến là `<dishId>.webp` cho ảnh chính và `thumbnails/<dishId>.webp` cho ảnh nhỏ. Cần Trí xác nhận các đường dẫn và UUID của lô đã upload.

Dùng lệnh dưới để GET từng ảnh, so số byte và SHA-256. Receipt chỉ sinh khi cả cặp khớp và mục ảnh có xác nhận của người kiểm. Với lô từng phần, trích danh sách UUID từ đúng ZIP Trí đã dùng. Giữ bản danh sách đó khi tạo receipt.

```sh
unzip -p "$GM47_UPLOAD_ZIP" reviewed-dish-ids.txt > .work/gm47-release-editorial/reviewed-dish-ids.txt
python data-preparation/scripts/gm47_storage_receipt.py --bucket-url "$GM47_PUBLIC_BUCKET" --candidate-version 1.4.5 \
  --image-prefix '' --thumbnail-prefix thumbnails \
  --dish-list .work/gm47-release-editorial/reviewed-dish-ids.txt
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
