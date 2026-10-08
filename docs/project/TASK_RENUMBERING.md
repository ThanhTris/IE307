# Lộ trình đánh số task và bảng đối chiếu

Ngày 2026-10-08 • numbering: roadmap-v1. Mã task hiện hành chạy từ **GM-01 đến GM-31** theo thứ tự dependency; GM-00 giữ làm hồ sơ baseline lịch sử đã review.

## Quy tắc nhận việc và merge

- Mọi start_dependencies và merge_dependencies của GM-N chỉ được trỏ GM có số nhỏ hơn N. Validator chặn dependency cùng số hoặc lớn hơn, kể cả graph chưa có cycle.
- Số nhỏ đứng trước số lớn trong lộ trình tích hợp. Không thêm dependency giả N → N-1 nếu hai task độc lập; vẫn được làm nhánh song song khi start gate đạt. parallel_with có thể chứa số lớn hơn vì đó không phải điều kiện phải xong trước.
- GM-01 là review baseline food-v1, trước đây mang mã GM-28. **GM-03 taxonomy nay chờ GM-01**, không chờ GM-28. GM-28 hiện là account nâng cao, không chặn task core.
- GM-02 bootstrap và GM-03 taxonomy là hai nhánh nền; GM-04 UI primitives, GM-05 schema, GM-06 decision, GM-07 auth, GM-08 dataset, GM-09 security, GM-10 location, GM-11 eligibility. GM-12..24 tích hợp tính năng; GM-25 regression, GM-26 QA, GM-27 release; GM-28..31 mở rộng.
- GM-01 vẫn review; task triển khai vẫn backlog. Đổi số không đổi owner/reviewer/priority/AC hoặc tự mở khóa approval.

[Danh sách đầy đủ và owner](TASK_SUMMARY.md) · [Hai gate và lớp song song](TASK_DEPENDENCIES.md) · [Workflow](TEAM_WORKFLOW.md).

## Mã mới là nguồn hiện hành

Cột mã cũ dưới đây chỉ để tra lịch sử, **không phải dependency**. Mỗi task có previous_id và numbering. [Mapping máy đọc](../../tasks/task-id-map.json) là hồ sơ đối chiếu bất biến của lần chuyển này; task mới về sau cấp số tiếp theo.

