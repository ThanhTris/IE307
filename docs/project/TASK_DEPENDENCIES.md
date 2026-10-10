# Làm song song, merge theo dependency — food-v1

Sinh từ task bằng `python scripts/task_readiness.py --write-docs`; không sửa tay. `--check-docs` kiểm độ mới. Đây là metadata local, không phải trạng thái GitHub.

38 task sau GM-00: 34 P0 (gồm GM-01), 1 P1, 3 P2. Mã roadmap-v2 tăng theo lộ trình; mọi dependency có số nhỏ hơn task. Owner/reviewer là đề xuất; không kế thừa approval khi đổi scope.

## Hai gate khác nhau

- `start_dependencies`: đầu vào phải Done/Approved trước viết phần độc lập. Mặc định checker dùng gate start.
- `merge_dependencies`: đầu vào phải Done/Approved và có trên nhánh đích trước tích hợp/merge; luôn cộng thêm start deps. Có thể viết branch/draft PR trong khi các task này đang làm.
- `parallel_with`: cặp làm phần độc lập trên nhánh riêng, có thể có quan hệ merge trước/sau. Không được có quan hệ start trước/sau hoặc cùng owner.

```text
python scripts/task_readiness.py --task GM-20
python scripts/task_readiness.py --task GM-20 --base-ref origin/main
python scripts/task_readiness.py --task GM-20 --gate merge --base-ref origin/main
python scripts/task_readiness.py --all
```

Trước kiểm merge, cập nhật ref nhánh đích bằng fetch phù hợp remote đã xác nhận. Checker không tự fetch/merge. Nó in SHA snapshot và kiểm task/evidence của dependency trên ref đó khớp bản local được review; không chứng minh code của PR đã merge hoặc remote ref còn mới. Người merge phải kiểm PR/merge commit thực tế, ancestry, cập nhật nhánh và chạy lại integration tests.

READY_TO_CLAIM: đủ start deps, chưa nhận việc; READY_TO_START: đã nhận; IN_PROGRESS: đang làm; IN_REVIEW: chờ reviewer; DONE_REVIEWED: bản ghi review đạt, không đồng nghĩa đã merge. BLOCKED: thiếu review dependency; BLOCKED_ARTIFACTS: upstream thiếu file bàn giao/HANDOFF; BLOCKED_ON_BASE: đầu vào thiếu/khác revision trên nhánh đích; NEEDS_BASE_CHECK: metadata local đạt nhưng chưa kiểm ref đích; READY_FOR_MERGE_REVIEW: đầu vào trên ref đạt, vẫn cần reviewer của chính PR và AC/test thật. Exit 0 của --task chỉ là gate tương ứng đạt; 1 là chờ; 2 là dữ liệu/lệnh lỗi. --all exit 0 chỉ là báo cáo chạy được.

## Trạng thái hiện tại

