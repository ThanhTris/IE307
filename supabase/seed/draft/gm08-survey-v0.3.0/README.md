# GM-08 — Pilot Thủ Đức cũ, draft khảo sát 0.3.0

HoaiTam/Tâm chịu trách nhiệm chuẩn bị/thu thập/nhập dữ liệu GM-08. Có thể nhận
khảo sát của Vinh nếu sẵn có; không cần chờ bundle của Vinh mới làm phần này.
ThanhTris/Trí hoặc người khác người nhập cần kiểm độc lập trước publish.
Phạm vi Thủ Đức cũ được user xác nhận giữ ngày2026-10-11.

[bundle.json](bundle.json) là dữ liệu quan sát thật từ snapshot2026-10-09,
đã chuyển sang food1.1.0 và liên kết UUID ổn định. Không phải fixture và chưa
verified/published. [audit.json](audit.json) ghi counts/hash/FK/blockers;
[source-records.json](source-records.json) giữ mapping ID cùng tọa độ/giờ/menu/
giá/checksum/ngày lấy nguyên nguồn. Snapshot gốc không đổi.

## Dữ liệu đã chuẩn bị

21 venue draft,247 offering draft,39 món gốc,154 dòng lịch chi nhánh draft,
27 nguồn,18 taxonomy,1 dataset0.3.0. Một ngày nguồn không có giờ giữ unknown;
23:59 không suy thành24h, lastOrder giữ null. Giá theo đúng mục menu, unit
menu_item_unspecified; tên menu được giữ như named variant, không suy khẩu phần.
Không claim giờ phục vụ tại quán hoặc giờ bán từng món từ lịch nền tảng.
Lịch offering/serviceMode chưa xác minh giữ null; venue serviceModes rỗng,
status unknown. Không có artwork, coverage polygon, anchor hoặc live-stock mới.
Địa chỉ là nguyên văn lịch sử, adminAreaId chưa xác minh giữ null.

## Danh sách chi nhánh cần kiểm

| Chi nhánh theo nguồn | Địa chỉ theo nguồn | Số mục menu đã map |
| --- | --- | --- |
| Tiệm Cơm Nhà Trộn - Hoàng Diệu 2 | 122 Hoàng Diệu 2, Phường Linh Trung, Thành Phố Thủ Đức, Hồ Chí Minh | 8 |
| Bún Bò Ngon Ánh Linh - Bánh Canh & Mì Ý 24h - Đường 49 | 1/43/6 Đường 49, Phường Hiệp Bình Chánh, Thành Phố Thủ Đức, Hồ Chí Minh | 20 |
| Cơm Tấm 49 - Đường Số 4 | 49 Đường Số 4, Linh Xuân, Thủ Đức, Hồ Chí Minh | 22 |
| Bún Đậu Mắm Tôm Ba Anh Em - Hoàng Diệu 2 | 220 Hoàng Diệu 2, Linh Chiểu, Thủ Đức, Hồ Chí Minh | 8 |
| LÒ BÁNH MỲ BẢO CHÂU - Hoàng Diệu 2 | 242 Đường Hoàng Diệu 2, Linh Chiểu, Thủ Đức, Hồ Chí Minh, Việt Nam | 31 |
| Gà Rán và Mỳ Ý Jollibee - Võ Văn Ngân | 255 Võ Văn Ngân, Khu Phố 4, Phường Linh Chiểu, Thành Phố Thủ Đức, Hồ Chí Minh | 6 |
| Bánh Cuốn & Bánh Ướt - Chương Dương | 129 Chương Dương, Linh Chiểu, Thủ Đức, Hồ Chí Minh, Việt Nam | 7 |
| Phở Lý Quốc Sư - Hoàng Diệu 2 | 218A Hoàng Diệu 2, Phường Thủ Đức, Hồ Chí Minh | 25 |
| Gà Rán Texas Chicken - Võ Văn Ngân | 13-13/1 Võ Văn Ngân, Khu Phố 2, Phường Linh Chiểu, Thành phố Thủ Đức, Hồ Chí Minh | 12 |
| Phở & Bún Bò Tươi - Hoàng Diệu 2 | 127-1 Hoàng Diệu 2, Phường Linh Xuân, Hồ Chí Minh | 2 |
| Cơm Chay Thập Phương - Hoàng Diệu 2 | 69B Hoàng Diệu 2, Phường Linh Xuân, Hồ Chí Minh | 17 |
| Nem Nướng Nha Trang Hùng Việt - Hoàng Diệu 2 | 118 Hoàng Diệu 2, Phường Linh Chiểu, Thành Phố Thủ Đức, Hồ Chí Minh | 4 |
| Phá Lấu Cô Phương - Hiệp Bình | 176 Hiệp Bình, Phường Hiệp Bình Chánh, Thành Phố Thủ Đức, Hồ Chí Minh | 5 |
| Bánh Mì, Xôi Xíu Mại & Xá Xíu - Đặng Văn Bi | 104 Đặng Văn Bi, Phường Thủ Đức, Hồ Chí Minh | 19 |
| Wallace Burger & Chicken - Kha Vạn Cân | 1098 Kha Vạn Cân, Khu Phố 1, Phường Thủ Đức, Hồ Chí Minh | 10 |
| Mì Trộn Nhà Min - Kha Vạn Cân | 1060/22 Kha Vạn Cân, Phường Thủ Đức, Hồ Chí Minh | 2 |
| Quie Tea & Food - Hoàng Diệu 2 | 127/6E Hoàng Diệu 2, Phường Linh Xuân, Hồ Chí Minh | 2 |
| Kim Nga Quán - Cơm Phần, Bún Riêu & Bánh Canh - Lê Văn Chí | 179 Lê Văn Chí, Phường Linh Xuân, Hồ Chí Minh | 15 |
| THE BEOSO HEALTHY FOOD - Kha Vạn Cân | 575/1/4 Kha Vạn Cân, Phường Hiệp Bình, Hồ Chí Minh | 10 |
| Cơm Tấm Mỹ Mỹ - Kha Vạn Cân | 754 Kha Vạn Cân, Phường Thủ Đức, Hồ Chí Minh | 12 |
| Bún Bò Huế Sông Hương - Đường 2 | 2 Đường 2 Khu Phố 1, Phường Linh Đông, Thành Phố Thủ Đức, Hồ Chí Minh | 10 |

