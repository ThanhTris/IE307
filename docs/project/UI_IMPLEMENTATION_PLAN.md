# Kế hoạch UI theo Figma final — 2026-10-25

Trí đã giao cập nhật task UI theo [final handoff](../design/UI_FINAL_HANDOFF_2026-10-25.md). [Bảng task/Figma/AC/gap và thứ tự](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md) là kế hoạch hiện hành; [map JSON](../design/UI_FIGMA_TASK_MAP.json) dành cho AI. HTML cũ và kế hoạch UI food-v1 trước đây là baseline lịch sử.

1. GM-02 font/bootstrap/routes → GM-05 token/component Figma.
2. GM-09..14 màn/mock làm theo owner và file ownership; cùng người xếp ca, không chờ API nếu chỉ dựng presentation.
3. GM-24 preview/setup dish-only → GM-25 guest/room/lobby → GM-26 ballot/waiting → GM-27 result. Contract/schema/runtime B phải bàn giao trước kiểm thật.
4. GM-28 social/history/inbox, GM-29 push, GM-30 QR/links/Places/map, GM-31 outbox/cache/reconnect nhận producer tương ứng. GM-27 không bị gắn dependency ngược GM-30; GM-33 kiểm composition cuối.
5. GM-33 visual + Android/API → GM-34 release. GM-39 handoff/design hỗ trợ song song, GM-35 giữ P1.

GM-14 bổ sung Figma G01–G03 và mock, GM-28/31 nối API/cache; GM-35 bổ sung G04/G05 khi làm P1. Mỗi task có node URL, route/state, ảnh Figma/app cùng viewport và CHECKS/HANDOFF/FIGMA_PARITY. Không dùng mock thay API/native hoặc Figma đủ màn thay app Pass. Giữ luật trong [UI_SPEC](../specs/UI_SPEC.md), phân công/Deadline theo Project #2.
