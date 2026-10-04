# Đặc tả release Manabi tiếng Nhật

Truy vết: FR-18/17, NFR-01–12; [DATA_PRIVACY](DATA_PRIVACY_SPEC.md), [NON_FUNCTIONAL_REQUIREMENTS](../product/NON_FUNCTIONAL_REQUIREMENTS.md). Giữ UI prototype đã chọn, không gọi prototype HTML là mobile production.

Trạng thái: cổng phát hành dự kiến. Android là nền tảng bắt buộc của đồ án; iOS là nhánh mở rộng nếu có thiết bị và tài khoản phù hợp. Prototype HTML không phải build phát hành.

## Android

- Application ID ổn định, icon/splash, versionCode/versionName.
- Signed AAB tạo thành công bằng EAS hoặc native build được kiểm soát.
- Internal testing trên Google Play nếu có tài khoản.
- Data safety, privacy policy, screenshot và store listing hoàn chỉnh.

## iOS

- Bundle ID ổn định, icon/splash, version/build number.
- Archive không lỗi; TestFlight nếu có Apple Developer account.
- Privacy manifest/permission description đúng chức năng thực tế.
- App Store metadata và screenshot sẵn sàng.

## Release gate

- Flashcard, lịch ôn và ba game với dữ liệu đã lưu vẫn dùng được khi tắt mạng, Gemini lỗi/hết quota hoặc người dùng không đồng ý gửi card cho AI.
- Quiz AI chỉ bật nếu câu hỏi đã qua kiểm tra/duyệt, có cơ chế báo lỗi và đo được quota/chi phí; không quảng bá độ chính xác tuyệt đối.
- Ảnh đời sống chỉ bật nếu từng ảnh có nguồn, quyền dùng, ghi công và liên kết nghĩa đã duyệt. Nếu pilot không đạt thì không đưa ảnh vào tính năng chấm điểm.
- Migration test và backup restore đạt; nếu có auth/sync thì RLS test đạt.
- Benchmark NFR mục tiêu có số đo build/thiết bị và known limitations; chưa đo không viết claim. Gemini phải có model/project quota thật, cổng tuổi/vùng/data tier và consent, daily 10-new-question + global cap chứng minh bằng test. Không có thì flag AI tắt.
- E2E demo đạt trên build release Android, không chỉ prototype hoặc development mode.
- Không còn blocker/critical; known issues được ghi rõ.
- Không chứa secret, tài liệu riêng hoặc debug endpoint.

## Checklist evidence

Lưu build/version/hash và thiết bị; core offline E2E/backup-migration/auth isolation; bảng kiểm FR/NFR đạt/chưa đạt; screenshots UI hiện hành; dataset không nhạy cảm; privacy/store claims; pilot provenance/review/cost/failure report nếu bật. Task release chỉ Done sau reviewer khác owner xác nhận. DOCX tiến độ được tái tạo trước push theo [TEAM_WORKFLOW](../project/TEAM_WORKFLOW.md) và không thay task Markdown làm nguồn trạng thái.
