# GM-50 — Kiểm tra

Trạng thái: bản triển khai đang được review trên `codex/gm50-legal-pages`. Website công khai chưa được triển khai; chưa nộp biểu mẫu của store.

## Phạm vi và bằng chứng

| Hạng mục | Trạng thái | Bằng chứng / giới hạn |
| --- | --- | --- |
| Chính sách quyền riêng tư, tóm tắt tiếng Anh, điều khoản, hỗ trợ, hướng dẫn xóa tài khoản | Đã chuẩn bị để review | `docs/legal/`; tên nhà phát hành và email liên hệ đã được cung cấp; nội dung đối chiếu với mã nguồn và phạm vi Android v1 hiện tại. Ngày hiệu lực/cập nhật: 2026-11-26. |
| Nhóm dữ liệu và bên xử lý thứ ba | Đã soạn; cần đối chiếu lại với build phát hành | Đã rà luồng Supabase/Auth và Google Places trong mã nguồn; push ngoài phạm vi release hiện tại; crash reporting phụ thuộc cấu hình Sentry của build cuối. |
| Mô tả lưu trữ và xóa | Đã soạn; cần chủ vận hành xác nhận chính sách backup | Đã đối chiếu với mã nguồn/migration: lịch sử tối đa 30 ngày và chỉ lưu khi bật (0021/0024/0029); lời mời hết hạn sau 7 ngày (0022/0038/0052); dữ liệu phòng được dọn sau khi kết thúc/hết hạn cộng 24 giờ (0004/0019); cache/outbox hết hạn sau 24 giờ (`outbox.ts`). Migration GM-49 mô tả dọn tài khoản và ẩn danh lịch sử nhóm. Chính sách backup production không có trong repo. |
| URL công khai ổn định | Chưa kiểm tra | Đã ghi các URL Pages dự kiến; website chưa được triển khai. |
| Luồng yêu cầu xóa trên web | Đã chuẩn bị; chưa hoạt động trước khi triển khai | Trang tĩnh có liên kết email trực tiếp tới 23521645@gm.uit.edu.vn và mô tả quy trình thủ công của GM-49; Pages chưa được triển khai. |
| Workflow GitHub Pages | Build PR thành công | Job Jekyll `build` thành công trên PR #219 ở commit `8dc9f10` (run `45449865157`); deploy được bỏ qua cho sự kiện PR và chỉ chạy trên `main`. |
| Google Play Data safety / phân loại nội dung | Chỉ có mapping dự thảo | Phải khớp chính xác APK/AAB và biểu mẫu store đang dùng; chưa nộp. |
| Apple App Privacy | Tài liệu tham khảo; iOS hoãn | iOS/App Store hoãn theo GM-60, không thuộc hồ sơ nộp v1. Chỉ xem xét lại khi kế hoạch iOS được mở lại và có build tương ứng. |
| Tên nhà phát hành | Đã cung cấp | Nguyễn Thanh Trí, chủ dự án cung cấp ngày 2026-11-24. |
| Email liên hệ | Đã xác nhận | 23521645@gm.uit.edu.vn, chủ dự án cung cấp ngày 2026-11-24. |
| Cấu hình GitHub Pages | Chưa bật; thiếu quyền quản trị | API trả về 404 cho thao tác đọc/tạo Pages; tài khoản hiện tại chỉ có quyền `push`, không có quyền `admin`. Cần quản trị viên repo bật Settings → Pages → Source: GitHub Actions. |
| URL công khai sau triển khai | Chưa kiểm tra | Chỉ xác nhận sau khi Pages deploy thành công; chưa được đánh dấu là URL hoạt động. |

## Xác thực

- `python scripts/task_readiness.py --task GM-50 --gate merge --base-ref origin/main --verify-outputs` trả về `READY_FOR_MERGE_REVIEW` ngày 2026-11-25, snapshot đích `d9332f73679eead23844ec927515c5ca623c9e`; các phụ thuộc Project #2 là GM-21 và GM-23 ở trạng thái Done.
- `python scripts/validate_repository.py` đã chạy thành công sau khi thay liên kết template Jekyll bằng URL Pages ổn định.
- GitHub Pages Jekyll build thành công trên PR #219 ở `8dc9f10` (run `45449865157`); deploy được bỏ qua do đây là sự kiện PR.
- CI của PR #219 trước cập nhật này đều xanh, gồm kiểm tra repo và Jekyll build. Chưa chạy deployment, rà APK/AAB, hay nộp biểu mẫu store trong môi trường này.
