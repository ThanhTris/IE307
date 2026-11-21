# GM-56 — Kiểm tra test tự động phía app

Ngày chạy: 2026-11-20, máy Windows 11, Node 24. Nền: nhánh GM-55 (PR #197, chưa merge) cộng `mobile/tests/component/appEntryEdgeCases.test.tsx`. Đây là kết quả của phần test mới; kết quả thiết bị thuộc GM-58.

| Kiểm tra | Lệnh | Kết quả |
| --- | --- | --- |
| Test mới | `npx jest tests/component/appEntryEdgeCases.test.tsx` | Đạt 3/3. Lần chạy đầu trên cache lạnh có một test quá 5 giây nên test đầu có thời hạn 30 giây; chạy lại với cache ấm đạt 11 giây |
| Ghi kết quả vào bộ test case | `python scripts/test_cases.py --import-jest ... --run-id automated-jest-20261120-app-gaps` | 3 ca ghi Pass: TC-ENTRY-006, TC-UI-004, TC-PREF-010 |
| Typecheck | `npm run typecheck` | Đạt |
| Lint | `npm run lint` | Đạt, không lỗi |
| Kiến trúc | `npm run check:architecture` | Đạt |
| Bộ test case | `python scripts/test_cases.py --check` và `--check-docs` | Đạt: 194 ca, 149 ca có test tự động (tăng 3), 45 ca chưa có |
| Toàn bộ Jest | không chạy lại trong task này | Lượt đầy đủ gần nhất (1.501 test) ghi ở [GM-55 CHECKS](../GM-55/CHECKS.md); chỉ thêm 3 test độc lập, không sửa code sản phẩm |

## Phạm vi đã lấp và còn thiếu

- Đã lấp 3 ca. Danh sách, lý do các ca còn thiếu và task sẽ lấp nằm ở [AUTOMATION_GAPS_APP](../../../testing/AUTOMATION_GAPS_APP.md).
- Ca của GM-35 (đăng ký, đăng nhập, đổi mật khẩu, giới hạn khách) và các ca của GM-53, GM-54 chưa có test vì tính năng chưa merge; thêm khi các task đó hoàn tất.
- Không sửa test cũ và không đổi code sản phẩm để làm ca pass.

## Giới hạn

- `TC-UI-004` mới kiểm vùng chạm tối thiểu của hai thành phần dùng chung; cần đo tay trên thiết bị (GM-58).
- Phần regenerate `TEST_CASES.md`, `TRACEABILITY.md`, `TEST_REPORT.md` sửa file thuộc GM-55: PR này chỉ merge được sau khi GM-55 Done trên Project (merge dependency).
