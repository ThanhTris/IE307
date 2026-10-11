# Output checks — GM-07 / roadmap-v2

## Follow-up patch on Trung's branch

Tested code commit **`77941b56146969ec562063f7b7c9351f69d0b675`**, based on local `main` `3076c3deb2937223a007b82211a61a2d61b63c84`; branch `codex/gm-07-trung-verification`. The patch makes `createApiClient` require an explicit `real`/`mock` mode at both TypeScript and JavaScript runtime, rejects missing/undefined/null/invalid strings instead of choosing mock, and tests preservation of the loading mock's explicit 600 ms delay. It adds runtime coverage and updates the HANDOFF. This does not alter backend RPC behavior or production dependencies.

| Check | Input / expected | Actual |
| --- | --- | --- |
| `npm run check` in `mobile` | Typecheck, lint, all Jest suites, architecture guard | Pass; 6 suites / 272 tests; typecheck and architecture pass; lint 0 errors / 4 warnings. |
| `python -m unittest discover -s tests -p test_api_contract_gm07.py` | GM-07 factory contract assertion | Pass; 10/10 tests. |
| Full Python regression | `python -m unittest discover -s tests -p "test_*.py"` | 524 tests; 5 errors in `test_vilao_catalogue`, whose runner explicitly requires Linux/macOS/WSL taxonomy locking. No test failures. |
| Repository and task docs | `python scripts/validate_repository.py`; `python scripts/task_readiness.py --check-docs`; `git diff --check` | Pass. |

The mobile checks were run after the code changes and before the code commit; commit `77941b5` contains those exact tested changes. This Windows clone used Node 24.15.0/npm 11.12.1/Python 3.14.3; its 524-test full Python run had 5 taxonomy-locking errors requiring Linux/macOS/WSL and no failures. The reviewer's Python 3.12.14 environment reported one additional locale-specific GM-06 failure; neither environment has a green full Windows regression. Raw local output for the clone-level run is summarized in [CLONE_VERIFICATION_2026-10-11.md](CLONE_VERIFICATION_2026-10-11.md). Project readiness/approval, independent review and merge have not been established by these tests.

## Lượt sửa read / caller isolation hiện tại

Ngày 2026-10-11: tested code commit **`3f7f2412ed253eb67109368373e997599e916689`**, base PR `e482ccb3d9fec8051d71550a75916c9541fd2476`, target đã fetch `00c4f27a97d4f1487dfed7c54c1253c766709a1a`. [Manifest mới](read-isolation-fix/PATCH_MANIFEST.json) ghi hash code/spec/tests đã kiểm. Mobile/Python contract chạy lại trên commit này theo yêu cầu push của Trí; commit evidence tiếp theo chỉ đổi tài liệu/output. Nhánh đích PR #104: `codex/gm-07-api-contract-and-mock`; CI/review cần kiểm HEAD sau push.

Client kiểm cả 8 read DTO/array trước success; restore session lỗi không lưu token. Mock ownPreferences/ownVotes/ownSubmission theo room + caller, trả bản sao private DTO. Thêm 125 tests trong apiReadValidation.test.ts và apiMockIsolation.test.ts, giữ 141 tests trước đó.

Full mobile **6 suites / 266 tests Pass**, typecheck/architecture Pass, lint 0 errors/4 warnings cũ; [output](read-isolation-fix/MOBILE_CHECK.txt). Full Python lần này **476 tests / 1 failure + 5 errors**, đúng 6 lỗi encoding/legacy locking đã đối chiếu main ở lượt trước; [output mới](read-isolation-fix/PYTHON_REGRESSION.txt). Không báo full regression Pass. Các checks contract/repo/indexes/diff/live gate và cách tái hiện nằm trong [bàn giao lượt sửa](read-isolation-fix/README.md).

Owner/reviewer/contract/Status Project giữ nguyên; chưa có review độc lập cho patch này. Các kết quả bên dưới là **lịch sử patch write/join f0599f8 → e482ccb**, không là kết quả của code read/isolation mới.

## Lịch sử patch write / join đã push

Status: Patch verified locally — awaiting independent review; full regression has baseline failures.

Task / owner / reviewer / scope: GM-07 / Trang (@rosy179) / Trí (@ThanhTris) / API contract, client, mock. Codex hỗ trợ patch theo yêu cầu Trí; không là approval.

Tested code commit: `f0599f8c4b92bf372fc6e3e497389cd59cadf914` (base PR `67f00e6d5b7016c44895617241ab41e0aa7583f1`), xác định thêm bằng [PATCH_MANIFEST.json](PATCH_MANIFEST.json). Mobile check và Python contract chạy lại trên commit này; commit evidence tiếp theo chỉ đổi tài liệu/output. CI của HEAD push mới cần kiểm riêng.

Target: `origin/main` = `00c4f27a97d4f1487dfed7c54c1253c766709a1a`; ngày kiểm 2026-10-11 (UTC+7); nhánh local `codex/pr104-fix-plan`.

Contract API: `food-v1/roadmap-v2/GM-07.1`; adapter/dictionary GM-04 proposal `1.1.0`; schema GM-06 `0.1.0`. Dataset mock là fixture, **không phải verified dataset GM-08**. Không thêm dependency/đổi lockfile/schema.

