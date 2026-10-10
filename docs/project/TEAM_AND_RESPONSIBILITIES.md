# Phân công đề xuất — food-v1

Sinh từ task bằng `python scripts/task_readiness.py --write-docs`; không sửa tay. `--check-docs` kiểm độ mới. Đây là metadata/gate chẩn đoán local, không phải trạng thái GitHub. Gate thực tế đọc Done live trên Project theo ADR-011; xem docs/project/PROJECT_READINESS.md.

Một task chính/người; reviewer khác owner. Phân công vẫn proposed tới khi thành viên xác nhận.

| Thành viên | Task đề xuất | GitHub |
| --- | --- | --- |
| Trí | [GM-03](../../tasks/review/GM-03.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-31](../../tasks/backlog/GM-31.md), [GM-34](../../tasks/backlog/GM-34.md) | [@ThanhTris](https://github.com/ThanhTris) |
| Trang | [GM-05](../../tasks/backlog/GM-05.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-26](../../tasks/backlog/GM-26.md) | [@rosy179](https://github.com/rosy179) |
| Tâm | [GM-06](../../tasks/backlog/GM-06.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-36](../../tasks/backlog/GM-36.md) | [@HoaiTam](https://github.com/HoaiTam) |
| Vinh | [GM-04](../../tasks/backlog/GM-04.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-32](../../tasks/backlog/GM-32.md), [GM-33](../../tasks/backlog/GM-33.md) | [@Vinh5905](https://github.com/Vinh5905) |
| Trung | [GM-07](../../tasks/backlog/GM-07.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-35](../../tasks/backlog/GM-35.md), [GM-37](../../tasks/backlog/GM-37.md), [GM-38](../../tasks/backlog/GM-38.md) | [@TrungNQ2645](https://github.com/TrungNQ2645) |
| Tuấn | [GM-02](../../tasks/review/GM-02.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-27](../../tasks/backlog/GM-27.md), [GM-30](../../tasks/backlog/GM-30.md) | [@mtuan2491](https://github.com/mtuan2491) |

Codex soạn GM-01, Trí review baseline. Đợt nền: Tuấn GM-02 UI structure, Trí GM-03 BE structure, Vinh GM-04 fields. Trang chuẩn bị inventory UI mẫu; Tâm/Trung review data/API plan. Sau đầu vào tương ứng: Trang GM-05 components, Tâm GM-06 database, Trung GM-07 client/mock, Vinh GM-08 import. Trang/Tuấn chia màn GM-09..14 theo ca; BE và tích hợp theo task/owner trong bảng. Không yêu cầu người chưa có nền tự tạo scaffolding riêng. Đặt lịch review sớm, cùng owner xếp ca. Xem [lộ trình](IMPLEMENTATION_ROADMAP.md), [handoff](TASK_HANDOFFS.md) và [dependency](TASK_DEPENDENCIES.md).
