# Phân loại toàn danh mục qua Vilao

Được chủ dự án yêu cầu chạy toàn bộ 219 tên món từ mẫu menu Thủ Đức cũ. Đây là bộ taxonomy đề xuất draft, chưa publish seed hoặc mở khóa GM-03. [Thử nghiệm ban đầu](VILAO_PILOT.md) là nguồn codebook và quan sát provider; [notebook full](notebooks/classify_thu_duc_catalogue.ipynb) chứa 7 code cell cấu hình, xem nguồn, cache, prompt, chạy, kiểm CSV và báo cáo.

## Phạm vi và đầu ra

Model cố định `vgpt/gpt-5.6-luna`, endpoint Vilao chat. Chỉ gửi tên chuẩn, tên menu gốc, mô tả và nhóm menu của một offering cùng ID; không gửi địa chỉ/GPS, ảnh, giá, dữ liệu người dùng hoặc toàn CSV. Các nguồn/metadata đầy đủ và alias/variant giữ nguyên trong CSV nguồn.

File xuất: `data-preparation/datasets/thu-duc-taxonomy/processed/thu_duc_dishes_taxonomy.csv`, UTF-8 BOM, 219 dòng, **52 cột**. 35 cột nguồn được giữ nguyên từng giá trị, thêm 17 cột:

| Cột | Ý nghĩa |
|---|---|
| taxonomy_cuisines_json | Array cuisine đề xuất |
| taxonomy_origin | Bắc/Trung/Nam khi nguồn nêu; unknown và not_applicable tách riêng |
| taxonomy_categories_json | Array họ món; tối đa 3 |
| taxonomy_methods_json | Array cách nấu món/thành phần chính; tối đa 3 |
| taxonomy_temperature | Nhiệt độ phục vụ được menu nêu |
| taxonomy_flavors_json | Cay/mặn/ngọt/chua, mức độ hoặc unknown |
| taxonomy_meal_slots_json | Slot phù hợp theo thông tin menu/giờ nêu; chưa là lịch hiện tại |
| taxonomy_evidence_json | unknown/menu_explicit/model_inferred_draft từng nhóm |
| taxonomy_status | schema_valid_draft/needs_review/pending |
| taxonomy_errors_json | Lỗi response/contract |
| taxonomy_raw_row_json | Array nguyên trạng, index trong batch |
| taxonomy_cache_key | SHA-256 context item |
| taxonomy_prompt_version | Prompt v2 hoặc pilot-v1-reused |
| taxonomy_model | Model yêu cầu |
| taxonomy_response_model | Model provider báo |
| taxonomy_checked_at | Thời điểm request UTC |
| taxonomy_batch_reference | Tham chiếu batch nguồn trong cache |

Các cột cuisine/origin/temperature/flavor/meal_slots gốc vẫn giữ unknown như nguồn; xem `taxonomy_*` để dùng đề xuất mới. Schema pass không phải human approval hoặc tỷ lệ phân loại chính xác. Các mức unknown không được đổi thành “không cay” hay nhiệt độ thường. Dữ liệu không chứng minh dị ứng, lịch quán/lịch món, tồn kho hoặc quyền ảnh.

## Cache và tiếp tục sau lỗi

[Catalogue engine](scripts/vilao_catalogue.py) lưu cache theo context từng dish ID và namespace từ model/prompt/codebook/contract. Đổi context của món chỉ làm món đó cần xử lý lại; đổi contract/prompt tạo namespace mới. Tái dùng pilot đạt validator khi model/codebook/context trùng, giữ provenance pilot riêng. Dòng pilot sai không được nhập.

```text
datasets/thu-duc-taxonomy/
  raw/<scope-sha256>/
    items/<item-context-sha256>.json
    batches/<request-sha256>_<attempt>.json
  processed/thu_duc_dishes_taxonomy.csv
  reports/
    DATASET_REPORT.md
    run_report.json
    needs_review.json
    quality_summary.json
    reproducibility_report.json
    classify_thu_duc_catalogue.executed.ipynb
```

- Ghi atomic bằng file tạm rồi replace, không append. Mỗi batch cập nhật CSV checkpoint đủ 219 dòng, nhãn thiếu ghi pending, nhãn chưa đạt ghi needs_review và raw/errors giữ riêng.
- Journal in_flight được ghi trước HTTP; response lưu trước item cache. Chạy lại phục hồi item từ batch đã lưu, tránh gọi lại chỉ vì chưa ghi hết item.
- Item schema_valid_draft đã cache không bị gọi lại. Cả phản hồi sai và lần thử lại đều giữ; không sửa hay ép nhãn tự động. Sai schema được thử lại tối đa một lần; HTTP/network lỗi dừng lần chạy, mở lại chạy tiếp phần còn thiếu/chưa hết attempt.
- Một lỗi định dạng được phục hồi cục bộ: thêm hoặc bỏ đúng một dấu `]` cuối array ngoài, chỉ khi có đúng số dòng, mỗi dòng đúng 9 vị trí và index đúng thứ tự. Không sửa giá trị nhãn, không cắt lời giải thích/code fence, không chữa cấu trúc bên trong. Raw response giữ nguyên; cache item có `json_wrapper_repair`, report đếm số dòng được phục hồi; từng dòng vẫn phải qua validator.
- Request bị ngắt sau gửi mà trước lưu response là uncertain; hệ thống dừng, không tự gửi trùng. Kiểm journal/provider trước quyết định chạy lại. Không có bảo đảm exactly-once hoặc chưa tính phí cho request mất response.
- Dataset lock ngăn hai lượt chạy full đồng thời. Cache response có checksum; cache hợp lệ phải qua validator lại khi đọc.

