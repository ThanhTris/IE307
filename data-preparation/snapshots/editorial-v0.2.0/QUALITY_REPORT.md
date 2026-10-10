# Catalogue biên tập 0.2.0 — báo cáo chất lượng

Phạm vi: mẫu menu Thủ Đức cũ, 39 món gốc; **chưa đạt mục tiêu 60–80**. Draft, contract 1.0.0, bản ghi món version 2, chưa review độc lập. Không seed/publish hoặc chứng minh quán đang bán. GM-03 vẫn chờ GM-28; nơi bán đủ điều kiện thuộc GM-27.

- Mô tả: 34/39; category: 39/39; cuisine: 5/39.
- Meal slots: 2/39; nhiệt độ: 2/39; nguồn gốc: 1/39; vị: 0/39.
- Alias: 1/39; ingredientTags: 0/39. Không tự suy thành phần/an toàn dị ứng.
- Cuisine theo mã (đa nhãn): {'vi': 5, 'zh': 1}. Meal slots: {'breakfast': 2, 'snack': 1}. Category theo mã (đa nhãn): {'family:banh_bao': 1, 'family:banh_cuon': 1, 'family:banh_cuon_wrap': 1, 'family:banh_mi': 1, 'family:banh_uot': 1, 'family:bun': 10, 'family:burger': 1, 'family:hu_tieu': 1, 'family:mien': 1, 'family:noodles': 3, 'family:nui': 1, 'family:pho': 2, 'family:rice': 13, 'family:salad': 1, 'family:sticky_rice': 1, 'preparation:steamed': 2}.
- Ảnh đã chọn đủ kiểm nội dung và license: 0/39; 28 ứng viên metadata. Wikimedia trả 429/403, chưa xem được ảnh; metadata có license không đủ để chọn artwork. Có ứng viên sai món/PDF bị loại. Giá: 247/247 quan sát có giá, 21 chi nhánh; đơn vị giữ theo nguồn, chưa biết khẩu phần.
- Mapping: {'mapped': 216, 'needs_review': 2, 'excluded': 1}; thông tin chi tiết/giá/ảnh menu gốc giữ nguyên trong snapshot offering. Không tính giá chung/giá mỗi người.
- Phân loại theo nhóm owner/menu và nguồn tham khảo; tất cả classificationStatus=needs_review. field_evidence.csv dẫn từng trường; fieldSources taxonomy chỉ là nguồn nhóm, không thay bảng bằng chứng chi tiết. Nhãn GPT không được chuyển thành dữ liệu verified.
- JSON/11 CSV theo contract; venue/offering/lịch/coverage/anchor arrays rỗng. Giá tham chiếu không phải entity nơi bán đã đủ freshness/lịch. validUntil/reviewedBy=null. Quyền menu unknown. Checksum artifact trong manifest tránh vòng tự băm; datasetVersions.checksum=null (draft).

| Món | Mô tả | Cuisine | Buổi ăn | Nhiệt độ | Artwork |
| --- | --- | --- | --- | --- | --- |
| Burger | có | unknown | unknown | unknown | thiếu |
| Bánh bao | có | có | breakfast, snack | unknown | thiếu |
| Bánh cuốn | có | có | breakfast | unknown | thiếu |
| Bánh cuộn | có | unknown | unknown | unknown | thiếu |
| Bánh mì | có | unknown | unknown | unknown | thiếu |
| Bánh ướt | có | có | unknown | unknown | thiếu |
| Bún bò | có | unknown | unknown | unknown | thiếu |
| Bún bò chay | có | unknown | unknown | unknown | thiếu |
| Bún chay | có | unknown | unknown | unknown | thiếu |
| Bún gạo lứt | có | unknown | unknown | unknown | thiếu |
| Bún mọc | thiếu | unknown | unknown | unknown | thiếu |
| Bún nem nướng | có | unknown | unknown | unknown | thiếu |
| Bún riêu | có | unknown | unknown | unknown | thiếu |
| Bún riêu chay | có | unknown | unknown | unknown | thiếu |
| Bún thịt nướng | có | unknown | unknown | unknown | thiếu |
| Bún đậu | có | unknown | unknown | unknown | thiếu |
| Cơm bò | có | unknown | unknown | unknown | thiếu |
| Cơm canh khổ qua | thiếu | unknown | unknown | unknown | thiếu |
| Cơm chay | có | unknown | unknown | unknown | thiếu |
| Cơm chiên | có | unknown | unknown | unknown | thiếu |
| Cơm cá chiên | có | unknown | unknown | unknown | thiếu |
| Cơm cá kho | thiếu | unknown | unknown | unknown | thiếu |
| Cơm gà | có | unknown | unknown | unknown | thiếu |
| Cơm sườn | có | unknown | unknown | unknown | thiếu |
| Cơm thịt kho | có | unknown | unknown | unknown | thiếu |
| Cơm trộn | có | unknown | unknown | unknown | thiếu |
| Cơm tôm rim | thiếu | unknown | unknown | unknown | thiếu |
| Cơm tấm | có | unknown | unknown | unknown | thiếu |
| Cơm đậu hủ sốt cà | thiếu | unknown | unknown | unknown | thiếu |
| Hủ tiếu | có | unknown | unknown | unknown | thiếu |
| Miến | có | unknown | unknown | unknown | thiếu |
| Mì | có | unknown | unknown | unknown | thiếu |
| Mì trộn | có | unknown | unknown | unknown | thiếu |
| Mì Ý | có | unknown | unknown | unknown | thiếu |
| Nui | có | unknown | unknown | unknown | thiếu |
| Phở bò | có | có | unknown | hot | thiếu |
| Phở gà | có | có | unknown | hot | thiếu |
| Salad | có | unknown | unknown | unknown | thiếu |
| Xôi | có | unknown | unknown | unknown | thiếu |

Nguồn và license ứng viên: image_references.csv; kiểm từng file theo [Commons reuse guide](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia). Chưa tải ảnh vào assets. Nội dung mô tả menu nêu phạm vi nhóm, không khẳng định mọi biến thể có cùng nguyên liệu/cách phục vụ. Nguồn web tham khảo là evidence draft, chưa bằng chứng reviewer Approved. Kết quả kiểm bằng Python runner, chưa chạy trực tiếp Jupyter kernel.