| Task | Start | Chờ start | Merge local | Chờ merge (gồm start) |
| --- | --- | --- | --- | --- |
| [GM-00](../../tasks/done/GM-00.md) | DONE_REVIEWED | — | NEEDS_BASE_CHECK | — |
| [GM-01](../../tasks/review/GM-01.md) | IN_REVIEW | — | NEEDS_BASE_CHECK | — |
| [GM-02](../../tasks/backlog/GM-02.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) |
| [GM-03](../../tasks/backlog/GM-03.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) |
| [GM-04](../../tasks/backlog/GM-04.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) | BLOCKED | [GM-01](../../tasks/review/GM-01.md) |
| [GM-05](../../tasks/backlog/GM-05.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md) |
| [GM-06](../../tasks/backlog/GM-06.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) |
| [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md), [GM-06](../../tasks/backlog/GM-06.md) |
| [GM-08](../../tasks/backlog/GM-08.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-06](../../tasks/backlog/GM-06.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-06](../../tasks/backlog/GM-06.md) |
| [GM-09](../../tasks/backlog/GM-09.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-10](../../tasks/backlog/GM-10.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-11](../../tasks/backlog/GM-11.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-12](../../tasks/backlog/GM-12.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-13](../../tasks/backlog/GM-13.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-14](../../tasks/backlog/GM-14.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-15](../../tasks/backlog/GM-15.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-16](../../tasks/backlog/GM-16.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-03](../../tasks/backlog/GM-03.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-07](../../tasks/backlog/GM-07.md) |
| [GM-17](../../tasks/backlog/GM-17.md) | BLOCKED | [GM-06](../../tasks/backlog/GM-06.md), [GM-16](../../tasks/backlog/GM-16.md) | BLOCKED | [GM-06](../../tasks/backlog/GM-06.md), [GM-16](../../tasks/backlog/GM-16.md) |
| [GM-18](../../tasks/backlog/GM-18.md) | BLOCKED | [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-17](../../tasks/backlog/GM-17.md) | BLOCKED | [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-17](../../tasks/backlog/GM-17.md) |
| [GM-19](../../tasks/backlog/GM-19.md) | BLOCKED | [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md) | BLOCKED | [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-18](../../tasks/backlog/GM-18.md) |
| [GM-20](../../tasks/backlog/GM-20.md) | BLOCKED | [GM-15](../../tasks/backlog/GM-15.md), [GM-19](../../tasks/backlog/GM-19.md) | BLOCKED | [GM-15](../../tasks/backlog/GM-15.md), [GM-19](../../tasks/backlog/GM-19.md) |
| [GM-21](../../tasks/backlog/GM-21.md) | BLOCKED | [GM-18](../../tasks/backlog/GM-18.md), [GM-20](../../tasks/backlog/GM-20.md) | BLOCKED | [GM-18](../../tasks/backlog/GM-18.md), [GM-20](../../tasks/backlog/GM-20.md) |
| [GM-22](../../tasks/backlog/GM-22.md) | BLOCKED | [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-19](../../tasks/backlog/GM-19.md) | BLOCKED | [GM-16](../../tasks/backlog/GM-16.md), [GM-17](../../tasks/backlog/GM-17.md), [GM-19](../../tasks/backlog/GM-19.md) |
| [GM-23](../../tasks/backlog/GM-23.md) | BLOCKED | [GM-20](../../tasks/backlog/GM-20.md), [GM-22](../../tasks/backlog/GM-22.md) | BLOCKED | [GM-20](../../tasks/backlog/GM-20.md), [GM-22](../../tasks/backlog/GM-22.md) |
| [GM-24](../../tasks/backlog/GM-24.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-18](../../tasks/backlog/GM-18.md) |
| [GM-25](../../tasks/backlog/GM-25.md) | BLOCKED | [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-24](../../tasks/backlog/GM-24.md) | BLOCKED | [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-19](../../tasks/backlog/GM-19.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-24](../../tasks/backlog/GM-24.md) |
| [GM-26](../../tasks/backlog/GM-26.md) | BLOCKED | [GM-12](../../tasks/backlog/GM-12.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-25](../../tasks/backlog/GM-25.md) | BLOCKED | [GM-12](../../tasks/backlog/GM-12.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-25](../../tasks/backlog/GM-25.md) |
| [GM-27](../../tasks/backlog/GM-27.md) | BLOCKED | [GM-13](../../tasks/backlog/GM-13.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-26](../../tasks/backlog/GM-26.md) | BLOCKED | [GM-13](../../tasks/backlog/GM-13.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-26](../../tasks/backlog/GM-26.md) |
| [GM-28](../../tasks/backlog/GM-28.md) | BLOCKED | [GM-14](../../tasks/backlog/GM-14.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-25](../../tasks/backlog/GM-25.md) | BLOCKED | [GM-14](../../tasks/backlog/GM-14.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-25](../../tasks/backlog/GM-25.md) |
| [GM-29](../../tasks/backlog/GM-29.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-28](../../tasks/backlog/GM-28.md) | BLOCKED | [GM-02](../../tasks/backlog/GM-02.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-28](../../tasks/backlog/GM-28.md) |
| [GM-30](../../tasks/backlog/GM-30.md) | BLOCKED | [GM-22](../../tasks/backlog/GM-22.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-27](../../tasks/backlog/GM-27.md) | BLOCKED | [GM-22](../../tasks/backlog/GM-22.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-25](../../tasks/backlog/GM-25.md), [GM-27](../../tasks/backlog/GM-27.md) |
| [GM-31](../../tasks/backlog/GM-31.md) | BLOCKED | [GM-26](../../tasks/backlog/GM-26.md), [GM-28](../../tasks/backlog/GM-28.md) | BLOCKED | [GM-26](../../tasks/backlog/GM-26.md), [GM-28](../../tasks/backlog/GM-28.md) |
| [GM-32](../../tasks/backlog/GM-32.md) | BLOCKED | [GM-18](../../tasks/backlog/GM-18.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-31](../../tasks/backlog/GM-31.md) | BLOCKED | [GM-18](../../tasks/backlog/GM-18.md), [GM-20](../../tasks/backlog/GM-20.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-22](../../tasks/backlog/GM-22.md), [GM-23](../../tasks/backlog/GM-23.md), [GM-31](../../tasks/backlog/GM-31.md) |
| [GM-33](../../tasks/backlog/GM-33.md) | BLOCKED | [GM-08](../../tasks/backlog/GM-08.md), [GM-27](../../tasks/backlog/GM-27.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md), [GM-32](../../tasks/backlog/GM-32.md) | BLOCKED | [GM-08](../../tasks/backlog/GM-08.md), [GM-27](../../tasks/backlog/GM-27.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md), [GM-32](../../tasks/backlog/GM-32.md) |
| [GM-34](../../tasks/backlog/GM-34.md) | BLOCKED | [GM-33](../../tasks/backlog/GM-33.md) | BLOCKED | [GM-33](../../tasks/backlog/GM-33.md) |
| [GM-35](../../tasks/backlog/GM-35.md) | BLOCKED | [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-07](../../tasks/backlog/GM-07.md), [GM-28](../../tasks/backlog/GM-28.md), [GM-34](../../tasks/backlog/GM-34.md) |
| [GM-36](../../tasks/backlog/GM-36.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md), [GM-34](../../tasks/backlog/GM-34.md) |
| [GM-37](../../tasks/backlog/GM-37.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-34](../../tasks/backlog/GM-34.md) |
| [GM-38](../../tasks/backlog/GM-38.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md) | BLOCKED | [GM-04](../../tasks/backlog/GM-04.md), [GM-07](../../tasks/backlog/GM-07.md), [GM-18](../../tasks/backlog/GM-18.md), [GM-21](../../tasks/backlog/GM-21.md), [GM-34](../../tasks/backlog/GM-34.md) |

