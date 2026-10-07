# Thứ tự và điều kiện bắt đầu task — food-v1

Bảng sinh từ frontmatter task bằng `python scripts/task_readiness.py --write-docs` (đồng thời sửa link task sau khi chuyển thư mục); không sửa tay. Kiểm độ mới: `python scripts/task_readiness.py --check-docs`. Đây là trạng thái local, không xác minh GitHub hay review ngoài repo.

31 task sau GM-00: 27 P0 (gồm gate tài liệu GM-28), 1 P1, 3 P2. Baseline food-v1; reviewer độc lập mới mở khóa.

## Cách tự kiểm trước khi làm

Chạy `python scripts/task_readiness.py --task GM-08` (đổi ID cần nhận). Exit 0 chỉ khi dependency đã Done với Reviewed-by đúng reviewer khác owner, Reviewed-at hợp lệ, Decision: Approved và Review-evidence tồn tại; assignment vẫn cần thành viên xác nhận. Exit 1 = đang bị chặn/chờ review, exit 2 = metadata không hợp lệ. `--all` là báo cáo tổng, exit 0 của báo cáo không có nghĩa mọi task đã sẵn sàng.

READY_TO_CLAIM: có thể nhận; READY_TO_START: đã nhận và gate đạt; BLOCKED: các dependency liệt kê chưa đạt; IN_REVIEW: chờ reviewer; IN_PROGRESS: đang làm; DONE_REVIEWED: đủ bản ghi review. Script không chứng minh người review có thật hoặc AC đạt thật; người nhận phải mở evidence/PR.

Một dependency merge PR nhưng task còn review chưa mở khóa. Đổi status Done mà thiếu Approved/evidence không mở khóa. Review là cho scope/revision đã giao; đổi contract sau nghiệm thu phải review lại và rà tác động task con.

## Trạng thái hiện tại

| Task | Gate | Chờ trực tiếp |
| --- | --- | --- |
| [GM-00](../../tasks/done/GM-00.md) | DONE_REVIEWED | — |
| [GM-01](../../tasks/backlog/GM-01.md) | BLOCKED | [GM-28](../../tasks/review/GM-28.md) |
| [GM-02](../../tasks/backlog/GM-02.md) | BLOCKED | [GM-01](../../tasks/backlog/GM-01.md) |
| [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-28](../../tasks/review/GM-28.md) |
| [GM-04](../../tasks/backlog/GM-04.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md) |
| [GM-05](../../tasks/backlog/GM-05.md) | BLOCKED | [GM-01](../../tasks/backlog/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md) |
| [GM-06](../../tasks/backlog/GM-06.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-05](../../tasks/backlog/GM-05.md) |
| [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-29](../../tasks/backlog/GM-29.md) |
| [GM-08](../../tasks/backlog/GM-08.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-30](../../tasks/backlog/GM-30.md) |
| [GM-09](../../tasks/backlog/GM-09.md) | BLOCKED | [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md) |
| [GM-10](../../tasks/backlog/GM-10.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-30](../../tasks/backlog/GM-30.md) |
| [GM-11](../../tasks/backlog/GM-11.md) | BLOCKED | [GM-01](../../tasks/backlog/GM-01.md), [GM-03](../../tasks/backlog/GM-03.md) |
| [GM-12](../../tasks/backlog/GM-12.md) | BLOCKED | [GM-06](../../tasks/backlog/GM-06.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-11](../../tasks/backlog/GM-11.md) |
| [GM-13](../../tasks/backlog/GM-13.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-12](../../tasks/backlog/GM-12.md) |
| [GM-14](../../tasks/backlog/GM-14.md) | BLOCKED | [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-30](../../tasks/backlog/GM-30.md) |
| [GM-15](../../tasks/backlog/GM-15.md) | BLOCKED | [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-14](../../tasks/backlog/GM-14.md) |
| [GM-16](../../tasks/backlog/GM-16.md) | BLOCKED | [GM-09](../../tasks/backlog/GM-09.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-15](../../tasks/backlog/GM-15.md) |
| [GM-17](../../tasks/backlog/GM-17.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-08](../../tasks/backlog/GM-08.md) |
| [GM-18](../../tasks/backlog/GM-18.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-30](../../tasks/backlog/GM-30.md) |
| [GM-19](../../tasks/backlog/GM-19.md) | BLOCKED | [GM-12](../../tasks/backlog/GM-12.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-30](../../tasks/backlog/GM-30.md) |
| [GM-20](../../tasks/backlog/GM-20.md) | BLOCKED | [GM-09](../../tasks/backlog/GM-09.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-29](../../tasks/backlog/GM-29.md) |
| [GM-21](../../tasks/backlog/GM-21.md) | BLOCKED | [GM-15](../../tasks/backlog/GM-15.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-27](../../tasks/backlog/GM-27.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md) |
| [GM-22](../../tasks/backlog/GM-22.md) | BLOCKED | [GM-21](../../tasks/backlog/GM-21.md) |
| [GM-23](../../tasks/backlog/GM-23.md) | BLOCKED | [GM-22](../../tasks/backlog/GM-22.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-24](../../tasks/backlog/GM-24.md) | BLOCKED | [GM-22](../../tasks/backlog/GM-22.md) |
| [GM-25](../../tasks/backlog/GM-25.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-17](../../tasks/backlog/GM-17.md) |
| [GM-26](../../tasks/backlog/GM-26.md) | BLOCKED | [GM-22](../../tasks/backlog/GM-22.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md) |
| [GM-27](../../tasks/backlog/GM-27.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) |
| [GM-28](../../tasks/review/GM-28.md) | IN_REVIEW | — |
| [GM-29](../../tasks/backlog/GM-29.md) | BLOCKED | [GM-01](../../tasks/backlog/GM-01.md), [GM-02](../../tasks/backlog/GM-02.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-30](../../tasks/backlog/GM-30.md) | BLOCKED | [GM-01](../../tasks/backlog/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-31](../../tasks/backlog/GM-31.md) | BLOCKED | [GM-22](../../tasks/backlog/GM-22.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-30](../../tasks/backlog/GM-30.md) |

