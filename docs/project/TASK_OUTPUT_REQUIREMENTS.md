# Chuẩn đầu ra chạy được — roadmap-v2

**Bổ sung UI Figma final 2026-10-25:** Task UI theo [kế hoạch và chuẩn visual](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md), có node/route/state, ảnh Figma và app cùng viewport, CHECKS/HANDOFF/FIGMA_PARITY. GM-02 kiểm nền/font; GM-39 kiểm handoff Figma/link/gap, HTML là lịch sử; GM-05/09..14 Expo mock; GM-24..31/35 API/native theo capability. Figma đủ màn chưa là app Pass. P1/P2 và Dark redesign giữ làm sau; nếu dòng legacy bên dưới khác phạm vi này thì task/UI spec mới ưu tiên.


2026-10-10. Chủ dự án xác nhận cấu trúc UI/BE và yêu cầu đầu ra task phải kiểm được theo đúng stage: UI màn/component phải chạy trên Expo và hiển thị scope; BE API phải gọi bằng Postman hoặc công cụ tương đương có output/assertion; task structure chỉ kiểm cây code/config/runner; Data đủ trường để BE làm song song. Đây là chuẩn nghiệm thu, không là approval GM-01, package, code, provider hoặc quyền tự merge.

[Checklist từng task](TASK_OUTPUT_CHECKLIST.md) sinh từ `tasks/task-id-map.json`; task Markdown giữ AC/scope/owner/reviewer. [Cấu trúc](REPOSITORY_STRUCTURE.md) và [plan GM-02/03](FOUNDATION_IMPLEMENTATION_PLAN.md) là đích triển khai, không chứng minh đã có app/API.

## Quy tắc chung

- Các task dùng mobile nhận cùng [baseline Expo hiện hành](EXPO_BASELINE.md): package-lock là nguồn cài, `npm ci` + `npm run check:expo` trước kiểm scope. Khuyến nghị patch online được kiểm riêng bằng `check:expo:latest` khi bảo trì GM-02; không pin lại patch theo evidence cũ. Bảng baseline liệt kê đủ task Expo Go/native/QA/release và các task BE/Data/HTML không cần mở Expo.

- File tồn tại, screenshot thiết kế, HTTP 200 hoặc CI xanh riêng lẻ chưa đủ. Phải đối chiếu input → expected → actual và assertions của chính scope.
- Mỗi task GM-01..39 bàn giao `docs/evidence/roadmap-v2/GM-XX/CHECKS.md` theo [mẫu checks](../../tasks/templates/CHECKS_TEMPLATE.md), kèm HANDOFF. Output bổ sung này có trong task map và gate kiểm sự hiện diện khi Done/upstream được dùng.
- CHECKS ghi revision, contract/schema/dataset version nếu áp dụng, công cụ và phiên bản, lệnh/route/request, environment, output thực tế và Pass/Fail/Not run. Screenshot/video/log/report phải có đường dẫn thật hoặc artifact truy cập được cho reviewer.
- Chỉ ghi Pass sau kiểm thực tế; thiếu device/Docker/credential/data ghi Not run + blocker/owner. Not run của AC bắt buộc không cho task Done. N/A chỉ cho phần ngoài scope, có lý do reviewer chấp nhận.
- Không commit/log token, service-role, raw phiếu thật, GPS hoặc dữ liệu cá nhân. HTTP dùng biến môi trường/placeholder auth; output che secret. Input phiếu trong ví dụ phải là fixture tổng hợp, không phải phiếu người dùng.
- Dùng artifact/version upstream đã review; không tự tạo lại nền, đoán DTO hoặc bổ sung dependency số lớn. Thay field/interface phải báo consumer, cập nhật version/schema/fixtures và review lại.
- Checker xác nhận metadata/path, không chạy Expo/API, không chứng minh assertions/human approval có thật. Người nhận phải chạy lại smoke sau cập nhật nhánh.

## UI — phải mở và nhìn thấy phần task yêu cầu

