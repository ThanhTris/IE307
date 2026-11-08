# Báo cáo đồng bộ UI–BE–Data theo Figma — 2026-10-25

## Kết quả

Đã đồng bộ yêu cầu hiện hành giữa task Markdown, GitHub Issues và handoff UI–BE–Data. Figma là nguồn quyết định trải nghiệm; task UI chỉ được nghiệm thu bằng React Native output và evidence so với frame. Producer BE/Data phải bàn giao field/command, contract/version và kiểm chứng tương ứng. Đây là đồng bộ yêu cầu/tài liệu, không phải triển khai runtime hoặc approval.

- Cập nhật hướng dẫn repo, task map, implementation/handoff và các task hiện hành; giữ lịch sử nghiệm thu baseline.
- Đưa phần hiện hành lên đầu 33 GitHub issue để supersede nội dung lịch sử mâu thuẫn. Không đổi issue state và không sửa Project fields.
- Ghi rõ G01–G05 đã có frame và Trí xác nhận UI scope hoàn tất; implementation review/evidence vẫn riêng.
- Ghi rõ quyết định: preference mặc định theo tài khoản và snapshot riêng phòng, raw choice chỉ chính chủ xem; ranking nâng cao không chặn core flow và nếu triển khai thì thành viên ngang trọng số; Google Places gọi trực tiếp từ app; giá chọn theo timestamp mới nhất, metadata khác nullable, timestamp trùng/amount null thì ẩn giá.
- Giữ nguyên policy đã chốt, legacy v2/v3, và caveat contract B/runtime chưa chứng minh deployed.

## Task và trạng thái Project

Status/owner được đọc trực tiếp từ Project #2 trước khi đồng bộ issue và đọc lại sau đó. Cột Status trước/sau giống nhau; assignee, Deadline, priority và PR review không bị chỉnh. Trường `Figma UI` của cả 20 task UI đã được kiểm và đều trỏ đúng frame/task-map tương ứng, nên giữ nguyên. “Issue state” Closed/Open không được dùng thay cho Project Status.

| Task | Issue | Owner hiện hành | Status trước → sau |
| --- | ---: | --- | --- |
| GM-02 | #63 | ThanhTris | Needs Update → Needs Update |
| GM-05 | #66 | TrungNQ2645 | Needs Update → Needs Update |
| GM-09 | #70 | mtuan2491 | Needs Update → Needs Update |
| GM-10 | #71 | mtuan2491 | Needs Update → Needs Update |
| GM-11 | #72 | TrungNQ2645 | Needs Update → Needs Update |
| GM-12 | #73 | rosy179 | Needs Update → Needs Update |
| GM-13 | #74 | mtuan2491 | Needs Update → Needs Update |
| GM-14 | #75 | TrungNQ2645 | Needs Update → Needs Update |
| GM-24 | #85 | rosy179 | Needs Update → Needs Update |
| GM-25 | #86 | rosy179 | Needs Update → Needs Update |
| GM-26 | #87 | rosy179 | Todo → Todo |
| GM-27 | #88 | rosy179 | Todo → Todo |
| GM-28 | #89 | TrungNQ2645 | Review → Review |
| GM-29 | #90 | TrungNQ2645 | Review → Review |
| GM-30 | #91 | rosy179 | Todo → Todo |
| GM-31 | #92 | TrungNQ2645 | Todo → Todo |
| GM-33 | #94 | Vinh5905 | Todo → Todo |
| GM-34 | #95 | ThanhTris | Todo → Todo |
| GM-35 | #96 | mtuan2491 | Todo → Todo |
| GM-39 | #107 | rosy179 | In Progress → In Progress |
| GM-03 | #64 | ThanhTris | Needs Update → Needs Update |
| GM-06 | #67 | HoaiTam | Needs Update → Needs Update |
| GM-07 | #68 | rosy179 | Needs Update → Needs Update |
| GM-15 | #76 | Vinh5905 | Needs Update → Needs Update |
| GM-17 | #78 | ThanhTris | Needs Update → Needs Update |
| GM-18 | #79 | HoaiTam | Needs Update → Needs Update |
| GM-19 | #80 | ThanhTris | Needs Update → Needs Update |
| GM-20 | #81 | Vinh5905 | Needs Update → Needs Update |
| GM-21 | #82 | HoaiTam | Needs Update → Needs Update |
| GM-22 | #83 | ThanhTris | Needs Update → Needs Update |
| GM-23 | #84 | ThanhTris | Needs Update → Needs Update |
| GM-32 | #93 | Vinh5905 | Needs Update → Needs Update |
| GM-40 | #125 | Vinh5905 | Needs Update → Needs Update |

