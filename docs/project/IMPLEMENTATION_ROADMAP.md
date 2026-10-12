# Lộ trình triển khai UI–BE–Data — roadmap-v2

2026-10-10. Chủ dự án yêu cầu chia lại task sau thử nghiệm sandbox: tạo nền trước, component/contract tiếp theo, hoàn thiện tính năng rồi tích hợp. Đây là kế hoạch hiện hành; 39 task sau GM-00, gồm 34 P0 (kể cả GM-01 đã xác nhận duyệt), 2 P1 và 3 P2. [Tổng hợp task/owner](TASK_SUMMARY.md) · [dependency](TASK_DEPENDENCIES.md) · [mapping](TASK_RENUMBERING.md).

## Ba luồng và đầu ra nhận được

| Luồng | Nền trước | Thành phần / dữ liệu chung | Chi tiết | Tích hợp |
| --- | --- | --- | --- | --- |
| UI | GM-02: folder, routes, Expo shell mở được | GM-05: component theo mẫu; dùng contract/mock GM-07 | GM-09..14: từng nhóm màn, xem/duyệt trên Expo Go | GM-24..31: API/thiết bị thật, giữ screens đã dựng |
| BE | GM-03: folders/config/local runner | GM-07: DTO/interface/errors/client/transport/mock theo Data GM-04, đối chiếu DB GM-06 | GM-15..23: engine/auth/RLS/eligibility/room/vote/history/social/inbox | API nhận dataset GM-08; UI tích hợp sau khi API tương ứng sẵn sàng |
| Data | GM-04: dictionary, field rules, JSON template | GM-06: schema/constraints/migrations từ dictionary | GM-08: importer + verified dataset nạp database | manifest/version/query mẫu bàn giao BE GM-18 |

UI component chỉ phụ thuộc UI shell và định nghĩa field cần hiển thị. Màn chi tiết dùng mock adapter do GM-07 cung cấp, được merge/nghiệm thu UI trước BE nghiệp vụ. Các task tích hợp có AC riêng để thay mock bằng API thật; không bắt task UI chờ toàn bộ backend hay viết lại layout.

## Thứ tự task cụ thể

