# Tiến độ theo dependency — food-v1

2026-10-07. 31 task sau GM-00, gồm gate tài liệu GM-01; 30 task triển khai, 27 P0 (kể cả gate), 1 P1 và 3 P2. GM-00 duyệt baseline cũ; GM-01 chờ review scope data mới. Lịch 8 tuần trước là mục tiêu cần ước lượng lại; chưa có ngày bắt đầu/hạn môn học hoặc cam kết mọi người nhận việc.

## Hai thứ tự riêng

Theo [ADR-006](../architecture/decisions/ADR-006-parallel-start-ordered-merge.md), bảng dưới là thứ tự **tích hợp/merge**, không phải thứ tự bắt đầu viết. Sau GM-01 có thể viết phần độc lập của 26 task theo contract đã review; GM-05, GM-06, GM-08, GM-11 chờ contract GM-03. Mock/fixture không đóng AC thật. Xem từng task để biết phần làm trước/phần chờ tích hợp, [workflow](TEAM_WORKFLOW.md) để kiểm target/PR.

Đợt đầu đề xuất: Tuấn GM-02, Trang GM-04, Vinh GM-03, Trung GM-07 adapter, Trí GM-09 ma trận quyền/tests. Tâm chuẩn bị patch/test plan GM-05 rồi triển khai khi GM-03 được review. Sau đó Tâm schema GM-05 và Vinh khảo sát GM-08 song song; GM-06, GM-08 cùng Vinh, GM-05, GM-11 cùng Tâm cần xếp ca. Không tự coi các thành viên đã nhận việc.

## Trình tự tích hợp và merge

| Chặng | Task/nhánh | Điều kiện đi tiếp |
| --- | --- | --- |
| Review mới | GM-01 sau GM-00 | Trí review spec/ADR/data/privacy/nguồn/task/gate; không tự mở khóa |
| Nền độc lập | GM-02 bootstrap song song GM-03 taxonomy | Runner native và contract data được review riêng |
| Schema/UI | GM-04 primitives song song GM-05 schema sau dependency riêng | SQL setup/constraints và UI primitives |
| Auth/data/rules | GM-07 song song GM-08; GM-09 song song GM-06 khi đủ gate | Identity/RLS, dataset nguồn thật, decision fixture |
| Khả thi và vị trí | GM-10 song song GM-11 | Capability chọn anchor/giờ + eligibility server trên seed thật |
| Room/UI | GM-12 → GM-13 → GM-16; GM-19 và GM-14 có thể song song; GM-15 nhánh riêng | Hai máy cùng context/pool, nguồn/giờ/coverage, quyền và submit |
| Vote/result | GM-20 → GM-21 → GM-22; GM-17 nhánh history sau GM-14 | Hai vòng/result ổn định, availability đổi có thông báo |
| Sync/integration | GM-24 song song GM-23; GM-18 nhánh push | Outbox, QR/link/review, push/receipt, history |
| Regression/release | GM-25 có thể song song GM-23; GM-26 → GM-27 | Tất cả dependency riêng được review, native/pilot/SQL/DoD thật |
| Sau release | GM-28 P1; GM-29, GM-30, GM-31 P2 | Account/OCR/AI/weather–mood không chặn P0 |

Đây là tóm tắt merge; [dependency map sinh từ task](TASK_DEPENDENCIES.md) có lớp start riêng và lớp merge riêng. parallel_with có thể có quan hệ merge trước/sau. Không chờ cả chặng nếu dependency riêng đạt; cùng owner một task chính. Reviewer Trí/Tâm cần đặt lịch sớm, không coi topo là cân tải.

## Đầu vào dữ liệu bắt buộc

GM-03 chốt taxonomy/biểu mẫu; GM-05 schema không chờ khảo sát; GM-08 seed verified trên schema; GM-11 query eligibility; GM-12 room khóa pool. Chuỗi GM-03 → GM-05 → GM-08 → GM-11 → GM-12 là đường nghiệm thu/tích hợp data; khảo sát GM-08 và pure rules GM-11 có thể viết sau GM-03 trước các upstream merge còn lại. GM-10 viết adapter/UI với fixture sớm, test thật chờ auth/coverage; GM-23 tái dùng capability đó.

P0 data thật giới hạn coverage khảo sát được; unknown/stale không thành khẳng định đang bán. Ngoài coverage là thiếu dữ liệu, không lấy quán tỉnh khác. Pilot data cần người kiểm nguồn/ngày/license và lịch cập nhật; ảnh/mock không làm bằng chứng nơi bán.

## Theo dõi và điều chỉnh

Mỗi tuần đối chiếu [mẫu checkpoint](WEEKLY_REVIEW_TEMPLATE.md): AC/evidence, task đủ gate, blocked owner, khả năng song song và tải review, dữ liệu hết hạn/quota/chi phí, lệnh chạy thực. Chỉ người nhận cập nhật in-progress; chỉ reviewer độc lập mới Done.

Ưu tiên dời GM-28, GM-29, GM-30, GM-31 nếu trễ. Không tự cắt core location/time/NO/security/expiry/test để giữ lịch 8 tuần; thay scope cần chủ dự án chốt và ADR. Chưa sync issue/Project, chưa app/API/native evidence.
