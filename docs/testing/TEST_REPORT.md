# Báo cáo kết quả test case

Sinh bằng `python scripts/test_cases.py --write` từ `docs/testing/cases` và `docs/testing/results`; không sửa tay. `Not run` nghĩa là chưa có kết quả được ghi, không phải đạt.

- Tổng số test case: **194** (15 module)
- Có liên kết test tự động: **153**; chưa có: **41**
- Trạng thái: Pass 83, Fail 1, Blocked 0, Partial 10, Not run 100

## Theo module

| Module | Pass | Fail | Blocked | Partial | Not run | Tổng |
| --- | --- | --- | --- | --- | --- | --- |
| AUTH — Tài khoản và phiên | 5 | 0 | 0 | 1 | 8 | 14 |
| ENTRY — Khởi động, hướng dẫn và quyền | 5 | 0 | 0 | 0 | 1 | 6 |
| ROOM — Phòng, lobby và tham gia | 5 | 0 | 0 | 1 | 15 | 21 |
| PREF — Khẩu vị và bộ lọc | 4 | 0 | 0 | 0 | 6 | 10 |
| VOTE1 — Bình chọn vòng 1 và chờ kết quả | 11 | 0 | 0 | 3 | 8 | 22 |
| VOTE2 — Bình chọn vòng 2 | 7 | 0 | 0 | 1 | 5 | 13 |
| RES — Kết quả, Top 3 và Places | 12 | 1 | 0 | 1 | 1 | 15 |
| SOC — Bạn bè, lời mời và hộp thư | 4 | 0 | 0 | 0 | 9 | 13 |
| HIS — Lịch sử và đồng ý lưu | 5 | 0 | 0 | 0 | 5 | 10 |
| RT — Realtime, phục hồi và ngoại tuyến | 9 | 0 | 0 | 0 | 4 | 13 |
| SEC — Bảo mật và quyền riêng tư | 4 | 0 | 0 | 0 | 8 | 12 |
| DATA — Dữ liệu món ăn | 7 | 0 | 0 | 0 | 3 | 10 |
| UI — Giao diện và trợ năng | 5 | 0 | 0 | 3 | 5 | 13 |
| REL — Phát hành và nâng cấp | 0 | 0 | 0 | 0 | 12 | 12 |
| IOS — iOS | 0 | 0 | 0 | 0 | 10 | 10 |

## Theo ưu tiên

| Giá trị | Số ca |
| --- | --- |
| P0 | 146 |
| P1 | 44 |
| P2 | 4 |

## Theo loại

| Giá trị | Số ca |
| --- | --- |
| accessibility | 8 |
| boundary | 18 |
| compatibility | 5 |
| functional | 76 |
| negative | 21 |
| privacy | 11 |
| resilience | 33 |
| security | 22 |

## Theo tầng

| Giá trị | Số ca |
| --- | --- |
| api | 33 |
| component | 62 |
| e2e | 35 |
| sql | 15 |
| unit | 49 |

## Các lượt chạy đã ghi

| Lượt | Commit | Ngày | Build | Số kết quả |
| --- | --- | --- | --- | --- |
| automated-jest-20261120 | 08f3bc3 | 2026-11-20 | main 08f3bc3 + GM-55 working tree, Windows, Node v24.15.0, jest-expo | 83 |
| automated-jest-20261120-app-gaps | ab8c63f | 2026-11-20 | GM-56 tests on top of GM-55, Windows, Node v24.15.0 | 3 |
| automated-jest-20261120-rerun | 08f3bc3 | 2026-11-20 | rerun of the two result-screen suites on an idle machine, Windows, Node v24.15.0 | 3 |
| automated-python-20261120 | 08f3bc3 | 2026-11-20 | main 08f3bc3 + GM-55 working tree, Windows, Python 3.14.5 | 7 |
| qa-local-e2e-20261120 | 028ba6a | 2026-11-20 | owned GM-03 QA stack gm03qa-gm57-e2e (migrations checked in at this commit, contract dish-session-v4/roadmap-v2/GM-07.B-supplement), Windows, Node v24.15.0 | 1 |

## Ca chưa có test tự động

| ID | Tầng | Lý do |
| --- | --- | --- |
| TC-AUTH-007 | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). |
| TC-AUTH-008 | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). |
| TC-AUTH-009 | e2e |  |
| TC-AUTH-010 | api | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). |
| TC-AUTH-011 | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). |
| TC-AUTH-012 | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). |
| TC-AUTH-013 | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). |
| TC-AUTH-014 | e2e |  |
| TC-DATA-003 | unit | Chức năng thuộc GM-51 chưa có; test thêm khi GM-51 hoàn tất. |
| TC-DATA-010 | unit | Bundle kế tiếp thuộc GM-41/GM-47 chưa có; kiểm bằng scripts/dish_filter_coverage.py khi bàn giao. |
| TC-IOS-001 | e2e |  |
| TC-IOS-002 | e2e |  |
| TC-IOS-003 | e2e |  |
| TC-IOS-004 | e2e |  |
| TC-IOS-005 | e2e |  |
| TC-IOS-006 | e2e |  |
| TC-IOS-007 | e2e |  |
| TC-IOS-008 | e2e |  |
| TC-IOS-009 | e2e |  |
| TC-IOS-010 | e2e |  |
| TC-RT-005 | e2e |  |
| TC-RT-013 | e2e |  |
| TC-REL-001 | e2e |  |
| TC-REL-002 | e2e |  |
| TC-REL-005 | e2e |  |
| TC-REL-006 | e2e |  |
| TC-REL-007 | component | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). |
| TC-REL-010 | e2e |  |
| TC-REL-011 | e2e |  |
| TC-REL-012 | e2e |  |
| TC-SEC-006 | e2e | Chưa có script quét secret; bổ sung ở GM-57. |
| TC-SEC-009 | e2e |  |
| TC-SEC-010 | api | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). |
| TC-SEC-012 | e2e |  |
| TC-UI-001 | e2e |  |
| TC-UI-007 | e2e |  |
| TC-UI-010 | e2e |  |
| TC-UI-012 | e2e |  |
| TC-UI-013 | e2e |  |
| TC-VOTE1-004 | e2e |  |
| TC-VOTE1-014 | e2e |  |

## Ca Fail

| ID | Tiêu đề | Kết quả thực tế | Lỗi |
| --- | --- | --- | --- |
| TC-RES-001 | Kết quả winner và Top 3 hiển thị đúng | 2 automated test(s) fail |  |
