# Master backlog — food-v1

Sinh từ task bằng `python scripts/task_readiness.py --write-docs`; không sửa tay. `--check-docs` kiểm độ mới. Đây là metadata local, không phải trạng thái GitHub.

31 task sau GM-00: 27 P0 (gồm GM-01), 1 P1, 3 P2. Mã roadmap-v1 tăng theo lộ trình; mọi dependency có số nhỏ hơn task. Không đổi owner/priority/approval.

| Task | Phạm vi | Owner / reviewer | Mức/cỡ | Status | Gate bắt đầu | Start deps | Merge deps | Song song |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [GM-01](../review/GM-01.md) | Review baseline food-v1, dependency và quy trình PR | Codex / Trí | P0/L | review | IN_REVIEW | [GM-00](../done/GM-00.md) | [GM-00](../done/GM-00.md) | — |
| [GM-02](GM-02.md) | Bootstrap Expo Android và native capability spike | Tuấn / Trí | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-01](../review/GM-01.md) | [GM-03](GM-03.md), [GM-04](GM-04.md), [GM-07](GM-07.md), [GM-09](GM-09.md) |
| [GM-03](GM-03.md) | Taxonomy món ăn và hợp đồng dataset | Vinh / Tâm | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-01](../review/GM-01.md) | [GM-02](GM-02.md), [GM-04](GM-04.md), [GM-07](GM-07.md), [GM-09](GM-09.md) |
| [GM-04](GM-04.md) | Design system và UI primitives | Trang / Tuấn | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-02](GM-02.md) | [GM-02](GM-02.md), [GM-03](GM-03.md), [GM-05](GM-05.md), [GM-07](GM-07.md), [GM-09](GM-09.md) |
| [GM-05](GM-05.md) | Schema món–quán–lịch bán và migrations | Tâm / Trí | P0/L | backlog | BLOCKED | [GM-03](GM-03.md) | [GM-03](GM-03.md) | [GM-04](GM-04.md), [GM-08](GM-08.md) |
| [GM-06](GM-06.md) | Engine decision-v2 và fixtures | Vinh / Trung | P0/M | backlog | BLOCKED | [GM-03](GM-03.md) | [GM-02](GM-02.md), [GM-03](GM-03.md) | [GM-09](GM-09.md) |
| [GM-07](GM-07.md) | Guest identity và secure session | Trung / Trí | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-02](GM-02.md), [GM-05](GM-05.md) | [GM-02](GM-02.md), [GM-03](GM-03.md), [GM-04](GM-04.md), [GM-08](GM-08.md), [GM-09](GM-09.md) |
| [GM-08](GM-08.md) | Dataset quán–món–lịch bán đã kiểm trong coverage | Vinh / Tâm | P0/L | backlog | BLOCKED | [GM-03](GM-03.md) | [GM-03](GM-03.md), [GM-05](GM-05.md) | [GM-05](GM-05.md), [GM-07](GM-07.md), [GM-10](GM-10.md), [GM-11](GM-11.md) |
| [GM-09](GM-09.md) | RLS/quyền RPC nền và retention | Trí / Tâm | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-05](GM-05.md), [GM-07](GM-07.md) | [GM-02](GM-02.md), [GM-03](GM-03.md), [GM-04](GM-04.md), [GM-06](GM-06.md), [GM-07](GM-07.md) |
| [GM-10](GM-10.md) | Vị trí foreground, coverage và điểm ăn chung | Tuấn / Trang | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-02](GM-02.md), [GM-04](GM-04.md), [GM-07](GM-07.md), [GM-08](GM-08.md), [GM-09](GM-09.md) | [GM-08](GM-08.md), [GM-11](GM-11.md) |
| [GM-11](GM-11.md) | Eligibility món theo nơi bán, giờ và snapshot pool | Tâm / Vinh | P0/L | backlog | BLOCKED | [GM-03](GM-03.md) | [GM-02](GM-02.md), [GM-05](GM-05.md), [GM-08](GM-08.md), [GM-09](GM-09.md) | [GM-08](GM-08.md), [GM-10](GM-10.md) |
| [GM-12](GM-12.md) | Room RPC, context và khóa pool khả thi | Tâm / Trí | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-07](GM-07.md), [GM-09](GM-09.md), [GM-11](GM-11.md) | [GM-13](GM-13.md) |
| [GM-13](GM-13.md) | Home/create/join và context khu vực–giờ ăn | Trang / Trung | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-04](GM-04.md), [GM-07](GM-07.md), [GM-10](GM-10.md), [GM-12](GM-12.md) | [GM-12](GM-12.md) |
| [GM-14](GM-14.md) | Submit/finalize nguyên tử và result event | Trí / Tâm | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-06](GM-06.md), [GM-09](GM-09.md), [GM-12](GM-12.md) | [GM-19](GM-19.md), [GM-20](GM-20.md) |
| [GM-15](GM-15.md) | Kết bạn avatar và room invitation core | Trung / Trí | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-04](GM-04.md), [GM-07](GM-07.md), [GM-09](GM-09.md), [GM-12](GM-12.md) | [GM-19](GM-19.md) |
| [GM-16](GM-16.md) | Lobby ready và đồng bộ cơ bản | Tuấn / Trang | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-12](GM-12.md), [GM-13](GM-13.md) | — |
| [GM-17](GM-17.md) | History consent và chống lặp core | Tâm / Vinh | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-04](GM-04.md), [GM-05](GM-05.md), [GM-09](GM-09.md), [GM-11](GM-11.md), [GM-14](GM-14.md) | [GM-22](GM-22.md) |
| [GM-18](GM-18.md) | Push invite/result và notification inbox | Trung / Trí | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-04](GM-04.md), [GM-07](GM-07.md), [GM-09](GM-09.md), [GM-14](GM-14.md), [GM-15](GM-15.md) | — |
| [GM-19](GM-19.md) | Preferences cuisine/đặc tính và pool theo context | Trang / Vinh | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-04](GM-04.md), [GM-11](GM-11.md), [GM-16](GM-16.md), [GM-17](GM-17.md) | [GM-14](GM-14.md), [GM-15](GM-15.md) |
| [GM-20](GM-20.md) | Card voting double-tap và pending UX | Trang / Tuấn | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-04](GM-04.md), [GM-06](GM-06.md), [GM-14](GM-14.md), [GM-16](GM-16.md), [GM-19](GM-19.md) | [GM-14](GM-14.md), [GM-21](GM-21.md) |
| [GM-21](GM-21.md) | Result và nơi bán theo lịch đã kiểm | Tuấn / Vinh | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-11](GM-11.md), [GM-14](GM-14.md), [GM-20](GM-20.md) | [GM-20](GM-20.md) |
| [GM-22](GM-22.md) | Vòng hai Giữ/Loại và giới hạn phiên | Trung / Vinh | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-14](GM-14.md), [GM-20](GM-20.md), [GM-21](GM-21.md) | [GM-17](GM-17.md) |
| [GM-23](GM-23.md) | QR/incoming links và tích hợp Maps/review | Tuấn / Trang | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-10](GM-10.md), [GM-15](GM-15.md), [GM-16](GM-16.md), [GM-21](GM-21.md) | [GM-24](GM-24.md), [GM-25](GM-25.md) |
| [GM-24](GM-24.md) | SQLite outbox/cache và realtime recovery | Trí / Tâm | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-14](GM-14.md), [GM-16](GM-16.md), [GM-22](GM-22.md) | [GM-23](GM-23.md) |
| [GM-25](GM-25.md) | Regression contract/security/race | Vinh / Tâm | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-11](GM-11.md), [GM-14](GM-14.md), [GM-15](GM-15.md), [GM-17](GM-17.md), [GM-18](GM-18.md), [GM-24](GM-24.md) | [GM-23](GM-23.md) |
| [GM-26](GM-26.md) | QA native và user pilot | Vinh / Trang | P0/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-08](GM-08.md), [GM-10](GM-10.md), [GM-11](GM-11.md), [GM-15](GM-15.md), [GM-17](GM-17.md), [GM-18](GM-18.md), [GM-22](GM-22.md), [GM-23](GM-23.md), [GM-24](GM-24.md), [GM-25](GM-25.md) | — |
| [GM-27](GM-27.md) | APK/demo/báo cáo và bàn giao | Trí / Tuấn | P0/M | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-26](GM-26.md) | — |
| [GM-28](GM-28.md) | Account link/recovery và history sync | Trung / Trí | P1/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-15](GM-15.md), [GM-17](GM-17.md), [GM-27](GM-27.md) | [GM-29](GM-29.md) |
| [GM-29](GM-29.md) | Pilot OCR menu | Tâm / Vinh | P2/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-08](GM-08.md), [GM-27](GM-27.md) | [GM-28](GM-28.md), [GM-30](GM-30.md), [GM-31](GM-31.md) |
| [GM-30](GM-30.md) | Pilot AI hiểu sở thích | Trung / Trí | P2/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-27](GM-27.md) | [GM-29](GM-29.md) |
| [GM-31](GM-31.md) | Weather và tâm trạng tự khai để xếp hạng | Trung / Trí | P2/L | backlog | BLOCKED | [GM-01](../review/GM-01.md) | [GM-11](GM-11.md), [GM-17](GM-17.md), [GM-27](GM-27.md) | [GM-29](GM-29.md) |

[Hai gate và thứ tự merge](../../docs/project/TASK_DEPENDENCIES.md) · [Mã cũ–mới](../../docs/project/TASK_RENUMBERING.md). Merge cần cả start deps và merge deps. Song song chỉ áp dụng phần độc lập được ghi trong task; không tự xác nhận nhận việc.
