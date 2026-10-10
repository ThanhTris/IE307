# Catalogue món có nguồn — GM-03 phần 3

Phiên bản dataset **0.2.0**, contract **1.0.0**. 39 món gốc giữ UUID, version bản ghi tăng lên 2. Mẫu menu Thủ Đức cũ từ snapshot ngày 2026-10-09; biên tập ngày 2026-10-10. Owner yêu cầu hoàn thiện 39 món trước, chưa đạt mục tiêu 60–80. Tất cả draft/needs_review; chưa có reviewer độc lập, hạn hiệu lực hoặc approval GM-28. Nơi bán đủ điều kiện gợi ý thuộc GM-27, áp dụng eligibility thuộc GM-30.

## Đọc và sửa ở đâu

| File | Vai trò |
| --- | --- |
| [Notebook](../notebooks/prepare_editorial_catalogue.ipynb) | 7 khối: cấu hình, nguồn, biên tập, ảnh/license, giá, kiểm, xuất/đọc lại |
| [Config từng ID](../config/editorial_catalogue_v1.json) | 39 amendment có mô tả/alias/taxonomy và evidence từng trường; chưa biết để null/unknown/array rỗng |
| [Nguồn tham khảo](../config/editorial_source_evidence_v1.json) | URL, revision khi đọc được, ngày kiểm, tóm tắt phạm vi bằng chứng; checksum raw captures và danh sách URL refresh |
| [Ứng viên ảnh](../config/editorial_image_candidates_v1.json) | Metadata từng file, trạng thái rà/loại và lý do; chưa kiểm nội dung ảnh thì không chọn |
| [Module](../scripts/editorial_catalogue.py) | Đọc snapshot, bảo toàn ID/giá, resolve taxonomy UUID, validate và export; không import/gọi pipeline GPT |
| [Catalogue JSON](../snapshots/editorial-v0.2.0/catalogue.json) | Bundle 11 entity; dishes/taxonomy/dataSources/datasetVersions có dữ liệu draft |
| [Catalogue CSV](../snapshots/editorial-v0.2.0/csv/dishes.csv) | 39 dòng theo contract; cùng thư mục có 10 CSV entity còn lại và bundle.json |
| [Giá](../snapshots/editorial-v0.2.0/price_references.csv) | 247 dòng: món UUID ↔ menu item khảo sát ↔ chi nhánh ↔ giá/đơn vị/URL/checksum/ngày snapshot |
| [Ảnh/ghi công](../snapshots/editorial-v0.2.0/image_references.csv) | 60 dòng gồm 28 ứng viên ảnh và 32 dòng ghi chưa có ứng viên đủ điều kiện; không phải 60 ảnh được chọn |
| [Bằng chứng từng trường](../snapshots/editorial-v0.2.0/field_evidence.csv) | Dish ID/field/sourceRef/sourceKey/basis/note/menuItemIds; bổ sung độ chi tiết cho fieldSources của contract |
| [Báo cáo](../snapshots/editorial-v0.2.0/QUALITY_REPORT.md) và [manifest](../snapshots/editorial-v0.2.0/manifest.json) | Số liệu, thiếu sót từng món, checksum/bytes và đầu vào |

Metadata nguồn web đầy đủ nằm trong `datasets/editorial-catalogue/raw/` được Git bỏ qua. File có trên máy phải khớp checksum; clone mới vẫn replay offline từ evidence trích xuất được Git theo dõi. Không ghi đè ba snapshot phần 1, không sửa codebook/cache GPT hay registry UUID.

Checksum rawCaptures băm file snapshot JSON/metadata đã lưu. Collector khảo sát ban đầu chỉ giữ JSON đã parse và SHA response ban đầu, không lưu nguyên byte HTTP; hai loại checksum này không được coi là cùng giá trị. Refresh mới lưu nguyên byte response và băm byte đó. Bản source evidence trích xuất được pin checksum riêng trong config.

## Quy tắc biên tập

Category family là nhãn theo tên/nhóm menu và quy tắc gộp owner; không dùng như bằng chứng thành phần. Chỉ bổ sung cách hấp cho bánh bao/bánh cuốn khi nguồn tham khảo mô tả rõ. Cuisine đã có nguồn cho bánh bao, bánh cuốn, bánh ướt, phở bò và phở gà; không gán cuisine Việt cho toàn bộ món chỉ vì bán ở Thủ Đức. Bánh cuốn có alias Bánh quấn theo nguồn; Bánh ướt không trở thành alias của Bánh cuốn. Tên chi tiết/topping còn ở mapping/menuOfferings nguồn.

Bánh bao có breakfast/snack, bánh cuốn có breakfast từ nguồn tham khảo. Phở nước bò/gà có hot; bún bò gộp nước/khô/trộn vẫn temperature unknown. Origin north của bánh cuốn là nguồn gốc, không giới hạn địa điểm bán. Origin phở giữ unknown vì nguồn ghi tranh luận lịch sử. Meal slot phổ biến không chứng minh lịch bán. Không suy flavor, ingredientTags hay an toàn dị ứng từ tên.