- GM-02: kiểm cây thư mục, route/provider boundary, strict tooling và package boundary của shell UI bằng code-structure checks. Expo Go/Metro smoke là bằng chứng bổ sung; chưa yêu cầu thiết bị để chốt task nền và chưa yêu cầu màn nghiệp vụ.
- GM-05: từng component trong scope có cách xem state/props/events trên Expo trong ví dụ ghép từ mẫu; gallery riêng không là sản phẩm bắt buộc. Không chỉ export component mà không có cách mở xem.
- GM-09..14: mọi màn được liệt kê phải có route/navigation chạy được trên Expo Go. CHECKS ghi cách mở từng màn, scenario fixture, thao tác, expected/actual, screenshot/video theo AC. Fixture có nhãn mock; loading/empty/error và state tương tác liên quan phải xem được.
- GM-39: scope riêng là prototype HTML, không sửa app. Đọc brief dự án/spec, audit và trình hướng để Trí chốt; sửa HTML/CSS/mock JS, mở browser kiểm responsive/theme/zoom/focus/luồng/states, có ảnh trước–sau/CHECKS/HANDOFF. Không đòi Expo/API/native ở task này; không dùng HTML miễn nghiệm thu app của các task khác. Áp dụng mẫu mới vào RN chờ Trí giao scope sau.
- GM-24..31/35/38: các mục UI mở được trên môi trường Expo; tích hợp dùng API thật, không production fallback fixture. Shell/luồng cơ bản vẫn mở trên Expo Go; capability không được Expo Go hỗ trợ phải có guard/chỉ dẫn và nghiệm thu trên development/native build phù hợp. Không lấy Expo Go làm chứng cứ remote push hoặc persistence/native chưa chạy.
- Typecheck/lint/component test/bundle bổ sung bằng chứng, không thay mở app thật. TalkBack/font scaling/dark/safe area/48dp theo scope; không bắt task shell chờ QA toàn bộ app.

## BE — request chạy thật và output có assertion

### Android gọi API — không suy từ Postman

Theo [ma trận Android–API](../testing/MOBILE_API_TEST_MATRIX.md) được chủ dự án yêu cầu ngày 2026-10-12: tách server HTTP/SQL, mobile unit/mock và Android app gọi API thật. GM-16 có native session harness trong scope; GM-24..31 kiểm API từ từng luồng app; GM-33 tổng hợp coverage/release candidate và GM-34 kiểm APK. HANDOFF API GM-16..23 ghi consumer/cases/setup endpoint điện thoại; không tạo dependency ngược BE → UI tương lai. AC native đã bắt buộc ở producer vẫn phải đạt, chưa có app không tự miễn AC.

Case device có endpoint truy cập được, runtime/build/device/revision, thao tác → request/status/error → UI/state server và evidence/assertion che secret. Ít nhất một điện thoại Android thật cho nghiệm thu tích hợp; dùng thêm client/giả lập đúng kịch bản nhiều người. Localhost máy tính, Metro chạy hoặc bundle/unit test Pass không chứng minh device API/SecureStore/SQLite/push đã chạy. Thiếu case bắt buộc ghi Not run và chặn Done; không dồn mọi phép kiểm đến GM-33.

- Endpoint task API có bộ request tái lập trong `supabase/tests/http/GM-XX.http` hoặc artifact tương đương được task map chốt trước code. Có base URL local, identity/role placeholder, preconditions/setup/cleanup chỉ local, method/path/headers/body, expected HTTP status và expected response fields/error codes.
- Postman, curl/HTTP runner hoặc integration test đều hợp lệ; không bắt mua/cài Postman. HANDOFF chỉ rõ lệnh/import/file và cách tạo identity không chứa token thật. Test payload khác nhau theo outsider/member/host khi liên quan.
- Happy path và lỗi theo AC phải ghi request → response đã che dữ liệu → assertions. Với write, kiểm thêm DB/state/version/idempotency; với race dùng concurrency runner/SQL test vì một request Postman không chứng minh tính nguyên tử.
- GET list/query cần kiểm content/null/enum/unit/pagination/ACL; HTTP 200 với `data: []` chỉ pass nếu đúng expected của case, không chứng minh API có dữ liệu hợp lệ.
- GM-03: kiểm cây thư mục BE, config/env boundary, local-only runner và test ownership bằng code-structure checks. Health/DB smoke có thể ghi bổ sung; không yêu cầu Postman/API/schema nghiệp vụ ở task nền. API request suite bắt đầu từ các task API tương ứng.
- GM-07 là contract/client/mock: có test gọi client/transport với request/response/error fixtures thật chạy và mode rõ; optional mock HTTP phải ghi mock. Không chờ GM-16..23 hoặc tuyên bố backend nghiệp vụ đã hoàn tất.
- GM-15 là domain thuần: test runner thực thi input/seed/round/votes tổng hợp → actual winner/tier/reason/invariants. Không tạo public endpoint chỉ để test engine; SQL finalize/parity nằm task nhận sau.
- GM-17 kiểm các access surfaces/policies đã có trong scope bằng HTTP multi-user và SQL; không chờ RPC của task sau. Fake sender/provider không là delivery/provider thật. Thiếu credential phần bắt buộc thì còn blocker, không ghi Pass.

