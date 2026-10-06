# Master backlog — 24 task triển khai

Tất cả là kế hoạch chưa triển khai; GM-00 ở review, chưa mở khóa code. P0 core; P1 sau core ổn; P2 sau release. S/M/L tương đối, không phải giờ. Owner/reviewer đề xuất.

| ID | Tên | Owner | Reviewer | Mức | Cỡ | Dependency |
| --- | --- | --- | --- | --- | --- | --- |
| [GM-01](GM-01.md) | Bootstrap Expo và kiểm tra Android | Tuấn | Trí | P0 | M | GM-00 |
| [GM-02](GM-02.md) | Design tokens và UI primitives | Trang | Tuấn | P0 | M | GM-01 |
| [GM-03](GM-03.md) | Catalogue và fixtures | Vinh | Tâm | P0 | M | GM-00 |
| [GM-04](GM-04.md) | Schema và migrations | Tâm | Trí | P0 | L | GM-00 |
| [GM-05](GM-05.md) | Guest identity và session | Trung | Trí | P0 | M | GM-01, GM-04 |
| [GM-06](GM-06.md) | RLS và quyền RPC nền | Trí | Tâm | P0 | L | GM-04, GM-05 |
| [GM-07](GM-07.md) | Home tạo/vào phòng UI | Trang | Trung | P0 | M | GM-02, GM-05 |
| [GM-08](GM-08.md) | Room RPC và snapshot | Tâm | Trí | P0 | L | GM-04, GM-06 |
| [GM-09](GM-09.md) | Lobby và ready flow | Tuấn | Trang | P0 | M | GM-07, GM-08 |
| [GM-10](GM-10.md) | Sở thích và pool UI | Trang | Vinh | P0 | M | GM-02, GM-03, GM-09 |
| [GM-11](GM-11.md) | Decision engine thuần và fixtures | Vinh | Trung | P0 | M | GM-03 |
| [GM-12](GM-12.md) | Submit và finalize RPC | Trí | Tâm | P0 | L | GM-06, GM-08, GM-11 |
| [GM-13](GM-13.md) | Card voting native | Trang | Tuấn | P0 | M | GM-02, GM-09, GM-10, GM-11 |
| [GM-14](GM-14.md) | Result và no-consensus UI | Tuấn | Vinh | P0 | M | GM-12, GM-13 |
| [GM-15](GM-15.md) | Vòng hai và giới hạn phiên | Trung | Vinh | P0 | M | GM-12, GM-13, GM-14 |
| [GM-16](GM-16.md) | Realtime và reconnect | Trí | Tâm | P0 | L | GM-09, GM-12, GM-15 |
| [GM-17](GM-17.md) | Bạn ăn cùng và account link | Trung | Trí | P1 | M | GM-05, GM-08, GM-16 |
| [GM-18](GM-18.md) | Lịch sử và retention P1 | Tâm | Vinh | P1 | M | GM-04, GM-14, GM-17 |
| [GM-19](GM-19.md) | Regression contract và security | Vinh | Tâm | P0 | M | GM-12, GM-16 |
| [GM-20](GM-20.md) | QR join và Maps | Tuấn | Trang | P0 | M | GM-09, GM-14 |
| [GM-21](GM-21.md) | QA Android và thử nhóm | Vinh | Trang | P0 | L | GM-15, GM-16, GM-19, GM-20 |
| [GM-22](GM-22.md) | Release demo và báo cáo | Trí | Tuấn | P0 | M | GM-21 |
| [GM-23](GM-23.md) | Pilot OCR menu | Tâm | Vinh | P2 | L | GM-22 |
| [GM-24](GM-24.md) | Pilot AI hiểu sở thích | Trung | Trí | P2 | L | GM-22 |
