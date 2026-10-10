# Seed/template food-v1

[Template JSON](templates/food-v1.template.json) do GM-03 bàn giao là envelope rỗng để nhập liệu, status=draft. Chưa có SQL import/config/database; GM-05 tạo runner/schema, GM-08 nhập dữ liệu có nguồn và review thật. Nội dung JSON độc lập backend.

Đọc [data dictionary](../../docs/data/FOOD_DATA_DICTIONARY.md) trước khi nhập. Đổi metadata ngày/version/editor, cung cấp nguồn đúng loại, giữ null/unknown khi thiếu bằng chứng; không dùng template rỗng làm dataset đã publish.

Fixture ví dụ nằm riêng tại [tests/fixtures/food-v1](../../tests/fixtures/food-v1/README.md); không copy giá/quán/tọa độ mô phỏng làm khảo sát thật. Preflight `purpose=publish` chặn kind fixture, nguồn fixture-only và review thiếu; quyền trusted publisher, chất lượng nguồn/ảnh và transaction import vẫn cần kiểm ở server/người review. Không có ảnh hoặc data quán thật được thêm trong GM-03.
