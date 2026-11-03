# GM-13.2 — bước 6: routes, regression và bàn giao

Default result/no-consensus đã chuyển sang DishResultEntry/Preview/Flow;
Foundation mở màn mới. Real mode có auth/capability guard, không hiển thị
mock kể cả gắn legacy flag. Development/mock ?legacy=1 giữ màn cũ để
versioned regression; file legacy còn consumer nên chưa xóa.

Tạo phòng mới dùng entry GM-09/10, giữ tên khách và bỏ receipt tổng hợp;
Home/đóng dùng dismissTo Home. Không mang phiếu hoặc gọi tạo phòng thật.
QA mặc định gọn, tìm kiếm/Xem tất cả và lọc theo màn; mô phỏng quán có
pending/callbacks, không network/native. Mỗi fixture có result ID riêng;
retry giữ ID, điểm và winner. Các fixture điểm chưa tuyệt đối dùng R2
ACCEPTABLE_FINAL, không gắn nhãn UNANIMOUS_WANT sai cohort.

Thêm guard-mode, QA và stale async response tests; gộp import/cleanup refs
để source lint không còn warnings mới. Số hạng dùng dark brand trên nền
xanh sáng, giữ layout mẫu và nâng tương phản; tap nội dung vinh danh hoặc
nút rõ ràng đều dismiss có lock, scroll chữ lớn không bị thay bằng timer.

TypeScript, lint src/tests/scripts, architecture Pass. Full Jest cuối:
55 suites/936 tests Pass241.738s, không skipped, không đổi timeout/runner.
So với878 tăng58 ca; assertions legacy vẫn giữ với route flag rõ ràng,
thêm coverage route mặc định mới. Router/guard tập trung12/12 Pass.

Locked reinstall/check, Android Hermes export, Python/docs/diff cuối
được ghi ở CHECKS.json. SOURCE_MANIFEST pin revision source/assets thực
sự kiểm. Root HANDOFF/CHECKS/FIGMA_PARITY dẫn đúng supplement; các
report cũ vẫn là lịch sử, không thay hash để tạo bằng chứng mới.

Chưa chạy bước7 trên thiết bị; chưa API/Places/map thật hoặc reviewer
approval. Không push/merge/đổi Project status từ kết quả tự động.