## Các lớp dependency

Đây là thứ tự topo, không phải deadline hoặc barrier toàn nhóm. Task ở lớp sau bắt đầu ngay khi dependency riêng đạt, không cần chờ task không liên quan ở lớp trước. Các task cùng lớp có thể độc lập về dependency, nhưng cùng owner/reviewer/file phải xếp ca hoặc chia lại người. Một task chính/người tại một thời điểm.

| Lớp | Tasks | Owner cần điều phối |
| --- | --- | --- |
| 0 | [GM-00](../../tasks/done/GM-00.md) | GM-00: Codex |
| 1 | [GM-28](../../tasks/review/GM-28.md) | GM-28: Codex |
| 2 | [GM-01](../../tasks/backlog/GM-01.md), [GM-03](../../tasks/backlog/GM-03.md) | GM-01: Tuấn; GM-03: Vinh |
| 3 | [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-11](../../tasks/backlog/GM-11.md) | GM-02: Trang; GM-04: Tâm; GM-11: Vinh |
| 4 | [GM-05](../../tasks/backlog/GM-05.md), [GM-27](../../tasks/backlog/GM-27.md) | GM-05: Trung; GM-27: Vinh |
| 5 | [GM-06](../../tasks/backlog/GM-06.md) | GM-06: Trí |
| 6 | [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md) | GM-29: Tuấn; GM-30: Tâm |
| 7 | [GM-08](../../tasks/backlog/GM-08.md) | GM-08: Tâm |
| 8 | [GM-07](../../tasks/backlog/GM-07.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-17](../../tasks/backlog/GM-17.md) | GM-07: Trang; GM-12: Trí; GM-17: Trung |
| 9 | [GM-09](../../tasks/backlog/GM-09.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-25](../../tasks/backlog/GM-25.md) | GM-09: Tuấn; GM-18: Tâm; GM-25: Trung |
| 10 | [GM-10](../../tasks/backlog/GM-10.md) | GM-10: Trang |
| 11 | [GM-13](../../tasks/backlog/GM-13.md) | GM-13: Trang |
| 12 | [GM-14](../../tasks/backlog/GM-14.md) | GM-14: Tuấn |
| 13 | [GM-15](../../tasks/backlog/GM-15.md), [GM-20](../../tasks/backlog/GM-20.md) | GM-15: Trung; GM-20: Tuấn |
| 14 | [GM-16](../../tasks/backlog/GM-16.md) | GM-16: Trí |
| 15 | [GM-19](../../tasks/backlog/GM-19.md) | GM-19: Vinh |
| 16 | [GM-21](../../tasks/backlog/GM-21.md) | GM-21: Vinh |
| 17 | [GM-22](../../tasks/backlog/GM-22.md) | GM-22: Trí |
| 18 | [GM-23](../../tasks/backlog/GM-23.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-26](../../tasks/backlog/GM-26.md), [GM-31](../../tasks/backlog/GM-31.md) | GM-23: Tâm; GM-24: Trung; GM-26: Trung; GM-31: Trung |

## Cặp song song đã khai báo

| Cặp task | Điều kiện |
| --- | --- |
| [GM-01](../../tasks/backlog/GM-01.md), [GM-03](../../tasks/backlog/GM-03.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-05](../../tasks/backlog/GM-05.md), [GM-27](../../tasks/backlog/GM-27.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-06](../../tasks/backlog/GM-06.md), [GM-11](../../tasks/backlog/GM-11.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-10](../../tasks/backlog/GM-10.md), [GM-12](../../tasks/backlog/GM-12.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-10](../../tasks/backlog/GM-10.md), [GM-17](../../tasks/backlog/GM-17.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-15](../../tasks/backlog/GM-15.md), [GM-18](../../tasks/backlog/GM-18.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-16](../../tasks/backlog/GM-16.md), [GM-20](../../tasks/backlog/GM-20.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-19](../../tasks/backlog/GM-19.md), [GM-20](../../tasks/backlog/GM-20.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-23](../../tasks/backlog/GM-23.md), [GM-24](../../tasks/backlog/GM-24.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-23](../../tasks/backlog/GM-23.md), [GM-26](../../tasks/backlog/GM-26.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-23](../../tasks/backlog/GM-23.md), [GM-31](../../tasks/backlog/GM-31.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |
| [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md) | Mỗi task tự đạt dependency gate; owner khác nhau; phối hợp interface/file và lịch reviewer. |

Các cặp trên là gợi ý cụ thể, không liệt kê mọi khả năng độc lập. Validator cấm khai báo song song với ancestor/descendant hoặc cùng owner. Mỗi task có checklist đầu vào và đầu ra bàn giao; không dùng mock để đóng AC tích hợp.

GM-27 data quán/giờ là P0 trước GM-30 eligibility và GM-08 room. GM-29 location/context chạy trước GM-07, tách khỏi GM-20 QR/review sau result. GM-28 review scope mới chặn mọi task triển khai food-v1; GM-00 chỉ chứng minh baseline cũ đã review. Weather/mood GM-31 và account/OCR/AI chờ GM-22.
