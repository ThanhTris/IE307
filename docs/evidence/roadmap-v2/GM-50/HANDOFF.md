# GM-50 — Bàn giao

Nhánh: `codex/gm50-legal-pages`, tách từ `origin/main` tại `d9332f7`.

## Nội dung đã chuẩn bị để review

- `docs/legal/PRIVACY_POLICY.md` — chính sách tiếng Việt và tóm tắt tiếng Anh, dựa trên mã nguồn và phạm vi Android v1 hiện tại; ngày hiệu lực/cập nhật là 2026-11-26.
- `docs/legal/TERMS_OF_SERVICE.md` — điều khoản sử dụng, ngày hiệu lực 2026-11-26.
- `docs/legal/ACCOUNT_DELETION.md` — luồng trong ứng dụng và yêu cầu qua email, khớp quy trình vận hành của GM-49.
- `docs/legal/STORE_PRIVACY_ANSWERS.md` — mapping dự thảo Google Play Data safety và Apple App Privacy; chưa nộp. Apple App Privacy chỉ để tham khảo vì iOS/App Store hoãn theo GM-60, không thuộc phát hành v1.
- `docs/legal/index.md`, `support.md`, `_config.yml` — nội dung website tĩnh với các đường dẫn ổn định.
- `.github/workflows/legal-pages.yml` — build trên PR và deploy GitHub Pages từ nhánh chính; workflow dừng nếu thiếu tên nhà phát hành/email liên hệ.

Jekyll build đã thành công trên PR #219 ở commit `8dc9f10` (run `45449865157`); deploy được bỏ qua cho sự kiện PR như thiết kế.

## Việc còn lại trước khi công bố

1. Tên nhà phát hành **Nguyễn Thanh Trí** và email công khai `23521645@gm.uit.edu.vn` đã được chủ dự án cung cấp ngày 2026-11-24.
2. Đối chiếu tài liệu với APK/AAB phát hành và cấu hình Supabase production, đặc biệt Sentry, push, khu vực dữ liệu, thời hạn backup và hành vi xóa tài khoản.
3. Quản trị viên repo cần bật GitHub Pages với nguồn **GitHub Actions**. Tài khoản hiện tại không có quyền admin; thao tác cấu hình trả về 404. Sau khi Pages được bật và PR được merge, kiểm tra các URL mở được khi chưa đăng nhập:
   - `https://thanhtris.github.io/IE307/privacy/`
   - `https://thanhtris.github.io/IE307/terms/`
   - `https://thanhtris.github.io/IE307/delete-account/`
   - `https://thanhtris.github.io/IE307/support/`
4. Chạy workflow deploy, kiểm tra trang đã render và cập nhật `CHECKS.md` với run, URL, revision và kết quả review.
5. Chủ dự án kiểm tra biểu mẫu Play Console hiện hành, duyệt `STORE_PRIVACY_ANSWERS.md` và tự nộp khi kế hoạch phát hành cho phép.
6. Hoàn tất GM-53 trước GM-59 vì trang xóa tài khoản hiện mô tả khả năng xóa từ ứng dụng theo thời điểm tính năng được hỗ trợ. Nếu bật Sentry hoặc push trong đợt sau, cập nhật chính sách và `STORE_PRIVACY_ANSWERS.md` trước khi phát hành đợt đó.

`python scripts/task_readiness.py --task GM-50 --gate merge --base-ref origin/main --verify-outputs` trả về `READY_FOR_MERGE_REVIEW` ngày 2026-11-25 cho target `d9332f73679eead23844ec927515c5ca623c9e`. PR #219 đang mở để review; trạng thái Project và phê duyệt không thay đổi.
