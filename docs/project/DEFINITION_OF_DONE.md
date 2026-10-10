# Definition of Done

Trí nghiệm thu và chuyển Done trên Project sau khi AC/test của task đạt; task Trí viết vẫn cần người kiểm độc lập. Theo [ADR-011](../architecture/decisions/ADR-011-project-done-readiness.md), Done trên Project là xác nhận nghiệm thu cho dependency, không cần đồng bộ status Markdown để mở task tiếp. AI không tự đổi Done hoặc tạo approval. Nếu ghi task Markdown thành done, vẫn cần reviewer độc lập và quyết định/ngày/evidence thật.

- Theo [chuẩn đầu ra](TASK_OUTPUT_REQUIREMENTS.md), [checklist từng task](TASK_OUTPUT_CHECKLIST.md) và CHECKS.md: UI phải mở trên Expo thấy các mục/state/action thuộc scope; API phải có request/response/assertion thật bằng Postman/curl/runner; Data phải đủ field contract và kiểm schema/query/import đúng stage để BE dùng song song.
- CHECKS.md/HANDOFF có tested revision/version/environment, cách mở/gọi/lệnh và artifact output thực tế. Not run/Fail của AC bắt buộc còn chặn Done; N/A chỉ phần ngoài scope được reviewer chấp nhận. Không báo request 200/empty output, placeholder hoặc runner 0 case thành hoàn tất nghiệp vụ.

- Mọi AC trong task có kết quả/evidence, ghi giới hạn còn lại.
- Docs-only: validator/link/diff; prototype kiểm nhánh và layout. Không báo native build đã đạt từ HTML.
- App: typecheck/lint/test liên quan và Android build/smoke; UI kiểm font scaling, TalkBack, dark/reduced motion, error/empty/loading.
- Domain: NO exclusion, UNSET, 2 vòng, tie, retry/result stability; TypeScript/SQL dùng chung fixtures.
- Backend: outsider/member/host quyền đúng, SQL transaction/concurrency, server expiry, cleanup, không token trong log.
- Không còn blocker/critical do task; lỗi khác có owner/giới hạn được reviewer chấp nhận.
- Spec/ADR/task và evidence đúng với thay đổi cuối; không dùng dữ liệu giả làm kết quả nghiên cứu.
- Core v0.2: outbox restart/stale/auth isolation, remote push/inbox fallback, friend consent, history delete/group ACL và double-tap/button đều có native/backend evidence phù hợp.
- Release có APK và demo thật; P1/P2 không chặn P0.

Validator chỉ kiểm cấu trúc/truy vết, không chứng minh review có thật hoặc thuật toán đúng.

## Bổ sung food-v1 và bàn giao dependency

- Task có assignment accepted; start_dependencies phải Done trên Project và đủ output/HANDOFF khi bắt đầu; trước merge thêm merge_dependencies Done và artifact/version đúng target. GM-00 lịch sử vẫn kiểm local Approved. Review chỉ áp dụng scope/version đã kiểm; in-progress/draft có thể còn merge blocker. Done không được bỏ qua merge deps hoặc hạ AC.
- Trước merge kiểm ref target đã cập nhật, bản task/evidence đúng revision, PR/merge commit upstream thực tế và integration tests sau cập nhật branch. Done không đồng nghĩa đã merge; checker không chứng minh code đã vào target. Mock không thay native/SQL/verified-data AC.
- Reviewer nên lưu Reviewed-by, Reviewed-at, Decision: Approved và Review-evidence thật, PR/commit/version để truy vết; đây là bắt buộc khi ghi task Markdown thành done, không là bước đồng bộ bắt buộc để mở downstream đã Done trên Project. Không coi merge PR/Issue Closed là Project Done.
- Dataset: nguồn/license/freshness/coverage, quán–món/lịch/ngoại lệ/unknown/giá đơn vị và người kiểm khác người nhập; fixture tách thật. FOOD-01..10/12..14 áp dụng P0; FOOD-11 và mood thuộc GM-38 P2.
- Gate checker, validator và regression đạt; sinh lại task indexes rồi --check-docs. Handoff nêu output/version/task sau, migration/rollback và lỗi còn lại.

## Nghiệm thu theo scope roadmap-v2

Task shell/component/màn mock được Done khi đạt đúng AC của task đó và review, không cần API/native của task sau. GM-02 không chờ camera/push/SQLite/APK; GM-05 không phải nghiệm thu gallery riêng; GM-09..14 bàn giao màn theo mẫu + mock đúng contract. Các task tích hợp GM-24..31 cần API/native thật theo AC. Mỗi task cung cấp file thực tế/lệnh dùng/version/commit/HANDOFF, người nhận kiểm đủ input trước làm; không dùng placeholder hoặc đổi mã để kế thừa approval. [Lộ trình](IMPLEMENTATION_ROADMAP.md).