## Nội dung và bàn giao

| Nhóm | Phần bổ sung | Figma/input | Output và kiểm chứng |
| --- | --- | --- | --- |
| UI: GM-02/05/09–14 | Frame/state/component theo task map; hành vi, lỗi, loading/empty/retry và ranh giới mock/API/native. G01–G05 không còn Pending design. | File Figma hiện hành và node cụ thể trong từng task/map; lấy context qua Figma MCP, không dùng storyboard/router làm màn production. | Route/màn React Native, component/token dùng chung, CHECKS/HANDOFF và `FIGMA_PARITY` ghép frame/state → route → dữ liệu → expected/actual → ảnh cùng viewport. |
| UI tích hợp: GM-24–31 | Preview/setup, admission/lobby, ballot/ACK/R2, Top 3/result, friends/inbox/history, push, QR/link/Places và cache/outbox theo luồng mới. | Node/state đã liệt kê trong task; đọc contract/version/HANDOFF thật của producer trước phần tích hợp. | Màn RN có interaction và lỗi/retry phù hợp; phân biệt mock/API/Android API/native; Not run nếu producer hoặc môi trường chưa có. |
| UI QA/release/P1/handoff: GM-33/34/35/39 | Visual parity, thiết bị/accessibility, release evidence, G04/G05 xử lý lỗi và handoff design consistency. Giữ GM-35 P1. | Task map, frame Figma, handoff và component map. | Screenshot so sánh, viewport/font scale/TalkBack/Back/safe-area, CHECKS/HANDOFF; Trí review, không tự ghi Approved/Done. |
| BE/Data: GM-03/06/07/15/17–23/32/40 | Runner và regression; contract/storage/policy/ACL/history/social/event; preference snapshot; catalogue projection và price observation; Places boundary direct-app. | Handoff UI–BE–Data và artifact/version upstream; UI là nguồn trải nghiệm, producer cung cấp đúng dữ liệu/hành vi. | Request/response/assertions thật, CHECKS/HANDOFF, schema/policy/catalogue version/hash và expected/actual. Không coi contract B là runtime hoặc thay đổi phiên v2/v3 đã pin. |

## Gap và câu hỏi

Không còn gap Figma G01–G05 chờ tạo frame. Các trạng thái thực tế như lỗi mạng/server, retry, ACK không rõ, quyền, dữ liệu legacy/mất quyền và cache stale đã được gắn với task sở hữu màn và task consumer trong handoff. Quy tắc cần quyết định sản phẩm/privacy đã được hỏi và trả lời; chi tiết provider/conflict ngoài contract đã duyệt vẫn phải theo artifact auth, không tự suy diễn.

BE/Data matrix đã được chuyển từ “sơ bộ do thiếu frame” thành mapping hiện hành theo Figma đã chốt. Các thiếu hụt runtime/contract vẫn được ghi là thiếu cho đến khi producer bàn giao và kiểm chứng thật; không có blocker Figma đang mở trong lượt này.

## Xác minh

- `python scripts/validate_repository.py`: Pass, chỉ kiểm tài liệu/manifest; không xác minh runtime hay human approval.
- `python scripts/task_readiness.py --check-docs`: Pass.
- `python -m unittest discover -s tests -p "test_ui_refinement_task.py"`: 5/5 Pass.
- `python -m unittest discover -s tests -p "test_*.py"`: 594 tests, 21 failures và 6 skipped. Cả 21 lỗi nằm trong `test_mobile_api_test_plan.py` (handoff link và literal `Android thật` trong checklist/manifest), trùng nhóm đã ghi nhận trước đợt này; không sửa ngoài phạm vi tài liệu đồng bộ.
- `git diff --check`: Pass; còn cảnh báo chuyển CRLF của `tasks/backlog/GM-39.md`.
- GitHub Issues: 33 body được bổ sung scope hiện hành lên đầu, giữ nguyên phần lịch sử phía dưới; trạng thái issue không đổi.
- Project #2: xác minh trước/sau; status và owner giữ nguyên; 20 liên kết Figma UI hiện có đã kiểm; không ghi hoặc thay đổi Done/Approved.
- Chưa chạy app Expo, Android/native build, API, DB hay migration. Không có runtime Pass trong báo cáo này.

## Phần chưa nghiệm thu

Task output, implementation, producer contract/policy/schema, deployed migration/RPC, visual parity trên app, API/DB/Android/native và review của Trí vẫn cần thực hiện theo từng task. Những task ở Todo/Review/In Progress/Needs Update giữ nguyên trạng thái; đồng bộ mô tả không nghiệm thu thay cho người review.
