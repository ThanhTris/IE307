# Phân công đề xuất — food-v1

Bảng sinh từ frontmatter task bằng `python scripts/task_readiness.py --write-docs` (đồng thời sửa link task sau khi chuyển thư mục); không sửa tay. Kiểm độ mới: `python scripts/task_readiness.py --check-docs`. Đây là trạng thái local, không xác minh GitHub hay review ngoài repo.

Một task chính/người; reviewer khác owner. Tên là đề xuất tới khi assignment_status=accepted. Không suy đã nhận từ Assignee GitHub.

| Thành viên | Task đề xuất | GitHub |
| --- | --- | --- |
| Trí | [GM-06](../../tasks/backlog/GM-06.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-22](../../tasks/backlog/GM-22.md) | [@ThanhTris](https://github.com/ThanhTris) |
| Trang | [GM-02](../../tasks/backlog/GM-02.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-13](../../tasks/backlog/GM-13.md) | [@rosy179](https://github.com/rosy179) |
| Tâm | [GM-04](../../tasks/backlog/GM-04.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-30](../../tasks/backlog/GM-30.md) | [@HoaiTam](https://github.com/HoaiTam) |
| Vinh | [GM-03](../../tasks/backlog/GM-03.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-27](../../tasks/backlog/GM-27.md) | [@Vinh5905](https://github.com/Vinh5905) |
| Trung | [GM-05](../../tasks/backlog/GM-05.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-26](../../tasks/backlog/GM-26.md), [GM-31](../../tasks/backlog/GM-31.md) | [@TrungNQ2645](https://github.com/TrungNQ2645) |
| Tuấn | [GM-01](../../tasks/backlog/GM-01.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-29](../../tasks/backlog/GM-29.md) | [@mtuan2491](https://github.com/mtuan2491) |

Codex soạn bộ nền GM-00 và bản sửa GM-28; Trí review độc lập, không tự duyệt. GM-28 vẫn chờ review bản mới.

Vinh làm taxonomy/dataset/engine và QA; Tâm schema/eligibility/room/history; Trí security/submit/outbox/release; Tuấn bootstrap/location/lobby/result/QR; Trang primitives/context/card; Trung identity/friends/push rồi phần mở rộng. Data quán phải làm sớm. GM-11 và GM-27 cùng Vinh nên xếp ca dù có thể độc lập về dependency. Cân tải/reviewer hằng tuần theo [dependency map](TASK_DEPENDENCIES.md).
