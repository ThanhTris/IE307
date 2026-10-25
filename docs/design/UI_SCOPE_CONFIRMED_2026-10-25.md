# Phạm vi UI đã chốt sau hai đợt bổ sung — 2026-10-25

Theo chỉ dẫn trực tiếp của Trí trong cuộc hội thoại UI ngày25/10, các mục nêu ở lượt rà cuối **không cần bổ sung**. Bộ UI hiện tại được dùng làm đầu vào để chuyển sang rà BE/Data; không tiếp tục tạo vòng bổ sung thiết kế từ các đề xuất đã được loại khỏi phạm vi.

## Thiết kế hiện hành

- G01–G05 đã có12 frame thật trên trang03, dùng component tại trang02. Xem [bàn giao G01–G05](UI_GAPS_FIGMA_UPDATE_2026-10-25.md).
- Đợt sau đã thêm state dưới10 món và nội dung thông báo không khả dụng; sửa preview trước join, Friends/search/presence, CTA contrast và bố cục. Xem [bàn giao cập nhật](UI_APPROVED_UPDATES_2026-10-25.md).
- [Task map](UI_FIGMA_TASK_MAP.json) và [component map](COMPONENT_MAP.md) chứa node hiện hành. Màn cùng quy trình xếp ngang, giữ12 điểm bắt đầu prototype.

## Không tiếp tục coi là yêu cầu bổ sung UI

Các đề xuất cuối về hủy kết bạn, mapping auth P1 và mẫu trình bày legacy thiếu điểm/Top3 không là điều kiện để mở thêm frame hoặc chặn việc chốt bộ UI hiện tại. Main không dùng các báo cáo rà lịch sử để tự đưa chúng trở lại backlog bổ sung thiết kế.

Kiểm tương tác prototype là phạm vi riêng, không tính là thiếu frame. Việc chốt thiết kế không chứng minh mọi link prototype đã chạy đúng hoặc API/runtime đã được triển khai/nghiệm thu.

## Phần tiếp theo

Rà BE/Data theo node và trạng thái UI hiện có, phân biệt field từ producer với state cục bộ của FE; giữ riêng bằng chứng implementation/Android/API và quyền review cuối của Trí. Không đổi status/owner/deadline trên Project từ tài liệu này.

Đây là xác nhận phạm vi thiết kế từ chỉ dẫn của chủ dự án, không là approval tự tạo cho code, migration, dataset hoặc task runtime. Không push các bản nháp app/ảnh/đề xuất lịch sử trong gói bàn giao UI này.
