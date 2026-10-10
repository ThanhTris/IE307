# Tổng quan bộ dữ liệu menu khu Thủ Đức cũ

Bản mô tả này ghi nhận **snapshot của lần chạy ngày 2026-10-09**, đọc trực tiếp từ CSV và báo cáo cục bộ. Dùng để hiểu dữ liệu, không phải chứng nhận catalogue đã được duyệt. Khi refresh nguồn và chạy lại notebook, số liệu có thể đổi; cần cập nhật tài liệu này theo reports và CSV mới.

## Quy mô và đơn vị mỗi dòng

File cuối có **219 dòng dữ liệu × 35 cột**, tương ứng **219 tên chuẩn ứng viên**, tổng hợp từ **250 mục menu của 21 chi nhánh**. Có **110 tên có URL ảnh** và **126 tên có mô tả** ở ít nhất một mục nguồn. Các dòng có thể là biến thể topping/cách nấu hoặc tên marketing; 219 không có nghĩa là 219 họ món độc lập.

Đầu vào khảo sát có **27 URL**: 23 beFood và 4 ShopeeFood. Đọc được **692 mục menu từ 23 nguồn beFood**; 4 trang ShopeeFood chưa đọc được menu. Hai quán có raw nhưng chưa có mục đủ điều kiện vào file cuối. Tất cả số dòng dưới đây **không tính hàng tiêu đề CSV**.

| File trong datasets/thu-duc-menus/processed | Dòng | Cột | Dung lượng | Mỗi dòng là gì |
| --- | --- | --- | --- | --- |
| thu_duc_dishes_final.csv | 219 | 35 | 1.79 MB | Bản xem/dùng tiếp: một tên chuẩn một dòng, gộp metadata quán–món. |
| menu_items_raw.csv | 692 | 36 | 5.59 MB | Một mục menu nguồn một dòng sau gộp occurrence trùng; gồm cả đồ uống/combos/món thêm. |
| menu_dish_mapping.csv | 692 | 17 | 0.25 MB | Một quyết định phân loại cho mỗi mục raw, đủ cả nhận/loại/cần rà. |
| dish_catalogue.csv | 219 | 20 | 0.15 MB | Danh mục ứng viên trung gian; là đầu vào của bản cuối. |

CSV dùng UTF-8 có BOM, giữ dấu tiếng Việt. MB ở đây bằng 1.000.000 byte. Bốn CSV tổng cộng **7.78 MB**; **27 snapshot HTML** tổng cộng **14.85 MB**, chưa tính notebook thực thi và báo cáo.

Các file dữ liệu nằm trong datasets được Git bỏ qua. File cuối có cột JSON chứa nhiều mục menu nên dung lượng lớn hơn catalogue trung gian, dù cùng 219 dòng. **Không cộng số dòng bốn CSV thành số món** vì chúng mô tả các lớp của cùng dữ liệu.

## Nguồn, thời gian và cách thu thập

Danh sách URL đầu vào nằm ở [thu_duc_sources.json](config/thu_duc_sources.json). [Notebook](notebooks/prepare_thu_duc_menus.ipynb) tải HTML công khai từng URL, lưu snapshot và manifest gồm URL, fetched_at, kích thước và SHA-256; mặc định chạy lại từ snapshot, REFRESH=True mới cập nhật.

Snapshot nguồn được lấy từ **2026-10-09 23:38:05 đến 23:39:07 giờ Việt Nam (UTC+7)**. Các trường checked_at trong dữ liệu lưu ISO 8601 UTC. Đây là thời gian thu thập, không xác nhận ngày menu được quán cập nhật.

Adapter beFood đọc section thực đơn trong HTML: tên, mô tả, nhóm và giá; ghép ảnh/srcset/alt từ card khi không nhập nhằng. Metadata quán như địa chỉ, tọa độ và lịch nguồn được giữ nếu có. Mục lặp giữa “Món phải thử” và nhóm chính được gộp theo ID; vẫn lưu occurrence/HTML để truy lại. Giá section menu và giá card khuyến mãi được giữ riêng.

ShopeeFood trả HTML chưa có adapter menu nên ghi needs_render, không coi là quán không có món. Lần này chưa lấy menu GrabFood. Không lấy dữ liệu Wikipedia hay dataset công thức cũ; không đăng nhập, gọi API nội bộ, thu đánh giá cá nhân hoặc tải ảnh.

