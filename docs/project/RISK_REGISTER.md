# Risk register

| Rủi ro | Xác suất | Tác động | Giảm thiểu | Owner |
| --- | --- | --- | --- | --- |
| Phạm vi quá lớn trong hai tháng | Cao | Cao | Mốc RC sớm, tiêu chí cắt phạm vi, giới hạn hai task active | Trung |
| Sync làm mất hoặc nhân bản dữ liệu | Trung bình | Cao | Event id, version, tombstone, idempotency và fixture hai thiết bị | Trang/Tâm |
| JSON quá linh hoạt làm truy vấn chậm | Trung bình | Cao | Chuẩn hóa cột lịch ôn/index, JSON Schema và index JSONB có chọn lọc | Tâm |
| Word Ninja tốn thời gian hơn dự kiến | Cao | Trung bình | Làm vertical slice đơn giản, ưu tiên logic trước hiệu ứng | Tuấn/Trí |
| Không có tài khoản Apple Developer | Trung bình | Cao | Chuẩn bị archive và metadata; ghi rõ phụ thuộc tài khoản/xét duyệt | Trang |
| RLS cấu hình sai | Trung bình | Cao | Policy test theo user A/B và deny-by-default | Trang/Tâm |
| Báo cáo dồn cuối kỳ | Cao | Cao | Evidence và nội dung viết song song từ tuần 1 | Trung |
| Tài liệu môn học cập nhật | Cao | Trung bình | Script sync, manifest và traceability review mỗi đầu tuần | Vinh |
| AI sinh code không hiểu hoặc sai license | Trung bình | Cao | Diff review, test bắt buộc, không merge code chưa hiểu | Trí |
