# Gì Cũng Được

Ứng dụng React Native giúp cặp đôi và nhóm bạn chọn món theo ba mức **Muốn ăn / Ăn được / Không ăn**, tối đa hai vòng và một kết quả chung.

**Hiện trạng:** bộ nền đề xuất và prototype tương tác; chưa có app Expo chạy được, chưa deploy backend. Không có package để `npm install` ở root. Bootstrap bắt đầu sau review bộ nền.

## Đọc trước

1. [Kế hoạch chuyển đề tài](docs/project/MIGRATION_PLAN.md), [kế hoạch 8 tuần](docs/project/PROJECT_PLAN.md).
2. [PRD](docs/product/PRODUCT_REQUIREMENTS.md), [spec index](docs/specs/README.md), [truy vết](docs/specs/TRACEABILITY.md).
3. [Prototype UI](design/prototypes/gi-cung-duoc.html), [UI spec](docs/specs/UI_SPEC.md), [design system](design/DESIGN_SYSTEM.md).
4. [Kiến trúc](docs/architecture/SYSTEM_ARCHITECTURE.md), [cấu trúc React Native](docs/project/REPOSITORY_STRUCTURE.md).
5. [Backlog](tasks/backlog/MASTER_BACKLOG.md), [sáu thành viên](docs/project/TEAM_AND_RESPONSIBILITIES.md), [AIDD](docs/project/AIDD_PROCESS.md).

```text
mobile/        Expo Router + feature modules (skeleton)
supabase/      migrations, seed, RPC/RLS tests (skeleton)
design/        design system và prototype HTML
docs/          PRD, specs, ADR, kế hoạch, kiểm thử
tasks/         backlog, review, done và mẫu task
tests/         fixture quyết định và E2E
scripts/       validator và công cụ môn học
```

Mở `design/prototypes/gi-cung-duoc.html` bằng trình duyệt hoặc chạy `python -m http.server 8765 --bind 127.0.0.1`. Prototype mô phỏng, không kết nối backend.

```powershell
python scripts/validate_repository.py
git diff --check
```

Kiểm prototype tùy chọn: `node scripts/verify_prototype.cjs` trong môi trường có Playwright/Chromium (hoặc `PROTOTYPE_PLAYWRIGHT_PATH`). [Evidence lần chuyển đề tài](docs/evidence/GM-00/VERIFICATION.md).

[Bắt đầu](docs/project/START_HERE.md). Nguồn đề tài cũ còn trong lịch sử Git (commit `6086c16`), không phải backlog hiện hành.

[Task GitHub](https://github.com/ThanhTris/IE307/issues?q=is%3Aissue+is%3Aopen+label%3A%22project%3Agi-cung-duoc%22) được gắn người phụ trách ở mức đề xuất; thành viên tự chọn cuối cùng.
