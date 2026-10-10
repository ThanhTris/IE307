# ADR-009 — Chia task theo nền UI–BE–Data và artifact bàn giao

2026-10-10. Đổi cách chia task được chủ dự án yêu cầu trực tiếp sau khi thử sandbox. Baseline/package/provider và code vẫn theo review riêng. ADR này thay các ví dụ phân công/mã task trong ADR-006/007 bằng roadmap-v2; giữ hai gate và quy tắc dependency số nhỏ hơn.

## Bối cảnh

Roadmap-v1 đúng số nhưng mở phần độc lập quá sớm: UI chưa có structure/components/client chung vẫn được bắt đầu; task UI gộp cả API thật nên khó nghiệm thu màn; bootstrap kéo theo capability demo khiến người dùng chậm thấy UI. Sandbox GM-02 gặp SDK/adb và notifications/Expo Go; GM-04 thành gallery trước khi dựng màn mẫu. Data field có draft được review, nhưng cần bàn giao schema/import/API tường minh.

## Quyết định

- UI: GM-02 shell chạy được → GM-05 components từ mẫu → GM-09..14 màn dùng mock interface GM-07 → task tích hợp GM-24..31.
- BE: GM-03 cấu trúc/config/local runner → GM-07 contract/error/DTO/client/mock theo Data → GM-15..23 API nghiệp vụ; schema GM-06 và dataset GM-08 có trước query thật.
- Data: GM-04 dictionary/template → GM-06 database/migration → GM-08 import/verified manifest → BE dùng data. Không dùng fixture làm verified dataset.
- Start dependency là đầu vào thực sự phải nhận; mock UI là đầu ra nghiệm thu hợp lệ của task màn. API/native thật là AC của task tích hợp riêng. Có thể viết client từ dictionary trong khi DB hoàn thiện nhưng phải đối chiếu schema trước merge.
- Mỗi task khai báo input producer/path/gate và output path trong task map, có HANDOFF version/commit/lệnh chạy/test/task nhận. Checker kiểm graph, input/output, stage và file bàn giao; reviewer kiểm thực tế.
- Mọi dependency nhỏ hơn ID hiện hành; task số lớn trong mục bàn giao/scope downstream/parallel không tự là prerequisite.
- Preserve snapshot v1 và namespace evidence v2; không chuyển approval theo ID, không rewrite evidence cũ.

## Hệ quả và phạm vi

38 task giúp người làm có đầu ra nhỏ để merge: 6 nhóm màn UI độc lập và các task API/tích hợp rõ. Có thêm task structure/contract nhưng không thêm feature/provider/framework. Bộ luật food-v1/NO/hai vòng/privacy không thay đổi. Không triển khai code app, merge nhánh sandbox, đổi issue hoặc tự Approved trong lần chia kế hoạch này.

Xem [lộ trình](../../project/IMPLEMENTATION_ROADMAP.md), [mapping](../../project/TASK_RENUMBERING.md), [evidence](../../evidence/roadmap-v2/GM-01/REPLAN_2026-10-10.md).
