# Plan sửa lỗi PR #104 — GM-07

Ngày lập: 2026-10-11 (UTC+7). Trạng thái: plan đề xuất, chưa sửa code, chưa nghiệm thu.

Đã thực hiện patch local theo yêu cầu tiếp theo của Trí ngày 2026-10-11; kết quả hiện hành ở [CHECKS.md](CHECKS.md) và [HANDOFF.md](HANDOFF.md). Baseline dưới đây giữ làm lịch sử lần lập plan, không là kết quả sau sửa.

## Revision và căn cứ

- PR: https://github.com/ThanhTris/IE307/pull/104; task roadmap-v2 GM-07 / issue #68.
- HEAD đã fetch và checkout: `67f00e6d5b7016c44895617241ab41e0aa7583f1`.
- Target đã fetch: `origin/main` = `00c4f27a97d4f1487dfed7c54c1253c766709a1a`.
- Nhánh local để chuẩn bị: `codex/pr104-fix-plan`, xuất phát đúng HEAD PR; không merge main vào PR.
- Đã đọc cả 6 issue comments và review summary; API inline review comments trả danh sách rỗng.
- Căn cứ chính: [comment review mới nhất](https://github.com/ThanhTris/IE307/pull/104#issuecomment-6105731584), phần B/C/D. Các comment trước dùng để giữ regression coverage, không coi mọi lỗi cũ vẫn còn.
- Scope/version: contract/client/mock của `food-v1/roadmap-v2/GM-07.1`; spec `docs/architecture/API_CONTRACT.md`, DTO `mobile/src/data/api/contracts.ts`, dictionary GM-04 và schema GM-06.
- Issue/Project hiện giao Trang (@rosy179), reviewer Trí (@ThanhTris). Task Markdown ở HEAD vẫn ghi owner Trung/proposed; đây là lệch metadata cần đối chiếu khi nhận việc, không tự sửa assignment hoặc tạo approval. Nếu Trí trực tiếp viết patch, cần reviewer khác Trí trước nghiệm thu.

## Baseline đã kiểm trong lần lập plan

| Kiểm tra | Kết quả và giới hạn |
| --- | --- |
| Git HEAD / target | Khớp hai SHA trên; workspace sạch trước khi thêm plan |
| Mobile CI hiện tại | 2 checks mobile FAIL; log CI job `114393283209` báo `mock.ts(727,9): TS2552 Cannot find name 'roomId'` |
| Đọc `joinRoom()` | `data.roomId` dùng biến không khai báo; envelope bên ngoài đã dùng `room.roomId`; mutation xảy ra trước khi tạo response |
| Đọc write normalizer | `ok:true` dẫn tới cast `dataPayload as T`, chưa kiểm required fields của endpoint |
| API Jest coverage hiện có | Có 18 khai báo `it`; chưa có test joinRoom trực tiếp hoặc malformed-success trong comment C. 24 là tổng mobile được reviewer báo, không phải 24 case riêng API |
| Python GM-07 | `python -m unittest discover -s tests -p test_api_contract_gm07.py`: 10/10 PASS; các assertion nguồn không thay runtime validation |
| Repo validator / indexes | PASS trong lần lập plan |
| Full Python regression local | 476 tests / 77.820s: FAIL, 163 failures, 42 errors, 6 skipped. Output có thiếu `tzdata`, PermissionError với sandbox TEMP và lỗi charmap; chưa đối chiếu main trên cùng runtime này, không kết luận số lỗi mới của PR |
| Live start gate | `READY_TO_CLAIM`, đọc Project lúc 12:17:34 UTC+7; không là xác nhận assignment accepted |
| Live merge gate | `READY_FOR_MERGE_REVIEW`, đọc Project lúc 12:17:41 UTC+7; không là approval hoặc chứng minh code pass |
| Expo base artifact | `git diff origin/main HEAD -- mobile/app.config.ts` rỗng |
| Diff toàn PR | FAIL whitespace: HANDOFF dòng 3–6, Python test dòng 31/66 |
| Mobile checks local | Not run: workspace chưa có `mobile/node_modules`; chưa cài dependency trong lần lập plan. Log CI là bằng chứng typecheck fail trên HEAD đã nêu |
| Runtime local | Windows / PowerShell; Node v24.15.0, npm 11.12.1, Python 3.14.5; Node đáp ứng engines `>=22.13.0` |

Link `<a href="https://github.com/ThanhTris/IE307/pull/104">PR #104</a>` đã có đúng ở GM-07 → PR review trên Project #2; đã đọc kiểm lại, không thêm trùng, không đổi Status.

## 1. Sửa joinRoom và khóa regression — P1

Files: `mobile/src/data/api/mock.ts`, `mobile/tests/unit/apiContract.test.ts`.

1. Sửa đúng field `data.roomId` thành `roomId: room.roomId`; giữ helper idempotency và thứ tự lookup trước kiểm state/version.
2. Test join code `GCD1` bằng caller mới: tạo mock, sau đó `setCurrentUser()` sang user chưa nằm trong roster. Không chỉ join bằng host đã có sẵn, vì ca đó không kiểm được thêm member.
3. Assert promise không reject, `ok === true`, requestId giữ nguyên, `data.roomId === envelope.roomId === 'room_mock_001'`, code/memberId đúng, `data.version === envelope.version` và snapshot sau join đúng.
4. Retry nguyên requestId/body: ACK deep-equal lần đầu, member chỉ xuất hiện một lần, version chỉ tăng ở lần join đầu. Thêm cùng ID khác displayName → `REQUEST_ID_REUSED`, không mutation.
5. Kiểm đường `acceptRoomInvite()` vì đang delegate `joinRoom()`: gọi invitation fixture hiện được mock hỗ trợ, assert cùng response contract và retry không mutation. Không triển khai toàn bộ invite business logic ở bước này.

Đạt khi test join/retry/invite pass và typecheck không còn TS2552; không đổi scaffold GM-02 hoặc luật phòng.

## 2. Kiểm response theo endpoint trước success — P2

Files: `mobile/src/data/api/client.ts`, `mobile/tests/unit/apiContract.test.ts`; có thể thêm `mobile/src/data/api/responseGuards.ts` nếu giúp tách guards rõ. Spec response cập nhật tại `docs/architecture/API_CONTRACT.md`.

1. Giữ validation envelope đã có: object, boolean `ok`, business error còn là lỗi. Đầu vào decoder là `unknown`; dùng type guards nhỏ, không thêm package/schema engine và không dựa vào generic cast để chứng minh JSON hợp lệ.
2. Cho write normalizer nhận guard/decoder phù hợp endpoint. Chỉ unwrap và trả `ok:true` sau khi payload đạt guard. Guard fail → `MALFORMED_RESPONSE`, giữ requestId để caller truy vết, không tự điền định danh/version/state.
3. Giữ tương thích success flat vì test hiện có dùng dạng này; flat và nested phải qua cùng guard. Dùng sự hiện diện của key `data` để phân biệt: `data:null` hoặc data sai không được fallback sang flat để che lỗi.
4. Validate metadata nếu server gửi: roomId/requestId đúng kiểu, version là số nguyên hữu hạn hợp lệ, state nằm trong RoomState. Field optional được phép vắng; không mặc nhiên biến optional thành required. Metadata và payload trùng roomId/version phải nhất quán; reject khi mâu thuẫn.
5. Rà tất cả write trả dữ liệu theo bảng dưới, cập nhật fixtures cũ thành response hợp lệ đầy đủ. Wrapper chỉ derive envelope từ dữ liệu server đã validate.

| Endpoint | Payload required theo DTO hiện hành |
| --- | --- |
| createGuestSession | token, user (id/displayName/isGuest/createdAt), expiresAt; chỉ lưu token sau decode hợp lệ |
| createRoom | roomId/code là string không rỗng, version số nguyên hữu hạn hợp lệ, expiresAt là timestamp hợp lệ |
| joinRoom / acceptRoomInvite | roomId/code/memberId là string không rỗng, version hợp lệ |
| submitBallot | accepted/allMembersSubmitted boolean, round 1 hoặc 2, roomVersion hợp lệ; requestId/receipt optional nhưng khi có phải đúng shape |
| invitePartner | id/inviterUserId/inviterName/inviteeUserId/status/createdAt/expiresAt đúng kiểu, enum và timestamp |
| inviteToRoom | các field RoomInvitation, gồm roomId/roomCode; enum và timestamp hợp lệ |
| WriteResult<void> | ACK envelope hợp lệ; không đòi object DTO giả. Chốt rõ `data` vắng/null được decode thành `undefined`; các metadata optional vẫn kiểm khi xuất hiện |

Giới hạn version/range và timestamp lấy theo DTO/spec/schema đã chốt, không suy ra từ mock. Khi spec chưa rõ một dạng response, ghi rõ dạng được hỗ trợ trước khi thay decoder; không mở rộng sang RPC nghiệp vụ.

Negative tests bắt buộc qua factory/public ApiClient và injected transport:

- Giữ các ca null/undefined/primitive/missing ok/ok sai kiểu đang có.
- Với createRoom: `{ok:true}`, `{ok:true,data:{}}`, `{ok:true,data:null}`, array/string data, `roomId:42`, `code:9`, `version:'bad'`, version NaN/Infinity/fraction, thiếu expiresAt và timestamp sai → `MALFORMED_RESPONSE`.
- Join/accept invite: thiếu memberId/roomId hoặc sai kiểu → malformed; ballot thiếu required boolean/round/version → malformed.
- Các typed writes còn lại có ít nhất positive + missing required + wrong type; optional receipt/metadata sai kiểu bị từ chối, vắng hợp lệ được giữ.
- Positive: create/join flat hợp lệ và nested hợp lệ; business error `VERSION_CONFLICT`; void ACK hợp lệ có/không metadata. Assert data không lồng sai tầng, requestId/version/state không bị thay.
- Auth malformed success không làm thay đổi token; success metadata mâu thuẫn payload không được dùng để chuyển UI sang bước tiếp.

Đạt khi mọi typed write có guard và behavior tests; endpoint void không bị phá bởi quy tắc áp cho object DTO.

## 3. Chạy checks và cập nhật hồ sơ — phần D

Files: `docs/evidence/roadmap-v2/GM-07/CHECKS.md`, `HANDOFF.md`, `tests/test_api_contract_gm07.py` (whitespace), mô tả PR được chuẩn bị cho revision sau sửa.

- Chạy bằng dependency lockfile hiện có và Node đáp ứng engines; không thêm package hoặc đổi lockfile. Nếu chưa có dependencies, setup `npm ci` trong `mobile` trước khi kiểm code ở lượt triển khai.
- Ghi tested code SHA, target SHA, ngày/OS/Node/npm/Python thực tế và lệnh/output. Khi code chưa commit, ghi base SHA + trạng thái patch chưa commit, không gọi base SHA là revision patch đã test. Sau commit/push do người có quyền yêu cầu, chạy lại trên SHA mới.
- Sửa số test riêng API và tổng mobile theo output mới, không đóng đinh 18/24 sau khi thêm cases; bỏ hàng thừa `|UND_2...` và Clean Base Artifact bị lặp.
- Thay các khẳng định “type-safe 100%”, “triệt để”, “không blocker” bằng kết quả từng AC/case. Fail/Not run bắt buộc vẫn chặn nghiệm thu.
- Đối chiếu snippet HANDOFF với ClientConfig thật; HEAD hiện đã có cả `timeoutMs` và `defaultTimeoutMs`, không áp lại kết luận lỗi config của revision cũ. Typecheck ví dụ factory/public interface và retry cùng toàn bộ body/requestId.
- Phân biệt GM-07 API contract, GM-04 adapter proposal `1.1.0`, schema GM-06 và mock dataset fixture; không ghi `1.1.0` là verified dataset GM-08.
- Chuẩn bị PR body đã điền GM-07/#68, scope, upstream SHA/version, tests, limitations, CHECKS/HANDOFF. Cập nhật PR body/đăng comment/commit/push là bước riêng khi được yêu cầu; không tick approval của reviewer.
- Dọn whitespace đúng các vị trí diff báo; giữ base Expo config sạch.

Các lệnh nghiệm thu sau patch, từ root trừ nhóm mobile:

```powershell
python scripts/task_readiness.py --task GM-07 --base-ref origin/main
Push-Location mobile
npm test -- tests/unit/apiContract.test.ts
npm run check
Pop-Location
python -m unittest discover -s tests -p test_api_contract_gm07.py
python scripts/validate_repository.py
python -m unittest discover -s tests -p "test_*.py"
python scripts/task_readiness.py --check-docs
git diff origin/main HEAD --check
git diff --check
```

Trước merge: fetch lại target rồi `python scripts/task_readiness.py --task GM-07 --gate merge --base-ref origin/main`; kiểm artifact/upstream revision thật và chạy lại checks nếu HEAD hoặc target đổi. Với patch chưa commit, `git diff origin/main --check` kiểm cả nội dung working tree so với target; không chỉ dùng working-tree diff rỗng để kết luận toàn PR sạch.

Regression Windows từng được reviewer báo 1 failure + 5 errors trên main do encoding/legacy locking. Khi chạy lại phải ghi output của lần chạy mới; nếu có lỗi mới, đối chiếu main trước phân loại, không mặc định bỏ qua mọi lỗi Windows. Không yêu cầu đổi máy hoặc sửa legacy ngoài scope chỉ để che báo cáo.

Lần lập plan dùng Python 3.14.5 trong sandbox đã gặp nhiều lỗi môi trường hơn baseline reviewer: thiếu timezone database, ghi/cleanup thư mục tạm bị từ chối, encoding mặc định không đọc được fixtures. Lượt triển khai cần dùng runtime đã có timezone data, TEMP được phép ghi và cấu hình UTF-8 đúng, sau đó đối chiếu PR/main nếu regression còn lỗi. Không thay code nghiệp vụ, fixtures hay AC để làm các lỗi môi trường biến mất; không coi kết quả FAIL hiện tại là PASS có ngoại lệ.

## Điều kiện trình review lại

- Lỗi joinRoom không còn; join/retry/invite có assertions hành vi và typecheck đạt.
- Các payload malformed-success bị chặn; typed/void/flat/nested/error hợp lệ vẫn hoạt động.
- Mobile check, Python contract, validator/indexes và diff đạt; regression được báo rõ và lỗi nền được đối chiếu khi cần.
- CHECKS/HANDOFF/PR body khớp revision được test, đủ output và không có khẳng định nghiệm thu giả.
- Hai checks mobile của revision được push phải xanh; reviewer kiểm lại B/C, Trí nghiệm thu. AI không approve, merge hoặc chuyển Done.

Giữ các phần A đã sửa: pricing parity, caller requestId, idempotency create/ready/ballot, HTTP body/status, timeout với external signal, mock error/empty modes và Expo config. Không mở rộng sang SQL/RLS, production decision engine, verified import hoặc native feature.
