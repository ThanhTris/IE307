# Chuẩn đầu ra chạy được — roadmap-v2

2026-10-10. Chủ dự án xác nhận cấu trúc UI/BE và yêu cầu đầu ra task phải kiểm được theo đúng stage: UI màn/component phải chạy trên Expo và hiển thị scope; BE API phải gọi bằng Postman hoặc công cụ tương đương có output/assertion; task structure chỉ kiểm cây code/config/runner; Data đủ trường để BE làm song song. Đây là chuẩn nghiệm thu, không là approval GM-01, package, code, provider hoặc quyền tự merge.

[Checklist từng task](TASK_OUTPUT_CHECKLIST.md) sinh từ `tasks/task-id-map.json`; task Markdown giữ AC/scope/owner/reviewer. [Cấu trúc](REPOSITORY_STRUCTURE.md) và [plan GM-02/03](FOUNDATION_IMPLEMENTATION_PLAN.md) là đích triển khai, không chứng minh đã có app/API.

## Quy tắc chung

- File tồn tại, screenshot thiết kế, HTTP 200 hoặc CI xanh riêng lẻ chưa đủ. Phải đối chiếu input → expected → actual và assertions của chính scope.
- Mỗi task GM-01..38 bàn giao `docs/evidence/roadmap-v2/GM-XX/CHECKS.md` theo [mẫu checks](../../tasks/templates/CHECKS_TEMPLATE.md), kèm HANDOFF. Output bổ sung này có trong task map và gate kiểm sự hiện diện khi Done/upstream được dùng.
- CHECKS ghi revision, contract/schema/dataset version nếu áp dụng, công cụ và phiên bản, lệnh/route/request, environment, output thực tế và Pass/Fail/Not run. Screenshot/video/log/report phải có đường dẫn thật hoặc artifact truy cập được cho reviewer.
- Chỉ ghi Pass sau kiểm thực tế; thiếu device/Docker/credential/data ghi Not run + blocker/owner. Not run của AC bắt buộc không cho task Done. N/A chỉ cho phần ngoài scope, có lý do reviewer chấp nhận.
- Không commit/log token, service-role, raw phiếu thật, GPS hoặc dữ liệu cá nhân. HTTP dùng biến môi trường/placeholder auth; output che secret. Input phiếu trong ví dụ phải là fixture tổng hợp, không phải phiếu người dùng.
- Dùng artifact/version upstream đã review; không tự tạo lại nền, đoán DTO hoặc bổ sung dependency số lớn. Thay field/interface phải báo consumer, cập nhật version/schema/fixtures và review lại.
- Checker xác nhận metadata/path, không chạy Expo/API, không chứng minh assertions/human approval có thật. Người nhận phải chạy lại smoke sau cập nhật nhánh.

## UI — phải mở và nhìn thấy phần task yêu cầu

- GM-02: kiểm cây thư mục, route/provider boundary, strict tooling và package boundary của shell UI bằng code-structure checks. Expo Go/Metro smoke là bằng chứng bổ sung; chưa yêu cầu thiết bị để chốt task nền và chưa yêu cầu màn nghiệp vụ.
- GM-05: từng component trong scope có cách xem state/props/events trên Expo trong ví dụ ghép từ mẫu; gallery riêng không là sản phẩm bắt buộc. Không chỉ export component mà không có cách mở xem.
- GM-09..14: mọi màn được liệt kê phải có route/navigation chạy được trên Expo Go. CHECKS ghi cách mở từng màn, scenario fixture, thao tác, expected/actual, screenshot/video theo AC. Fixture có nhãn mock; loading/empty/error và state tương tác liên quan phải xem được.
- GM-24..31/35/38: các mục UI mở được trên môi trường Expo; tích hợp dùng API thật, không production fallback fixture. Shell/luồng cơ bản vẫn mở trên Expo Go; capability không được Expo Go hỗ trợ phải có guard/chỉ dẫn và nghiệm thu trên development/native build phù hợp. Không lấy Expo Go làm chứng cứ remote push hoặc persistence/native chưa chạy.
- Typecheck/lint/component test/bundle bổ sung bằng chứng, không thay mở app thật. TalkBack/font scaling/dark/safe area/48dp theo scope; không bắt task shell chờ QA toàn bộ app.

## BE — request chạy thật và output có assertion

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

### GM-08: importer và dữ liệu đã kiểm

- Verified bundle đúng version schema/contract và đủ required fields; optional/unknown dùng đúng nghĩa, broken FK/missing required/stale/fixture không publish. Nguồn/license/freshness/coverage/timezone/reviewer và giờ thực tế phải có evidence theo spec.
- Nạp DB local đã có schema; dry-run, reject logs, reimport idempotent, rollback và query sample có output thật. Bàn giao manifest/hash/counts, coverage/hạn và fixture tách biệt; không bịa dữ liệu để đủ quota.

### Song song Data–BE

1. Sau review GM-01, GM-02/03/04 làm độc lập theo file ownership; GM-03 không cần dictionary để test nền.
2. Sau fields GM-04 và structure GM-02/03 được bàn giao/review, GM-06 làm schema; GM-07 soạn client/mock từ field contract, đối chiếu GM-06 trước merge như gate hiện hành.
3. Sau GM-06, GM-08 nạp/xác minh data trong khi BE làm phần đã đủ start inputs theo contract/fixtures. Query data thật chỉ nghiệm thu sau verified dataset tương ứng có trên target.

Song song không là bỏ review/start deps hoặc dựng schema/data giả. Không thêm quan hệ start GM-04 ↔ GM-07 hoặc GM-08 ↔ API để gây phụ thuộc vòng; giữ nguyên graph hiện hành.

## QA và release

GM-32 regression chạy API/SQL/domain/outbox thật; GM-33 có Expo/native end-to-end và pilot dataset thật; GM-34 APK install smoke/runbook. P1/P2 không chặn core. Report phải ghi thiếu môi trường/mẫu tuyển, không biến fixture thành nghiên cứu người dùng hoặc HTML thành APK.