Runtime: Windows / PowerShell, Node v24.15.0, npm 11.12.1, Python bundled 3.12.14 có tzdata, `PYTHONUTF8=1`. Node đáp ứng engines `>=22.13.0`. Mobile/full regression chạy ngoài sandbox vì sandbox chặn TEMP; không cần credential production cho contract tests.

## Input và gate

GM-02 `_layout.tsx`/`app.config.ts`, GM-03 `supabase/config.toml`, GM-04 dictionary/field coverage và GM-06 `0001_core_schema.sql` có trên nhánh, đối chiếu target SHA trên. `app.config.ts` không đổi so với target.

Live start gate trước code: `READY_TO_CLAIM` lúc 12:24:09 UTC+7. Checker hiển thị owner Trung/proposed theo task Markdown cũ, trong khi issue #68/Project giao Trang. Không tự sửa assignment/approval; quyền sửa patch đến từ yêu cầu trực tiếp của Trí. Gate merge sau patch và offline docs checks: [GATES_AND_DOCS.txt](GATES_AND_DOCS.txt). Gate chỉ kiểm đầu vào/artifact, không thay review hoặc quyền merge. PR #104 đã có đúng ở GM-07 → PR review; giữ nguyên link/Status.

## Kết quả thật

| Kiểm / AC | Input, expected, actual | Kết quả / evidence |
| --- | --- | --- |
| P1 joinRoom | Caller mới join GCD1; data/envelope cùng roomId/version; retry cùng body/ID trả ACK cũ; khác body bị REQUEST_ID_REUSED; chỉ 1 member mới và 1 lần tăng version | Pass; test cả joinRoom và acceptRoomInvite |
| P2 typed-write validation | Create/join/accept invite/auth/ballot/partner invite/room invite: flat/nested đầy đủ pass; data/field thiếu hoặc sai type/enum/timestamp/null/array/primitive → MALFORMED_RESPONSE | Pass; table theo endpoint trong apiResponseValidation.test.ts |
| Metadata / receipt | Version số nguyên an toàn >=1, state hợp lệ, room/version/requestId nhất quán; optional được vắng, receipt khi có kiểm shape/round/ID/count/votes/time | Pass; không fabricate version/state; malformed auth không đổi token |
| Void ACK | 14 writes void nhận data vắng/undefined/null, giữ metadata; metadata/data sai bị từ chối | Pass; không đòi object DTO giả |
| Public client / retry | Factory real + configured URL/defaultTimeoutMs; timeout rồi retry cùng body/requestId trên wire; ACK đúng version/state | Pass; fetch giả và Response thật, không là RPC production |
| API Jest | 18 cases cũ + 117 cases mới | 2 suites / 135 tests Pass; [API_TESTS.txt](API_TESTS.txt) |
| Ví dụ HANDOFF | Trích cả 2 fenced TypeScript snippets vào harness dùng context tsconfig mobile thực tế | Compile Pass; [HANDOFF_TYPECHECK.txt](HANDOFF_TYPECHECK.txt) |
| Full mobile check | Typecheck, lint, Jest, architecture | 4 suites / 141 tests Pass; lint 0 errors/4 warnings có sẵn; [MOBILE_CHECK.txt](MOBILE_CHECK.txt) |
| Python GM-07 | Assertions nguồn, không thay runtime/schema parity | 10/10 Pass; [PYTHON_CONTRACT.txt](PYTHON_CONTRACT.txt) |
| Full Python regression | 476 tests bằng Python 3.12.14/UTF-8 | **Fail: 1 failure + 5 errors**; [PYTHON_REGRESSION.txt](PYTHON_REGRESSION.txt). Chính 6 ca trên snapshot main cùng runtime cũng 1 failure + 5 errors; [MAIN_BASELINE.txt](MAIN_BASELINE.txt) |
| Repo/indexes/diff | Validator, check-docs, diff so target gồm patch chưa commit; base Expo diff rỗng | Pass; [GATES_AND_DOCS.txt](GATES_AND_DOCS.txt) |

Mobile cold run có 1 shell timeout 5s, 136/137 tests pass trước khi bổ sung 4 receipt cases; giữ [MOBILE_CHECK_COLD.txt](MOBILE_CHECK_COLD.txt). Chạy lại nguyên check với cache đã nạp/timeout mặc định pass; patch cuối chạy check 141 cases. Không tăng timeout/sửa shell test để che lỗi.

Full Python còn `test_fixture_under_windows_cp1252_default` thất bại khi ép UTF-8 và 5 `test_vilao_catalogue` lỗi vì locking yêu cầu Linux/macOS/WSL. Cả 6 tái hiện trên main; không ghi toàn regression Pass hoặc sửa legacy trong GM-07. Lần lập plan dùng Python 3.14.5/sandbox có thêm thiếu tzdata/TEMP/encoding; đó không phải runtime của kết quả ở đây.

## Chạy lại và giới hạn

Setup/lệnh trong [HANDOFF.md](HANDOFF.md). API: `npm test -- tests/unit/apiContract.test.ts tests/unit/apiResponseValidation.test.ts` trong mobile. Toàn mobile: `npm run check`.

Đã commit và chạy lại check trên code SHA nêu trên theo yêu cầu push của Trí. Review độc lập/CI revision mới/nghiệm thu Trí: **Not run / pending**. SQL/RLS/RPC nghiệp vụ/native/verified import ngoài scope contract GM-07; không ghi Pass từ mock.
