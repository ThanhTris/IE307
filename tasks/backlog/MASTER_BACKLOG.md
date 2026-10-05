# Danh mục task dự kiến Manabi

Người thực hiện và reviewer trong kế hoạch chỉ là đề xuất tham khảo, không bắt buộc. Thành viên có thể nhận task được đề xuất cho người khác; trao đổi trong nhóm để tránh nhận trùng và cập nhật người thực hiện thực tế khi bắt đầu. GitHub Assignees để trống đến khi có người nhận. Reviewer thực tế phải khác người thực hiện.

36 task MANABI-001–036 là kế hoạch triển khai dự kiến, chưa bắt đầu.

Bảng này là nguồn phân công task dự kiến. Trước khi code, chuyển mô tả thành task Markdown có AC/test/evidence cụ thể; không tự tạo registry hoặc báo cáo tiến độ từ kế hoạch. Owner chịu trách nhiệm tích hợp và nghiệm thu toàn đầu ra, người hỗ trợ có phạm vi ghi rõ. Các số dependency là ID MANABI; mọi dependency phải qua review. “—” vẫn cần G0: phạm vi/spec liên quan được duyệt.

| ID | Nhánh | Người thực hiện đề xuất | Reviewer đề xuất | Công việc | Dependency | Đầu ra/phạm vi nghiệm thu dự kiến |
| --- | --- | --- | --- | --- | --- | --- |
| 001 | Core | Tuấn | Trang | Expo, navigation và cấu hình local | — | App shell build Android, không yêu cầu login; FR-01/18 |
| 002 | Core | Trí | Trung | CI và build kiểm tra sớm | 001 | Lint/typecheck/test/build tái lập; NFR-08/11 |
| 003 | Core | Tâm | Vinh + Trí | Chốt contract và spike SQLite/JSON | — | Query/index/migration/backup thử nghiệm; ADR-004; không triển khai Mongo |
| 004 | Core | Vinh | Tâm | Fixture tiếng Nhật và dữ liệu biên | 003 | Unicode, đa nghĩa, ít card, schema tùy biến; dữ liệu có nguồn hợp lệ |
| 005 | Pilot | Trung | Tâm | Corpus development và rubric AI | 004 | Bộ phát triển có provenance; không truy cập holdout của 023 |
| 006 | Core | Trang | Tuấn | UI nền và settings | 001 | Tokens/components, theme, font, reduce-motion, settings lưu local; FR-01 |
| 007 | Core | Trang | Tuấn | Flashcard và phiên học | 006, 016, 033 | Reveal/rating/resume, transaction qua repository; FR-05/06 |
| 008 | Online | Trung | Trí + Tâm | Auth và chuyển guest/account | 015, 027 | Gồm UI đăng nhập/session và mapping ownership; FR-12 |
| 009 | Core | Tâm | Vinh + Trí | SQLite, migration và repository CRUD | 003, 001 | API dữ liệu cho deck/card/search/tag/version, transaction; FR-02/03 |
| 010 | Core | Vinh | Tâm + Trung | Import paste/CSV | 004, 009 | Parser/mapping/preview/rollback; Trung làm UI import; FR-04 |
| 011 | Core | Trung | Trang | Matching | 007 | Game và lưu session offline, xử lý cặp mơ hồ; FR-07 |
| 012 | Core | Tuấn | Trang | Word Ninja | 007 | Ba mạng, reduce-motion, không chấm auto-hit/bom; FR-09 |
| 013 | Core | Trang | Tuấn | Four Choices local | 007 | Một đáp án, ba nhiễu hợp lệ, fallback thiếu card; FR-08 |
| 014 | Online | Trí | Trung + Vinh | Sync và xử lý xung đột | 008 | Outbox/cursor/replay/isolation; Trung làm UI conflict; FR-13 |
| 015 | Online | Tâm | Vinh + Trí | Cloud schema và RLS | 009 | Migration và negative ownership tests; chỉ mở sau core; FR-12/13 |
| 016 | Core | Vinh | Tâm + Trung | Scheduler và review event | 004, 009 | Deterministic, UTC, idempotent, transaction; FR-06 |
| 017 | Pilot | Trung | Trí + Tâm | Generator và validator AI | 005, 020 | Đáp án từ card, ba nhiễu, provenance/stale/report; FR-14 |
| 018 | Pilot | Tâm | Trung | Nguồn ảnh và pipeline duyệt | 020 | API ảnh, license, OCR, mapping/version và loại ảnh lỗi; FR-16 |
| 019 | Pilot | Trang | Tuấn | Quiz UI và duyệt/báo lỗi | 017 | Chỉ phát approved, fallback local, báo sai không phạt lịch; FR-14/15 |
| 020 | Pilot | Trí | Trung + Vinh | Gateway Gemini và quota | 014, 027 | Consent/tier, atomic reservation, cap/retry/cache; FR-15/17 |
| 021 | Core | Trung | Tâm + Tuấn | Backup/restore trọn luồng | 009 | JSON/checksum, file picker, preview, rollback; FR-11 |
| 022 | Pilot | Vinh | Tâm + Trí | Tín hiệu game/quiz ở shadow mode | 016, 019 | Lưu/đo riêng; chưa đổi dueAt; bật tác động thật cần review riêng |
| 023 | Pilot | Vinh | Tâm | Đánh giá AI độc lập | 017 | Giữ holdout riêng, khóa validator trước đo; assessor tiếng Nhật độc lập; NFR-06 |
| 024 | Pilot | Tuấn | Trang + Vinh | Bài tập ảnh bốn lựa chọn | 018, 017 | UI, nguồn ảnh, nhiễu/card version, skip/fallback; FR-16 |
| 025 | Core | Trí | Tuấn | Benchmark hiệu năng toàn app | 029 | Đo release/query/list/game, phân lỗi về owner; NFR-02 |
| 026 | Core + Online | Trí | Trung + Tâm | Kiểm bảo mật và dữ liệu riêng tư | 021, 027 | Core: secret/backup/log; online thêm 014/020 và kiểm isolation/quota; NFR-04/05/10 |
| 027 | Core + Online | Tâm | Vinh + Trung | Privacy, consent và xóa dữ liệu | 009, 006 | Tâm làm lifecycle; Trung làm UI consent/delete; online kiểm revoke trước gọi dịch vụ; FR-17 |
| 028 | Core | Tuấn | Trang + Vinh | Dashboard và lịch sử | 007, 011, 012, 013 | Tuấn làm UI/tích hợp; Vinh làm query/metrics, mẫu số rõ; FR-10 |
| 029 | Core | Trung | Tuấn | Acceptance core offline | 010, 021, 027, 028, 031 | E2E restart/mất mạng/crash và trace FR-01–11/17/18; NFR-01/03/12 |
| 030 | Core | Trang | Trung | Audit accessibility và layout | 029 | TalkBack/font 200%/dark/ba cỡ layout; NFR-07 |
| 031 | Core | Tuấn | Trí | Integration core từ đầu | 001, 006, 009 | Smoke tạo/sửa card → học → restart; hoàn tất sau 007/033; không đợi cuối kỳ |
| 032 | Release | Trí | Tuấn | Signed Android và smoke release | 025, 026, 030, 034 | Core offline chạy thật; pilot tắt mặc định, bật phải qua gate riêng; FR-18 |
| 033 | Core | Trang | Tuấn + Tâm | Màn deck/card và form động | 006, 009 | Trang làm UI + nối repository; Tâm hỗ trợ schema, không làm lại CRUD data; FR-02/03 |
| 034 | Core | Vinh | Tâm + Trung | Regression dữ liệu | 029 | Migration/roundtrip/replay/force-close; NFR-03/12 |
| 035 | Release | Trung | Trí | Báo cáo và evidence | 032 | Viết khung từ đầu; kết quả cuối khớp build/FR, không claim pilot chưa đạt |
| 036 | Release | Tuấn | Trang | Slide, demo và gói bàn giao | 032, 035 | Soạn kịch bản sớm, rehearsal build thật và gói nộp đủ tài liệu |

