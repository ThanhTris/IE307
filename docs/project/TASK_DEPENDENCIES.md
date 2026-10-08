# Làm song song, merge theo dependency — food-v1

Sinh từ task bằng `python scripts/task_readiness.py --write-docs`; không sửa tay. `--check-docs` kiểm độ mới. Đây là metadata local, không phải trạng thái GitHub.

31 task sau GM-00: 27 P0 (gồm GM-01), 1 P1, 3 P2. Mã roadmap-v1 tăng theo lộ trình; mọi dependency có số nhỏ hơn task. Không đổi owner/priority/approval.

## Hai gate khác nhau

- `start_dependencies`: đầu vào phải Done/Approved trước viết phần độc lập. Mặc định checker dùng gate start.
- `merge_dependencies`: đầu vào phải Done/Approved và có trên nhánh đích trước tích hợp/merge; luôn cộng thêm start deps. Có thể viết branch/draft PR trong khi các task này đang làm.
- `parallel_with`: cặp làm phần độc lập trên nhánh riêng, có thể có quan hệ merge trước/sau. Không được có quan hệ start trước/sau hoặc cùng owner.

```text
python scripts/task_readiness.py --task GM-20
python scripts/task_readiness.py --task GM-20 --gate merge --base-ref origin/main
python scripts/task_readiness.py --all
```

Trước kiểm merge, cập nhật ref nhánh đích bằng fetch phù hợp remote đã xác nhận. Checker không tự fetch/merge. Nó in SHA snapshot và kiểm task/evidence của dependency trên ref đó khớp bản local được review; không chứng minh code của PR đã merge hoặc remote ref còn mới. Người merge phải kiểm PR/merge commit thực tế, ancestry, cập nhật nhánh và chạy lại integration tests.

READY_TO_CLAIM: đủ start deps, chưa nhận việc; READY_TO_START: đã nhận; IN_PROGRESS: đang làm; IN_REVIEW: chờ reviewer; DONE_REVIEWED: bản ghi review đạt, không đồng nghĩa đã merge. BLOCKED: thiếu review dependency; BLOCKED_ON_BASE: đầu vào thiếu/khác revision trên nhánh đích; NEEDS_BASE_CHECK: metadata local đạt nhưng chưa kiểm ref đích; READY_FOR_MERGE_REVIEW: đầu vào trên ref đạt, vẫn cần reviewer của chính PR và AC/test thật. Exit 0 của --task chỉ là gate tương ứng đạt; 1 là chờ; 2 là dữ liệu/lệnh lỗi. --all exit 0 chỉ là báo cáo chạy được.

## Trạng thái hiện tại

| Task | Start | Chờ start | Merge local | Chờ merge (gồm start) |
| --- | --- | --- | --- | --- |
| [GM-00](../../tasks/done/GM-00.md) | DONE_REVIEWED | — | NEEDS_BASE_CHECK | — |
| [GM-01](../../tasks/review/GM-01.md) | IN_REVIEW | — | NEEDS_BASE_CHECK | — |
| [GM-02](../../tasks/backlog/GM-02.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) |
| [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) |
| [GM-04](../../tasks/backlog/GM-04.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-02](../../tasks/backlog/GM-02.md) |
| [GM-05](../../tasks/backlog/GM-05.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md) |
| [GM-06](../../tasks/backlog/GM-06.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md) |
| [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-02](../../tasks/backlog/GM-02.md), [GM-05](../../tasks/backlog/GM-05.md) |
| [GM-08](../../tasks/backlog/GM-08.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md), [GM-05](../../tasks/backlog/GM-05.md) |
| [GM-09](../../tasks/backlog/GM-09.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-10](../../tasks/backlog/GM-10.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-09](../../tasks/backlog/GM-09.md) |
| [GM-11](../../tasks/backlog/GM-11.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-09](../../tasks/backlog/GM-09.md) |
| [GM-12](../../tasks/backlog/GM-12.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-11](../../tasks/backlog/GM-11.md) |
| [GM-13](../../tasks/backlog/GM-13.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-12](../../tasks/backlog/GM-12.md) |
| [GM-14](../../tasks/backlog/GM-14.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-12](../../tasks/backlog/GM-12.md) |
| [GM-15](../../tasks/backlog/GM-15.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-12](../../tasks/backlog/GM-12.md) |
| [GM-16](../../tasks/backlog/GM-16.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md) |
| [GM-17](../../tasks/backlog/GM-17.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-14](../../tasks/backlog/GM-14.md) |
| [GM-18](../../tasks/backlog/GM-18.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-15](../../tasks/backlog/GM-15.md) |
| [GM-19](../../tasks/backlog/GM-19.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md) |
| [GM-20](../../tasks/backlog/GM-20.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-19](../../tasks/backlog/GM-19.md) |
| [GM-21](../../tasks/backlog/GM-21.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-20](../../tasks/backlog/GM-20.md) |
| [GM-22](../../tasks/backlog/GM-22.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-21](../../tasks/backlog/GM-21.md) |
| [GM-23](../../tasks/backlog/GM-23.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-21](../../tasks/backlog/GM-21.md) |
| [GM-24](../../tasks/backlog/GM-24.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-22](../../tasks/backlog/GM-22.md) |
| [GM-25](../../tasks/backlog/GM-25.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-24](../../tasks/backlog/GM-24.md) |
| [GM-26](../../tasks/backlog/GM-26.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-25](../../tasks/backlog/GM-25.md) |
| [GM-27](../../tasks/backlog/GM-27.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-26](../../tasks/backlog/GM-26.md) |
| [GM-28](../../tasks/backlog/GM-28.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-29](../../tasks/backlog/GM-29.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-30](../../tasks/backlog/GM-30.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-31](../../tasks/backlog/GM-31.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-27](../../tasks/backlog/GM-27.md) |

