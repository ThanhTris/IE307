# PR104 — read validation / caller isolation follow-up

2026-10-11 UTC+7. Owner Trang / reviewer Trí; Codex hỗ trợ theo yêu cầu trực tiếp Trí sau review trong chat main. API contract `food-v1/roadmap-v2/GM-07.1`; scope GM-07 giữ nguyên. Start gate live trước code READY_TO_CLAIM lúc 16:01:53 UTC+7; dependency source GitHub Project #2, không dùng cache/local thay approval.

Tested code commit: **`3f7f2412ed253eb67109368373e997599e916689`** trên base PR `e482ccb3d9fec8051d71550a75916c9541fd2476`, target origin/main đã fetch `00c4f27a97d4f1487dfed7c54c1253c766709a1a`. [PATCH_MANIFEST.json](PATCH_MANIFEST.json) định danh byte hash code/spec/tests thực tế. Mobile/Python contract chạy lại trên commit này theo yêu cầu push của Trí; commit evidence tiếp theo chỉ đổi tài liệu/output. Nhánh đích PR104: `codex/gm-07-api-contract-and-mock`. [Plan bổ sung](../PR104_FIX_PLAN.md); [CHECKS](../CHECKS.md); [HANDOFF](../HANDOFF.md).

## Thay đổi và tái hiện

| Ca trước sửa | Kết quả mới / kiểm hành vi |
| --- | --- |
| getRoomSnapshot nhận `42` và friends nhận `{ok:true,data:{}}` vẫn success | MALFORMED_RESPONSE; mọi read endpoint kiểm shape, nested field, từng array item |
| restoreSession nhận user thiếu field rồi lưu token | MALFORMED_RESPONSE; token null hoặc token cũ giữ nguyên; user hợp lệ mới lưu supplied token |
| Caller A submit, đổi sang B thấy votes/receipt của A | B ownVotes vắng/ownSubmission null; đổi lại A giữ đúng dữ liệu; shared version/result vẫn giống nhau |
| Preferences chung phòng; cùng requestId giữa caller; hai phòng/vòng | Preferences/receipt/votes tách theo roomId chuẩn + userId; retry của từng caller giữ ACK của họ |
| Request/ACK/snapshot private object bị sửa từ bên ngoài | Dữ liệu own lưu trong mock không bị mutation của object đã trả/đã nhận |

Bare DTO/array và `{ok:true,data:...}` hợp lệ vẫn success; optional có thể vắng, nullable đúng contract, array rỗng hợp lệ. Error codes hợp lệ giữ nguyên, mã lạ UNKNOWN_ERROR. Public ApiClient/DTO không đổi, không package/lockfile/schema/Expo config mới.

## Kiểm tra thực tế

Windows PowerShell; Node 24.15.0/npm 11.12.1; Python bundled 3.12.14 có tzdata, PYTHONUTF8=1. Jest/regression chạy với TEMP có quyền ghi. Không tăng timeout Jest.

- [MOBILE_CHECK.txt](MOBILE_CHECK.txt): typecheck, lint (0 errors/4 warnings có sẵn), 6 suites/266 tests và architecture Pass. Gồm 141 tests trước + 125 mới. Lần đầu fixture test dùng mã SESSION_EXPIRED không có trong contract bị 8 assertion fail; đã đổi đúng AUTH_REQUIRED, full check cuối pass.
- [PYTHON_CONTRACT.txt](PYTHON_CONTRACT.txt): 10 source contract tests Pass, không thay runtime tests.
- [PYTHON_REGRESSION.txt](PYTHON_REGRESSION.txt): 476 tests, 1 failure + 5 errors; chạy trước commit trên đúng code/spec/test hashes trong manifest, không đổi source khi commit. Đúng các ca trong [baseline main cùng runtime](../MAIN_BASELINE.txt): test_gm06_schema_runner encoding probe khi UTF-8 và 5 test_vilao_catalogue yêu cầu Linux/macOS/WSL locking. Không có failure/error mới, không gọi full suite Pass.
- [DOCS_AND_DIFF.txt](DOCS_AND_DIFF.txt): repository validator, task indexes và diff checks Pass.
- [MERGE_GATE.txt](MERGE_GATE.txt): kiểm live dependencies/artifacts sau fetch; không là approval hoặc quyền merge.

## Chạy lại tại checkout chứa patch

```powershell
Set-Location 'C:\Users\ADMIN\.codex\worktrees\b952\Project'
$env:PYTHONUTF8 = '1'
Push-Location mobile
npm test -- tests/unit/apiReadValidation.test.ts tests/unit/apiMockIsolation.test.ts
npm run check
Pop-Location
python -m unittest discover -s tests -p test_api_contract_gm07.py
python scripts/validate_repository.py
python scripts/task_readiness.py --check-docs
git diff origin/main --check
git diff --check
```

Expected mới: targeted 125 tests; full mobile 266 tests; Python contract 10 tests; validator/indexes/diff exit 0. Có thể dùng Python bundled như output đã chạy: `C:\Users\ADMIN\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe`. Full regression: `python -m unittest discover -s tests -p 'test_*.py'`, lưu và đối chiếu lỗi như trên.

Mock consensus vẫn mô phỏng peer submissions để chạy UI; privacy isolation này chỉ cho own projection, không chứng minh ACL/RLS/production decision engine. SQL/RPC/native/verified import nằm ở task sau. Review độc lập và CI trên HEAD sau push cần kiểm riêng. Không đăng comment, không đổi Project Status/Done hoặc merge; link PR104 đã có đúng GM-07 được giữ.
