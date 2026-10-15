# GM-02 — bảo trì Expo ngày 2026-10-15

Theo yêu cầu trực tiếp của Trí: cập nhật bộ Expo và yêu cầu tooling của các task liên quan; chạy lại CI history lỗi mạng của PR #120; chưa kiểm điện thoại. Lượt triển khai/kiểm ban đầu ở local. Ngày 2026-10-16, Trí cho phép commit/push phần bảo trì lên main và cập nhật PR #120 từ main mới để kiểm lại; không ghi approval hoặc chuyển Done thay Trí.

Tiếp tục kiểm và chốt kết quả ngày 2026-10-16. Kết quả dưới đây áp dụng đúng working tree bảo trì đã nêu.

## Revision và phạm vi

- Base: main `30ecb5675104f13c64580018cad118647fb3d601` + working tree bảo trì, không phải revision PR #120.
- Môi trường: Windows, Node24.15.0, npm11.12.1. Worktree riêng; không dùng node_modules chia sẻ từ nhánh review.
- Expo57.0.29 → 57.0.30, Router57.0.27 → 57.0.28, lockfile cập nhật các dependency liên quan. React/RN và override peer giữ nguyên; không thêm native module.
- [Hướng dẫn hiện hành](../../../project/EXPO_BASELINE.md) nêu đủ task Expo Go/native/QA/release và scope API/Data/HTML không cần Expo. 21 task có link baseline trong Test plan; không đổi metadata/dependency/assignee/deadline.
- CI foundations kiểm manifest/lock/install và map SDK đã cài; kiểm remote recommendations tách thành `check:expo:latest`. Không exclude package, tắt validation hoặc bỏ qua exit code.

## Kiểm đã chạy

| Phép kiểm | Actual | Kết quả |
| --- | --- | --- |
| Cài mobile độc lập | npm install --no-audit --no-fund sinh lock; sau đó npm ci --no-audit --no-fund cài sạch lại đúng lock, 1063 packages, exit0. Có deprecated warnings từ dependency tree | Pass |
| Installed direct dependencies | npm ls --depth=0, exit0, Expo57.0.30/Router57.0.28 | Pass |
| Regression checker | npm run test:expo-baseline: 5/5 tests | Pass |
| Negative SDK case thật | Test tạo fixture tạm, Router1.0.0 khớp manifest/lock/install; CLI Expo thật báo expected ~57.0.28 và exit1 | Pass |
| Locked compatibility | npm run check:expo: Dependencies are up to date, exit0 | Pass |
| Online recommendations | npm run check:expo:latest: Dependencies are up to date, exit0 tại lượt kiểm | Pass |
| TypeScript và ESLint | Lượt npm run check đầu: typecheck/lint exit0, 4 warning cũ ở contracts.ts/api/index.ts | Pass |
| Full mobile check | Chạy lại npm run check: typecheck/lint, 14 suites/462 tests và architecture đều Pass; Jest41.725s, exit0. Lượt đầu có 1 timeout5000ms ở Home khi chạy cùng bundle/Python; giữ nguyên test và timeout khi chạy lại | Pass |
| Android export | npm run bundle:android: 1284 modules, Hermes2.9MB, 27assets, metadata, exit0 | Pass |
| Repository validator/indexes | validate_repository.py và task_readiness.py --check-docs exit0 | Pass |
| Python regression | python -m unittest discover -s tests -p "test_*.py": 550 tests, skipped6, 0 failure/error, 155.147s, exit0 | Pass |
| Git whitespace | git diff --check exit0 | Pass |
| Project start gate GM-02 | Checker đọc live: DONE_ON_PROJECT, baseline alias GM-00/#37 | Pass |
| Expo Go/device smoke | Theo yêu cầu Trí để kiểm sau; không suy từ bundle/Jest | Not run |

Negative test dùng SDK thật qua link trong thư mục fixture riêng; cleanup chỉ xóa fixture, không sửa SDK/package cài thật. Dòng CLI “Dependency validation is unreliable in offline-mode” là cảnh báo không lấy recommendations remote; negative case chứng minh bundled compatibility vẫn fail khi sai SDK.

## Chạy lại lỗi mạng PR #120

PR #120 head lúc đối chiếu: `3f396f3c3362c55db3ed6fd05113d96c5f3da585`. Đây là bằng chứng CI remote riêng, không phải output của working tree Expo mới.

- Lỗi gốc: npm ci mobile ECONNRESET trong job history, chưa chạy logic nghiệp vụ.
- Lệnh được Trí yêu cầu: `gh run rerun 38764750930 --repo ThanhTris/IE307 --failed`.
- [Attempt2](https://github.com/ThanhTris/IE307/actions/runs/38764750930/attempts/2): **success**, hoàn tất2026-10-15T16:10:25Z; npm ci, SQL privacy/consent/history/pagination/retention, JWT/mobile-client HTTP, lifecycle/ranking/finalize integration, upstream finalize/access regression, artifact và cleanup đều Pass.
- Lượt history còn lại38764750390 đã success trước đó; không cần sửa nghiệp vụ để xử lý ECONNRESET.

## Bàn giao và giới hạn

Theo chỉ định Trí ngày 2026-10-16: đưa phần bảo trì lên main trước, cập nhật PR #120 từ main, kiểm lại code/checks của revision kết hợp. Các PR khác nhận baseline package/lockfile/tooling mới rồi chạy npm ci và checks theo scope. Kết quả local trong bảng không tự thay CI remote hoặc nghiệm thu thiết bị. Không sửa kết quả lịch sử trong CHECKS cũ, reset DB hoặc tuyên bố app/API production hoàn thiện. Hướng dẫn [cài/chạy](../../../../mobile/README.md) và [baseline](../../../project/EXPO_BASELINE.md) là đầu vào consumer.
