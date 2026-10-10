[Data dictionary](docs/DATA_DICTIONARY.md) và [CSV/JSON forms](templates/README.md): hợp đồng draft 11 entity, ví dụ giả lập, validator không publish. Mở thêm notebooks/inspect_data_contract.ipynb để xem trường, ví dụ, lỗi và chuyển đổi CSV offline.

[Handoff GM-03](docs/HANDOFF.md) và [taxonomy/món gốc](docs/TAXONOMY.md): snapshot Git 219 tên, 39 món gốc, mapping và notebook chạy offline.

[Catalogue biên tập 0.2.0](docs/EDITORIAL_CATALOGUE.md): notebook prepare_editorial_catalogue, bundle CSV/JSON 39 món theo contract, 247 giá tham khảo và nguồn ảnh/ghi công. Mặc định chạy offline, không gọi lại GPT; artwork chưa kiểm nội dung giữ null. [Báo cáo từng món](snapshots/editorial-v0.2.0/QUALITY_REPORT.md) ghi số liệu và trường còn thiếu.

# Danh mục món từ thực đơn khu Thủ Đức cũ

[Tổng quan dữ liệu](DATASET_OVERVIEW.md): quy mô/số dòng/dung lượng, nguồn và phạm vi, danh sách quán, ý nghĩa đủ 35 cột của file cuối và các giới hạn của snapshot ngày 2026-10-09.

[Thử nghiệm phân loại qua Vilao](VILAO_PILOT.md): notebook riêng trên 10 món, codebook/prompt dạng array, kết quả thật, giới hạn token và cách chạy cache không phát sinh thêm API calls.

[Phân loại toàn danh mục qua Vilao](VILAO_CATALOGUE.md): notebook full 219 món, cache theo từng món/batch, tiếp tục sau lỗi và CSV 52 cột giữ đủ metadata nguồn.

Mở [prepare_thu_duc_menus.ipynb](notebooks/prepare_thu_duc_menus.ipynb). Notebook chứa toàn bộ code tải HTML, đọc menu, chuẩn hóa tên, tổng hợp danh mục và kiểm CSV. Đây là khảo sát được chủ dự án yêu cầu; dữ liệu vẫn draft, chưa publish seed hay hoàn thành GM-03/GM-27. Bộ chuẩn bị dữ liệu trước đã được xóa và thay bằng quy trình này.

## Cấu trúc

```text
data-preparation/
  config/thu_duc_sources.json          # URL ứng viên, nhóm tìm kiếm, cụm/địa chỉ
  notebooks/prepare_thu_duc_menus.ipynb
  scripts/run_notebook.py              # runner, không chứa logic dữ liệu
  datasets/thu-duc-menus/              # tự tạo, Git bỏ qua
    raw/html/                         # snapshot từng nguồn
    raw/source_manifest.json          # URL, thời gian UTC, SHA-256, kích thước
    processed/menu_items_raw.csv
    processed/dish_catalogue.csv
    processed/menu_dish_mapping.csv
    processed/thu_duc_dishes_final.csv # file cuối, mỗi tên món một dòng
    reports/source_coverage.json
    reports/quality_report.json
    reports/output_checksums.json
    reports/prepare_thu_duc_menus.executed.ipynb
```

## Phạm vi và nguồn

Khởi đầu 27 URL công khai: 23 beFood, 4 ShopeeFood. Tập trung Võ Văn Ngân–Tô Vĩnh Diện, Hoàng Diệu 2–Lê Văn Chí, Kha Vạn Cân; bổ sung địa chỉ thuộc khu Thủ Đức cũ ở Linh Xuân, Linh Đông, Linh Chiểu, Đặng Văn Bi và Hiệp Bình Chánh. Đây là mẫu quán được chọn theo địa chỉ công khai, chưa là toàn bộ khu vực hay polygon coverage đã xác minh. Không dùng chữ “TP Thủ Đức” để tự lấy cả Quận 2/Quận 9 cũ.