## Điều kiện mở và ranh giới

- Core học offline không phụ thuộc Online/Pilot. 015 chỉ bắt đầu sau G3 core; 008 → 014 → 020 → 017/018 theo thứ tự review. Nghiên cứu corpus 005 dùng fixture demo, không gọi dịch vụ và không mở khóa phát AI.
- 026 có hai đợt: core dùng 021/027; online cần 014/021. Đợt core đủ cho release tắt online/pilot; không yêu cầu nhánh tùy chọn hoàn thành để xuất bản core.
- 031 mở sớm để dựng harness theo repository đã duyệt; chỉ nghiệm thu smoke khi 033/007 đạt. 029 nhận kết quả 031, không tạo dependency vòng.
- Mỗi game tự lưu signal/session an toàn và không đổi lịch ôn ngoài policy. 022 chỉ nghiên cứu tín hiệu quiz mở rộng, không chặn ba game offline.
- Trước bật AI: 008/014/015/020, đợt online 026, 017/019/023 và consent phải đạt. Trước bật ảnh: thêm 018/024, duyệt quyền/nghĩa và holdout ảnh độc lập do Vinh điều phối. Thiếu assessor tiếng Nhật phù hợp thì pilot giữ tắt.
- 023 do Vinh giữ holdout và chạy đánh giá; Trung chỉ cung cấp phiên bản validator đã khóa. Tâm review phương pháp, assessor khác người viết prompt/mapping duyệt nghĩa. Không dùng bộ development 005 làm holdout hoặc tự coi reviewer code đủ năng lực tiếng Nhật.
- UI import/consent/conflict do Trung thực hiện trong 010/027/014; query tiến độ do Vinh thực hiện trong 029. Công hỗ trợ được tính vào tải người hỗ trợ, không cộng lại như task độc lập.
- Accessibility, test và hiệu năng cơ bản thuộc từng task. 025/030 là kiểm tổng; lỗi trả về owner chức năng. 035/036 chuẩn bị khung sớm, dependency trong bảng là điều kiện hoàn tất bàn giao.

Spec và ngưỡng chi tiết: [FR](../../docs/product/FUNCTIONAL_REQUIREMENTS.md), [NFR](../../docs/product/NON_FUNCTIONAL_REQUIREMENTS.md), [kế hoạch](../../docs/project/PROJECT_PLAN.md), [workflow](../../docs/project/TEAM_WORKFLOW.md).