## Phạm vi địa lý và lựa chọn quán

Khảo sát ban đầu ở **khu Thủ Đức cũ**, tập trung Võ Văn Ngân–Tô Vĩnh Diện, Hoàng Diệu 2–Lê Văn Chí, Kha Vạn Cân; có nguồn tại Linh Xuân, Linh Đông, Linh Chiểu, Đặng Văn Bi và Hiệp Bình Chánh. Không tự mở rộng sang Quận 2/Quận 9 cũ.

Nguồn được chọn từ tìm kiếm công khai theo đường/nhóm món. Notebook đối chiếu token địa chỉ trong config với địa chỉ trả về. Địa chỉ trong bảng giữ nguyên cách viết của nguồn, có thể dùng tên phường theo các thời kỳ khác nhau. Chưa kiểm polygon/radius, chưa lập danh sách đầy đủ quán trong khu vực và chưa đo độ bao phủ địa lý. Phạm vi giao hàng của nền tảng không được dùng làm ranh giới khảo sát.

## Các quán đã đọc được menu

Tên quán là link đến trang menu nguồn. “Mục vào bản cuối” là số mục menu được nhận; “Tên chuẩn tại quán” là số dish_id khác nhau của quán đó. Một tên chuẩn có thể xuất hiện ở nhiều quán, vì vậy không cộng cột tên chuẩn để suy ra tổng 219 món.