URL được tìm theo đường và nhóm món. Notebook kiểm lại địa chỉ trả về bằng expected_address_token; không khớp thì cần rà, không dùng làm ứng viên danh mục. Khi mở rộng, thêm nguồn thật vào config. Với nhiều nền tảng cho cùng chi nhánh, đặt branch_key giống nhau sau khi đối chiếu địa chỉ để không đếm đôi. Không tự coi hai quán trùng tên là cùng chi nhánh.

- Adapter beFood đọc section menu HTML và ghép metadata ảnh từ card khi tìm được; gộp mục được lặp ở “Món phải thử”.
- ShopeeFood trong lần đọc HTTP có thể chỉ có vỏ trang. Báo needs_render và giữ URL, không coi là quán không có món. Notebook này chưa có adapter browser/API ShopeeFood hoặc GrabFood. Không cài thêm package để vượt chặn.
- Không thu đánh giá cá nhân; chỉ giữ metadata quán và menu. Không đăng nhập, thu GPS user, gọi API nội bộ hoặc tải ảnh.

## Chạy notebook

1. Chọn Python kernel có pandas và lxml. Cell đầu hiển thị phiên bản, đường dẫn và tạo raw/processed/reports.
2. Mặc định REFRESH=False: tái sử dụng snapshot; nguồn còn thiếu được tải khi ALLOW_NETWORK=True. Máy mới cần mạng cho lần đầu.
3. Run All theo thứ tự: cấu hình → nguồn → snapshot → menu gốc → quy tắc/mapping → danh mục/báo cáo → kiểm CSV → xuất file cuối.
4. Đặt ALLOW_NETWORK=False để chạy offline. Không có menu nào thì báo lỗi, không xuất kết quả rỗng như thành công.
5. Muốn cập nhật, đặt REFRESH=True. Nếu tải lỗi và có snapshot cũ, report ghi fallback và giữ ngày cũ. Snapshot sai checksum sẽ dừng; khôi phục raw đúng manifest, hoặc xóa có chủ đích cặp snapshot/entry manifest rồi lấy lại.

Working directory có thể là repo, notebooks hoặc thư mục con trong project. Kernel nằm ngoài project thì đặt DATA_PREPARATION_DIR ở cell đầu. Đường dẫn còn lại đều suy từ thư mục đó.

Khi chưa có Jupyter kernel, dùng Python đã có pandas/lxml:

```bash
python3 data-preparation/scripts/run_notebook.py
python3 data-preparation/scripts/run_notebook.py --offline
python3 data-preparation/scripts/run_notebook.py --refresh
```

Runner chạy cùng code từng cell, lưu output thật vào báo cáo executed; lỗi cell được lưu và trả exit code khác 0. Bản notebook nguồn giữ output rỗng để không đưa dữ liệu cục bộ vào Git. Đây là kiểm bằng Python exec, không phải chứng nhận chạy trực tiếp trong Jupyter kernel. Chưa cài package hay đổi dependency ứng dụng.

## CSV và quy tắc

- menu_items_raw: mỗi ID menu nguồn một dòng; giữ tên/mô tả/giá gốc, value VND, nhóm nguồn, mọi occurrence và HTML từng mục, ID nền tảng, ảnh/srcset/alt, URL, checksum, thời gian, metadata chi nhánh. Các nhãn giá trên card được giữ riêng trong ui_price_labels_json, không ghi đè giá của section menu khi có khuyến mãi. Card chưa ghép được section vẫn giữ để rà. Không quy giá item chưa rõ khẩu phần thành giá/người.
- dish_catalogue: mỗi tên chuẩn ứng viên một dòng; ID khảo sát theo tên (không ổn định khi đổi tên), món gốc/nhóm đề xuất, alias/tên menu, kích cỡ, số chi nhánh, số mục menu và tham chiếu nguồn ảnh/mô tả. Giá thuộc menu gốc, không ghép metadata nhiều quán thành offering giả.
- menu_dish_mapping: đủ mọi menu_item_id, kể cả excluded/needs_review; tên trước/sau chuẩn hóa, món gốc, variant, kích cỡ, alias thay đổi, lý do và URL nguồn. Chỉ candidate có dish_id để vào danh mục.
- **thu_duc_dishes_final.csv**: file cuối có 35 cột, mỗi tên chuẩn một dòng. Có tên/nhóm món, aliases, kích cỡ, gợi ý tìm kiếm, số quán/mục menu, URL nguồn, ảnh/mô tả và ngày lấy. Các cột example_* cùng thuộc một mục menu thật; giá là giá mục đó, không là giá/người hay giá trung bình. menu_offerings_json giữ metadata mọi mục tương ứng: tên gốc, giá/đơn vị, nhóm, quán/địa chỉ/tọa độ/lịch nếu nguồn có, ảnh/srcset, URL, checksum, thời gian và lý do mapping. HTML chi tiết nằm trong raw để file cuối gọn hơn. Có thể xem riêng các cột đầu và example_*; trường JSON dùng khi cần đầy đủ nguồn.

