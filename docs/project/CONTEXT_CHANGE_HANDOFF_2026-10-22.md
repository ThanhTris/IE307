# Bàn giao cập nhật yêu cầu chọn món — 2026-10-22

Chủ dự án Trí đã yêu cầu đưa ngữ cảnh lên main, comment task còn mở/Review và thực hiện code bổ sung qua PR mới cho task Done. ADR-019 ghi yêu cầu đã chốt; đây là PR ngữ cảnh/phân định phạm vi trước implementation.

Không mở lại lịch sử nghiệm thu, không coi thay mô tả là feature đã chạy. Các supplement trong task là yêu cầu patch tiếp theo, giữ nguyên assignee và deadline trên Project. Không thêm task Data thứ hai hoặc ép task cũ phụ thuộc ngược GM-40.

Thứ tự patch: contract phiên có version mới → backend/catalogue và domain có đầu vào chung → UI nhận API → hồi quy → kiểm điện thoại theo đợt sau merge. Giữ phiên legacy chạy theo policy cũ; giữ privacy và dữ liệu auth/social/history.

Phạm vi đã chốt: phòng 20 người, host chọn chính xác 10–20 món; bỏ ready; người đầu tiên hoàn tất lượt vào chờ mới kích hoạt 60 giây riêng mỗi vòng; host chốt với tối thiểu một phiếu đủ; cap loại động; reconnect vào vòng 2 nếu còn mở hoặc đọc kết quả terminal; chọn món không phụ thuộc quán/GPS.

Pending riêng: public Top 3/score và tự gửi/Undo ở thẻ cuối. Không dùng Pending đó cản phần độc lập đã chốt.

## Kiểm cho PR ngữ cảnh

- Baseline origin/main afb1dca13b91bef30062aca018e5457908d244bc; worktree sạch riêng từ main, không đưa thay đổi local ngoài scope.
- CHECKS: validate_repository.py, task_readiness.py --check-docs, git diff --check đều Pass. Python regression tại checkout baseline afb1dca + patch tài liệu: 550 tests, OK, skipped=6, 94,435 giây trên Windows/Python 3.14.
- Không có thay đổi mobile/runtime/migration trong PR ngữ cảnh; Android/API N/A cho patch tài liệu, vẫn Not run cho feature mới.
- Những PR runtime sau phải có request suite/input-response-assertions, test policy và component; migration tiến, không reset database ứng dụng.
