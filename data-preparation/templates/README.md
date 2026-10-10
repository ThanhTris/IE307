# Biểu mẫu món–quán–lịch bán

Đọc [data dictionary](../docs/DATA_DICTIONARY.md) trước khi nhập. [JSON trống](empty/dataset.json) có đủ entity arrays. [JSON ví dụ](examples/dataset.json) và CSV trong cùng folder biểu diễn cùng bộ dữ liệu. Đây là fixture tổng hợp, fixtureOnly=true, nguồn example.invalid; giá/địa chỉ/lịch không dùng tìm quán thật. Bộ CSV gồm 11 file entity và bundle.json metadata; không xóa file của entity trống.

Tạo dữ liệu thật từ bản sao empty, đặt fixtureOnly=false nhưng giữ reviewStatus=draft. Mọi cột phải có, nullable để ô trống/null; arrays/objects viết JSON trong ô. Giữ ID/registry key bất biến; người nhập tăng version khi thay dữ liệu. Không copy ngày giờ/giá/nguồn/UUID fixture làm dữ liệu thật. Không tự điền validUntil khi policy chưa chốt.

```bash
# Kiểm JSON hoặc toàn thư mục CSV; exit 1 và chỉ rõ entity/row/field nếu lỗi
python3 data-preparation/scripts/data_contract.py data-preparation/templates/examples/dataset.json
python3 data-preparation/scripts/data_contract.py data-preparation/templates/examples
# Sinh lại templates từ schema + fixture code đã review; sẽ ghi đè templates
python3 data-preparation/scripts/prepare_contract_templates.py
```

Validator không import database, publish, gọi mạng hoặc tự cấp review. JSON/CSV đều kiểm cùng contract. Code chuyển đổi read_csv_bundle/write_csv_bundle ở data_contract.py. CSV UTF-8 BOM, boolean true/false, số JSON, nullable ô trống. Chưa biết giờ/giá/tọa độ không thành 0, luôn mở hoặc active.

Ví dụ có hai ca trong cùng nhóm lịch offering; ca Thứ Sáu 22:00–02:00 qua đêm và ngoại lệ Thứ Bảy đóng cửa. GM-30 cần xác nhận 00:30 Thứ Bảy bị chặn dù ca bắt đầu Thứ Sáu. Lịch quán unknown, tọa độ/coverage/freshness thiếu → ví dụ này không được vào pool thật. Sold_out hết expiresAt phải trở lại unknown, không thành available.

GM-03 còn fixtures pool/budget/context và review độc lập; không coi các forms này là task Done. Dữ liệu 39 món thật vẫn ở snapshots dưới dạng khảo sát, không tự chuyển sang offering verified trong forms.
