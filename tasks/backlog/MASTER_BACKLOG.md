# Master backlog v0.2 — 27 task triển khai

2026-10-07. GM-00 đã được review/chấp thuận; GM-01..27 backlog. 23 P0, 2 P1, 2 P2. Tất cả owner/reviewer triển khai là đề xuất, không chứng minh đã nhận việc. Hạn Wn là tuần từ khi baseline review đạt, chưa có ngày lịch.

| Task | Phạm vi | Owner / reviewer đề xuất | Mức/cỡ | Hạn | Dependency |
| --- | --- | --- | --- | --- | --- |
| [GM-01](GM-01.md) | Bootstrap Expo Android và native capability spike | Tuấn / Trí | P0/L | W1 | GM-00 |
| [GM-02](GM-02.md) | Design system và UI primitives | Trang / Tuấn | P0/M | W2 | GM-01 |
| [GM-03](GM-03.md) | Catalogue ảnh/tag/giá và context fixtures | Vinh / Tâm | P0/M | W2 | GM-00 |
| [GM-04](GM-04.md) | Schema và migrations v0.2 | Tâm / Trí | P0/L | W2 | GM-00 |
| [GM-05](GM-05.md) | Guest identity và secure session | Trung / Trí | P0/M | W2 | GM-01, GM-04 |
| [GM-06](GM-06.md) | RLS/quyền RPC nền và retention | Trí / Tâm | P0/L | W2 | GM-04, GM-05 |
| [GM-07](GM-07.md) | Home/create/join UI và context form | Trang / Trung | P0/M | W3 | GM-02, GM-05 |
| [GM-08](GM-08.md) | Room RPC/snapshot và khóa context | Tâm / Trí | P0/L | W3 | GM-03, GM-04, GM-06 |
| [GM-09](GM-09.md) | Lobby ready và đồng bộ cơ bản | Tuấn / Trang | P0/M | W3 | GM-07, GM-08 |
| [GM-10](GM-10.md) | Preferences/context/pool UI | Trang / Vinh | P0/M | W3 | GM-02, GM-03, GM-09 |
| [GM-11](GM-11.md) | Engine decision-v2 và fixtures | Vinh / Trung | P0/M | W3 | GM-03 |
| [GM-12](GM-12.md) | Submit/finalize nguyên tử và result event | Trí / Tâm | P0/L | W4 | GM-06, GM-08, GM-11 |
| [GM-13](GM-13.md) | Card voting double-tap và pending UX | Trang / Tuấn | P0/M | W4 | GM-02, GM-09, GM-10, GM-11, GM-12 |
| [GM-14](GM-14.md) | Result tiers và No Consensus UI | Tuấn / Vinh | P0/M | W4 | GM-12, GM-13 |
| [GM-15](GM-15.md) | Vòng hai Giữ/Loại và giới hạn phiên | Trung / Vinh | P0/M | W4 | GM-12, GM-13, GM-14 |
| [GM-16](GM-16.md) | SQLite outbox/cache và realtime recovery | Trí / Tâm | P0/L | W5 | GM-09, GM-12, GM-15 |
| [GM-17](GM-17.md) | Kết bạn avatar và room invitation core | Trung / Trí | P0/L | W4 | GM-05, GM-06, GM-08 |
| [GM-18](GM-18.md) | History consent và chống lặp core | Tâm / Vinh | P0/L | W6 | GM-04, GM-06, GM-12 |
| [GM-19](GM-19.md) | Regression contract/security/race | Vinh / Tâm | P0/L | W7 | GM-12, GM-16, GM-17, GM-18, GM-25 |
| [GM-20](GM-20.md) | QR/incoming links/vị trí và review | Tuấn / Trang | P0/L | W6 | GM-09, GM-14, GM-17 |
| [GM-21](GM-21.md) | QA native và user pilot | Vinh / Trang | P0/L | W7 | GM-15, GM-16, GM-17, GM-18, GM-19, GM-20, GM-25 |
| [GM-22](GM-22.md) | APK/demo/báo cáo và bàn giao | Trí / Tuấn | P0/M | W8 | GM-21 |
| [GM-23](GM-23.md) | Pilot OCR menu | Tâm / Vinh | P2/L | Sau W8 | GM-22 |
| [GM-24](GM-24.md) | Pilot AI hiểu sở thích | Trung / Trí | P2/L | Sau W8 | GM-22 |
| [GM-25](GM-25.md) | Push invite/result và notification inbox | Trung / Trí | P0/L | W5 | GM-05, GM-06, GM-12, GM-17 |
| [GM-26](GM-26.md) | Account link/recovery và history sync | Trung / Trí | P1/L | Sau W8 | GM-22, GM-17, GM-18 |
| [GM-27](GM-27.md) | Pilot venue–dish radius quanh trường | Vinh / Tâm | P1/L | Sau W8 | GM-22, GM-20 |

GM-17 chỉ kết bạn/invite, GM-18 history tối thiểu; account/recovery chuyển GM-26. GM-25 push mới, GM-27 venue pilot P1 mới. Chưa tự đồng bộ issue/Project hoặc đổi status. [Mô tả hệ thống](../../docs/product/SYSTEM_OVERVIEW.md) · [Tiến độ](../../docs/project/PROJECT_PLAN.md).