## Giới hạn và chạy notebook

Tối đa 10 món/request, 2 attempt/món và 44 HTTP attempt/lượt chạy. Giới hạn transport 16.000 UTF-8 byte/request, response 2 MB, timeout 45 giây, không redirect hoặc transport retry. Prompt v2 nhắc rõ toàn bộ flavor unknown phải có evidence 0, kể cả lựa chọn cay/không cay. Các nhãn chỉ trong [codebook draft](config/taxonomy_pilot_v1.json).

`max_tokens=1400` là ngưỡng gửi, chưa là trần tổng token tính phí: lần pilot provider báo completion gồm reasoning vượt ngưỡng này. Ngưỡng dừng 200.000 reported tokens được kiểm giữa các request và gồm các batch mới đã cache trong namespace; một response có thể đẩy tổng qua ngưỡng. Không suy tiền từ giá OpenAI, cần đối chiếu Vilao dashboard. Usage batch full không cộng lặp khi đọc cache; pilot được báo riêng.

Mặc định `ALLOW_API_CALLS=False`, Run All chỉ đọc cache và xuất lại file. Đặt True để gọi phần thiếu. Notebook chọn kernel Python có pandas; khi kernel ngoài project đặt DATA_PREPARATION_DIR. Root `.env` chứa key, parser nhận dạng đã dùng ở pilot; key không vào cache, CSV hay log. Không bật refresh để xóa cache; thay prompt/config phải có chủ đích.

```bash
# Chạy hoặc tiếp tục phần thiếu:
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/classify_thu_duc_catalogue.ipynb --allow-api
# Chỉ đọc cache, không cần key và không gọi API:
python3 data-preparation/scripts/run_notebook.py data-preparation/notebooks/classify_thu_duc_catalogue.ipynb --offline
```

Chạy bằng Python exec có output thật từng cell; chưa kiểm trực tiếp Jupyter kernel. Tests dùng fixture/mock để kiểm cache replay, phục hồi sau lưu response, lỗi HTTP/schema, dữ liệu nguồn/BOM và ngăn gửi lại uncertain request. Không cài package hoặc thay dependency app; không commit/push.

## Kết quả lần chạy 2026-10-10

Đã xuất **219 dòng, 52 cột**, dung lượng 1.955.954 byte (~1,96 MB). **219/219 dòng đạt contract**, không còn pending hoặc lỗi contract. 35 cột nguồn giữ nguyên; danh mục nguồn không bị ghi đè. Các nhãn vẫn draft và cần review về nội dung.

Tái dùng 9 dòng pilot; 210 món còn lại được xử lý qua **32 request mới**, gồm các lần thử lại. Phản hồi lỗi ngoặc khiến lượt API đầu phải thử lại một số batch; bước replay bằng parser phục hồi wrapper lấy lại 41 món từ response đã lưu, **không gọi thêm API**. Các lần chạy sau dùng parser này ngay khi nhận response. Raw response, các lần thử và ghi chú phục hồi đều giữ.

Usage **riêng lượt full** do provider báo: prompt 106.550, completion 46.140, tổng **152.690 tokens**; không gồm 7.061 tokens của hai request pilot trước đó. Có 19 batch báo completion_tokens vượt max_tokens gửi, vì vậy không suy trần phí từ tham số này. Số tiền chưa đối chiếu Vilao dashboard.

Không ép đoán thuộc tính thiếu nguồn: 7 món cuisine unknown, 185 món origin unknown, 210 món nhiệt độ unknown, 200 món buổi ăn unknown, 208 món có cả bốn mức vị unknown. Category đề xuất của mọi dòng chứa category từ bước chuẩn hóa menu, nhưng đây chỉ là đối chiếu hai đề xuất, không chứng minh độ chính xác.

Hai lần chạy lại offline cho CSV cùng SHA-256 `e441ecfca93846da6596284f969149d2fef3e53f3397daa537cd8ba24dbcff37`, mỗi lần 0 API calls. Quét 257 file dữ liệu/cache/báo cáo không thấy key thật. 80 regression test, repository validator, task indexes và diff check đạt; chưa kiểm bằng Jupyter kernel hoặc review độc lập.