## Phần còn thiếu để nghiệm thu

- Kiểm lại chi nhánh/tọa độ/mã hành chính và hình thức phục vụ thật; nguồn hiện là
  metadata nền tảng lịch sử, chưa là khảo sát hiện tại hoặc bằng chứng dine_in.
- Kiểm riêng giờ quán và giờ món, đầy đủ7 ngày; không mượn schedule của venue cho
  offering. Có ngày thiếu thì khảo sát lại, không tự điền closed.
- Xác minh menu/giá/đơn vị và mapping món–variant. Metadata ảnh/card có2 trường hợp
  unique_name_price_difference trong nguồn; không thay giá section bằng giá card.
- Chọn pilot15–20 món có offering được review, kiểm taxonomy/meal/temperature/flavor;
  hiện giữ đủ39 draft để không làm mất mapping. Quota hiện chưa đạt theo importer;
  nếu giữ scope khác cần reviewer chấp nhận số thực/lý do.
- Có polygon vùng khảo sát và anchor công cộng thực tế, kiểm vị trí trong vùng;
  không tự lấy convex hull/rectangle của21 tọa độ làm coverage đã nghiệm thu.
- Có căn cứ usageRights/license/attribution cho nguồn, ngày kiểm mới/chính sách
  validUntil được chốt và người review độc lập. Không suy quyền dùng từ URL,
  không gán TTL/reviewer hoặc đổi reviewStatus để bỏ blockers.
- Stage bản mới sau bổ sung, reviewer duyệt đúng bundle hash cùng evidence thật.
  Publish/query offering thật trên PostgreSQL, lưu receipt/assertions và cập nhật
  manifest/evidence. Hiện bước này Not run; verified manifest vẫn0.

## Tái lập

Từ repo root, thư mục output/stage phải mới:

```sh
python3 scripts/gm08_prepare_survey.py --output-dir /tmp/gm08-survey-new
python3 supabase/seed/import_food_data.py validate --input /tmp/gm08-survey-new/bundle.json --report /tmp/gm08-survey-preflight.json
python3 supabase/seed/import_food_data.py stage --input /tmp/gm08-survey-new/bundle.json --output /tmp/gm08-survey-stage-new
python3 -m unittest discover -s tests -p 'test_gm08_survey.py' -v
```

Chỉ offline, không crawl/GPT/DB calls. Bundle bytes/IDs tái lập ổn định;
audit evaluatedAt thay theo clock, source dates không được làm mới.
Stage chấp nhận draft hợp lệ và sinh review-template Pending, không là approval.
Publish cần [workflow reviewer](../../README.md) và
[intake contract](../../../../docs/data/GM08_DATASET_INTAKE.md).
