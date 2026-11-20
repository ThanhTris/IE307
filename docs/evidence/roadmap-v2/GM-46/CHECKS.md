# GM-46 — Kiểm cờ lịch sử gần đây

Baseline `0174746`, migration `0062`, schema `0.31.7`. QA owned `gm46-final-1120` ngày 20/11/2026, Auth + REST + worker. Lệnh tái hiện trong [HANDOFF](HANDOFF.md).

| Kiểm | Kết quả |
| --- | --- |
| Auth/REST | 12 assertion đạt. Cờ tắt khi chưa có kết quả, chỉ có NO_CONSENSUS, đã xóa, hết hạn hoặc tắt consent. Cờ bật khi có món thắng còn hạn của chính người gọi. Tài khoản khác giữ kết quả riêng. Baseline không có cờ. |
| Mobile | Typecheck, lint, architecture và 74 test liên quan đạt. Setup dùng cờ cho phòng mới và host, giữ ô tắt khi thiếu cờ hoặc sai kiểu và bỏ lượt đọc lịch sử. |
| Android AVD | API 37, Expo Go và stack QA `gm46-final-1120`. Đăng nhập khách mới rồi vào Tạo phòng qua Home. UI Automator xác nhận ô Ưu tiên món khác 3 bữa gần đây ở trạng thái unchecked và disabled, hiện thông báo cần lịch sử. [Ảnh AVD](avd-no-recent-history.png) |
| Worker | Sealed QA đã áp migration và worker khởi động sau khi xác minh hash của RPC và wrapper. |
| Repository | Validator, kiểm chỉ mục task, 19 test backend tooling và 9 test contract v4 đạt. |
| Gate merge | `READY_FOR_MERGE_REVIEW` trên `origin/main` sau khi fetch. |

Regression Python chạy 720 ca trên Windows. Hai failure và hai error liên quan cấu hình Git của tiến trình, quyền symlink và ký tự phân cách đường dẫn của catalogue GM-41. Bốn ca này đã đạt khi chạy lại riêng. Hai ca Git chạy trên Windows với cấu hình Git tiến trình đã bỏ, hai ca symlink và catalogue chạy trên WSL.