| Mã hiện hành | Phạm vi | Mã cũ trước roadmap-v1 | Issue cùng phạm vi |
| --- | --- | --- | --- |
| [GM-01](../../tasks/review/GM-01.md) | Review baseline food-v1, dependency và quy trình PR | GM-28 | Chưa có URL issue |
| [GM-02](../../tasks/backlog/GM-02.md) | Bootstrap Expo Android và native capability spike | GM-01 | [Issue](https://github.com/ThanhTris/IE307/issues/38) |
| [GM-03](../../tasks/backlog/GM-03.md) | Taxonomy món ăn và hợp đồng dataset | GM-03 | [Issue](https://github.com/ThanhTris/IE307/issues/40) |
| [GM-04](../../tasks/backlog/GM-04.md) | Design system và UI primitives | GM-02 | [Issue](https://github.com/ThanhTris/IE307/issues/39) |
| [GM-05](../../tasks/backlog/GM-05.md) | Schema món–quán–lịch bán và migrations | GM-04 | [Issue](https://github.com/ThanhTris/IE307/issues/41) |
| [GM-06](../../tasks/backlog/GM-06.md) | Engine decision-v2 và fixtures | GM-11 | [Issue](https://github.com/ThanhTris/IE307/issues/48) |
| [GM-07](../../tasks/backlog/GM-07.md) | Guest identity và secure session | GM-05 | [Issue](https://github.com/ThanhTris/IE307/issues/42) |
| [GM-08](../../tasks/backlog/GM-08.md) | Dataset quán–món–lịch bán đã kiểm trong coverage | GM-27 | Chưa có URL issue |
| [GM-09](../../tasks/backlog/GM-09.md) | RLS/quyền RPC nền và retention | GM-06 | [Issue](https://github.com/ThanhTris/IE307/issues/43) |
| [GM-10](../../tasks/backlog/GM-10.md) | Vị trí foreground, coverage và điểm ăn chung | GM-29 | Chưa có URL issue |
| [GM-11](../../tasks/backlog/GM-11.md) | Eligibility món theo nơi bán, giờ và snapshot pool | GM-30 | Chưa có URL issue |
| [GM-12](../../tasks/backlog/GM-12.md) | Room RPC, context và khóa pool khả thi | GM-08 | [Issue](https://github.com/ThanhTris/IE307/issues/45) |
| [GM-13](../../tasks/backlog/GM-13.md) | Home/create/join và context khu vực–giờ ăn | GM-07 | [Issue](https://github.com/ThanhTris/IE307/issues/44) |
| [GM-14](../../tasks/backlog/GM-14.md) | Submit/finalize nguyên tử và result event | GM-12 | [Issue](https://github.com/ThanhTris/IE307/issues/49) |
| [GM-15](../../tasks/backlog/GM-15.md) | Kết bạn avatar và room invitation core | GM-17 | [Issue](https://github.com/ThanhTris/IE307/issues/54) |
| [GM-16](../../tasks/backlog/GM-16.md) | Lobby ready và đồng bộ cơ bản | GM-09 | [Issue](https://github.com/ThanhTris/IE307/issues/46) |
| [GM-17](../../tasks/backlog/GM-17.md) | History consent và chống lặp core | GM-18 | [Issue](https://github.com/ThanhTris/IE307/issues/55) |
| [GM-18](../../tasks/backlog/GM-18.md) | Push invite/result và notification inbox | GM-25 | Chưa có URL issue |
| [GM-19](../../tasks/backlog/GM-19.md) | Preferences cuisine/đặc tính và pool theo context | GM-10 | [Issue](https://github.com/ThanhTris/IE307/issues/47) |
| [GM-20](../../tasks/backlog/GM-20.md) | Card voting double-tap và pending UX | GM-13 | [Issue](https://github.com/ThanhTris/IE307/issues/50) |
| [GM-21](../../tasks/backlog/GM-21.md) | Result và nơi bán theo lịch đã kiểm | GM-14 | [Issue](https://github.com/ThanhTris/IE307/issues/51) |
| [GM-22](../../tasks/backlog/GM-22.md) | Vòng hai Giữ/Loại và giới hạn phiên | GM-15 | [Issue](https://github.com/ThanhTris/IE307/issues/52) |
| [GM-23](../../tasks/backlog/GM-23.md) | QR/incoming links và tích hợp Maps/review | GM-20 | [Issue](https://github.com/ThanhTris/IE307/issues/57) |
| [GM-24](../../tasks/backlog/GM-24.md) | SQLite outbox/cache và realtime recovery | GM-16 | [Issue](https://github.com/ThanhTris/IE307/issues/53) |
| [GM-25](../../tasks/backlog/GM-25.md) | Regression contract/security/race | GM-19 | [Issue](https://github.com/ThanhTris/IE307/issues/56) |
| [GM-26](../../tasks/backlog/GM-26.md) | QA native và user pilot | GM-21 | [Issue](https://github.com/ThanhTris/IE307/issues/58) |
| [GM-27](../../tasks/backlog/GM-27.md) | APK/demo/báo cáo và bàn giao | GM-22 | [Issue](https://github.com/ThanhTris/IE307/issues/59) |
| [GM-28](../../tasks/backlog/GM-28.md) | Account link/recovery và history sync | GM-26 | Chưa có URL issue |
| [GM-29](../../tasks/backlog/GM-29.md) | Pilot OCR menu | GM-23 | [Issue](https://github.com/ThanhTris/IE307/issues/60) |
| [GM-30](../../tasks/backlog/GM-30.md) | Pilot AI hiểu sở thích | GM-24 | [Issue](https://github.com/ThanhTris/IE307/issues/61) |
| [GM-31](../../tasks/backlog/GM-31.md) | Weather và tâm trạng tự khai để xếp hạng | GM-31 | Chưa có URL issue |

## Issue và evidence cũ

Không đổi số issue GitHub, URL hoặc tự sửa remote. Tiêu đề/mô tả issue chưa sync có thể mang mã cũ; dùng bảng trên và title/phạm vi, không suy identity chỉ từ GM-ID. Một mã cũ có thể được dùng lại cho phạm vi khác trong lộ trình mới, nên không tạo alias CLI mơ hồ.

Giữ nguyên GM-00 và evidence được duyệt, không viết lại kết quả/lệnh lịch sử. Các tài liệu lịch sử khác có banner mã cũ; link tới task hiện hành được retarget khi cần. Folder docs/evidence/GM-28 vẫn là evidence của **review baseline mã cũ**, không phải account GM-28 mới. Evidence mới dùng docs/evidence/roadmap-v1/GM-XX/ để tránh trùng nghĩa.

Khi kiểm merge với branch còn mã cũ, checker không tự coi cùng số là cùng task: phải có đúng nội dung task/evidence trên target. Cập nhật bộ metadata đánh số trước khi merge feature; không bypass review vì rename.
