# Definition of Done

Chỉ task có reviewer độc lập và quyết định có ngày được chuyển done.

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

- Task có assignment accepted, cả start_dependencies và merge_dependencies Done + Decision Approved + reviewer độc lập/ngày/evidence; bản review chỉ áp dụng scope/version được ghi. In-progress/draft review có thể còn merge blocker; Done không được bỏ qua merge deps.
- Trước merge kiểm ref target đã cập nhật, bản task/evidence đúng revision, PR/merge commit upstream thực tế và integration tests sau cập nhật branch. Done không đồng nghĩa đã merge; checker không chứng minh code đã vào target. Mock không thay native/SQL/verified-data AC.
- Reviewer ghi Reviewed-by, Reviewed-at, Decision: Approved và Review-evidence (file từ root có thật), PR/commit/version trong evidence; không coi merge PR là Done.
- Dataset: nguồn/license/freshness/coverage, quán–món/lịch/ngoại lệ/unknown/giá đơn vị và người kiểm khác người nhập; fixture tách thật. FOOD-01..10/12..14 áp dụng P0; FOOD-11 và mood thuộc GM-31 P2.
- Gate checker, validator và regression đạt; sinh lại task indexes rồi --check-docs. Handoff nêu output/version/task sau, migration/rollback và lỗi còn lại.
