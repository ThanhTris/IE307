# Đối chiếu task roadmap-v1 → roadmap-v2

2026-10-10. Lần này chia lại scope và bàn giao, không chỉ đổi số. GM-00/evidence cũ giữ nguyên. Một task cũ có thể tách thành màn UI, API và tích hợp; số giống nhau không có nghĩa cùng scope.

| Task roadmap-v1 | Task nhận scope roadmap-v2 |
| --- | --- |
| GM-01 — Review baseline food-v1, dependency và quy trình PR | [GM-01](../../tasks/review/GM-01.md) |
| GM-02 — Bootstrap Expo Android và native capability spike | [GM-02](../../tasks/backlog/GM-02.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md) |
| GM-03 — Taxonomy món ăn và hợp đồng dataset | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) |
| GM-04 — Design system và UI primitives | [GM-05](../../tasks/backlog/GM-05.md) |
| GM-05 — Schema món–quán–lịch bán và migrations | [GM-06](../../tasks/backlog/GM-06.md) |
| GM-06 — Engine decision-v2 và fixtures | [GM-15](../../tasks/backlog/GM-15.md) |
| GM-07 — Guest identity và secure session | [GM-16](../../tasks/backlog/GM-16.md) |
| GM-08 — Dataset quán–món–lịch bán đã kiểm trong coverage | [GM-08](../../tasks/backlog/GM-08.md) |
| GM-09 — RLS/quyền RPC nền và retention | [GM-17](../../tasks/backlog/GM-17.md) |
| GM-10 — Vị trí foreground, coverage và điểm ăn chung | [GM-10](../../tasks/backlog/GM-10.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-25](../../tasks/backlog/GM-25.md) |
| GM-11 — Eligibility món theo nơi bán, giờ và snapshot pool | [GM-18](../../tasks/backlog/GM-18.md) |
| GM-12 — Room RPC, context và khóa pool khả thi | [GM-19](../../tasks/backlog/GM-19.md) |
| GM-13 — Home/create/join và context khu vực–giờ ăn | [GM-09](../../tasks/backlog/GM-09.md), [GM-25](../../tasks/backlog/GM-25.md) |
| GM-14 — Submit/finalize nguyên tử và result event | [GM-20](../../tasks/backlog/GM-20.md) |
| GM-15 — Kết bạn avatar và room invitation core | [GM-14](../../tasks/backlog/GM-14.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-28](../../tasks/backlog/GM-28.md) |
| GM-16 — Lobby ready và đồng bộ cơ bản | [GM-11](../../tasks/backlog/GM-11.md), [GM-25](../../tasks/backlog/GM-25.md) |
| GM-17 — History consent và chống lặp core | [GM-14](../../tasks/backlog/GM-14.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-28](../../tasks/backlog/GM-28.md) |
| GM-18 — Push invite/result và notification inbox | [GM-14](../../tasks/backlog/GM-14.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md) |
| GM-19 — Preferences cuisine/đặc tính và pool theo context | [GM-10](../../tasks/backlog/GM-10.md), [GM-25](../../tasks/backlog/GM-25.md) |
| GM-20 — Card voting double-tap và pending UX | [GM-12](../../tasks/backlog/GM-12.md), [GM-26](../../tasks/backlog/GM-26.md) |
| GM-21 — Result và nơi bán theo lịch đã kiểm | [GM-13](../../tasks/backlog/GM-13.md), [GM-27](../../tasks/backlog/GM-27.md) |
| GM-22 — Vòng hai Giữ/Loại và giới hạn phiên | [GM-12](../../tasks/backlog/GM-12.md), [GM-26](../../tasks/backlog/GM-26.md) |
| GM-23 — QR/incoming links và tích hợp Maps/review | [GM-30](../../tasks/backlog/GM-30.md) |
| GM-24 — SQLite outbox/cache và realtime recovery | [GM-31](../../tasks/backlog/GM-31.md) |
| GM-25 — Regression contract/security/race | [GM-32](../../tasks/backlog/GM-32.md) |
| GM-26 — QA native và user pilot | [GM-33](../../tasks/backlog/GM-33.md) |
| GM-27 — APK/demo/báo cáo và bàn giao | [GM-34](../../tasks/backlog/GM-34.md) |
| GM-28 — Account link/recovery và history sync | [GM-35](../../tasks/backlog/GM-35.md) |
| GM-29 — Pilot OCR menu | [GM-36](../../tasks/backlog/GM-36.md) |
| GM-30 — Pilot AI hiểu sở thích | [GM-37](../../tasks/backlog/GM-37.md) |
| GM-31 — Weather và tâm trạng tự khai để xếp hạng | [GM-38](../../tasks/backlog/GM-38.md) |

GM-03 mới là BE structure bổ sung. `previous_ids` chỉ để tra cứu, không phải dependency hoặc chứng nhận hoàn thành. [JSON hiện hành](../../tasks/task-id-map.json) lưu track/stage/input/output và liên hệ nhiều–nhiều; [snapshot v1](../../tasks/archive/roadmap-v1/task-snapshot.json) giữ nguyên văn task tại main `aeb1a83`; [map đời trước](../../tasks/archive/roadmap-v1/task-id-map.json) để tra issue/evidence trước roadmap-v1.

Issue URL của v1 nằm trong snapshot; chưa đổi title/body/assignee của issue hoặc tạo issue mới cho task tách. Khi đồng bộ GitHub phải xử lý một–nhiều theo scope, không đổi số issue hoặc copy cùng issue thành nhiều task độc lập.

[Hướng dẫn triển khai và tái sử dụng sandbox](IMPLEMENTATION_ROADMAP.md) · [tổng hợp](TASK_SUMMARY.md). Review sandbox GM-03 cũ tại `f110167` vẫn có giá trị cho phần được duyệt; scope bổ sung phải đối chiếu/review, không tự chuyển task mới sang Done.
