# GM-56 — Test tự động phía app cho các ca còn thiếu

Tài liệu này ghi các ca của [bộ test case](TEST_CASES.md) mà GM-56 lấp bằng test Jest, và các ca phía app còn chưa có test tự động cùng lý do. Test mới nối vào ca bằng tag `TC-XXX-NNN` trong tên test, không sửa file case của GM-55. Kết quả chạy xem [CHECKS](../evidence/roadmap-v2/GM-56/CHECKS.md).

## Đã lấp

| Ca | Test | Ghi chú |
| --- | --- | --- |
| TC-ENTRY-006 Màn không tìm thấy (route sai) | `mobile/tests/component/appEntryEdgeCases.test.tsx` | Kiểm tiêu đề, nội dung và nút về trang đầu của màn không tìm thấy. |
| TC-UI-004 Vùng chạm tối thiểu 48dp | `mobile/tests/component/appEntryEdgeCases.test.tsx` | Kiểm vùng chạm tối thiểu của AppButton và Chip; vùng chạm của mọi màn còn cần đo tay ở GM-58 (TalkBack, thiết bị). |
| TC-PREF-010 Xếp hạng khẩu vị là nâng cao, không chặn luồng chính | `mobile/tests/component/appEntryEdgeCases.test.tsx` | Kiểm lưu khẩu vị mà không đụng tới lựa chọn nâng cao; ngữ nghĩa xếp hạng nâng cao thuộc phần hoãn. |

## Còn thiếu phía app (unit, component)

| Ca | Tầng | Vì sao chưa có test | Task lấp |
| --- | --- | --- | --- |
| TC-AUTH-007 Đăng ký tài khoản email và xác minh mã | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). | GM-56 sau khi GM-35 (PR #182) merge |
| TC-AUTH-008 Đăng nhập bằng email, sai mật khẩu và đúng mật khẩu | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). | GM-56 sau khi GM-35 (PR #182) merge |
| TC-AUTH-011 Khách bị giới hạn Bạn bè, Lịch sử, Hộp thư | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). | GM-56 sau khi GM-35 (PR #182) merge |
| TC-AUTH-012 Sửa tên hồ sơ: pending, lỗi và thử lại | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). | GM-56 sau khi GM-35 (PR #182) merge |
| TC-AUTH-013 Đổi mật khẩu: chặn gửi lặp và xóa ba ô khi lỗi | component | Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56). | GM-56 sau khi GM-35 (PR #182) merge |
| TC-DATA-003 Hosted import có cờ xác nhận, dry-run, rollback | unit | Chức năng thuộc GM-51 chưa có; test thêm khi GM-51 hoàn tất. | GM-51, GM-41/GM-47 |
| TC-DATA-010 Độ phủ theo bữa và nhóm sau bổ sung dữ liệu | unit | Bundle kế tiếp thuộc GM-41/GM-47 chưa có; kiểm bằng scripts/dish_filter_coverage.py khi bàn giao. | GM-51, GM-41/GM-47 |
| TC-REL-003 Bản app cũ thấy màn Cần cập nhật khi dưới phiên bản tối thiểu | unit | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). | GM-56 sau khi tính năng của GM-54 merge |
| TC-REL-004 Không đọc được cấu hình phiên bản thì vẫn dùng được | unit | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). | GM-56 sau khi tính năng của GM-54 merge |
| TC-REL-007 Hiển thị phiên bản app | component | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). | GM-56 sau khi tính năng của GM-54 merge |
| TC-REL-008 Build release không có route dev hay nút QA | unit | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). | GM-56 sau khi tính năng của GM-54 merge |
| TC-REL-009 Mục thông báo đẩy ẩn khi chưa cấu hình | component | Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57). | GM-56 sau khi tính năng của GM-54 merge |

## Ca chạy tay (e2e): 31 ca

Các ca này cần thiết bị, iPhone hoặc staging; không có test tự động trong phạm vi release v1. Thực hiện ở GM-58 và ghi vào `docs/testing/results/`.

- TC-AUTH-009 — Khôi phục mật khẩu bằng mã gửi qua email
- TC-AUTH-014 — Xóa tài khoản trong app
- TC-IOS-001 — Quét QR vào phòng trên iPhone
- TC-IOS-002 — Từ chối camera trên iOS vẫn nhập mã tay
- TC-IOS-003 — Vị trí chỉ khi dùng và Places trên iOS
- TC-IOS-004 — Phiên khôi phục sau khi mở lại bằng Keychain
- TC-IOS-005 — Liên kết vào phòng khi lạnh và khi nóng
- TC-IOS-006 — Tai thỏ, bàn phím và cử chỉ Back
- TC-IOS-007 — Bình chọn hai vòng trên iPhone
- TC-IOS-008 — Xóa tài khoản trên iPhone
- TC-IOS-009 — Chế độ tối và chữ lớn trên iPhone
- TC-IOS-010 — Quyền thông báo trên iPhone khi chưa có push từ xa
- TC-RT-005 — Chuyển vòng khi hết giờ không cần worker (hosted)
- TC-RT-013 — Force-stop khi gửi phiếu và khôi phục ở máy thật
- TC-REL-001 — Cài mới chạy được
- TC-REL-002 — Nâng cấp từ bản trước giữ phiên
- TC-REL-005 — Backend tạm ngừng khi review store
- TC-REL-006 — Liên kết chính sách và điều khoản mở được khi chưa đăng nhập
- TC-REL-010 — Phiên bản và build ghi nhận đúng
- TC-REL-011 — Quyền camera và vị trí chỉ khi dùng, không chạy nền
- TC-REL-012 — Closed testing và hướng dẫn cho người review
- TC-SEC-006 — Không có secret trong repo và bundle
- TC-SEC-009 — Khóa Places giới hạn theo app và API
- TC-SEC-012 — Dữ liệu chỉ gửi tới Supabase và Google Places
- TC-UI-001 — Bố cục dùng được ở 320dp, 360dp và 412dp
- TC-UI-007 — Chế độ tối giữ nội dung và độ tương phản
- TC-UI-010 — Safe area và tai thỏ
- TC-UI-012 — Màn tài khoản ở 320dp và chữ 200%
- TC-UI-013 — Đối chiếu Figma cùng state ở 412dp
- TC-VOTE1-004 — Cuộn, vuốt dọc và chạm đơn không tính phiếu
- TC-VOTE1-014 — Mất mạng sau ACK không gia hạn hay đặt lại đồng hồ

## Ca phía backend

Các ca `sql` và `api` chưa có test (xóa tài khoản, hosted import, lịch tick) thuộc [GM-57](../../tasks/backlog/GM-57.md) và các task tính năng tương ứng.
