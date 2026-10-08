> Hồ sơ lịch sử dùng mã task cũ trước khi đánh số roadmap-v1. Không dùng các GM-ID bên dưới để nhận việc hiện tại; xem [bảng mã cũ–mới](../../project/TASK_RENUMBERING.md). Liên kết task (nếu có) đã trỏ tới mã mới; kết quả/lệnh cũ được giữ nguyên.

# Audit repo và chuyển baseline food-v1

Ngày 2026-10-07. Owner soạn: Codex; reviewer đề xuất: Trí. Đây là evidence thao tác/kiểm, không là quyết định review. [GM-28](../../../tasks/review/GM-01.md) ở review; Decision pending. Không tự Approved hoặc Done.

## Phạm vi rà soát

Kiểm inventory tracked/untracked và hidden config; đối chiếu toàn bộ task/frontmatter/AC/dependency với plan data mới. Đọc nguồn yêu cầu/architecture/spec/workflow/DoD/PR/issue/test/CI/scripts và tìm stale scope toàn repo. Link Markdown/JSON/metadata/manifest/FR kiểm máy. Evidence/research lịch sử giữ nguồn gốc, banner nêu nguồn hiện hành khi có scope đã thay. PNG evidence và HTML prototype không được coi là native/backend proof mới; không claim đã chạy app hoặc kiểm lại ảnh nguồn.

Repo trước thay đổi có chỉnh sửa người dùng ở design/prototypes/gi-cung-duoc.html và plan/ADR-005 từ lượt trước. Đợt này bảo toàn prototype; không cài dependency, tạo dữ liệu quán giả, commit/push hoặc sync GitHub.

## Findings và xử lý

| Finding | Xử lý |
| --- | --- |
| GM-27 venue P1 đợi release dù data cần trước pool | Chuyển GM-27 P0 sau taxonomy/schema; upstream của eligibility GM-30 |
| Location chung với QR/review sau result | GM-29 capability sớm; GM-20 reuse sau result, tránh cycle |
| UI create task chưa phụ thuộc room API; engine thiếu runner bootstrap | GM-07 chờ GM-08/29; GM-11 chờ GM-01/03; SQL setup ở GM-04 |
| Chỉ kiểm status done/ngày, thiếu quyết định/evidence/reviewer thực tế | Validator + readiness kiểm Approved/reviewer khác owner/date/evidence/AC/assignment và dependency đầy đủ |
| PR có template nhưng thiếu dependency/AC chi tiết/handoff | Bổ sung PR/issue/task template, thêm REVIEW_TEMPLATE.md |
| Bảng task/owner/lịch dễ lệch nhau | Sinh 4 chỉ mục từ frontmatter; CI --check-docs chống drift |
| Chưa có task weather/mood | GM-31 P2 sau release, dữ liệu opt-in/freshness và rule không phá eligibility/NO |
| GM-00 Approved bị hiểu là duyệt scope mới | GM-28 review food-v1 riêng, giữ phê duyệt lịch sử GM-00 |
| Spec/PRD nói location chỉ sau winner và venue P1 | Đồng bộ active spec/FR/API/data/UI/test; 21 FR, FOOD-01..14 phân biệt core/P2 |
| .github không trong inventory validator local nên link PR template báo thiếu | Thêm .github/.githooks vào Source; Markdown PR template được kiểm link |

## Kiểm thực tế

| Lệnh/phép kiểm | Kết quả thực tế |
| --- | --- |
| `python scripts/validate_repository.py` | Exit 0; documents/links/JSON/tasks/dependencies/FR traceability OK |
| `python -m unittest discover -s tests -p "test_*.py"` | 42 tests, OK, exit 0; gồm negative gates, release không bỏ P0, checklist drift, link repair sau move và CLI |
| `python scripts/task_readiness.py --check-docs` | Exit 0, bốn task indexes khớp metadata; không có link task cần retarget |
| `python scripts/task_readiness.py --task GM-08` | Exit 1 đúng kỳ vọng: BLOCKED, chờ GM-05/GM-06/GM-30 backlog |
| CLI GM-00/GM-28/ID không tồn tại | Regression kiểm DONE_REVIEWED/IN_REVIEW/unknown ID; kiểm Approval mới chỉ trên memory fixture |
| `git diff --check` + quét whitespace các file text untracked | Không lỗi; không chỉ kiểm file tracked |
| Tìm scope cũ trong active PRD/spec/task | Không còn GM-27/P1 hoặc location chỉ sau result làm yêu cầu hiện hành; tài liệu lịch sử có banner chỉ nguồn mới |

Python launcher cục bộ có in cảnh báo `Failed to find real location of C:\Python314\python.exe`, nhưng các lệnh thực thi và trả exit/output nêu trên. CLI readiness xuất UTF-8 để tên tiếng Việt đọc đúng trong môi trường này. Chưa chạy CI trên GitHub. Các ca feature FOOD/T-* chỉ là kế hoạch, chưa có runner native/SQL hoặc seed thật; 42 tests là test tooling, không phải test app.

## Các giới hạn phát hiện khi rà toàn repo

- Inventory source gồm hidden .github/.githooks; không kiểm thủ công binary PNG, file ignored/outputs hoặc Git history như yêu cầu active. Không có package/app/API để chạy native/SQL; không dùng placeholders làm bằng chứng.
- `scripts/verify_prototype.cjs` là runner HTML cũ, ghi vào evidence GM-00 và chứa ngày cố định 2026-10-06. Không chạy trong đợt task này để tránh ghi đè evidence lịch sử/nhầm native proof; cần cập nhật output/date/scenario khi có yêu cầu kiểm prototype mới.
- `scripts/sync-course-materials.ps1` có guard `StartsWith(projectRoot)` và tạo thư mục trước khi kiểm; prefix có thể khớp thư mục cùng tiền tố ngoài workspace. Chưa chạy hoặc sửa công cụ sync tài liệu môn trong đợt này; trước lần dùng với destination tùy chọn cần kiểm containment theo ranh giới đường dẫn trước tạo/copy. Đây là finding còn lại của công cụ phụ, không phải dependency của data/app hiện tại.

## Bàn giao và giới hạn

- 31 task sau GM-00: 27 P0 gồm gate GM-28, 1 P1, 3 P2; 30 task triển khai backlog, GM-28 review.
- [Dependency map](../../project/TASK_DEPENDENCIES.md) có gate hiện tại/lớp topo/cặp song song. Blocked phải chờ từng dependency Approved; không chờ task độc lập toàn chặng.
- Reviewer cần review field/schema/radius/giờ/unknown/freshness/anchor/privacy/provider và tải nhóm trước mở khóa GM-28. Không đánh dấu các ADR Accepted tự động.
- GitHub mapping là trạng thái lưu lần trước, chưa kiểm live hoặc sync issues mới; tên owner/reviewer task code là đề xuất.
- Tooling chỉ xác minh cấu trúc bản ghi review, không chứng minh người review có thật hoặc source data đúng; người nhận phải mở evidence/PR/version.
