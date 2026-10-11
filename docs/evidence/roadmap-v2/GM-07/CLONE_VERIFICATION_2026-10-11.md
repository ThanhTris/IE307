# GM-07 — kiểm tra lại trên clone local

Ngày 2026-10-11. Kiểm tra trên Windows PowerShell sau khi clone `ThanhTris/IE307`.

## Follow-up code patch

Trên nhánh `codex/gm-07-trung-verification`, code commit `77941b56146969ec562063f7b7c9351f69d0b675` kiểm mode chính xác ở runtime: omitted/undefined/null/chuỗi sai đều throw thay vì tạo mock; `'real'`/`'mock'` hợp lệ giữ nguyên. Loading fixture với delay mặc định tối thiểu và delay 600 ms tường minh đều được test. `npm run check` pass với 6 suites / 272 tests; Python GM-07 pass 10/10. Full Python regression chạy 524 tests, có 5 lỗi do `test_vilao_catalogue` yêu cầu Linux/macOS/WSL locking. Validator, task docs và diff check pass. Chi tiết có trong [CHECKS.md](CHECKS.md).

## Revision và môi trường

- Nhánh kiểm tra: `main`; HEAD `3076c3deb2937223a007b82211a61a2d61b63c84` (đã có merge PR #104).
- Node `v24.15.0`, npm `11.12.1`, Python `3.14.3`.
- `npm ci --no-audit --no-fund` cài theo lockfile; không thay package manifest hoặc lockfile.
- Nhánh này chỉ bổ sung evidence cho lần kiểm tra local; không thay code GM-07.

## Kết quả

| Kiểm tra | Kết quả |
| --- | --- |
| `npm run check` trong `mobile` | Pass: typecheck; Jest 6 suites / 266 tests; architecture guard. Lint 0 errors, 4 warnings hiện có. |
| `python -m unittest discover -s tests -p test_api_contract_gm07.py` | Pass: 10/10 tests. |
| `python scripts/validate_repository.py` | Pass. |
| `python scripts/task_readiness.py --check-docs` | Pass: task indexes khớp metadata. |

Lượt `npm run check` lạnh đầu tiên timeout bài test shell ở giới hạn 5 giây (265/266); chạy lại sau đó pass đầy đủ 266/266. Không chạy full Python regression suite trong lần kiểm tra này.

## Giới hạn

Đây là kiểm tra local trên Windows, không phải review độc lập hoặc xác nhận nghiệm thu/Done. `python scripts/task_readiness.py --task GM-07` không xác minh được trạng thái Project vì truy vấn GitHub Project bị từ chối (`BLOCKED_PROJECT_UNVERIFIED`). Các test contract/mock không xác nhận RPC nghiệp vụ, SQL/RLS hoặc hành vi native production.
