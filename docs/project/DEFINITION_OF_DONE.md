# Definition of Done

Reviewer duy nhất theo phân công hiện hành là Trí (`ThanhTris`) cho mọi task, gồm task Trí thực hiện; không yêu cầu review chéo theo ADR-013. Quy tắc này không miễn kiểm AC/test và không tự tạo approval.

Trí nghiệm thu và chuyển Done trên Project sau khi AC/test của scope hiện hành đạt; Trí tự review task mình trực tiếp làm, không cần chỉ định người khác theo [ADR-013](../architecture/decisions/ADR-013-project-owner-final-review.md). Theo [ADR-011](../architecture/decisions/ADR-011-project-done-readiness.md), Done nghiệm thu toàn scope. Needs Update xác nhận baseline đã nghiệm thu, đồng thời để supplement mới mở cho dependency; nó không thay approval/review/evidence của supplement. Không cần đồng bộ status Markdown để mở task tiếp. AI không tự đổi Done hoặc tạo approval. Nếu ghi task Markdown thành done, vẫn cần review thực tế của Trí và quyết định/ngày/evidence thật.

- Theo [chuẩn đầu ra](TASK_OUTPUT_REQUIREMENTS.md), [checklist từng task](TASK_OUTPUT_CHECKLIST.md) và CHECKS.md: UI phải mở trên Expo thấy các mục/state/action thuộc scope; API phải có request/response/assertion thật bằng Postman/curl/runner; Data phải đủ field contract và kiểm schema/query/import đúng stage để BE dùng song song.
- CHECKS.md/HANDOFF có tested revision/version/environment, cách mở/gọi/lệnh và artifact output thực tế. Not run/Fail của AC bắt buộc còn chặn Done; N/A chỉ phần ngoài scope được reviewer chấp nhận. Không báo request 200/empty output, placeholder hoặc runner 0 case thành hoàn tất nghiệp vụ.

- Mọi AC trong task có kết quả/evidence, ghi giới hạn còn lại.
- Docs-only: validator/link/diff; prototype kiểm nhánh và layout. Không báo native build đã đạt từ HTML.
- App: typecheck/lint/test liên quan và Android build/smoke; UI kiểm font scaling, TalkBack, dark/reduced motion, error/empty/loading.
- Domain: NO exclusion, UNSET, 2 vòng, tie, retry/result stability; TypeScript/SQL dùng chung fixtures.
- Backend: outsider/member/host quyền đúng, SQL transaction/concurrency, server expiry, cleanup, không token trong log.
- Android–API: theo [ma trận kiểm trên điện thoại](../testing/MOBILE_API_TEST_MATRIX.md); server HTTP/SQL, unit/mock và device thật báo riêng. Task tích hợp có thao tác app → transport/API thật → UI/state server/assertion trên Android; native scope GM-16 kiểm qua harness, GM-31 kiểm persistent private cache, GM-33 đối chiếu coverage và GM-34 smoke APK. Thiếu device case bắt buộc chặn Done, không thêm dependency ngược về task UI tương lai.
- Không còn blocker/critical do task; lỗi khác có owner/giới hạn được reviewer chấp nhận.
- Spec/ADR/task và evidence đúng với thay đổi cuối; không dùng dữ liệu giả làm kết quả nghiên cứu.
- Core v0.2: outbox restart/stale/auth isolation, remote push/inbox fallback, friend consent, history delete/group ACL và double-tap/button đều có native/backend evidence phù hợp.
- Release có APK và demo thật; P1/P2 không chặn P0.

Validator chỉ kiểm cấu trúc/truy vết, không chứng minh review có thật hoặc thuật toán đúng.

## Bổ sung food-v1 và bàn giao dependency

- Task có assignment accepted; start_dependencies phải Done hoặc Needs Update trên Project và đủ output/HANDOFF khi bắt đầu; trước merge thêm merge_dependencies ở một trong hai trạng thái đó và artifact/version đúng target. Needs Update giữ nghiệm thu baseline, không nghiệm thu supplement; reviewer vẫn kiểm scope/version mới trước khi task chuyển Done. GM-00 lịch sử vẫn kiểm local Approved. In-progress/draft có thể còn merge blocker. Status không được bỏ qua merge deps hoặc hạ AC.
- Trước merge kiểm ref target đã cập nhật, bản task/evidence đúng revision, PR/merge commit upstream thực tế và integration tests sau cập nhật branch. Done không đồng nghĩa đã merge; checker không chứng minh code đã vào target. Mock không thay native/SQL/verified-data AC.
- Reviewer nên lưu Reviewed-by, Reviewed-at, Decision: Approved và Review-evidence thật, PR/commit/version để truy vết; đây là bắt buộc khi ghi task Markdown thành done, không là bước đồng bộ bắt buộc để mở downstream đã Done trên Project. Không coi merge PR/Issue Closed là Project Done.
- Dataset: field/FK/quán–món/giá/nullable và query thật đúng stage, fixture tách thật. Theo [ADR-014](../architecture/decisions/ADR-014-test-data-and-baseline-project-card.md), GM-08 nghiệm thu DB test, không bắt verified publish/review độc lập/coverage/anchor đầy đủ; BE được dùng bundle test đã bàn giao, thiếu dữ liệu lọc phải trả unknown/empty đúng spec, không bịa. Production publish giữ guards riêng; FOOD-01..10/12..14 vẫn là luật bộ lọc P0, FOOD-11/mood thuộc GM-38 P2.
- Gate checker, validator và regression đạt; sinh lại task indexes rồi --check-docs. Handoff nêu output/version/task sau, migration/rollback và lỗi còn lại.

## Nghiệm thu theo scope roadmap-v2

Task shell/component/màn mock được Done khi đạt đúng AC của task đó và review, không cần API/native của task sau. GM-02 không chờ camera/push/SQLite/APK; GM-05 không phải nghiệm thu gallery riêng; GM-09..14 bàn giao màn theo mẫu + mock đúng contract. Các task tích hợp GM-24..31 cần API/native thật theo AC. Mỗi task cung cấp file thực tế/lệnh dùng/version/commit/HANDOFF, người nhận kiểm đủ input trước làm; không dùng placeholder hoặc đổi mã để kế thừa approval. [Lộ trình](IMPLEMENTATION_ROADMAP.md).

GM-39 nghiệm thu handoff Figma: node/link/component/state, ảnh review và gap log theo final handoff 2026-10-25. HTML cũ giữ tham chiếu, không yêu cầu sửa HTML để mở task app. GM-14/35 bổ sung frame còn thiếu; GM-39 hỗ trợ thiết kế. Không báo Expo/API/native Pass từ handoff.


## Bổ sung UI Figma final 2026-10-25

Theo [kế hoạch UI](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md), task màn/component phải có ảnh đối chiếu Figma/app cùng node/state/data/viewport và CHECKS/HANDOFF/FIGMA_PARITY. Task cấu trúc GM-02 kiểm nền/font; task thiết kế GM-39 kiểm handoff/link, không nhận toàn bộ UI/API. Task tích hợp phải có evidence API/Android/native phù hợp. G01–G03 giao GM-14 bổ sung Figma, GM-28/31 nối; G04/G05 GM-35/P1. Dark redesign hoãn; giữ accessibility/capability hiện có.
