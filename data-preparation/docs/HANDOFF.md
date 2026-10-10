# Bàn giao chuẩn bị dữ liệu GM-03

## Đọc theo thứ tự

1. [Tổng quan nguồn](../DATASET_OVERVIEW.md): phạm vi, danh sách quán, 35 cột khảo sát.
2. [Vilao full](../VILAO_CATALOGUE.md): 17 cột thêm, prompt/cache/usage và giới hạn.
3. [Taxonomy](TAXONOMY.md): giá trị chuẩn, món gốc, alias/variant và quy tắc owner.

## Bản dữ liệu đóng băng

Snapshots Git có CSV 219 dòng/52 cột, CSV 39 món gốc, CSV mapping 219 dòng và manifest SHA-256. Bản nguồn 219 dòng giữ nguyên byte; pipeline gốc/raw/API cache trong datasets Git-ignored. Sau clone có thể chạy notebook gộp món offline; chạy crawl/GPT lại cần nguồn/cache hoặc opt-in mạng/API theo README.

27 URL khảo sát Thủ Đức cũ: 23 beFood đọc được menu, 4 ShopeeFood cần render. 692 menu items; 250 mục tạo 219 tên ứng viên từ 21 chi nhánh. Mapping rộng còn 253 cần rà và 189 excluded. Đây là mẫu có chọn lọc, chưa phủ toàn bộ khu vực; delivery menu chưa chứng minh dine_in.

219/219 GPT schema-valid draft, 32 request mới và 9 món tái dùng pilot. Full provider usage 152690 tokens, pilot riêng 7061. 19 batch vượt max_tokens gửi, không coi tham số này là trần phí. Nhiều thuộc tính unknown; schema valid không chứng minh đúng nội dung.

## Trạng thái và phần còn lại

Owner đã xác nhận gộp 216 tên vào 39 món, 2 needs_review, 1 excluded. Không mất offering, không ghép giá/đặc tính giữa quán, không suy quyền ảnh từ URL. GM-03 vẫn BLOCKED bởi GM-28 và phân công còn proposed. Không sửa Approved/Done hoặc publish seed.

Còn review độc lập, nguồn/quyền ảnh và giá/đơn vị, biên tập taxonomy/meal unknown, fixtures pool/budget/context boundary và kiểm freshness/lịch/offering thật. GM-04 làm SQL/import transaction; GM-27 xác minh dataset quán; GM-30 thực thi eligibility. Không sử dụng dataset này như danh sách quán đang mở/còn hàng.

Kiểm bằng Python runner, chưa Jupyter kernel/native/SQL. Không cài package, không gọi API thêm khi gộp món. Task readiness BLOCKED là kết quả dự kiến, không phải bằng chứng test thất bại hay gate mở.

## Kiểm chứng phần 1 — 2026-10-10

89 regression tests đạt; repository validator, task index check và diff check đạt. Notebook gộp món chạy 2 lần offline, 7/7 code cells đạt, 0 API calls, các CSV cùng SHA-256 theo snapshots/manifest.json. CSV nguồn có SHA-256 e441ecfca93846da6596284f969149d2fef3e53f3397daa537cd8ba24dbcff37. Các kiểm chứng này không thay review nội dung hoặc approval GM-28.
