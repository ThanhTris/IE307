# Rà repo main và chuẩn bị thực hiện trên sanbox

Ngày: 2026-10-08. Người thực hiện: Codex. Task: [GM-01](../../../../tasks/review/GM-01.md). Reviewer: Trí; quyết định vẫn Pending. Đây là evidence của người thực hiện, không là review độc lập.

## Branch và nguồn đọc

Đã tạo branch `sanbox` trong worktree hiện tại từ `main` local tại commit `1b9e156c22f33f2965286cb1cc9685702811516f`. Worktree ban đầu ở detached HEAD `3d5c224`; đã fast-forward sanbox tới main trước khi sửa. Không thay branch main hoặc commit/push. `origin/main` local cùng SHA lúc kiểm; không fetch nên không khẳng định remote mới nhất.

[Inventory](REPO_INVENTORY_2026-10-08.json) ghi 158 file tracked của baseline: 152 file text (gồm placeholders), 6 ảnh. Đã đọc file để inventory/kiểm UTF-8, đối chiếu task/AC/gates/spec/ADR/PRD/API/data/workflow/DoD/CI/scripts/tests/fixtures và code prototype. Blob IDs trong inventory là bản main đầu vào, không phải fingerprint của patch chưa commit. File mới của đợt audit chưa nằm trong inventory baseline.

Không dùng Git history làm yêu cầu active. Tài liệu research/evidence lịch sử được đọc theo banner/mapping cũ; không xác minh lại sản phẩm, remote issues hoặc URL bên ngoài. Ảnh chỉ kiểm inventory/provenance, không kiểm lại layout hay quyền sử dụng. Prototype 4.300 dòng có 15 trạng thái màn mô phỏng, không có script/stylesheet ngoài; không chạy lại checker HTML ghi vào evidence GM-00.

## Kết quả và phần đã sửa trong GM-01

| Finding | Căn cứ và xử lý |
| --- | --- |
| UI guide nói vào phòng tự ready | ROOM_SPEC, FR-03, GM-16 yêu cầu ready chủ động; sửa UI guide để người mới ready=false, context đổi reset ready, server kiểm trước start |
| UI guide bỏ public anchor, tự dùng GPS | FOOD_DATA_SPEC/FR-10/15/GM-10 yêu cầu anchor công cộng được xác nhận, manual fallback và không GPS server; sửa hướng dẫn create/context |
| Mã phòng bị coi chỉ 6 số | ROOM_SPEC dùng 6 ký tự bỏ ký tự dễ nhầm; sửa text/input guidance, mã mẫu chỉ trong mô phỏng |
| Swipe phải OK, nút vote ẩn và gesture món cuối tự submit trong HTML | UI_SPEC/FR-19/GM-20 yêu cầu double-tap WANT, ba nút luôn hiện, swipe phải WANT nếu có và Gửi chủ động; sửa hướng dẫn port, ghi khác biệt trong notes, giữ nguyên HTML |
| Vòng 2 UI guide bắt Giữ >=1 | DECISION_SPEC/GM-22 cho Loại hết và NO_CONSENSUS; sửa nút Gửi, explicit confirm kể cả một món, server chốt sau đủ phiếu |
| UI-ID Friends/Profile lệch UI_SPEC | Đồng bộ UI-10 network, UI-11 friends, UI-14 account, bổ sung UI-15/16; panel hồ sơ/kiêng cữ chỉ là ý tưởng prototype ngoài core |
| UI guide coi allergy badge, nguồn/giờ/giá mẫu, theme và 60fps như tính năng/QA đã chốt | Làm rõ fixture, unknown/source/unit, lịch khác tồn kho live; không claim an toàn dị ứng/contrast/performance đã đạt, package chỉ ứng viên qua GM-02 |
| Notes prototype còn dùng GM-ID cũ | Sửa friends GM-15/history GM-17/account GM-28; data GM-08/location GM-10/eligibility GM-11 theo roadmap-v1 |
| 8 task có patch destination evidence namespace cũ | Sửa đường dự kiến trong GM-08/09/25/26/27/29/30/31 thành docs/evidence/roadmap-v1/GM-XX; không đổi metadata/AC/dependency/assignment hoặc hồ sơ lịch sử |

Các thay đổi trên đồng bộ tài liệu theo AC đã có; không chọn kiến trúc/provider mới hoặc thay luật sản phẩm. [UI guide](../../../specs/UI_DESIGN_SPECIFICATION.md) và [implementation notes](../../../../design/prototypes/UI-IMPLEMENTATION-NOTES.md) là đầu ra cần review cùng baseline.

## Thứ tự thực hiện

Theo yêu cầu làm tuần tự, dùng GM-01 → GM-31 của roadmap-v1. Mọi start/merge dependency có số nhỏ hơn nên thứ tự số là một thứ tự topo hợp lệ. Không thêm dependency giả giữa task độc lập; gates/AC riêng vẫn phải đạt trước bước kế tiếp có phụ thuộc.