Phân công đồng bộ theo assignee hiện hành trên [Project #2](https://github.com/users/ThanhTris/projects/2) ngày 2026-10-11. Lịch và Deadline quản lý trên Project; bảng này không đổi trạng thái nghiệm thu hoặc tác giả/evidence lịch sử. Trí review cuối cho mọi task, kể cả task Trí trực tiếp viết; không cần chỉ định người kiểm độc lập theo [ADR-013](../architecture/decisions/ADR-013-project-owner-final-review.md).

| Task | Luồng | Đầu ra | Owner / reviewer |
| --- | --- | --- | --- |
| [GM-01](../../tasks/done/GM-01.md) | PLAN / baseline | Chốt lộ trình UI–BE–Data và bàn giao đầu vào | Codex / Trí |
| [GM-02](../../tasks/review/GM-02.md) | UI / structure | UI: cấu trúc thư mục và app Expo chạy được | Trí / Trí |
| [GM-03](../../tasks/review/GM-03.md) | BE / structure | BE: cấu trúc thư mục và môi trường chạy local | Trí / Trí |
| [GM-04](../../tasks/backlog/GM-04.md) | DATA / fields | Data: trường thông tin, taxonomy và mẫu nhập liệu | Vinh / Trí |
| [GM-05](../../tasks/backlog/GM-05.md) | UI / components | UI: component dùng chung theo UI mẫu | Trung / Trí |
| [GM-06](../../tasks/backlog/GM-06.md) | DATA / database | Data: thiết lập database và migrations từ dictionary | Tâm / Trí |
| [GM-07](../../tasks/backlog/GM-07.md) | BE / api-contract | BE: hợp đồng API, lớp gọi API và mock adapter | Trang / Trí |
| [GM-08](../../tasks/in-progress/GM-08.md) | DATA / import | Data: nhập, kiểm và bàn giao dataset thật | Tâm / Trí |
| [GM-09](../../tasks/backlog/GM-09.md) | UI / screens | UI: Home, tạo phòng và nhập mã theo mẫu | Tuấn / Trí |
| [GM-10](../../tasks/backlog/GM-10.md) | UI / screens | UI: chọn khu vực, giờ ăn và sở thích theo mẫu | Tuấn / Trí |
| [GM-11](../../tasks/backlog/GM-11.md) | UI / screens | UI: lobby, ready và trạng thái phòng theo mẫu | Trung / Trí |
| [GM-12](../../tasks/backlog/GM-12.md) | UI / screens | UI: bình chọn và vòng hai theo mẫu | Trang / Trí |
| [GM-13](../../tasks/backlog/GM-13.md) | UI / screens | UI: kết quả, nơi bán và không đồng thuận theo mẫu | Tuấn / Trí |
| [GM-14](../../tasks/backlog/GM-14.md) | UI / screens | UI: bạn bè, inbox và lịch sử theo mẫu | Trung / Trí |
| [GM-15](../../tasks/backlog/GM-15.md) | BE / implementation | BE: engine quyết định thuần và fixture chuẩn | Vinh / Trí |
| [GM-16](../../tasks/in-progress/GM-16.md) | BE / implementation | BE: guest auth và session API | Trí / Trí |
| [GM-17](../../tasks/backlog/GM-17.md) | BE / implementation | BE: RLS, quyền RPC và retention | Trí / Trí |
| [GM-18](../../tasks/backlog/GM-18.md) | BE / implementation | BE: API catalogue, coverage và lọc món khả thi | Tâm / Trí |
| [GM-19](../../tasks/backlog/GM-19.md) | BE / implementation | BE: API phòng, context, ready và start | Trí / Trí |
| [GM-20](../../tasks/backlog/GM-20.md) | BE / implementation | BE: API nộp phiếu, hai vòng và chốt kết quả | Vinh / Trí |
| [GM-21](../../tasks/backlog/GM-21.md) | BE / implementation | BE: API history, consent và chống lặp | Tâm / Trí |
| [GM-22](../../tasks/backlog/GM-22.md) | BE / implementation | BE: API bạn bè và lời mời phòng | Trí / Trí |
| [GM-23](../../tasks/backlog/GM-23.md) | BE / implementation | BE: API inbox, thiết bị push và sender | Trí / Trí |
| [GM-24](../../tasks/backlog/GM-24.md) | INTEGRATION / native | UI: nối vị trí thiết bị với coverage API | Trang / Trí |
| [GM-25](../../tasks/backlog/GM-25.md) | INTEGRATION / integration | UI–BE: nối Home, context, preferences và lobby | Trang / Trí |
| [GM-26](../../tasks/backlog/GM-26.md) | INTEGRATION / integration | UI–BE: nối bình chọn, nộp phiếu và vòng hai | Trang / Trí |
| [GM-27](../../tasks/backlog/GM-27.md) | INTEGRATION / integration | UI–BE: nối kết quả và nơi bán thực tế | Trang / Trí |
| [GM-28](../../tasks/backlog/GM-28.md) | INTEGRATION / integration | UI–BE: nối bạn bè, inbox và history | Trung / Trí |
| [GM-29](../../tasks/backlog/GM-29.md) | INTEGRATION / native | UI–BE: push native và mở app từ thông báo | Trung / Trí |
| [GM-30](../../tasks/backlog/GM-30.md) | INTEGRATION / native | UI–BE: QR, incoming links và Maps/review | Trang / Trí |
| [GM-31](../../tasks/backlog/GM-31.md) | INTEGRATION / integration | UI–BE: SQLite outbox, cache và reconnect | Trung / Trí |
| [GM-32](../../tasks/backlog/GM-32.md) | QA / regression | QA: regression API, data, quyền và race | Vinh / Trí |
| [GM-33](../../tasks/backlog/GM-33.md) | QA / qa | QA: đối chiếu UI mẫu và pilot Android end-to-end | Vinh / Trí |
| [GM-34](../../tasks/backlog/GM-34.md) | RELEASE / release | Release: APK, demo và bàn giao core | Trí / Trí |
| [GM-35](../../tasks/backlog/GM-35.md) | EXTENSION / extension | P1: account link/recovery và history sync | Tuấn / Trí |
| [GM-36](../../tasks/backlog/GM-36.md) | EXTENSION / extension | P2: OCR menu qua quy trình nhập dữ liệu | Tâm / Trí |
| [GM-37](../../tasks/backlog/GM-37.md) | EXTENSION / extension | P2: AI hiểu sở thích | Tuấn / Trí |
| [GM-38](../../tasks/backlog/GM-38.md) | EXTENSION / extension | P2: weather và mood tự khai để xếp hạng | Tâm / Trí |
| [GM-39](../../tasks/backlog/GM-39.md) | UI / prototype | UI: cải thiện prototype HTML trước khi sửa app | Trang / Trí |

Merge theo số tăng dần 01 → 39 luôn hợp lệ vì mọi prerequisite có số nhỏ hơn. Tuy vậy, không phải task 10 phải chờ tất cả 01..09: chỉ chờ đầu vào được khai báo; những task độc lập có thể làm/merge cùng đợt. Nếu chủ dự án chọn merge tuyệt đối theo số, các nhánh vẫn được làm song song khi start inputs đã có. Không chạy task có prerequisite chưa merge bằng cách dựng lại scaffold hoặc đoán API.

## Task UI bổ sung — GM-39

[GM-39](../../tasks/backlog/GM-39.md) do Trang thực hiện, Trí review, P1 thiết kế lại prototype HTML nhưng ưu tiên ngay sau GM-05/GM-09..14. Đọc [brief cho AI](../design/UI_REFINEMENT_BRIEF.md) trước audit/đề xuất; chỉnh `design/prototypes/gi-cung-duoc.html`, kiểm browser và Trí duyệt HTML, chưa sửa app. Không chờ API, GM-34 hoặc GM-35..38; không thêm dependency ngược/chặn core release. Số 39 là ID mới, không bắt làm cuối. Giữ thứ tự của 38 task cũ; áp dụng mẫu mới vào app chờ Trí giao scope riêng.

## Các đợt phối hợp

- Sau GM-01: Trí đảm nhận GM-02 UI structure và GM-03 BE structure theo ca; Vinh GM-04 fields. Không chạy song song hai task chính cùng người hoặc code thiếu nền.
- Sau UI shell/fields: Trung GM-05 components; Tâm GM-06 database sau BE shell; Trang GM-07 contract/client có thể soạn từ dictionary, đối chiếu schema trước merge.
- Sau schema: Tâm GM-08 nạp data. Sau component+contract: Tuấn/Trung/Trang chia GM-09..14 theo assignee trên Project, cùng owner xếp ca. BE làm phần độc lập theo start gate; tích hợp/nghiệm thu sau đủ merge inputs.
- GM-24..31: tích hợp theo module đã có UI + API, native capability vào đúng chức năng. GM-32..34 regression → QA/pilot → APK.
- GM-35..38 P1/P2: draft độc lập nếu đủ contract và còn người, merge sau core. Weather/mood không chặn bộ lọc địa điểm/giờ.

## Contract bàn giao trước khi làm tiếp

Chủ dự án xác nhận cấu trúc UI/BE 2026-10-10, xem [plan GM-02/03](FOUNDATION_IMPLEMENTATION_PLAN.md) và [cấu trúc](REPOSITORY_STRUCTURE.md). [Chuẩn đầu ra](TASK_OUTPUT_REQUIREMENTS.md)/[checklist 39 task](TASK_OUTPUT_CHECKLIST.md) bắt buộc UI mở Expo thấy các mục scope, API chạy request/output/assertions, Data đủ fields/schema/templates/fixtures/version cho BE làm song song. Mỗi task bàn giao CHECKS.md + HANDOFF; API có request suite riêng. Chưa triển khai app/API, không tự chuyển Approved/Done hoặc cài package trước gate/review.

Mỗi task có bảng “Đầu vào bắt buộc và đầu ra bàn giao”: upstream, path, trước start hay trước merge; source machine-readable là [task map](../../tasks/task-id-map.json). Path là đích dự kiến, không phải chứng nhận file đã tồn tại. Task hoàn thành cần [HANDOFF](../../tasks/templates/HANDOFF_TEMPLATE.md) gồm:

1. PR/commit, version contract/schema/dataset và đường dẫn file thật.
2. Lệnh chạy từ clone sạch, input/output mẫu và expected result.
3. AC đã kiểm, môi trường, Pass/Fail/Not run và giới hạn.
4. Task nhận đầu ra, thay đổi interface/migration và cách khôi phục.

Người nhận kiểm cả review lẫn artifact đã có trên target/nhánh mình; input chỉ “Approved” nhưng thiếu file hoặc cách dùng vẫn là blocker. Checker kiểm metadata/graph/file bàn giao và revision task/evidence; người review đối chiếu nội dung/code/commit thật.

## UI mẫu và phạm vi kiểm thử

Bám [HTML](../../design/prototypes/gi-cung-duoc.html) và [UI design spec](../specs/UI_DESIGN_SPECIFICATION.md) cho layout/phong cách. Tuân thủ task/spec về ready chủ động, public anchor xác nhận, mã phòng server, WANT/OK/NO, Gửi riêng, hai vòng/NO không winner. Sai khác giữa hình mẫu và luật sản phẩm ghi trong component map; không tự kéo allergy/account/P2 vào core.

GM-02 chỉ smoke shell/khởi động. GM-05 kiểm component đang dùng trên màn mẫu; gallery không là một sản phẩm riêng. GM-09..14 kiểm visual/interaction với mock có nhãn. Native camera/push/location/cache kiểm ở GM-24/29/30/31. QA tổng thể ở GM-33; HTML/Expo Go không được ghi thành bằng chứng APK hoặc remote push.

## Dùng lại kết quả sandbox

Chat “Tạo branch sandbox và làm task”, worktree `1043/Project`, nhánh `sanbox`, commit đã đọc `f110167`; có cả phần đang sửa chưa commit. Đã đọc kế hoạch/report GM-02/03/04 và phản hồi người dùng, không nhập code vào main trong lần chia task này.

| Phần roadmap-v1 trong sandbox | Chuyển sang roadmap-v2 | Cách dùng |
| --- | --- | --- |
| GM-02 Expo shell/runner | GM-02 | Reuse khởi động/routes/tooling phù hợp; tách capability thử camera/push/SQLite sang GM-29/30/31 |
| GM-03 dictionary/template/DTO/validator; chủ dự án đã review ở revision sandbox | GM-04, phần DTO dùng cho GM-07 | Giữ JSON template đã chấp thuận, rà toàn bộ core fields/API; không viết lại vì đổi ID |
| GM-04 tokens/primitives/gallery draft | GM-05 | Reuse tokens/component; nghiệm thu trên màn theo mẫu |
| GM-04 prototype-app screens đang sửa | GM-09..14 | Đối chiếu rồi tách vào feature tương ứng, giữ mock repository cùng contract; không tự gọi toàn bộ draft là Done |

Review sandbox được giữ đúng revision/phạm vi đã chấp thuận. Việc chia lại không phủ nhận review đó và không tự duyệt thêm phần mới hoặc ghi task main Done. Chi tiết nguồn/giới hạn tại [evidence](../evidence/roadmap-v2/GM-01/REPLAN_2026-10-10.md).
