# Phân công đề xuất — food-v1

Sinh từ task bằng `python scripts/task_readiness.py --write-docs`; không sửa tay. `--check-docs` kiểm độ mới. Đây là metadata local, không phải trạng thái GitHub.

Một task chính/người; reviewer khác owner. Phân công vẫn proposed tới khi thành viên xác nhận.

| Thành viên | Task đề xuất | GitHub |
| --- | --- | --- |
| Trí | [GM-09](../../tasks/backlog/GM-09.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-27](../../tasks/backlog/GM-27.md) | [@ThanhTris](https://github.com/ThanhTris) |
| Trang | [GM-04](../../tasks/backlog/GM-04.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-20](../../tasks/backlog/GM-20.md) | [@rosy179](https://github.com/rosy179) |
| Tâm | [GM-05](../../tasks/backlog/GM-05.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-29](../../tasks/backlog/GM-29.md) | [@HoaiTam](https://github.com/HoaiTam) |
| Vinh | [GM-03](../../tasks/backlog/GM-03.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-26](../../tasks/backlog/GM-26.md) | [@Vinh5905](https://github.com/Vinh5905) |
| Trung | [GM-07](../../tasks/backlog/GM-07.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md) | [@TrungNQ2645](https://github.com/TrungNQ2645) |
| Tuấn | [GM-02](../../tasks/backlog/GM-02.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-23](../../tasks/backlog/GM-23.md) | [@mtuan2491](https://github.com/mtuan2491) |

Codex soạn GM-01; Trí review độc lập, chưa Approved. Sau GM-01, đợt đầu đề xuất: Tuấn GM-02 runner; Trang GM-04 primitives theo UI spec; Vinh GM-03 contract; Trung GM-07 adapter identity theo API; Trí GM-09 thiết kế quyền/tests theo data model. Tâm chuẩn bị patch/test plan GM-05, chỉ triển khai sau GM-03 được review. Các nhánh chưa có runtime phải ghi Not run, không tự tạo package/lockfile riêng.

Sau GM-03: Tâm GM-05 schema và Vinh GM-08 khảo sát có thể song song; GM-06 cùng owner Vinh cần xếp ca, GM-11 cùng Tâm cần xếp ca. Sau nền: Trang UI, Tuấn context/result/links, Tâm eligibility/room/history, Trí security/submit/outbox, Trung friends/push, Vinh data/decision/QA. Reviewer Trí/Tâm có tải cao: đặt lịch review contract sớm, không tự thay reviewer hay coi proposed là đã nhận. Xem [hai gate và cặp task](TASK_DEPENDENCIES.md); cùng owner không được tự gắn song song.