34 mô tả viết theo phạm vi nhóm/phiên bản menu hoặc tham khảo, không sao chép một công thức cho cả nhóm. Còn thiếu mô tả cho Bún mọc, Cơm canh khổ qua, Cơm cá kho, Cơm tôm rim, Cơm đậu hủ sốt cà. Nguồn là evidence biên tập draft; schema-valid không thay review nội dung. Trường taxonomy của contract chỉ cho một sourceRef mỗi nhóm; dùng field_evidence.csv để biết nguồn riêng cho cuisine/category/meal/origin/temperature. Các sourceRef của sidecar đều có trong dataSources.

## Ảnh và giá

Đã tra 39 tên trên Commons API: 10 lượt lấy được metadata, 29 lỗi 429; 20 lượt API bài tham khảo cũng lỗi 429. Bộ collector khám phá ban đầu chạy 3 worker và tiếp tục sau lỗi; không sử dụng lại collector đó. Module refresh mới chạy tuần tự, lưu lỗi và dừng ngay 403/429, không tự retry. Các trang tham khảo và một số trang file được đọc bằng web tool; xem nội dung ảnh trong browser bị 403/429. **0 artwork được chọn**, 28 ứng viên giữ metadata, 5 ứng viên bị loại (PDF hoặc không chứng minh đúng bánh ướt), 23 cần kiểm hình ảnh. Không báo metadata-license là đã kiểm ảnh.

Mỗi ứng viên có file URL, file page, tác giả (không dùng bot upload làm tác giả), license/link, dòng ghi công dự kiến, revision và ngày lấy. License chưa đủ hoặc chưa xem ảnh thì artwork=null. Khi chọn ảnh, cần kiểm lại trang file, nội dung khớp món và ghi visualNote/visualCheckedAt/filePageCheckedAt; module bắt buộc đủ metadata và license cho phép. Các điều kiện cụ thể phải đọc theo [hướng dẫn Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia); dòng ghi công ảnh Kham Tran còn giữ link tác giả yêu cầu. ShareAlike/attribution phải được xử lý khi dùng trong ứng dụng sau này. Chưa tải ảnh vào assets.

Giá có nguồn cho đủ **247 mục menu từ 21 chi nhánh**, gắn đúng từng source_id/menu_item_id/venue_id khảo sát. Giữ nguyên priceRaw, priceValue, VND, menu_item_unspecified, source URL, checksum và checkedAt từ snapshot. checkedAt của bảng này giữ chuỗi UTC gốc (offset +00:00), không phải ngày biên tập; timestamp trong entity contract dùng Z. portion/validUntil=null. Không tính giá/người, giá trung bình hoặc giá chung món gốc; không chứng minh giá hiện tại.

Venue/offering/lịch/availability/coverage/anchor arrays trong bundle vẫn rỗng; bảng giá chỉ là tham khảo nghiên cứu, không FK tới entity venue đã xác minh. Metadata menu khác (mô tả/ảnh/quán/lịch quan sát) vẫn nguyên trạng trong menuOfferings của snapshot phần 1, truy ngược bằng menuItemId; không nhân đôi hoặc ghép giữa quán.

## Chạy lại

Mở notebook, chọn Python kernel có pandas hiện có, Run All. Working directory trong repo hoặc thư mục con; path tự tìm data-preparation. Notebook tự tạo folder đầu ra mới `snapshots/editorial-v0.2.0/` và report trong datasets. Không phải cài package hoặc có .env.

```bash
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_editorial_catalogue.ipynb --offline
python3 data-preparation/scripts/editorial_catalogue.py
python3 data-preparation/scripts/data_contract.py data-preparation/snapshots/editorial-v0.2.0/catalogue.json
python3 data-preparation/scripts/data_contract.py data-preparation/snapshots/editorial-v0.2.0/csv
```

Runner cần Python đã có pandas; CLI editorial/contract chỉ dùng stdlib. Hai lần Run All offline phải có cùng manifest. Không append, không API calls. Python runner lưu output ở `datasets/editorial-catalogue/reports/prepare_editorial_catalogue.executed.ipynb`; source notebook để output rỗng. Chưa kiểm trực tiếp bằng Jupyter kernel.

Để refresh, đặt REFRESH_WEB=True và OFFLINE=False ở cell cấu hình, hoặc dùng runner `--refresh`. Cell ảnh chỉ lấy tối đa 3 URL metadata đã cấu hình; chọn tập request khác trong cell nếu muốn khảo sát đợt khác. Refresh chỉ lưu response bytes/checksum/ngày kiểm trong raw và refresh_journal.json, không tự sửa catalogue, không tải ảnh hoặc gọi AI. Dừng khi nguồn chặn; không đổi header/client để vượt chặn. Kiểm thủ công nguồn mới rồi sửa amendment/evidence theo ID, tăng version thích hợp ở đợt dataset kế tiếp. Nếu sửa file evidence đã chốt, cập nhật inputChecksums bằng SHA-256 sau khi rà diff; không tự bỏ kiểm checksum.

## Còn lại trước hoàn thành task

Review độc lập taxonomy và mô tả; xem ảnh/kiểm license hoặc tìm nguồn ảnh khác; bổ sung evidence cho trường unknown; mở rộng danh mục khi có menu món mới thực tế để đạt 60–80. GM-28 chưa Approved; GM-27 còn cần xác minh offering/freshness/lịch/coverage thực tế. AC fixtures/pool/budget/context và import/SQL ngoài phạm vi lần này. Không tự Approved/Done, publish seed, push hoặc tạo PR.