Giữ dấu, chuẩn hóa NFC/case/punctuation. Chỉ alias chính tả rõ trong bảng notebook; không fuzzy-match hoặc gộp theo tên bỏ dấu. Hậu tố kích cỡ rõ được tách; topping, khô/nước, thập cẩm và cách nấu vẫn giữ. Số lượng 1 trước mì/burger/bánh cuộn được bỏ khỏi tên chuẩn, vẫn giữ trong tên menu gốc và không chia giá. Combo/món nhóm cần rà; đồ uống/món thêm/tráng miệng/khai vị/món ăn chơi giữ trong raw/mapping và loại khỏi danh mục bữa chính. Tên rút gọn chưa đủ nghĩa cần rà. Nhóm nguồn ghi rõ Cơm Chay/Bún Chay cho phép bổ sung “chay” vào tên, có lý do; chỉ tên quán chay chưa đủ và không gộp vào món thịt. Quy tắc là đề xuất biên tập, mọi dữ liệu vẫn draft.

URL ảnh không đồng nghĩa có quyền tái sử dụng. Cuisine/origin/temperature/flavor/mealSlots chưa xác minh thì unknown/needs_review; không suy an toàn dị ứng hay dinh dưỡng từ tên. Menu trong snapshot không chứng minh bán buổi trưa, còn hàng hoặc đang mở. Disabled không tự chuyển thành sold_out. Việc publish/eligibility của app cần lịch, freshness, offering và review theo FOOD_DATA_SPEC.

## Kiểm chứng

Cell 7 kiểm ID và FK raw↔mapping↔catalogue, tổng occurrence, các cặp dễ nhầm, BOM và đọc lại từng ô CSV. Cell 8 kiểm thêm mọi metadata trong menu_offerings_json so với raw, liên kết ví dụ cùng mục nguồn và tổng quán/mục; chỉ candidate được xuất. Rerun trên snapshot phải giữ checksum cả bốn CSV và không append. Báo cáo nguồn phân biệt lấy được menu, cần render, thiếu menu, lỗi tải và địa chỉ cần rà. Số chi nhánh chỉ là độ hiện diện trong mẫu, không là lượng người thích món.

Regression notebook ở tests/test_menu_notebook.py kiểm phân loại và parser bằng fixture nhỏ; không dùng fixture làm kết quả khảo sát. Các kết quả thực tế và hạn chế của lần chạy được lưu ở quality_report/source_coverage và notebook executed. Không tự Approved/Done, commit hoặc push.

Lần chạy full 2026-10-09 đã refresh thành công cả 27 URL. Đọc được menu của 23 nguồn beFood: 692 mục sau gộp occurrence cùng ID; 260 mục có URL ảnh. Sau rà quy tắc theo nhóm menu, file cuối có **219 tên ứng viên từ 250 mục menu ở 21 chi nhánh**, 110 tên có URL ảnh và 126 tên có mô tả. Mapping còn 253 mục cần rà và 189 mục bị loại khỏi danh mục bữa chính; dữ liệu của hai quán chỉ có món nhóm/món chưa rõ vẫn giữ trong raw/mapping. Bốn nguồn ShopeeFood cần render, chưa có menu trong bản xuất. Toàn bộ 8 cell chạy đạt bằng Python 3.12.14/pandas 2.2.3/lxml 6.1.1. Chưa kiểm qua Jupyter kernel; đây là mẫu 27 URL đã chọn, chưa là toàn bộ quán/món khu Thủ Đức cũ.
