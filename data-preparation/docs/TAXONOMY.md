# Taxonomy và món gốc — draft 1.0.0

Nguồn yêu cầu: kế hoạch GM-03 được chủ dự án xác nhận. [Food data spec](../../docs/specs/FOOD_DATA_SPEC.md) và [task GM-03 lịch sử](../../docs/evidence/roadmap-v1/GM-03/TASK_BEFORE_V2.json) còn chờ GM-28/reviewer. Quyết định gộp tên của owner không thay review độc lập về dữ liệu.

## Cấu hình có thẩm quyền

[Codebook chuẩn](../config/taxonomy_v1.json) liệt kê toàn bộ giá trị được phép. Cuisine dùng vi/th/ko/ja/zh/it/us/other. Unknown biểu diễn bằng array rỗng kèm evidence unknown; other là có bằng chứng ngoài danh sách. Origin north/central/south/unknown/not_applicable tách địa điểm bán. Category đa nhãn, mã family:* và preparation:* khác nhau; unknown không thành other. Nhiệt độ hot/warm/cold/ambient/unknown tách cay.

Vị gồm spicy/salty/sweet/sour, mỗi vị có present true/false/null và intensity none/low/medium/high/unknown. Có vị nhưng chưa rõ mức → true/unknown; chưa biết → null/unknown; không có theo nguồn → false/none. Mức thấp không tự tương đương không có.

Meal slots breakfast/lunch/dinner/snack. Pilot khuya giữ timeHints late_night, không chuyển thành snack. Array rỗng chưa đủ dữ liệu phân loại, không có nghĩa món không phù hợp mọi buổi. Không tự biến khung giờ pilot thành lịch bán hoặc tất cả món thành ăn sáng.

Pilot codebook, prompt và cache Vilao giữ nguyên. Hàm convert_profile chuyển biểu diễn offline, không đổi namespace cache và không gọi API. Nguồn model_inferred_draft chưa là sự thật đã review. Profile nguồn chỉ gắn ngữ cảnh món đã gửi GPT, không truyền sang mọi offering khác.

## Món gốc, alias và variant

[Registry](../config/base_dish_registry.json) có 39 món gốc; [mapping](../config/base_dish_mapping_v1.json) có 219 source ID: 216 mapped, 2 needs_review, 1 excluded. Đây là bảng cụ thể đã chốt, runtime không fuzzy/prefix match. Đổi tên nguồn hoặc thêm ID yêu cầu cập nhật mapping có chủ đích. RegistryKey bất biến; UUIDv5 namespace anyfood:food-v1:dishes, khóa base-NNN. Không dùng tên hiển thị làm khóa ID. Đổi nhãn không đổi ID; không tái dùng key món đã bỏ.

Alias chỉ tên tương đương được xác minh; không biến mọi tên topping thành alias. SourceNames là tên chi tiết trên menu. Phở bò/gà tách; phở bò gà loại theo owner; phở thập cẩm/cơm viên chua ngọt cần rà. Chay riêng khỏi thịt; chỉ nhãn chay có nguồn, không khẳng định an toàn dị ứng.

Bún bò gồm khô/nước/trộn bò theo quyết định owner. Bún nem nướng khác bún thịt nướng; bún chay chung khác bún bò chay/bún riêu chay; healthy/gạo lứt về bún gạo lứt. Mì/Mì trộn/Mì Ý tách. Cơm tấm/chay/gà/bò/sườn/chiên/cá kho/cá chiên/thịt kho/trộn/tôm rim/đậu hủ sốt cà/canh khổ qua riêng; gapao/tomyum/cơm trộn về cơm trộn. Bánh mì và burger mỗi loại một nhóm. Bánh cuốn/cuộn/ướt tách. Xôi/salad/hủ tiếu/miến/nui/bánh bao gộp topping theo từng nhóm.

Giá, sốt, kích cỡ, ảnh, mô tả, tên menu và quán nằm nguyên trong menuOfferings. Món gốc có nhiệt độ/nguồn gốc/vị/buổi ăn chưa xác minh, không lấy hợp nhãn giữa các quán. Các profile GPT giữ riêng sourceProfiles để review. Catalogue 39 món phản ánh mẫu thật và yêu cầu owner; không thêm để đủ mục tiêu cũ 60–80. Chưa thay AC task hay approval.

## Chạy

Mở notebook prepare_base_catalogue, chọn Python có pandas rồi Run All. Notebook 7 code cell, chạy offline từ snapshot Git; output tự lưu snapshots, báo cáo executed vào datasets/thu-duc-base/reports. Có thể chạy:

```bash
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/prepare_base_catalogue.ipynb --offline
```

Runner Python exec không phải bằng chứng Jupyter kernel. Không cần .env/API/cache HTML để tạo lại danh mục gốc.
