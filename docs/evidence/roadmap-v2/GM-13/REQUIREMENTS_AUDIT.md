# GM-13 — yêu cầu, điểm nối downstream và kế hoạch triển khai

Ngày đọc: 2026-10-16. Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`).
Nhận việc theo yêu cầu trực tiếp của Tuấn trong cuộc hội thoại hiện tại.
Contract task: `food-v1/roadmap-v2/GM-13.1`; chưa thay contract upstream.
Nhánh: `codex/gm-13-result-no-consensus`, tạo từ local `main`
`4a8cd642c8d908d9e6d2c75d19c0935a44cba042`; chưa fetch/đối chiếu main remote.

**Cập nhật sau đăng nhập: đã triển khai scope màn mock trên working tree.**
Start gate live đạt `READY_TO_CLAIM` tại `2026-10-16T07:24:23.474977+00:00`,
đọc mới Project #2. Đã fetch `origin/main`, kết quả `HEAD...origin/main = 0 / 0`
trước code. Lỗi `BLOCKED_PROJECT_UNVERIFIED` trong phần chuẩn bị phía dưới là
lịch sử trước khi đăng nhập; nguyên nhân là credential sandbox/đọc mạng.
Kết quả kiểm cuối và giới hạn nghiệm thu xem [CHECKS](CHECKS.md), điểm nối xem
[HANDOFF](HANDOFF.md). Không dùng Issue Closed, approval local hoặc log gate cũ
để thay xác minh Done.
Không đổi Status/assignee/deadline/approval trên GitHub hoặc metadata task.

## Nguồn đã đọc và thứ tự áp dụng

- [Issue GM-13/#74](https://github.com/ThanhTris/IE307/issues/74) và [task local](../../../../tasks/backlog/GM-13.md).
- Issue downstream [GM-27/#88](https://github.com/ThanhTris/IE307/issues/88), [GM-30/#91](https://github.com/ThanhTris/IE307/issues/91), [GM-39/#107](https://github.com/ThanhTris/IE307/issues/107), cùng task local. Bốn issue không có comment tại thời điểm đọc. Issue GM-27/30 ghi revision dự kiến .2, task local còn .1: không sửa contract downstream thay owner.
- [AGENTS](../../../../AGENTS.md), [CONTRIBUTING](../../../../CONTRIBUTING.md), [AIDD](../../../project/AIDD_PROCESS.md), [workflow](../../../project/TEAM_WORKFLOW.md), [DoD](../../../project/DEFINITION_OF_DONE.md), [Project readiness](../../../project/PROJECT_READINESS.md), ADR-011/013 được dẫn trong các quy định này.
- [UI_SPEC](../../../specs/UI_SPEC.md), [UI_DESIGN_SPECIFICATION](../../../specs/UI_DESIGN_SPECIFICATION.md), [DECISION_SPEC](../../../specs/DECISION_SPEC.md), [ROOM_SPEC](../../../specs/ROOM_SPEC.md), [FOOD_DATA_SPEC](../../../specs/FOOD_DATA_SPEC.md), [API_CONTRACT](../../../architecture/API_CONTRACT.md), [NFR](../../../product/NON_FUNCTIONAL_REQUIREMENTS.md).
- [UI implementation plan](../../../project/UI_IMPLEMENTATION_PLAN.md), [output checklist](../../../project/TASK_OUTPUT_CHECKLIST.md), [handoff map](../../../project/TASK_HANDOFFS.md), [Expo baseline](../../../project/EXPO_BASELINE.md), [component map](../../../design/COMPONENT_MAP.md).
- [Design system](../../../../design/DESIGN_SYSTEM.md), [prototype notes](../../../../design/prototypes/UI-IMPLEMENTATION-NOTES.md), [prototype Result/empty](../../../../design/prototypes/gi-cung-duoc.html), [GM-39 brief](../../../design/UI_REFINEMENT_BRIEF.md).
- GM-05/07/18 HANDOFF, tokens/shared UI, GM-07 contracts/mock, discovery adapter GM-18, feature/data/domain README, routes, GM-09/10 frames, GM-12 final screen, mobile test README và architecture guard.

Issue cũ yêu cầu reviewer độc lập/local Approved không ghi đè ADR-011/013:
Trí review cuối, dependency dùng Done live trên Project. Bảng phân công trong plan
cũ không thay assignee GitHub. Tokens GM-05 hiện hành là nguồn code, không thay
bằng palette design-system v0.1 hoặc thiết kế GM-39 chưa được giao áp dụng app.

## Phạm vi và ma trận yêu cầu

| Nguồn | Hành vi phải có | Cách kiểm dự kiến |
| --- | --- | --- |
| GM-13 / UI-08 | Result: tier, lý do trung tính, tên món, nơi bán, địa chỉ, giá/đơn vị/nguồn, giờ dự kiến và ngày kiểm hoặc trạng thái chưa biết | Render từng tier; missing/null/zero/group-price; đối chiếu cùng offering, không ghép field từ nhiều quán |
| GM-13 / FOOD-10 | Refetch nơi bán không đổi resultId/winner/pool; stale/closed/changed/empty/unknown rõ và có hành động phù hợp | Callback spy + rerender dữ liệu nơi bán thay đổi trong cùng result; kiểm winner bất biến |
| UI-08 / UI-15 | Khoảng cách có đơn vị, ghi đường chim bay từ điểm ăn công cộng; lịch dự kiến không bảo đảm tồn hàng/chỗ ngồi trực tiếp | Khoảng cách thiếu và bằng 0; giờ chưa biết; không dùng GPS hoặc copy khẳng định đang còn món |
| GM-13 / UI-09 | NoConsensus có lý do EMPTY_INTERSECTION/ALL_REMOVED, kết thúc/về Home và tạo phiên mới | Kiểm hai reason; callback tạo mới không nhận phiếu/roster tự động, không vòng ba |
| DECISION_SPEC | PERFECT/CONSENSUS/COMPROMISE/NO_CONSENSUS theo dữ liệu đã chốt; không NO/REMOVE thắng, không chọn ngẫu nhiên ở UI | Fixture định trước tương ứng; không gọi selector/submit/re-vote từ Result; không công khai matrix/count/user NO |
| GM-30 | Maps/review/copy/browser fallback thông qua callbacks có target đúng offering/anchor công cộng | Spy payload; mock feedback rõ; không Linking/provider/clipboard thật trong task này |
| UI/NFR | Safe area, dark, font200%, TalkBack, nút >=48dp, không chỉ màu, reduced motion, 320–599dp một cột | Interaction tests + Android Expo Go thực tế, ghi riêng kết quả chưa chạy |
| GM-13 | Mở được màn/fixture trên Expo Go, có nhãn mô phỏng | Routes mỏng riêng; đường mở dễ tìm; preview controls tách khỏi nội dung và có thể ẩn |

Copy tier dùng DECISION_SPEC: PERFECT “Cả nhóm cùng muốn ăn món này”; CONSENSUS
“Đa số muốn ăn và mọi người đều giữ món này”; COMPROMISE “Phương án cả nhóm ăn
được, ưu tiên theo mức muốn ăn”. Không đồng nhất mọi tier thành đồng thuận tuyệt
đối. Không hứa ẩn danh tuyệt đối hoặc tự xác minh ảnh/địa điểm.

Prototype chỉ tham chiếu hierarchy: badge tier → tiêu đề món → hình/emoji fallback
→ card nơi bán → actions → tạo mới/Home. Không sao chép random winner, Maps search
“gần đây”, lời hứa bảo mật tuyệt đối, claim giờ phục vụ live, lời mời/thêm bạn
hoặc token màu cũ thành chức năng GM-13. Không sửa HTML trong task này.

## Điểm nối cần bàn giao

| Consumer | Đầu vào GM-13 và giới hạn |
| --- | --- |
| GM-27 | `ResultScreen.tsx` và `NoConsensusScreen.tsx`, props typed nhận result/context/offering state, callbacks refetch/new/home; production composition inject dữ liệu thật, screen không import/fallback mock. Retry/reconnect/back giữ winner và refetch chỉ thay nơi bán. Không triển khai resultRepository/API thật trong GM-13. |
| GM-30 | Callbacks Maps/review/copy/browser nhận public target của đúng offering, có missing-target/failure state. Native allowlist, Linking, browser/clipboard và cold/warm thuộc GM-30; không gửi GPS thô. |
| GM-39 | Hai màn cùng routes/fixture/version/HANDOFF để đọc đối chiếu HTML. GM-39 không sửa app; GM-13 không chờ hướng visual mới của GM-39. |
| GM-33/34 | Cách mở/reproduce từng tier/state và evidence Expo Go; QA/pilot/APK riêng, không báo API/native Pass từ fixture. |

GM-07 `RoomResult` đã có resultId/roomId/round/winnerRoundDishId/winnerDish,
reasonCode/matchTier/finalizedAt/policyVersion=`decision-v2`. `PoolDish` có
venueName/address/distanceM và giá nhưng chưa có đầy đủ source/checkedAt/schedule.
GM-18 `OfferingCard` bổ sung offeringIds/availability, không tự cung cấp toàn bộ
metadata đó. Vì vậy không tự thêm field/đổi DTO chung hoặc bịa lịch/nguồn từ giá.
Kế hoạch: view model thuộc feature cho metadata nullable được cung cấp tường minh
bởi fixture/composition; thiếu dữ liệu hiển thị chưa biết. HANDOFF chỉ rõ mapping
và giới hạn để GM-27 nối metadata thực tế theo contract đã duyệt.

GM-10 [audit contrast](../GM-10/REQUIREMENTS_AUDIT.md) đã ghi màu primary/shared
GM-05 chưa đạt text contrast NFR-06. GM-13 phải giữ vấn đề này trong giới hạn
kiểm chứng và phối hợp owner GM-05/Trí; không tự sửa palette chung hoặc báo
accessibility Pass chỉ vì tái sử dụng component.

## Patch/test plan sau khi start gate được xác minh

1. Chạy lại gate live GM-13, đọc Done GM-05/#66 và GM-07/#68; đối chiếu commit/version/HANDOFF trên nhánh. Upstream artifact có trong checkout không tự thay xác minh này.
2. Tạo `mobile/src/features/result/` với typed presentation model/adapter và hai screen tại path task yêu cầu; tái sử dụng tokens/AppHeader/AppButton/StatusNotice. Không thêm package/native module hoặc sửa shared palette/contract/engine/backend.
3. Tạo fixture tổng hợp cố định, không vote thật/token/GPS; scenarios ba winner tiers, hai no-consensus reasons, loading/error/empty/stale/closed/changed/unknown. Preview composition riêng trong bootstrap, routes dự kiến `/gm13/result`, `/gm13/no-consensus`; chốt đường vào hub trong patch, không thay hành vi terminal của task khác.
4. Inject navigation/Home/back/new-session và external actions; nhãn mock/công cụ preview từ composition có thể ẩn/thay khi GM-27 tích hợp. Back/Android Back không mở lại vòng vote. Tạo phiên mới đi flow tạo phòng, không mang phiếu.
5. Unit/component kiểm mapping, null/units, tier/reason, callback target/refetch, result bất biến, new-session, lỗi action và privacy. Route tests dùng route modules thật. Không viết tests chỉ kiểm file có tồn tại.
6. Nhận baseline bằng `npm ci` trong mobile, `npm run check:expo`, `npm run check`, `npm run bundle:android`. Giữ package-lock hiện hành; online `check:expo:latest` chỉ cho bảo trì GM-02.
7. Expo Go Android: mở hai màn, đổi mọi scenario, thao tác actions/Back/new/Home, dark/font200/TalkBack/reduced motion/màn nhỏ-lớn. Ghi input → expected → actual → assertions thật; Not run chưa đạt AC, không suy device Pass từ Jest/bundle.
8. Bàn giao CHECKS.md/HANDOFF.md với tested revision/upstream versions, routes/lệnh, ma trận cases, callback/view-model mapping và known limits. Chạy repo validator, Python regression, `--check-docs`, `git diff --check`; trước merge cập nhật target và chạy merge gate. Trí review, không tự Done/Approved/commit/push.

Kế hoạch trên đã được dùng cho patch màn mock; không mở rộng sang API/native.
Audit này không phải approval cho task; xem CHECKS/HANDOFF cho kết quả thực tế.

## Kiểm phần chuẩn bị trước đăng nhập (lịch sử)

- `scripts/validate_repository.py`: Pass (documents/links/JSON/task manifest/dependencies/traceability); không xác minh approval/live gate.
- `scripts/task_readiness.py --check-docs`: Pass, indexes khớp metadata; không đổi metadata task.
- `git diff --check` và `git diff --no-index --check -- NUL docs/evidence/roadmap-v2/GM-13/REQUIREMENTS_AUDIT.md`: Pass, có kiểm file mới chưa tracked.
- Python regression với Python 3.14: **Fail**, 542 tests / 165 failures / 85 errors / 6 skipped. Có lỗi quyền ghi thư mục Temp và thiếu `tzdata`; probe `ZoneInfo('Asia/Ho_Chi_Minh')` cũng fail. Chưa phân loại toàn bộ failure, không khẳng định mọi lỗi là môi trường hoặc lỗi baseline. Không sửa source/test hoặc cài package để che kết quả.
- Mobile/Expo Go GM-13: **Not run**; chưa viết code vì live start gate chưa xác minh. Nhánh đã tạo; chưa commit/push.