## Lớp mở khóa bắt đầu

Lớp topo không là barrier cả nhóm hay deadline. Chỉ chờ dependency của task mình. Cùng owner xếp ca; các lớp start cho phép soạn phần độc lập, không bảo đảm đã có runner/API để test thật.

| Lớp | Tasks | Owner cần điều phối |
| --- | --- | --- |
| 0 | [GM-00](../../tasks/done/GM-00.md) | GM-00: Codex |
| 1 | [GM-01](../../tasks/review/GM-01.md) | GM-01: Codex |
| 2 | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) | GM-02: Tuấn; GM-03: Trí; GM-04: Vinh |
| 3 | [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md), [GM-07](../../tasks/backlog/GM-07.md) | GM-05: Trang; GM-06: Tâm; GM-07: Trung |
| 4 | [GM-08](../../tasks/backlog/GM-08.md), [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-16](../../tasks/backlog/GM-16.md), [GM-24](../../tasks/backlog/GM-24.md), [GM-35](../../tasks/backlog/GM-35.md), [GM-36](../../tasks/backlog/GM-36.md), [GM-37](../../tasks/backlog/GM-37.md), [GM-38](../../tasks/backlog/GM-38.md) | GM-08: Vinh; GM-09: Trang; GM-10: Tuấn; GM-11: Tuấn; GM-12: Trang; GM-13: Tuấn; GM-14: Trang; GM-15: Vinh; GM-16: Trung; GM-24: Tuấn; GM-35: Trung; GM-36: Tâm; GM-37: Trung; GM-38: Trung |
| 5 | [GM-17](../../tasks/backlog/GM-17.md) | GM-17: Trí |
| 6 | [GM-18](../../tasks/backlog/GM-18.md) | GM-18: Tâm |
| 7 | [GM-19](../../tasks/backlog/GM-19.md) | GM-19: Tâm |
| 8 | [GM-20](../../tasks/backlog/GM-20.md), [GM-22](../../tasks/backlog/GM-22.md) | GM-20: Trí; GM-22: Trung |
| 9 | [GM-21](../../tasks/backlog/GM-21.md), [GM-23](../../tasks/backlog/GM-23.md) | GM-21: Tâm; GM-23: Trung |
| 10 | [GM-25](../../tasks/backlog/GM-25.md) | GM-25: Trang |
| 11 | [GM-26](../../tasks/backlog/GM-26.md), [GM-28](../../tasks/backlog/GM-28.md) | GM-26: Trang; GM-28: Trung |
| 12 | [GM-27](../../tasks/backlog/GM-27.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-31](../../tasks/backlog/GM-31.md) | GM-27: Tuấn; GM-29: Trung; GM-31: Trí |
| 13 | [GM-30](../../tasks/backlog/GM-30.md), [GM-32](../../tasks/backlog/GM-32.md) | GM-30: Tuấn; GM-32: Vinh |
| 14 | [GM-33](../../tasks/backlog/GM-33.md) | GM-33: Vinh |
| 15 | [GM-34](../../tasks/backlog/GM-34.md) | GM-34: Trí |