| Thứ tự | Phạm vi |
| --- | --- |
| GM-01 | Review baseline/spec/ADR/contracts/privacy và evidence của bản sửa hiện tại |
| GM-02 → GM-03 | Bootstrap Expo/Android/runner, rồi taxonomy/DTO/templates/fixtures |
| GM-04 → GM-06 | UI primitives, schema/SQL setup, decision-v2 |
| GM-07 → GM-09 | Guest session, dataset verified thật, RLS/retention |
| GM-10 → GM-12 | Foreground/manual context, eligibility, room RPC/snapshot |
| GM-13 → GM-16 | Create/join, submit/finalize, friends/invites, lobby |
| GM-17 → GM-19 | History/consent, push/inbox, preferences/context |
| GM-20 → GM-24 | Voting, result/offering, vòng hai, QR/links/Maps, outbox/recovery |
| GM-25 → GM-27 | Regression, QA/user pilot, APK/demo/bàn giao |
| GM-28 → GM-31 | Account P1; OCR/AI/weather–mood P2 sau core |

Nguồn metadata hiện hành: [dependency map](../../../project/TASK_DEPENDENCIES.md), [task summary](../../../project/TASK_SUMMARY.md), [mapping](../../../project/TASK_RENUMBERING.md). Bảng trên là ảnh chụp kế hoạch của đợt audit; metadata task là nguồn để tiếp tục.

## Điểm chặn và đầu vào cần chốt

GM-01 đang IN_REVIEW. GM-02/03 chờ trực tiếp GM-01; tất cả 30 task triển khai BLOCKED ở start gate (4 task data chờ GM-03). Không có task triển khai độc lập đủ gate lúc kiểm. Vì AGENTS/workflow quy định AI không tự Approved/Done, yêu cầu “thực hiện theo thứ tự” chưa thay được quyết định review độc lập.

Reviewer Trí cần review revision gồm baseline main và patch tài liệu trong sanbox, ghi quyết định/ngày/evidence thật theo [mẫu review](../../../../tasks/templates/REVIEW_TEMPLATE.md). Cần chốt:

- Baseline/ADR/API/data/UI hiện hành, các khác biệt prototype được ghi ở trên và package/provider nào được phép đánh giá ở task kế tiếp. ADR-001/Supabase vẫn Proposed.
- Vùng pilot/public anchors/nguồn có quyền dùng/người nhập–người kiểm; radius/time horizon và policy unknown/freshness. Menu/giờ 7 ngày và địa chỉ 30 ngày vẫn là đề xuất, chưa tự chuyển thành cấu hình triển khai.
- Privacy/TTL: room expiry 60 phút, private data cleanup 24h, history 30 ngày/50 local, push retention; context công cộng khác GPS cá nhân.
- Assignment thực tế của GM-02 và reviewer khác owner, package/version/license, patch/test plan và môi trường Android. Owner Tuấn/reviewer Trí hiện chỉ proposed; chưa tự thay bằng Codex.

Sau review được chấp thuận, cập nhật task/evidence đúng quy trình rồi sinh indexes; trước GM-02 chạy lại start gate. Thiết kế package/config/runner là scope GM-02, chưa tạo package hoặc lockfile trong đợt này. Trước merge cần ref target cập nhật và kiểm upstream code/evidence đúng revision, không chỉ checker metadata.

## Kiểm thực tế

Trên baseline main trước patch: validator đạt, regression 69 tests đạt, task indexes khớp, diff whitespace đạt. Readiness GM-01 trả exit 1/IN_REVIEW; --all là báo cáo exit 0 dù task triển khai bị chặn.

Sau patch: `python scripts/validate_repository.py` đạt; `python -m unittest discover -s tests -p "test_*.py"` đạt 69 tests (6,664 giây); `python scripts/task_readiness.py --check-docs` đạt; `git diff --check` đạt. Readiness GM-02 và GM-03 vẫn BLOCKED vì chờ review GM-01, đúng gate hiện hành. Metadata/assignment/dependency task giữ nguyên nên không cần sinh lại indexes.

Không có native/SQL/verified-dataset evidence; các test hiện tại kiểm tooling, không kiểm feature app. HTML prototype, assets và hồ sơ GM-00 lịch sử không đổi.

## Finding công cụ phụ còn lại

`sync-course-materials.ps1` tạo destination trước containment check và dùng StartsWith thiếu ranh giới đường dẫn; có thể khớp sibling cùng tiền tố. Đã có trong audit lịch sử, chưa sửa/chạy vì không cần cho các task hiện tại. `verify_prototype.cjs` dùng selectors/kịch bản cũ và output/date GM-00 cố định; không chạy để tránh ghi đè evidence lịch sử. Hai mục này không được dùng làm lý do bỏ start gate, cũng không được báo đã khắc phục.