## Lớp mở khóa bắt đầu

Lớp topo không là barrier cả nhóm hay deadline. Chỉ chờ dependency của task mình. Cùng owner xếp ca; các lớp start cho phép soạn phần độc lập, không bảo đảm đã có runner/API để test thật.

| Lớp | Tasks | Owner cần điều phối |
| --- | --- | --- |
| 0 | [GM-00](../../tasks/done/GM-00.md) | GM-00: Codex |
| 1 | [GM-01](../../tasks/review/GM-01.md) | GM-01: Codex |
| 2 | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-26](../../tasks/backlog/GM-26.md), [GM-27](../../tasks/backlog/GM-27.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md) | GM-02: Tuấn; GM-03: Vinh; GM-04: Trang; GM-07: Trung; GM-09: Trí; GM-10: Tuấn; GM-12: Tâm; GM-13: Trang; GM-14: Trí; GM-15: Trung; GM-16: Tuấn; GM-17: Tâm; GM-18: Trung; GM-19: Trang; GM-20: Trang; GM-21: Tuấn; GM-22: Trung; GM-23: Tuấn; GM-24: Trí; GM-25: Vinh; GM-26: Vinh; GM-27: Trí; GM-28: Trung; GM-29: Tâm; GM-30: Trung; GM-31: Trung |
| 3 | [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-11](../../tasks/backlog/GM-11.md) | GM-05: Tâm; GM-06: Vinh; GM-08: Vinh; GM-11: Tâm |

## Thứ tự merge / tích hợp

Lớp topo không là barrier cả nhóm hay deadline. Chỉ chờ dependency của task mình. Cùng owner xếp ca; các lớp start cho phép soạn phần độc lập, không bảo đảm đã có runner/API để test thật.