## Data — đủ field, contract, fixture để BE nhận việc

### GM-04: chốt field trước schema và API

- Dictionary và schema/template đầy đủ cho food/place/offering/coverage/anchor/schedule/exception/availability/source/dataset và core room/member/preferences/submission/result/history/consent/friend/invitation/inbox/device/event/idempotency/version/expiry theo spec. Weather/mood chỉ reserved P2; không triển khai provider.
- Mỗi field ghi type, required/nullable/default, enum, unit/timezone, FK/unique, privacy/access boundary, source/freshness/reviewer nếu áp dụng, version và ví dụ hợp lệ/không hợp lệ. Đủ trường không có nghĩa ép tất cả giá trị optional/unknown thành dữ liệu biết chắc.
- `docs/data/FIELD_COVERAGE.md` ánh xạ feature/use case → entity.field → schema/template/example → consumer task. Dựa yêu cầu/spec hiện có, không chờ task API số lớn để chốt field; consumer review contract theo scope của mình khi nhận việc.
- Food và core schema/template tách rõ; fixture synthetic có ID/FK nhất quán và examples success/error/null/unknown. Validator chạy schema/template/contract-cases; không chỉ có danh sách tên cột hoặc JSON trống.
- Cuisine/origin khác nơi bán; nhiệt độ khác cay. Phải có radius/context/giờ quán∩giờ món/timezone/overnight/lastOrder/exception/sold-out/unknown. Không suy allergen safety từ tên món.

### GM-06: mapping và database chạy thật

- Mọi field core của GM-04 được map sang bảng/cột/type/null/check/FK/index/unique/default/access; drift báo lỗi hoặc có thay đổi contract được review.
- Migration từ DB local rỗng chạy được, schemaVersion, constraints/default-deny/upgrade/rollback có tests và query output. BE nhận schema/test/query mẫu, không cần data khảo sát đã đủ trước thiết kế schema.

### GM-08: importer và dữ liệu thật trên DB test

- Theo [ADR-014](../architecture/decisions/ADR-014-test-data-and-baseline-project-card.md), bundle thật đúng schema/contract và đủ required fields/FK; optional/unknown giữ đúng nghĩa. Không yêu cầu verified publish, review độc lập hoặc coverage/public anchors đầy đủ để nghiệm thu GM-08. Không bịa lịch, nguồn/quyền ảnh hoặc chuyển draft thành verified.
- Nạp DB test đã có schema; dry-run, reject logs, reimport idempotent, rollback và typed query/readback có output thật. Bàn giao bundle/version/hash/counts/timezone/giới hạn, fixture tách biệt; verified manifest0 không chặn BE nhận input. Production publish guards giữ nguyên và ngoài scope hiện hành.

### Song song Data–BE

1. Sau review GM-01, GM-02/03/04 làm độc lập theo file ownership; GM-03 không cần dictionary để test nền.
2. Sau fields GM-04 và structure GM-02/03 được bàn giao/review, GM-06 làm schema; GM-07 soạn client/mock từ field contract, đối chiếu GM-06 trước merge như gate hiện hành.
3. Sau GM-06, GM-08 nạp dữ liệu thật trên DB test trong khi BE làm phần đã đủ start inputs theo contract/fixtures. Query data thật dùng bundle/version/DB test đã bàn giao trên target theo ADR-014, không chờ verified publish; thiếu coverage/lịch không bỏ bộ lọc, trả empty/reasonCodes và kiểm positive scenarios bằng fixture tách biệt.

Song song không là bỏ review/start deps hoặc dựng schema/data giả. Không thêm quan hệ start GM-04 ↔ GM-07 hoặc GM-08 ↔ API để gây phụ thuộc vòng; giữ nguyên graph hiện hành.

## QA và release

GM-32 regression chạy API/SQL/domain/outbox thật; GM-33 có Expo/native end-to-end và pilot dataset thật; GM-34 APK install smoke/runbook. P1/P2 không chặn core. Report phải ghi thiếu môi trường/mẫu tuyển, không biến fixture thành nghiên cứu người dùng hoặc HTML thành APK.