## Thứ tự merge / tích hợp

Lớp topo không là barrier cả nhóm hay deadline. Chỉ chờ dependency của task mình. Cùng owner xếp ca; các lớp start cho phép soạn phần độc lập, không bảo đảm đã có runner/API để test thật.

| Lớp | Tasks | Owner cần điều phối |
| --- | --- | --- |
| 0 | [GM-00](../../tasks/done/GM-00.md) | GM-00: Codex |
| 1 | [GM-01](../../tasks/review/GM-01.md) | GM-01: Codex |
| 2 | [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) | GM-02: Tuấn; GM-03: Trí; GM-04: Vinh |
| 3 | [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md) | GM-05: Trang; GM-06: Tâm |
| 4 | [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md) | GM-07: Trung; GM-08: Vinh |
| 5 | [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md), [GM-11](../../tasks/backlog/GM-11.md), [GM-12](../../tasks/backlog/GM-12.md), [GM-13](../../tasks/backlog/GM-13.md), [GM-14](../../tasks/backlog/GM-14.md), [GM-15](../../tasks/backlog/GM-15.md), [GM-16](../../tasks/backlog/GM-16.md) | GM-09: Trang; GM-10: Tuấn; GM-11: Tuấn; GM-12: Trang; GM-13: Tuấn; GM-14: Trang; GM-15: Vinh; GM-16: Trung |
| 6 | [GM-17](../../tasks/backlog/GM-17.md) | GM-17: Trí |
| 7 | [GM-18](../../tasks/backlog/GM-18.md) | GM-18: Tâm |
| 8 | [GM-19](../../tasks/backlog/GM-19.md), [GM-24](../../tasks/backlog/GM-24.md) | GM-19: Tâm; GM-24: Tuấn |
| 9 | [GM-20](../../tasks/backlog/GM-20.md), [GM-22](../../tasks/backlog/GM-22.md) | GM-20: Trí; GM-22: Trung |
| 10 | [GM-21](../../tasks/backlog/GM-21.md), [GM-23](../../tasks/backlog/GM-23.md) | GM-21: Tâm; GM-23: Trung |
| 11 | [GM-25](../../tasks/backlog/GM-25.md) | GM-25: Trang |
| 12 | [GM-26](../../tasks/backlog/GM-26.md), [GM-28](../../tasks/backlog/GM-28.md) | GM-26: Trang; GM-28: Trung |
| 13 | [GM-27](../../tasks/backlog/GM-27.md), [GM-29](../../tasks/backlog/GM-29.md), [GM-31](../../tasks/backlog/GM-31.md) | GM-27: Tuấn; GM-29: Trung; GM-31: Trí |
| 14 | [GM-30](../../tasks/backlog/GM-30.md), [GM-32](../../tasks/backlog/GM-32.md) | GM-30: Tuấn; GM-32: Vinh |
| 15 | [GM-33](../../tasks/backlog/GM-33.md) | GM-33: Vinh |
| 16 | [GM-34](../../tasks/backlog/GM-34.md) | GM-34: Trí |
| 17 | [GM-35](../../tasks/backlog/GM-35.md), [GM-36](../../tasks/backlog/GM-36.md), [GM-37](../../tasks/backlog/GM-37.md), [GM-38](../../tasks/backlog/GM-38.md) | GM-35: Trung; GM-36: Tâm; GM-37: Trung; GM-38: Trung |