| Quán / nguồn beFood | Địa chỉ theo nguồn | Mục raw | Mục vào bản cuối | Tên chuẩn tại quán |
| --- | --- | --- | --- | --- |
| [Cơm Tấm 49 - Đường Số 4](https://food.be.com.vn/ho-chi-minh/com-tam-49-duong-so-4-64909) | 49 Đường Số 4, Linh Xuân, Thủ Đức, Hồ Chí Minh | 41 | 22 | 22 |
| [Tiệm Cơm Nhà Trộn - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/tiem-com-nha-tron-hoang-dieu-2-102327) | 122 Hoàng Diệu 2, Phường Linh Trung, Thành Phố Thủ Đức, Hồ Chí Minh | 22 | 9 | 9 |
| [Wallace Burger & Chicken - Kha Vạn Cân](https://food.be.com.vn/ho-chi-minh/wallace-burger-chicken-kha-van-can-126511) | 1098 Kha Vạn Cân, Khu Phố 1, Phường Thủ Đức, Hồ Chí Minh | 64 | 10 | 10 |
| [Mì Trộn Nhà Min - Kha Vạn Cân](https://food.be.com.vn/ho-chi-minh/mi-tron-nha-min-kha-van-can-147476) | 1060/22 Kha Vạn Cân, Phường Thủ Đức, Hồ Chí Minh | 31 | 2 | 2 |
| [THE BEOSO HEALTHY FOOD - Kha Vạn Cân](https://food.be.com.vn/ho-chi-minh/the-beoso-healthy-food-kha-van-can-138734) | 575/1/4 Kha Vạn Cân, Phường Hiệp Bình, Hồ Chí Minh | 15 | 10 | 10 |
| [Cơm Tấm Mỹ Mỹ - Kha Vạn Cân](https://food.be.com.vn/ho-chi-minh/com-tam-my-my-kha-van-can-148809) | 754 Kha Vạn Cân, Phường Thủ Đức, Hồ Chí Minh | 17 | 12 | 12 |
| [Quán Cơm Hoa Đào - Kha Vạn Cân](https://food.be.com.vn/ho-chi-minh/quan-com-hoa-dao-kha-van-can-74716) | 1362 Kha Vạn Cân, Phường Linh Trung, Thành Phố Thủ Đức, Hồ Chí Minh | 12 | 0 | 0 |
| [Cơm Chay Thập Phương - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/com-chay-thap-phuong-hoang-dieu-2-125649) | 69B Hoàng Diệu 2, Phường Linh Xuân, Hồ Chí Minh | 26 | 17 | 17 |
| [Kim Nga Quán - Cơm Phần, Bún Riêu & Bánh Canh - Lê Văn Chí](https://food.be.com.vn/ho-chi-minh/kim-nga-quan-com-phan-bun-rieu-banh-canh-le-van-chi-130264) | 179 Lê Văn Chí, Phường Linh Xuân, Hồ Chí Minh | 18 | 15 | 15 |
| [Gà Rán Texas Chicken - Võ Văn Ngân](https://food.be.com.vn/ho-chi-minh/ga-ran-texas-chicken-vo-van-ngan-67488) | 13-13/1 Võ Văn Ngân, Khu Phố 2, Phường Linh Chiểu, Thành phố Thủ Đức, Hồ Chí Minh | 81 | 12 | 12 |
| [Gà Rán và Mỳ Ý Jollibee - Võ Văn Ngân](https://food.be.com.vn/ho-chi-minh/ga-ran-va-my-y-jollibee-vo-van-ngan-98881) | 255 Võ Văn Ngân, Khu Phố 4, Phường Linh Chiểu, Thành Phố Thủ Đức, Hồ Chí Minh | 45 | 6 | 5 |
| [Bánh Mì, Xôi Xíu Mại & Xá Xíu - Đặng Văn Bi](https://food.be.com.vn/ho-chi-minh/banh-mi-xoi-xiu-mai-xa-xiu-dang-van-bi-120584) | 104 Đặng Văn Bi, Phường Thủ Đức, Hồ Chí Minh | 19 | 19 | 19 |
| [LÒ BÁNH MỲ BẢO CHÂU - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/lo-banh-my-bao-chau-hoang-dieu-2-25690) | 242 Đường Hoàng Diệu 2, Linh Chiểu, Thủ Đức, Hồ Chí Minh, Việt Nam | 31 | 31 | 18 |
| [Bún Bò Ngon Ánh Linh - Bánh Canh & Mì Ý 24h - Đường 49](https://food.be.com.vn/ho-chi-minh/bun-bo-ngon-anh-linh-banh-canh-mi-y-24h-duong-49-94430) | 1/43/6 Đường 49, Phường Hiệp Bình Chánh, Thành Phố Thủ Đức, Hồ Chí Minh | 38 | 20 | 18 |
| [Bún Bò Huế Sông Hương - Đường 2](https://food.be.com.vn/ho-chi-minh/bun-bo-hue-song-huong-duong-2-19461) | 2 Đường 2 Khu Phố 1, Phường Linh Đông, Thành Phố Thủ Đức, Hồ Chí Minh | 19 | 10 | 10 |
| [Phá Lấu Cô Phương - Hiệp Bình](https://food.be.com.vn/ho-chi-minh/pha-lau-co-phuong-hiep-binh-46636) | 176 Hiệp Bình, Phường Hiệp Bình Chánh, Thành Phố Thủ Đức, Hồ Chí Minh | 9 | 5 | 3 |
| [Phở Lý Quốc Sư - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/pho-ly-quoc-su-hoang-dieu-2-86590) | 218A Hoàng Diệu 2, Phường Thủ Đức, Hồ Chí Minh | 36 | 27 | 27 |
| [Phở & Bún Bò Tươi - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/pho-bun-bo-tuoi-hoang-dieu-2-137270) | 127-1 Hoàng Diệu 2, Phường Linh Xuân, Hồ Chí Minh | 21 | 2 | 2 |
| [Bún Đậu Mắm Tôm Ba Anh Em - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/bun-dau-mam-tom-ba-anh-em-hoang-dieu-2-75616) | 220 Hoàng Diệu 2, Linh Chiểu, Thủ Đức, Hồ Chí Minh | 50 | 8 | 8 |
| [Bánh Cuốn & Bánh Ướt - Chương Dương](https://food.be.com.vn/ho-chi-minh/banh-cuon-banh-uot-chuong-duong-33659) | 129 Chương Dương, Linh Chiểu, Thủ Đức, Hồ Chí Minh, Việt Nam | 16 | 7 | 7 |
| [Quie Tea & Food - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/quie-tea-food-hoang-dieu-2-148318) | 127/6E Hoàng Diệu 2, Phường Linh Xuân, Hồ Chí Minh | 11 | 2 | 2 |
| [Nem Nướng Nha Trang Hùng Việt - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/nem-nuong-nha-trang-hung-viet-hoang-dieu-2-105890) | 118 Hoàng Diệu 2, Phường Linh Chiểu, Thành Phố Thủ Đức, Hồ Chí Minh | 37 | 4 | 4 |
| [Lẩu Gà Ớt Hiểm 109 - Hoàng Diệu 2](https://food.be.com.vn/ho-chi-minh/lau-ga-ot-hiem-109-hoang-dieu-2-98673) | 190 Hoàng Diệu 2, Phường Linh Chiểu, Thành Phố Thủ Đức, Hồ Chí Minh | 33 | 0 | 0 |

Quán Cơm Hoa Đào và Lẩu Gà Ớt Hiểm 109 có menu đã thu được, nhưng hiện không có mục được nhận vào danh mục bữa chính theo quy tắc. Dữ liệu vẫn trong raw/mapping; số 0 không có nghĩa quán không bán món.

## Bốn URL ShopeeFood chưa đọc được menu

Nhãn dưới đây là slug URL đầu vào, **chưa là tên quán/địa chỉ đã xác nhận từ snapshot**. Chưa tính các URL này vào 23 quán đã đọc được menu hoặc 21 quán trong bản cuối.

| URL đầu vào | Cụm dự kiến trong config | Kết quả |
| --- | --- | --- |
| [tep-thu-duc-com-tam-chao-long-to-vinh-dien](https://shopeefood.vn/ho-chi-minh/tep-thu-duc-com-tam-chao-long-to-vinh-dien) | Võ Văn Ngân – Tô Vĩnh Diện | Cần render; chưa đọc được tên quán, địa chỉ và menu trong HTML trực tiếp. |
| [bun-bo-bo-ne-bo-kho-134-hoang-dieu-2](https://shopeefood.vn/ho-chi-minh/bun-bo-bo-ne-bo-kho-134-hoang-dieu-2) | Hoàng Diệu 2 – Lê Văn Chí | Cần render; chưa đọc được tên quán, địa chỉ và menu trong HTML trực tiếp. |
| [bun-thit-nuong-com-tam-tem-hoang-dieu-2](https://shopeefood.vn/ho-chi-minh/bun-thit-nuong-com-tam-tem-hoang-dieu-2) | Hoàng Diệu 2 – Lê Văn Chí | Cần render; chưa đọc được tên quán, địa chỉ và menu trong HTML trực tiếp. |
| [tra-dau-nha-pao-vo-van-ngan](https://shopeefood.vn/ho-chi-minh/tra-dau-nha-pao-vo-van-ngan) | Võ Văn Ngân – Tô Vĩnh Diện | Cần render; chưa đọc được tên quán, địa chỉ và menu trong HTML trực tiếp. |

## Phân loại và những mục chưa đưa vào bản cuối

| mapping_status | Mục menu | Ý nghĩa |
| --- | --- | --- |
| candidate | 250 | Tên đủ rõ theo quy tắc; vào danh mục ứng viên, vẫn draft. |
| needs_review | 253 | Combo, lẩu/món nhóm, tên rút gọn hoặc metadata/địa chỉ chưa đủ rõ; chưa vào bản cuối. |
| excluded | 189 | Đồ uống, món thêm, nước chấm, tráng miệng, khai vị/món ăn chơi theo tên/nhóm nguồn; vẫn giữ raw/mapping. |

Giữ dấu, chuẩn hóa Unicode/hoa thường/khoảng trắng/dấu câu; chỉ sửa alias chính tả rõ. Kích cỡ tách khi hậu tố rõ, vẫn giữ trong variant và tên gốc. Topping, khô/nước và cách nấu khác nhau vẫn có thể là các dòng khác nhau. Không fuzzy-match theo tên bỏ dấu, không đoán “Tái”, “Đặc biệt” thành món cụ thể.

Nếu nhóm nguồn ghi rõ Cơm Chay/Bún Chay, tên chuẩn được bổ sung “chay” và lưu lý do để không gộp với món thịt. Nhãn này phản ánh nguồn, chưa xác minh thành phần. Chỉ tên quán chay không đủ để tự chốt.

### Số tên chuẩn theo category đề xuất

| category | Tên chuẩn trong bản cuối |
| --- | --- |
| cơm | 59 |
| bún | 57 |
| bánh mì | 23 |
| phở | 19 |
| burger | 15 |
| mì | 15 |
| xôi | 9 |
| bánh cuộn | 6 |
| hủ tiếu | 3 |
| miến | 3 |
| salad | 3 |
| bánh bao | 2 |
| bánh cuốn | 2 |
| bánh ướt | 2 |
| nui | 1 |

## Ý nghĩa đủ 35 cột của file cuối

CSV không lưu schema kiểu dữ liệu; “Dạng giá trị” dưới đây mô tả cách đọc. Các trường *_json là chuỗi JSON trong ô CSV. Giá gốc được giữ nguyên; các thuộc tính chưa xác minh là unknown/needs_review, hoặc rỗng khi nguồn không có.

| Cột | Dạng giá trị | Ý nghĩa |
| --- | --- | --- |
| dish_id | Chuỗi ID | ID ổn định từ tên chuẩn hóa; là khóa món trong lần khảo sát. |
| dish_name | Chuỗi | Tên chuẩn có dấu; mỗi giá trị một dòng. Có thể còn tên marketing/topping khác nhau. |
| root_dish | Chuỗi | Món gốc đề xuất bằng quy tắc tên, ví dụ cơm tấm hoặc bún bò. |
| category | Chuỗi | Nhóm món đề xuất như cơm, bún, phở; chưa là taxonomy được reviewer duyệt. |
| aliases_json | JSON array | Các tên gốc thực tế trên menu được gộp vào tên chuẩn này. |
| size_variants_json | JSON array | Kích cỡ tách từ hậu tố rõ của tên menu, ví dụ nhỏ/vừa/lớn. |
| search_queries_json | JSON array | Gợi ý tìm kiếm theo tên chuẩn + Thủ Đức; chưa chạy hay xác nhận kết quả Google Maps/TikTok. |
| venue_count | Số nguyên | Số venue_id khác nhau có mục menu được nhận cho món này trong mẫu. |
| menu_item_count | Số nguyên | Số mục menu gốc được nhận cho món; có thể lớn hơn venue_count. |
| survey_clusters_json | JSON array | Các cụm khảo sát của nguồn có món này. |
| example_menu_item_id | Chuỗi ID | Mục menu được chọn làm ví dụ; tất cả cột example_* cùng thuộc mục này. |
| example_menu_name | Chuỗi | Tên nguyên bản của mục ví dụ trên menu. |
| example_venue_name | Chuỗi | Tên quán/chi nhánh của mục ví dụ, theo snapshot nguồn. |
| example_address | Chuỗi | Địa chỉ của quán ví dụ, giữ cách viết của nguồn. |
| example_description | Chuỗi | Mô tả nguyên bản của mục ví dụ; rỗng nếu nguồn không có. |
| example_price_value | Giá trị giá | Giá trị giá của mục ví dụ, giữ nguyên từ nguồn; không phải giá thấp nhất/trung bình hay giá/người. |
| example_currency | Chuỗi | Đơn vị tiền của mục ví dụ, VND khi parser có giá. |
| example_price_unit | Chuỗi | Đơn vị giá; hiện menu_item_unspecified, chưa xác minh một phần/một người. |
| example_image_url | URL hoặc rỗng | URL ảnh của chính mục ví dụ; không tải ảnh về. |
| example_source_url | URL | Trang menu chứa mục ví dụ. |
| source_urls_json | JSON array | Danh sách URL nguồn có mục menu được nhận cho món này. |
| menu_offerings_json | JSON array of objects | Toàn bộ metadata từng mục quán–món được nhận, gồm giá, mô tả, ảnh, địa chỉ và provenance. Chi tiết bên dưới. |
| images_json | JSON array of objects | URL ảnh cùng menu_item_id/source_url/usage_rights; không tự suy quyền sử dụng. |
| descriptions_json | JSON array of objects | Mô tả gắn với menu_item_id và source_url, giữ riêng theo từng quán. |
| first_checked_at | ISO 8601 UTC | Thời gian lấy snapshot sớm nhất trong các mục được nhận cho món. |
| last_checked_at | ISO 8601 UTC | Thời gian lấy snapshot muộn nhất trong các mục được nhận cho món; không phải ngày quán cập nhật menu. |
| cuisine | Chuỗi | Hiện unknown; chưa chuẩn hóa/xác minh thuộc tính ẩm thực cấp món. |
| origin | Chuỗi | Hiện unknown; chưa xác minh xuất xứ món. |
| temperature | Chuỗi | Hiện unknown; chưa xác minh nóng/lạnh. |
| flavor | Chuỗi | Hiện unknown; chưa xác minh thuộc tính vị. |
| meal_slots | Chuỗi | Hiện needs_review; chưa xác nhận lịch bán buổi sáng/trưa/tối cho từng món. |
| availability | Chuỗi | Hiện unknown; snapshot không xác nhận còn hàng hay đang bán. |
| image_usage_rights | Chuỗi | Hiện unknown; URL ảnh chưa có bằng chứng quyền tái sử dụng. |
| review_status | Chuỗi | Hiện draft; chưa là quyết định Approved của reviewer độc lập. |
| dataset_version | Chuỗi | Phiên bản bản xuất: thu-duc-menu-survey-final-v1. |

### Đọc menu_offerings_json

Một dòng món có thể chứa nhiều quán và nhiều kích cỡ. menu_offerings_json là mảng các mục menu nguồn tương ứng, giữ:

- ID: menu_item_id, platform_item_id, source_id, venue_id; platform, source_url.
- Menu: menu_name_raw, description_raw, menu_groups_json, source_occurrence_count, metadata_match_status.
- Giá: price_raw, price_value, currency, price_unit và ui_price_labels_json riêng cho card.
- Ảnh: image_url, images_json chứa URL/srcset/alt, image_usage_rights; restaurant_image_url là ảnh quán.
- Quán/phạm vi: venue_name, address, latitude, longitude, survey_cluster, scope_status, service_mode.
- Lịch/metadata nguồn: opening_hours_source_json và restaurant_source_json; chưa được xác minh thành lịch bán món của app.
- Truy vết/trạng thái: checked_at, snapshot_sha256, availability, ui_disabled, review_status; mapping_reason và alias_changes_json.

Các trường JSON bên trong mỗi offering vẫn là chuỗi như raw; khi đọc bằng Python, có thể json.loads ô menu_offerings_json trước, rồi json.loads trường *_json bên trong nếu cần. File cuối bỏ card_html/source_occurrences_json để gọn; hai trường bằng chứng HTML này vẫn có trong menu_items_raw.csv.

Các cột example_* đều đến từ cùng một menu_item_id. Ví dụ của một món được ưu tiên mục có ảnh/mô tả/giá rồi chọn ổn định theo ID. Không ghép giá quán A với ảnh/mô tả quán B. Danh sách đầy đủ vẫn trong menu_offerings_json; example_* chỉ để xem nhanh.

## Giới hạn và kiểm chứng

Bản cuối là danh mục ứng viên từ mẫu menu đã chọn. Chưa xác nhận toàn menu ứng dụng nền tảng, mọi quán trong khu vực, giờ bán buổi trưa, tồn món, khả năng mang về hoặc giá/người. Số venue_count là độ hiện diện trong mẫu, không là độ phổ biến với người dùng. URL ảnh chưa chứng minh quyền tái sử dụng. Cuisine/origin/temperature/flavor chưa xác minh; không suy dinh dưỡng hay an toàn dị ứng.

Pipeline đã chạy đủ 8 cell bằng Python exec với pandas/lxml, chưa kiểm trực tiếp qua Jupyter kernel. Đã kiểm liên kết raw–mapping–catalogue, từng metadata offering về nguồn gốc, ví dụ cùng nguồn, BOM và đọc lại từng ô CSV. Chạy lại offline từ working directory ngoài project cho SHA-256 giống nhau ở cả bốn CSV; 62 kiểm thử repository đạt tại lần bàn giao.

Báo cáo cục bộ nằm trong datasets/thu-duc-menus/reports: quality_report.json (tổng hợp), source_coverage.json (từng URL), output_checksums.json (bốn CSV), reproducibility_report.json (chạy lại) và prepare_thu_duc_menus.executed.ipynb (output từng cell). Snapshot/manifest nằm trong raw. Dữ liệu chưa publish seed và chưa tự Approved/Done task.

Hướng dẫn chạy lại, refresh và cấu trúc thư mục: [README](README.md).
