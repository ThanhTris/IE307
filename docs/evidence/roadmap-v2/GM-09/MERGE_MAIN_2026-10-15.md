# GM-09 — kiểm tra hòa giải merge main, 2026-10-15

Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`). Theo yêu cầu xử lý conflict trong cuộc hội thoại hiện tại. Contract GM-09.1 không đổi; không tự Approved/Done hoặc cập nhật Project.

## Revision và scope

- Branch: `codex/gm-09-home-create-and-join-room`.
- HEAD trước merge: `606f040`; main/MERGE_HEAD: `ce7b87a2d7510b40fac843ba4657f9bc87a38146`. `git fetch origin main` xác nhận ref vẫn khớp phiên merge.
- Tested revision: hai commit trên cộng các thay đổi hòa giải đang staged; chưa có merge commit.
- `mobile/src/app/index.tsx`: giữ Home/preview và callbacks tạo/vào/phục hồi phòng GM-09.
- `mobile/src/app/shell.tsx`: nhận callbacks GM-12/16 từ main, giữ điều kiện `__DEV__` và `EXPO_PUBLIC_GM16_INTERNAL=true` của GM-16.
- `mobile/tests/integration/routes.test.tsx`: kết hợp routes/tests hai nhánh; test GM-12 mở từ `/shell`.
- `mobile/src/features/rooms/services/roomEntry.ts`: bổ sung copy `NOT_RECIPIENT` / `INVITE_CANCELLED` theo ErrorCode mới từ main, sửa lỗi TypeScript phát hiện sau merge. Không sửa DTO hoặc logic nghiệp vụ.
- `npm ci` dùng lockfile vừa nhận từ main; không sửa thêm package/lockfile. `GM-09-report.md` được giữ nguyên ngoài staging.

## Kiểm tra thực tế

Windows PowerShell, Node24.20.0/npm11.19.0; Python Windows CPython3.14.7. `tzdata2026.5` chỉ cài tại `.work/python-test-deps` được ignore, đặt PYTHONPATH cho tiến trình regression; không thêm dependency vào dự án.

| Lệnh / expected | Actual | Kết quả |
| --- | --- | --- |
| `task_readiness.py --task GM-09` đọc Project live | `READY_TO_CLAIM`, kiểm lúc `2026-10-15T09:24:04.879538+00:00` | Pass gate dependency; không thay assignment/approval |
| `task_readiness.py --task GM-09 --gate merge --base-ref origin/main` sau fetch | `READY_FOR_MERGE_REVIEW`, kiểm lúc `2026-10-15T09:24:52.829809+00:00` | Pass gate; chưa thay review thực tế |
| `cd mobile; npm ci --no-audit --no-fund` | Exit0; cài đúng lockfile upstream | Pass |
| `cd mobile; npm run check` | Typecheck, eslint, 14 suites / 448 tests và architecture guard đạt; Jest36.57s; 4 lint warnings ở contracts.ts/index.ts hiện có | Pass |
| `python -m unittest discover -s tests -p 'test_*.py'` | 550 tests / 92.443s, OK (skipped=6), exit0 | Pass với 6 ca skipped theo suite |
| `python scripts/validate_repository.py` | Docs/links/JSON/manifest/dependencies/traceability OK | Pass |
| `python scripts/task_readiness.py --check-docs` | Task indexes match task metadata | Pass |
| `git diff --name-only --diff-filter=U` sau stage các file code | Không còn unmerged path | Pass |
| `git diff --cached --check` giới hạn bốn file code hòa giải | Không có lỗi whitespace | Pass |
| `git diff --cached --check` toàn bộ merge | Có trailing whitespace tại `scripts/gm21_lifecycle_check.mjs:200`, xác nhận đã có trong `origin/main`; không sửa file ngoài scope | Warning kế thừa main, không phải conflict |
| Expo Go/device/API/native smoke | Không chạy trong lượt hòa giải; không dùng Jest làm bằng chứng native | Not run |

Lượt thử Python MinGW trong sandbox thất bại do quyền fixture trong Temp và timezone data; không dùng làm kết quả cuối. Regression được chạy lại bằng Python Windows với quyền thư mục tạm và tzdata, đạt kết quả ở bảng. GitHub Project được đọc bằng credential hiện có qua gh ngoài sandbox; token chỉ ở bộ nhớ tiến trình, không lưu vào evidence.

## Hoàn tất trên máy

Các file hòa giải được stage riêng, không dùng `git add -A`; các thay đổi main tự merge đã stage trước đó được giữ lại. Người dùng kiểm staged diff rồi chạy `git merge --continue` để tạo merge commit. Không cần chạy lại `git merge origin/main` khi phiên merge hiện tại chưa hoàn tất. Chưa push, chưa nghiệm thu task hoặc chuyển Done.
