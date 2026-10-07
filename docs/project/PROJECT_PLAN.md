# Tiến độ theo dependency — food-v1

2026-10-07. 31 task sau GM-00, gồm gate tài liệu GM-28; 30 task triển khai, 27 P0 (kể cả gate), 1 P1 và 3 P2. GM-00 duyệt baseline cũ; GM-28 chờ review scope data mới. Lịch 8 tuần trước là mục tiêu cần ước lượng lại; chưa có ngày bắt đầu/hạn môn học hoặc cam kết mọi người nhận việc.

## Trình tự và song song

| Chặng | Task/nhánh | Điều kiện đi tiếp |
| --- | --- | --- |
| Review mới | GM-28 sau GM-00 | Trí review spec/ADR/data/privacy/nguồn/task/gate; không tự mở khóa |
| Nền độc lập | GM-01 bootstrap song song GM-03 taxonomy | Runner native và contract data được review riêng |
| Schema/UI | GM-02 primitives song song GM-04 schema sau dependency riêng | SQL setup/constraints và UI primitives |
| Auth/data/rules | GM-05 song song GM-27; GM-06 song song GM-11 khi đủ gate | Identity/RLS, dataset nguồn thật, decision fixture |
| Khả thi và vị trí | GM-29 song song GM-30 | Capability chọn anchor/giờ + eligibility server trên seed thật |
| Room/UI | GM-08 → GM-07 → GM-09; GM-10 và GM-12 có thể song song; GM-17 nhánh riêng | Hai máy cùng context/pool, nguồn/giờ/coverage, quyền và submit |
| Vote/result | GM-13 → GM-14 → GM-15; GM-18 nhánh history sau GM-12 | Hai vòng/result ổn định, availability đổi có thông báo |
| Sync/integration | GM-16 song song GM-20; GM-25 nhánh push | Outbox, QR/link/review, push/receipt, history |
| Regression/release | GM-19 có thể song song GM-20; GM-21 → GM-22 | Tất cả dependency riêng được review, native/pilot/SQL/DoD thật |
| Sau release | GM-26 P1; GM-23/24/31 P2 | Account/OCR/AI/weather–mood không chặn P0 |

Đây là tóm tắt; [dependency map sinh từ task](TASK_DEPENDENCIES.md) có link từng ID, trạng thái, gate, lớp topo và cặp parallel_with. Không chờ cả chặng nếu dependency riêng đã đạt. Dependency có quyền ưu tiên hơn lịch ước lượng. Cùng owner chỉ một task chính: GM-11/27 cùng Vinh cần xếp ca; Tâm schema/eligibility/room/history cần bố trí reviewer Vinh/Trí, không coi topo là cân tải.

## Đầu vào dữ liệu bắt buộc

GM-03 định nghĩa taxonomy/biểu mẫu; GM-04 schema không chờ khảo sát; GM-27 seed verified trên schema; GM-30 query eligibility; GM-08 room khóa pool. Chuỗi GM-03 → GM-04 → GM-27 → GM-30 → GM-08 là đường phụ thuộc data bắt buộc. GM-29 location sớm không chờ result; GM-20 tích hợp QR/review muộn tái sử dụng capability đó.

P0 data thật giới hạn coverage khảo sát được; unknown/stale không thành khẳng định đang bán. Ngoài coverage là thiếu dữ liệu, không lấy quán tỉnh khác. Pilot data cần người kiểm nguồn/ngày/license và lịch cập nhật; ảnh/mock không làm bằng chứng nơi bán.

## Theo dõi và điều chỉnh

Mỗi tuần đối chiếu [mẫu checkpoint](WEEKLY_REVIEW_TEMPLATE.md): AC/evidence, task đủ gate, blocked owner, khả năng song song và tải review, dữ liệu hết hạn/quota/chi phí, lệnh chạy thực. Chỉ người nhận cập nhật in-progress; chỉ reviewer độc lập mới Done.

Ưu tiên dời GM-26/23/24/31 nếu trễ. Không tự cắt core location/time/NO/security/expiry/test để giữ lịch 8 tuần; thay scope cần chủ dự án chốt và ADR. Chưa sync issue/Project, chưa app/API/native evidence.