## Cặp song song cụ thể

| Tasks | Điều kiện |
| --- | --- |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-03](../../tasks/backlog/GM-03.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-02](../../tasks/backlog/GM-02.md), [GM-04](../../tasks/backlog/GM-04.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-03](../../tasks/backlog/GM-03.md), [GM-04](../../tasks/backlog/GM-04.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-05](../../tasks/backlog/GM-05.md), [GM-06](../../tasks/backlog/GM-06.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-05](../../tasks/backlog/GM-05.md), [GM-07](../../tasks/backlog/GM-07.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-07](../../tasks/backlog/GM-07.md), [GM-08](../../tasks/backlog/GM-08.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-09](../../tasks/backlog/GM-09.md), [GM-10](../../tasks/backlog/GM-10.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-09](../../tasks/backlog/GM-09.md), [GM-18](../../tasks/backlog/GM-18.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-11](../../tasks/backlog/GM-11.md), [GM-12](../../tasks/backlog/GM-12.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-13](../../tasks/backlog/GM-13.md), [GM-14](../../tasks/backlog/GM-14.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-15](../../tasks/backlog/GM-15.md), [GM-16](../../tasks/backlog/GM-16.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-20](../../tasks/backlog/GM-20.md), [GM-24](../../tasks/backlog/GM-24.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-21](../../tasks/backlog/GM-21.md), [GM-22](../../tasks/backlog/GM-22.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-29](../../tasks/backlog/GM-29.md), [GM-30](../../tasks/backlog/GM-30.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-30](../../tasks/backlog/GM-30.md), [GM-31](../../tasks/backlog/GM-31.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-36](../../tasks/backlog/GM-36.md), [GM-37](../../tasks/backlog/GM-37.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |
| [GM-36](../../tasks/backlog/GM-36.md), [GM-38](../../tasks/backlog/GM-38.md) | Đạt start gate riêng; contract/version chung; nhánh/file riêng; merge theo bảng trên. |

Không liệt kê mọi cặp có thể song song. Chốt interface và file ownership trong draft PR trước viết; GM-02 UI structure / GM-03 BE structure / GM-04 fields là ba nhánh nền. GM-05 components và GM-07 client/mock có thể làm đồng thời sau đầu vào riêng; GM-08 import chờ schema GM-06. GM-09..14 màn mock nghiệm thu riêng sau components+contract, không chờ API nghiệp vụ. GM-15..23 hoàn thiện BE; GM-24..31 tích hợp UI/API/native; GM-32..34 kiểm thử và release. GM-35..38 chỉ merge sau core. GM-01 vẫn review. Mock không đóng AC native/SQL/dataset thật của task tích hợp.

[Lộ trình](IMPLEMENTATION_ROADMAP.md) · [Đầu vào/đầu ra](TASK_HANDOFFS.md) · [Workflow](TEAM_WORKFLOW.md) · [Mapping](TASK_RENUMBERING.md) · [ADR-009](../architecture/decisions/ADR-009-foundation-first-task-slicing.md).