| Lớp | Tasks | Owner cần điều phối |
| --- | --- | --- |
| 0 | [GM-00](../../tasks/done/GM-00.md) | GM-00: Codex |
| 1 | [GM-01](../../tasks/review/GM-01.md) | GM-01: Codex |
| 2 | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md) | GM-02: Tuấn; GM-03: Vinh |
| 3 | [GM-04](../../tasks/backlog/GM-04.md), [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md) | GM-04: Trang; GM-05: Tâm; GM-06: Vinh |
| 4 | [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md) | GM-07: Trung; GM-08: Vinh |
| 5 | [GM-09](../../tasks/backlog/GM-09.md) | GM-09: Trí |
| 6 | [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md) | GM-10: Tuấn; GM-11: Tâm |
| 7 | [GM-12](../../tasks/backlog/GM-12.md) | GM-12: Tâm |
| 8 | [GM-13](../../tasks/backlog/GM-13.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-15](../../tasks/backlog/GM-15.md) | GM-13: Trang; GM-14: Trí; GM-15: Trung |
| 9 | [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md) | GM-16: Tuấn; GM-17: Tâm; GM-18: Trung |
| 10 | [GM-19](../../tasks/backlog/GM-19.md) | GM-19: Trang |
| 11 | [GM-20](../../tasks/backlog/GM-20.md) | GM-20: Trang |
| 12 | [GM-21](../../tasks/backlog/GM-21.md) | GM-21: Tuấn |
| 13 | [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md) | GM-22: Trung; GM-23: Tuấn |
| 14 | [GM-24](../../tasks/backlog/GM-24.md) | GM-24: Trí |
| 15 | [GM-25](../../tasks/backlog/GM-25.md) | GM-25: Vinh |
| 16 | [GM-26](../../tasks/backlog/GM-26.md) | GM-26: Vinh |
| 17 | [GM-27](../../tasks/backlog/GM-27.md) | GM-27: Trí |
| 18 | [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md) | GM-28: Trung; GM-29: Tâm; GM-30: Trung; GM-31: Trung |

## Cặp song song cụ thể

| Tasks | Điều kiện |
| --- | --- |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-07](../../tasks/backlog/GM-07.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-09](../../tasks/backlog/GM-09.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-03](../../tasks/backlog/GM-03.md), [GM-07](../../tasks/backlog/GM-07.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-03](../../tasks/backlog/GM-03.md), [GM-09](../../tasks/backlog/GM-09.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-04](../../tasks/backlog/GM-04.md), [GM-05](../../tasks/backlog/GM-05.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-04](../../tasks/backlog/GM-04.md), [GM-09](../../tasks/backlog/GM-09.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-05](../../tasks/backlog/GM-05.md), [GM-08](../../tasks/backlog/GM-08.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-06](../../tasks/backlog/GM-06.md), [GM-09](../../tasks/backlog/GM-09.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-07](../../tasks/backlog/GM-07.md), [GM-09](../../tasks/backlog/GM-09.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-08](../../tasks/backlog/GM-08.md), [GM-10](../../tasks/backlog/GM-10.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-08](../../tasks/backlog/GM-08.md), [GM-11](../../tasks/backlog/GM-11.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-14](../../tasks/backlog/GM-14.md), [GM-19](../../tasks/backlog/GM-19.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-14](../../tasks/backlog/GM-14.md), [GM-20](../../tasks/backlog/GM-20.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-15](../../tasks/backlog/GM-15.md), [GM-19](../../tasks/backlog/GM-19.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-17](../../tasks/backlog/GM-17.md), [GM-22](../../tasks/backlog/GM-22.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-20](../../tasks/backlog/GM-20.md), [GM-21](../../tasks/backlog/GM-21.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-23](../../tasks/backlog/GM-23.md), [GM-24](../../tasks/backlog/GM-24.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-23](../../tasks/backlog/GM-23.md), [GM-25](../../tasks/backlog/GM-25.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-29](../../tasks/backlog/GM-29.md), [GM-31](../../tasks/backlog/GM-31.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |

Không liệt kê mọi cặp có thể song song. Chốt interface và file ownership trong draft PR trước viết; mock không đóng AC native/SQL/dataset thật. GM-01 vẫn review, không tự mở khóa scope food-v1. GM-03 chốt taxonomy/templates trước GM-05, GM-06, GM-08, GM-11. GM-08 có thể khảo sát trong lúc GM-05 làm schema; GM-11 viết pure rules cùng GM-08 nhưng nghiệm thu query trên data thật phải chờ. Các cặp GM-12 với GM-13, GM-14 với GM-20, GM-20 với GM-21 được viết song song, merge theo chuỗi tích hợp. GM-28, GM-29, GM-30, GM-31 có thể soạn isolated draft khi đủ start gate và còn người; merge vẫn sau GM-27, không lấy nguồn lực P0 mặc định.

[Workflow và kiểm merge thực tế](TEAM_WORKFLOW.md) · [Mã cũ–mới](TASK_RENUMBERING.md) · [Hai gate](../architecture/decisions/ADR-006-parallel-start-ordered-merge.md) · [Quy tắc đánh số](../architecture/decisions/ADR-007-task-roadmap-numbering.md).
