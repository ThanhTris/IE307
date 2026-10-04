# Quy tắc làm việc và cập nhật trước push — Manabi

Quy tắc này thực hiện yêu cầu của chủ dự án ngày 02/10/2026. Áp dụng cho Trí, Trang, Tâm, Vinh, Trung, Tuấn và mọi AI hỗ trợ. Task Markdown là nguồn trạng thái; DOCX là bản tổng hợp để Trí kiểm tra khi merge. Không cập nhật Word riêng rồi để task cũ.

## Trước khi làm

Đọc `AGENTS.md`, [Bắt đầu Manabi](START_HERE.md), task, dependency đã được reviewer chấp thuận và linked spec. Task Manabi chi tiết nằm trên nhánh triển khai chỉ trong trang bắt đầu; task PM/Memo trên `main` không áp dụng. Chuyển task sang `tasks/in-progress` khi nhận việc, ghi giả định, patch nhỏ nhất và test plan. Chỉ nhận việc độc lập khi dependency còn review. Kiểm quyết định reviewer của MANABI-001 trên nhánh triển khai trước khi mở các task phụ thuộc; không suy ra trạng thái từ chỉ mục `main`.

## Bắt buộc khi push task hoặc code triển khai

1. Cập nhật task của phần mình làm: trạng thái, ngày cập nhật, acceptance criteria; các mục **Đã làm, Còn lại, Lỗi và blocker, File đã thay đổi, Kiểm thử và evidence, Bước tiếp theo, Quyết định reviewer**. Ghi “không có lỗi đã biết” khi phù hợp; test chưa chạy phải ghi rõ. Lỗi ghi cách tái hiện, ảnh hưởng, owner xử lý và bước tiếp theo; không đưa key hoặc dữ liệu riêng vào báo cáo.
2. Khi đủ phần triển khai/test, chuyển task sang `tasks/review`. Chưa được review thì không ghi Done. `blocked` cần lý do và phương án tiếp tục. Reviewer khác owner ghi quyết định có ngày và evidence trước khi chuyển sang `tasks/done`.
3. Khi sửa task hoặc phân công, sinh lại workbook bằng `node scripts/build_manabi_workbook.mjs --runtime-modules <thu-muc-node_modules-cua-runtime>`. Sinh lại ba DOCX bằng `python scripts/build_manabi_reports.py`. Script cần `python-docx` trong môi trường tài liệu đã cấu hình; không thêm dependency vào app. DOCX tiến độ sinh trên nhánh triển khai phải thể hiện phần đã làm, chưa làm và lỗi/blocker của task. Workbook và DOCX đều đọc task Markdown.
4. Hoàn tất cập nhật task/evidence trước lần sinh DOCX cuối; nếu còn sửa task/source sau đó, sinh lại báo cáo. Sau khi workbook đã đúng, chạy `python scripts/build_manabi_reports.py` lần cuối để ghi fingerprint và hash tất cả artifacts; chạy `python scripts/validate_repository.py` và `python scripts/validate_handoff.py`. Kiểm nội dung DOCX. Khi đổi bố cục/nội dung có nguy cơ tràn trang, render và kiểm các trang bị ảnh hưởng. Evidence render không thuộc fingerprint nguồn.
5. Stage code/spec/task/evidence và DOCX/manifest cùng một commit; chạy checker với `--git-tree HEAD` sau commit. Chỉ push khi được phép theo công việc đang làm. Hook chặn báo cáo cũ; nó không chứng minh nội dung báo cáo trung thực hoặc thay review của người khác.

## Công bố tài liệu nền trên main

Theo yêu cầu chủ dự án ngày 05/10/2026, các lần cập nhật tài liệu nền trên `main` chỉ gồm đặc tả chính, quy trình, rule, UI prototype và hướng dẫn bắt đầu. Không đưa từng task Manabi, registry, fixture/evidence spike, workbook/DOCX theo task hoặc code ứng dụng vào các commit tài liệu này. Trước push chạy `python scripts/validate_repository.py`, kiểm liên kết và diff. DOCX tiến độ cùng manifest kiểm freshness tiếp tục ở nhánh triển khai. Khi một push có task/code triển khai, áp dụng đầy đủ năm bước ở trên.

## Cài hook

Chạy `git config core.hooksPath .githooks` một lần ở mỗi clone. Hook `pre-push` kiểm snapshot task khi commit có registry; với bản tài liệu nền chưa có registry, chạy `validate_repository.py` thủ công trước push. Máy cần Python 3; nếu tên lệnh khác, đặt `MANABI_PYTHON` thành đường dẫn Python. Generator DOCX cần `python-docx`; checker chỉ dùng thư viện chuẩn. Không tắt hook để bỏ qua cập nhật; nếu lỗi môi trường, ghi lỗi và chạy cùng checker thủ công trước khi xin review.

## Khi merge

Trí/reviewer kiểm task, test/evidence, lỗi còn lại và phạm vi trước. Merge Markdown/code trước, giải quyết conflict nội dung nguồn, rồi sinh lại workbook khi task/status/AC/phân công thay đổi và sinh lại DOCX. Không giải quyết conflict DOCX bằng cách chọn đại một phiên bản. Bản Word là snapshot để đọc, không phải log lịch sử; lịch sử nằm trong Git và evidence. Checker chỉ kiểm quyết định chấp thuận có ngày YYYY-MM-DD; không xác thực danh tính hoặc thay việc review thực tế.

## Trạng thái

| Trạng thái | Ý nghĩa |
| --- | --- |
| backlog | Chưa bắt đầu; chưa có kết quả thực thi |
| in-progress | Đang làm; nêu phần đã làm và còn lại |
| blocked | Có trở ngại cụ thể, có owner và bước xử lý |
| review | Đã gửi kiểm tra; chưa được coi hoàn thành |
| done | Reviewer khác owner đã chấp thuận, DoD đạt |

Điểm công việc là ước lượng tương đối, không phải giờ làm hay phần trăm hoàn thành. Bảng phân công 36 task có tổng 228 điểm gồm review; MANABI-001 là việc tái lập tài liệu riêng, không cộng vào tải sáu thành viên.
