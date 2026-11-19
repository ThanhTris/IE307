# Bộ test case

Sinh từ `docs/testing/cases/*.json` bằng `python scripts/test_cases.py --write`; không sửa tay. Trạng thái lấy từ `docs/testing/results/*.json` (mặc định `Not run`, không suy từ việc có test tự động). Yêu cầu xem [REQUIREMENTS](REQUIREMENTS.md), truy vết xem [TRACEABILITY](TRACEABILITY.md), thống kê xem [TEST_REPORT](TEST_REPORT.md).

Tổng cộng 194 test case, 15 module.

## AUTH — Tài khoản và phiên (14 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-AUTH-001 | P0 | functional | component | Khách vào app với tên hợp lệ | REQ-AUTH-01 | 2 | Pass |
| TC-AUTH-002 | P0 | negative | unit | Tên khách không hợp lệ bị từ chối | REQ-AUTH-01 | 2 | Pass |
| TC-AUTH-003 | P0 | functional | unit | Đóng và mở lại app khôi phục đúng khách | REQ-AUTH-02 | 2 | Partial |
| TC-AUTH-004 | P0 | resilience | unit | Phiên bị thu hồi hoặc hết hạn | REQ-AUTH-02 | 2 | Pass |
| TC-AUTH-005 | P0 | resilience | unit | Đăng xuất xóa dữ liệu cục bộ kể cả khi offline | REQ-AUTH-07 | 2 | Pass |
| TC-AUTH-006 | P0 | security | unit | Đổi danh tính chặn thao tác của phiên cũ | REQ-AUTH-07 | 2 | Pass |
| TC-AUTH-007 | P0 | functional | component | Đăng ký tài khoản email và xác minh mã | REQ-AUTH-03 | — | Not run |
| TC-AUTH-008 | P0 | negative | component | Đăng nhập bằng email, sai mật khẩu và đúng mật khẩu | REQ-AUTH-03 | — | Not run |
| TC-AUTH-009 | P0 | functional | e2e | Khôi phục mật khẩu bằng mã gửi qua email | REQ-AUTH-03 | — | Not run |
| TC-AUTH-010 | P0 | functional | api | Liên kết khách thành tài khoản giữ nguyên UUID | REQ-AUTH-04 | — | Not run |
| TC-AUTH-011 | P0 | functional | component | Khách bị giới hạn Bạn bè, Lịch sử, Hộp thư | REQ-AUTH-05 | — | Not run |
| TC-AUTH-012 | P0 | resilience | component | Sửa tên hồ sơ: pending, lỗi và thử lại | REQ-AUTH-06 | — | Not run |
| TC-AUTH-013 | P0 | negative | component | Đổi mật khẩu: chặn gửi lặp và xóa ba ô khi lỗi | REQ-AUTH-06 | — | Not run |
| TC-AUTH-014 | P0 | functional | e2e | Xóa tài khoản trong app | REQ-AUTH-08 | — | Not run |

### TC-AUTH-001 — Khách vào app với tên hợp lệ

- **Yêu cầu:** REQ-AUTH-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Chưa có phiên; backend Auth hoạt động.
- **Dữ liệu:** Tên Unicode có dấu
- **Các bước:**
  1. Mở màn chào và chọn vào bằng khách.
  2. Nhập tên "Minh Anh" rồi xác nhận.
  3. Quan sát màn hình sau khi xác nhận.
- **Kết quả mong đợi:** Tạo đúng một khách, tên được cắt khoảng trắng hai đầu, vào Home; nút bị khóa trong khi chờ.
- **Tự động hóa:** `mobile/tests/component/guestEntryScreen.test.tsx::trimmed Unicode name is submitted once and remains locked after acceptance`, `mobile/tests/unit/authTransport.test.ts::anonymous signup sends only display name; verified user.id owns identity`

### TC-AUTH-002 — Tên khách không hợp lệ bị từ chối

- **Yêu cầu:** REQ-AUTH-01 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Chưa có phiên.
- **Dữ liệu:** Tên 0, 25 ký tự và chỉ khoảng trắng
- **Các bước:**
  1. Thử tạo khách với tên rỗng.
  2. Thử với tên 25 ký tự.
  3. Thử với tên chỉ gồm khoảng trắng.
- **Kết quả mong đợi:** Không gửi yêu cầu tới Auth, form báo lỗi tại ô tên và giữ nội dung đã nhập.
- **Tự động hóa:** `mobile/tests/unit/authTransport.test.ts::reject unsafe endpoint %s`, `mobile/tests/component/guestEntryScreen.test.tsx::failure keeps the name for explicit retry and Back does not submit`

### TC-AUTH-003 — Đóng và mở lại app khôi phục đúng khách

- **Yêu cầu:** REQ-AUTH-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci, avd
- **Tiền điều kiện:** Đã có phiên khách hợp lệ trong secure storage.
- **Các bước:**
  1. Đóng hẳn app (force-stop).
  2. Mở lại app.
  3. Kiểm tra danh tính hiển thị trên Home.
- **Kết quả mong đợi:** App xác minh phiên với server, khôi phục đúng người, không tạo khách thứ hai.
- **Tự động hóa:** `mobile/tests/unit/authSession.test.ts::restart restores the same caller after server verification`, `mobile/tests/unit/authSession.test.ts::existing secure session prevents silently creating a second guest`

### TC-AUTH-004 — Phiên bị thu hồi hoặc hết hạn

- **Yêu cầu:** REQ-AUTH-02 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Phiên khách đã lưu nhưng refresh token đã bị thu hồi.
- **Các bước:**
  1. Mở app.
  2. Quan sát màn hình và dữ liệu riêng.
- **Kết quả mong đợi:** Báo lỗi xác thực, xóa lưu trữ và cache riêng của danh tính cũ, không tự coi là khách mới.
- **Tự động hóa:** `mobile/tests/unit/authSession.test.ts::revoked refresh loses session, clears storage and private cache`, `mobile/tests/unit/roomRepository.test.ts::does not relabel a revoked stored session as a fresh guest opportunity`

### TC-AUTH-005 — Đăng xuất xóa dữ liệu cục bộ kể cả khi offline

- **Yêu cầu:** REQ-AUTH-07 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Đã đăng nhập, thiết bị mất mạng.
- **Các bước:**
  1. Chọn đăng xuất.
  2. Mở lại app.
- **Kết quả mong đợi:** Dữ liệu phiên và cache được xóa cục bộ, phản hồi nghiệp vụ đến muộn bị bỏ, về màn chào.
- **Tự động hóa:** `mobile/tests/unit/authSession.test.ts::logout clears locally even when remote revoke is offline`, `mobile/tests/unit/authSession.test.ts::business response received after logout is rejected before exposure to caller`

### TC-AUTH-006 — Đổi danh tính chặn thao tác của phiên cũ

- **Yêu cầu:** REQ-AUTH-07 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Một thao tác ghi đang chờ của phiên A, người dùng chuyển sang phiên B.
- **Các bước:**
  1. Tạm dừng bước dọn cache.
  2. Gửi một yêu cầu của phiên A.
  3. Hoàn tất chuyển phiên.
- **Kết quả mong đợi:** Yêu cầu của phiên A dừng trước khi tới transport; yêu cầu của phiên B dùng token mới.
- **Tự động hóa:** `mobile/tests/unit/authSession.test.ts::identity change returned by %s clears private data`, `mobile/tests/unit/authSession.test.ts::logout during pending refresh cannot resurrect credentials`

### TC-AUTH-007 — Đăng ký tài khoản email và xác minh mã

- **Yêu cầu:** REQ-AUTH-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Backend QA có Mailpit; email chưa đăng ký.
- **Các bước:**
  1. Mở màn đăng ký, nhập email và mật khẩu hợp lệ.
  2. Lấy mã 6 số trong hộp thư.
  3. Nhập mã và xác minh.
- **Kết quả mong đợi:** Tài khoản được tạo, mã đúng cho vào Home, mã sai báo lỗi dưới ô mã và không gọi xác minh sai chỗ.
- **Tự động hóa:** chưa có — Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56).

### TC-AUTH-008 — Đăng nhập bằng email, sai mật khẩu và đúng mật khẩu

- **Yêu cầu:** REQ-AUTH-03 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Đã có tài khoản email.
- **Các bước:**
  1. Đăng nhập với mật khẩu sai.
  2. Đăng nhập với mật khẩu đúng.
- **Kết quả mong đợi:** Mật khẩu sai hiện toast, giữ nguyên email đã nhập; mật khẩu đúng vào Home.
- **Tự động hóa:** chưa có — Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56).

### TC-AUTH-009 — Khôi phục mật khẩu bằng mã gửi qua email

- **Yêu cầu:** REQ-AUTH-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Đã có tài khoản email; Mailpit nhận thư.
- **Các bước:**
  1. Chọn quên mật khẩu và nhập email.
  2. Nhập mã và mật khẩu mới.
  3. Đăng nhập lại bằng mật khẩu mới.
- **Kết quả mong đợi:** Đặt lại được mật khẩu, phiên chính không bị mất khi chỉ khôi phục, đăng nhập bằng mật khẩu mới thành công.
- **Tự động hóa:** chưa có

### TC-AUTH-010 — Liên kết khách thành tài khoản giữ nguyên UUID

- **Yêu cầu:** REQ-AUTH-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, avd
- **Tiền điều kiện:** Đang là khách có lịch sử phòng.
- **Các bước:**
  1. Chọn liên kết tài khoản và hoàn tất xác minh email.
  2. So sánh UUID người dùng trước và sau.
- **Kết quả mong đợi:** UUID không đổi, phòng và khẩu vị còn nguyên; lỗi giữa chừng không làm mất phiên khách.
- **Tự động hóa:** chưa có — Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56).

### TC-AUTH-011 — Khách bị giới hạn Bạn bè, Lịch sử, Hộp thư

- **Yêu cầu:** REQ-AUTH-05 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Đang là khách.
- **Các bước:**
  1. Mở Bạn bè.
  2. Mở Lịch sử.
  3. Vào Hồ sơ và chỉnh Giao diện, Cỡ chữ.
- **Kết quả mong đợi:** Bạn bè và Lịch sử hiện lời mời đăng nhập; chỉnh giao diện và cỡ chữ vẫn hoạt động; tạo hoặc vào phòng vẫn dùng được.
- **Tự động hóa:** chưa có — Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56).

### TC-AUTH-012 — Sửa tên hồ sơ: pending, lỗi và thử lại

- **Yêu cầu:** REQ-AUTH-06 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Đã đăng nhập; mạng trả lỗi 503 có kiểm soát.
- **Các bước:**
  1. Sửa tên và bấm Lưu.
  2. Quan sát khi đang chờ.
  3. Thử lại khi mạng hồi phục.
- **Kết quả mong đợi:** Nút khóa trong lúc chờ, lỗi hiện toast và tên còn nguyên, thử lại nhận ACK rồi mới báo thành công.
- **Tự động hóa:** chưa có — Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56).

### TC-AUTH-013 — Đổi mật khẩu: chặn gửi lặp và xóa ba ô khi lỗi

- **Yêu cầu:** REQ-AUTH-06 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Tài khoản email; mật khẩu hiện tại cố ý sai.
- **Các bước:**
  1. Nhập ba ô mật khẩu và bấm Lưu hai lần liên tiếp.
  2. Quan sát phản hồi lỗi.
- **Kết quả mong đợi:** Chỉ một yêu cầu được gửi; lỗi hiện dưới ô mật khẩu hiện tại; cả ba ô bị xóa và nút Lưu mở lại.
- **Tự động hóa:** chưa có — Test của GM-35 nằm ở PR #182; nối vào bộ test case khi PR đó merge (GM-56).

### TC-AUTH-014 — Xóa tài khoản trong app

- **Yêu cầu:** REQ-AUTH-08 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Đã đăng nhập, có dữ liệu cá nhân và không ở trong phòng đang chơi.
- **Các bước:**
  1. Vào Hồ sơ, chọn Xóa tài khoản.
  2. Gõ chữ xác nhận (và nhập mật khẩu nếu là tài khoản email).
  3. Đăng nhập lại bằng thông tin cũ.
- **Kết quả mong đợi:** Về màn chào, token cũ không còn đọc được dữ liệu, đăng nhập cũ thất bại; người khác không bị ảnh hưởng.
- **Tự động hóa:** chưa có

## ENTRY — Khởi động, hướng dẫn và quyền (6 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ENTRY-001 | P0 | functional | component | Mở lần đầu: chào, hướng dẫn và nhập tên | REQ-ENTRY-01 | 3 | Pass |
| TC-ENTRY-002 | P0 | negative | component | Xin quyền lần đầu: từ chối vẫn dùng được app | REQ-ENTRY-02 | 3 | Pass |
| TC-ENTRY-003 | P1 | functional | api | Home tìm phòng đang tham gia | REQ-ENTRY-03 | 2 | Not run |
| TC-ENTRY-004 | P1 | functional | component | Tiếp tục phiên theo vòng hiện tại | REQ-ENTRY-03 | 3 | Pass |
| TC-ENTRY-005 | P1 | resilience | component | Lỗi mạng khi mở Home có nút thử lại | REQ-ENTRY-01 | 3 | Pass |
| TC-ENTRY-006 | P2 | negative | component | Màn không tìm thấy (route sai) | REQ-ENTRY-01 | 1 | Pass |

### TC-ENTRY-001 — Mở lần đầu: chào, hướng dẫn và nhập tên

- **Yêu cầu:** REQ-ENTRY-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Cài mới, chưa có phiên.
- **Các bước:**
  1. Mở app.
  2. Đi qua màn chào và hướng dẫn.
  3. Nhập tên khách.
- **Kết quả mong đợi:** Mở màn chào mà không tự tạo khách; sau khi xác nhận tên mới vào Home.
- **Tự động hóa:** `mobile/tests/component/guestEntryScreen.test.tsx::opening welcome and account placeholders never creates a guest; guest entry stays available`, `mobile/tests/component/tutorialScreen.test.tsx::tutorial only advances after the requested NO/OK choice`, `mobile/tests/integration/guestEntryRoute.test.tsx::confirmed no-session entry creates a guest through the existing seam only after name confirmation`

### TC-ENTRY-002 — Xin quyền lần đầu: từ chối vẫn dùng được app

- **Yêu cầu:** REQ-ENTRY-02 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Vừa đăng nhập lần đầu.
- **Các bước:**
  1. Từ chối quyền Thông báo, Camera, Vị trí.
  2. Vào Home và tạo phòng.
  3. Mở quét QR.
- **Kết quả mong đợi:** App không crash, vào được Home; tính năng cần quyền hỏi lại khi dùng và có đường nhập tay.
- **Tự động hóa:** `mobile/tests/component/permissionsWelcome.test.tsx::skipping asks for nothing and still continues`, `mobile/tests/component/permissionsWelcome.test.tsx::a refused notification permission shows a reminder; a second refusal points to Settings`, `mobile/tests/unit/appPermissions.test.ts::a first refusal is denied, and the feature asks again next time it is used`

### TC-ENTRY-003 — Home tìm phòng đang tham gia

- **Yêu cầu:** REQ-ENTRY-03 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Người dùng đang ở một phòng chưa kết thúc.
- **Các bước:**
  1. Mở lại app hoặc đăng nhập trên máy khác.
  2. Quan sát Home.
- **Kết quả mong đợi:** Home hiện thẻ tiếp tục và mở đúng màn theo trạng thái phòng.
- **Tự động hóa:** `supabase/tests/http/GM-44.http`, `mobile/tests/component/homeScreen.test.tsx::Home offers continuation only for a verified member room`

### TC-ENTRY-004 — Tiếp tục phiên theo vòng hiện tại

- **Yêu cầu:** REQ-ENTRY-03 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Phòng ở vòng 1 hoặc vòng 2.
- **Các bước:**
  1. Mở Home khi phòng ở vòng 1.
  2. Mở Home khi phòng ở vòng 2.
- **Kết quả mong đợi:** Vòng 1 có nút quay lại phòng; vòng 2 báo không thể vào lại và không có nút; trạng thái kết thúc không bị coi là đang chơi.
- **Tự động hóa:** `mobile/tests/component/returnToRoom.test.tsx::round 1 offers the way back`, `mobile/tests/component/returnToRoom.test.tsx::round 2 says the room cannot be entered again and offers no button`, `mobile/tests/component/homeScreen.test.tsx::continue does not label terminal state %s as active`

### TC-ENTRY-005 — Lỗi mạng khi mở Home có nút thử lại

- **Yêu cầu:** REQ-ENTRY-01 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Mất mạng khi mở app.
- **Các bước:**
  1. Mở app khi offline.
  2. Bật mạng và bấm thử lại.
- **Kết quả mong đợi:** Không crash, hiện lỗi rõ, thử lại hoạt động.
- **Tự động hóa:** `mobile/tests/integration/gm32ClientStates.test.tsx::G03 history without a cache reports offline failure and recovers to an empty list`, `mobile/tests/component/homeScreen.test.tsx::room network retry preserves the receipt and does not create or join`, `mobile/tests/unit/roomRepository.test.ts::retains a retryable restore error when stored credentials cannot be verified online`

### TC-ENTRY-006 — Màn không tìm thấy (route sai)

- **Yêu cầu:** REQ-ENTRY-01 · **Ưu tiên:** P2 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Mở một đường dẫn không tồn tại.
- **Các bước:**
  1. Mở liên kết sai.
- **Kết quả mong đợi:** Hiện màn không tìm thấy kèm nút về Home.
- **Tự động hóa:** `mobile/tests/component/appEntryEdgeCases.test.tsx (tag)`

## ROOM — Phòng, lobby và tham gia (21 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-ROOM-001 | P0 | functional | api | Tạo phòng 10 món cho bữa trưa | REQ-ROOM-01 | 3 | Not run |
| TC-ROOM-002 | P0 | boundary | api | Tạo phòng 20 món (giới hạn trên) | REQ-ROOM-01 | 2 | Not run |
| TC-ROOM-003 | P0 | boundary | api | Thiếu món: dùng 5–9 món hoặc báo không đủ | REQ-ROOM-01 | 4 | Not run |
| TC-ROOM-004 | P1 | functional | unit | Hẹn giờ và xung đột bữa ăn | REQ-ROOM-01 | 2 | Pass |
| TC-ROOM-005 | P0 | functional | component | Vào phòng bằng mã: xem trước rồi xác nhận | REQ-ROOM-02 | 2 | Not run |
| TC-ROOM-006 | P0 | negative | component | Mã phòng sai định dạng hoặc không tồn tại | REQ-ROOM-02 | 3 | Pass |
| TC-ROOM-007 | P0 | negative | api | Phòng hết hạn, đầy hoặc đã bắt đầu | REQ-ROOM-02 | 3 | Not run |
| TC-ROOM-008 | P0 | security | unit | Liên kết vào phòng an toàn | REQ-ROOM-02 | 3 | Pass |
| TC-ROOM-009 | P0 | functional | e2e | Quét QR vào phòng và từ chối camera | REQ-ROOM-02 | 1 | Not run |
| TC-ROOM-010 | P0 | boundary | api | Phòng đủ 20 người, người thứ 21 bị từ chối | REQ-ROOM-03 | 2 | Not run |
| TC-ROOM-011 | P0 | negative | component | Vào trùng hai lần chỉ tính một thành viên | REQ-ROOM-03 | 1 | Pass |
| TC-ROOM-012 | P1 | functional | sql | Host loại một thành viên | REQ-ROOM-03 | 2 | Not run |
| TC-ROOM-013 | P0 | functional | sql | Sẵn sàng: thành viên chưa lưu khẩu vị không được bắt đầu | REQ-ROOM-04 | 3 | Not run |
| TC-ROOM-014 | P0 | boundary | sql | Phòng một người không bắt đầu được | REQ-ROOM-04 | 2 | Not run |
| TC-ROOM-015 | P0 | security | api | Chỉ host sửa thiết lập phòng | REQ-ROOM-05 | 2 | Not run |
| TC-ROOM-016 | P0 | functional | api | Sửa không đổi hoặc chỉ đổi giờ giữ nguyên pool | REQ-ROOM-05 | 1 | Not run |
| TC-ROOM-017 | P1 | functional | sql | Vào lại phòng ở vòng 1 | REQ-ROOM-06 | 1 | Not run |
| TC-ROOM-018 | P0 | functional | api | Pool độc lập quán, GPS và giờ bán | REQ-ROOM-01 | 2 | Not run |
| TC-ROOM-019 | P0 | functional | component | Lobby tự chuyển thành viên vào vòng 1 khi host bắt đầu | REQ-ROOM-04 | 3 | Partial |
| TC-ROOM-020 | P1 | functional | component | Mời mã và QR hiển thị trong lobby | REQ-ROOM-02 | 1 | Pass |
| TC-ROOM-021 | P1 | functional | sql | Hủy phòng | REQ-ROOM-05 | 2 | Not run |

### TC-ROOM-001 — Tạo phòng 10 món cho bữa trưa

- **Yêu cầu:** REQ-ROOM-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Đăng nhập; catalogue trưa có ít nhất 10 món.
- **Các bước:**
  1. Chọn Trưa, 10 món.
  2. Xác nhận tạo phòng.
  3. Đọc lại phòng từ server.
- **Kết quả mong đợi:** Phòng lưu đúng 10 món khác nhau, mã phòng 6 ký tự, không yêu cầu vị trí.
- **Tự động hóa:** `supabase/tests/http/GM-19.http`, `supabase/tests/http/GM-20-canonical.http`, `mobile/tests/component/gm25FigmaParity.test.tsx::liveDishSetupGateway creates room via canonical dish_session v4 dispatch`

### TC-ROOM-002 — Tạo phòng 20 món (giới hạn trên)

- **Yêu cầu:** REQ-ROOM-01 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Catalogue có ít nhất 20 món cho bữa chọn.
- **Các bước:**
  1. Chọn 20 món.
  2. Tạo phòng.
- **Kết quả mong đợi:** Phòng có đúng 20 món; chọn 21 món bị chặn.
- **Tự động hóa:** `supabase/tests/http/GM-19.http`, `supabase/tests/http/GM-20-canonical.http`

### TC-ROOM-003 — Thiếu món: dùng 5–9 món hoặc báo không đủ

- **Yêu cầu:** REQ-ROOM-01 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Bữa chỉ có 7 món đủ điều kiện.
- **Các bước:**
  1. Yêu cầu 10 món.
  2. Chọn "Dùng 7 món".
  3. Lặp lại với bữa chỉ có 3 món.
- **Kết quả mong đợi:** Hộp thoại báo số món có sẵn; 5–9 món dùng được; dưới 5 món trả INSUFFICIENT_DISHES kèm số món có sẵn, không bù món.
- **Tự động hóa:** `supabase/tests/http/GM-18.http`, `mobile/tests/component/dishSetupFlow.test.tsx::shortage dialog shows requested/available separately and requires an explicit confirmation`, `mobile/tests/component/dishSetupFlow.test.tsx::below five only offers to change the time and never creates a room`, `mobile/tests/component/dishSetupFlow.test.tsx::7 of 15 dishes: "Dùng 7 món" creates the room with 7 dishes`

### TC-ROOM-004 — Hẹn giờ và xung đột bữa ăn

- **Yêu cầu:** REQ-ROOM-01 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Đang thiết lập phòng.
- **Các bước:**
  1. Chọn Hẹn giờ ngoài khung giờ của bữa.
  2. Chọn từng phương án giải quyết xung đột.
- **Kết quả mong đợi:** App báo bữa tương ứng với giờ đó; chọn giữ giờ thì đổi bữa, giữ bữa thì đưa giờ vào khung; ăn vặt và "ngay" không xung đột.
- **Tự động hóa:** `mobile/tests/unit/mealTimeConflict.test.ts::an hour outside the window reports the meal that hour belongs to`, `mobile/tests/unit/dishSetupTimePolicy.test.ts::schedule default advances fifteen displayed minutes and rolls the date at midnight`

### TC-ROOM-005 — Vào phòng bằng mã: xem trước rồi xác nhận

- **Yêu cầu:** REQ-ROOM-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** Có phòng mở, người vào là người thứ hai.
- **Các bước:**
  1. Nhập mã phòng.
  2. Xem màn xem trước.
  3. Bấm xác nhận vào phòng.
- **Kết quả mong đợi:** Xem trước chỉ hiện số người, không đổi số thành viên; chỉ lần xác nhận mới tham gia, một lần duy nhất.
- **Tự động hóa:** `mobile/tests/component/joinRoomEntry.test.tsx::preview shows count only, ignores supplied private fields, and confirmation is the only join mutation`, `supabase/tests/http/GM-22.http`

### TC-ROOM-006 — Mã phòng sai định dạng hoặc không tồn tại

- **Yêu cầu:** REQ-ROOM-02 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Đang ở màn vào phòng.
- **Các bước:**
  1. Nhập mã 5 ký tự.
  2. Nhập mã chứa ký tự 0, O, 1, I.
  3. Nhập mã 6 ký tự không có phòng.
- **Kết quả mong đợi:** Không xem trước hay vào phòng; báo lỗi và giữ mã đã nhập để sửa.
- **Tự động hóa:** `mobile/tests/component/joinRoomEntry.test.tsx::invalid code %s never previews or joins`, `mobile/tests/component/roomCodeField.test.tsx::pasting a whole code fills all cells once, including when replacing from a middle cell`, `mobile/tests/unit/joinLinks.test.ts::rejects invalid room codes (wrong length or excluded chars: 0, O, 1, I)`

### TC-ROOM-007 — Phòng hết hạn, đầy hoặc đã bắt đầu

- **Yêu cầu:** REQ-ROOM-02 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Ba phòng ở các trạng thái hết hạn, đủ 20 người, đã vào vòng 1.
- **Các bước:**
  1. Dùng mã của từng phòng để xem trước và vào.
- **Kết quả mong đợi:** Mỗi trường hợp báo lỗi riêng, rõ ràng; không ai vào được.
- **Tự động hóa:** `supabase/tests/http/GM-22.http`, `mobile/tests/component/gm25FigmaParity.test.tsx::displays error states for full or expired room preview`, `supabase/tests/database/ADR-027_room_rejoin.test.sql`

### TC-ROOM-008 — Liên kết vào phòng an toàn

- **Yêu cầu:** REQ-ROOM-02 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Có liên kết dạng gi-cung-duoc://join/ABC234 hoặc https tên miền cho phép.
- **Các bước:**
  1. Mở liên kết hợp lệ.
  2. Mở liên kết khác tên miền, có userinfo, có token trong query.
- **Kết quả mong đợi:** Liên kết hợp lệ điền mã phòng (vẫn cần xác nhận); liên kết lạ bị từ chối với thông báo "Liên kết bị chặn" và còn đường nhập mã tay.
- **Tự động hóa:** `mobile/tests/unit/joinLinks.test.ts::parses custom scheme with path (gi-cung-duoc://join/XYZ789)`, `mobile/tests/unit/joinLinks.test.ts::rejects disallowed web hosts (e.g. phishing / external domain)`, `mobile/tests/unit/joinLinks.test.ts::rejects suspicious payloads containing tokens or passwords in query params`

### TC-ROOM-009 — Quét QR vào phòng và từ chối camera

- **Yêu cầu:** REQ-ROOM-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Máy thật có camera.
- **Các bước:**
  1. Chọn quét QR và cho phép camera.
  2. Quét mã của phòng.
  3. Lặp lại khi từ chối quyền camera.
- **Kết quả mong đợi:** Quét thành công hiện màn xác nhận trước khi vào; từ chối quyền vẫn giữ ô nhập mã tay.
- **Tự động hóa:** `mobile/tests/component/joinRoomEntry.test.tsx::QR %s always retains manual entry and never auto-joins`

### TC-ROOM-010 — Phòng đủ 20 người, người thứ 21 bị từ chối

- **Yêu cầu:** REQ-ROOM-03 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng có 20 thành viên.
- **Các bước:**
  1. Người thứ 21 xem trước và xác nhận vào.
- **Kết quả mong đợi:** Từ chối với lỗi phòng đầy; số thành viên giữ 20.
- **Tự động hóa:** `supabase/tests/http/GM-19.http`, `supabase/tests/http/GM-22.http`

### TC-ROOM-011 — Vào trùng hai lần chỉ tính một thành viên

- **Yêu cầu:** REQ-ROOM-03 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Người dùng đã bấm xác nhận vào phòng.
- **Các bước:**
  1. Bấm xác nhận liên tiếp.
  2. Mất mạng giữa chừng rồi thử lại cùng yêu cầu.
- **Kết quả mong đợi:** Chỉ một lần tham gia; thử lại dùng lại cùng request id.
- **Tự động hóa:** `mobile/tests/component/joinRoomEntry.test.tsx::unknown join retry reuses frozen input/request ID; new route code and duplicate clicks cannot replace it`

### TC-ROOM-012 — Host loại một thành viên

- **Yêu cầu:** REQ-ROOM-03 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng có host và thành viên.
- **Các bước:**
  1. Host loại thành viên.
  2. Thành viên đọc lại phòng.
- **Kết quả mong đợi:** Thành viên bị loại không còn đọc được dữ liệu phòng (RLS).
- **Tự động hóa:** `supabase/tests/database/GM-19_room_lifecycle.test.sql`, `supabase/tests/http/GM-45.http`

### TC-ROOM-013 — Sẵn sàng: thành viên chưa lưu khẩu vị không được bắt đầu

- **Yêu cầu:** REQ-ROOM-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Phòng có host và một thành viên chưa lưu khẩu vị.
- **Các bước:**
  1. Host bấm bắt đầu.
  2. Thành viên lưu khẩu vị.
  3. Host bấm bắt đầu lại.
- **Kết quả mong đợi:** Lần đầu bị từ chối MEMBERS_NOT_READY (409); lần hai bắt đầu được; host luôn sẵn sàng.
- **Tự động hóa:** `supabase/tests/database/ADR-028_lobby_ready.test.sql`, `mobile/tests/component/gm25FigmaParity.test.tsx::the host cannot start while a member is still choosing their taste`, `mobile/tests/unit/readyQueue.test.ts::ready requests for a room are sent one at a time, in the order asked`

### TC-ROOM-014 — Phòng một người không bắt đầu được

- **Yêu cầu:** REQ-ROOM-04 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng chỉ có host.
- **Các bước:**
  1. Host bấm bắt đầu.
- **Kết quả mong đợi:** Từ chối NOT_ENOUGH_MEMBERS; phòng vẫn ở LOBBY.
- **Tự động hóa:** `supabase/tests/database/GM-19_room_lifecycle.test.sql`, `supabase/tests/http/GM-19.http`

### TC-ROOM-015 — Chỉ host sửa thiết lập phòng

- **Yêu cầu:** REQ-ROOM-05 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Phòng có host và thành viên.
- **Các bước:**
  1. Thành viên gọi sửa thiết lập.
  2. Host sửa thiết lập.
- **Kết quả mong đợi:** Thành viên bị từ chối; host sửa được; màn thành viên hiện chỉ đọc kèm thông báo.
- **Tự động hóa:** `supabase/tests/http/GM-19-settings-v4.http`, `mobile/tests/component/memberSetupFlow.test.tsx::member starts on preferences, saves once and reaches the lobby without touching room settings`

### TC-ROOM-016 — Sửa không đổi hoặc chỉ đổi giờ giữ nguyên pool

- **Yêu cầu:** REQ-ROOM-05 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng đã có pool khóa.
- **Các bước:**
  1. Host gửi sửa y hệt.
  2. Host chỉ đổi giờ.
- **Kết quả mong đợi:** Pool và poolVersion không đổi; yêu cầu mới tăng version phòng; ACK replay không tăng.
- **Tự động hóa:** `supabase/tests/http/GM-19-settings-v4.http`

### TC-ROOM-017 — Vào lại phòng ở vòng 1

- **Yêu cầu:** REQ-ROOM-06 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Thành viên đã rời phòng đang ở vòng 1.
- **Các bước:**
  1. Mở lại app và vào lại phòng.
- **Kết quả mong đợi:** Vào lại được và thấy đúng vòng hiện tại; người chưa từng vào thì không vào được khi đã bắt đầu.
- **Tự động hóa:** `supabase/tests/database/ADR-027_room_rejoin.test.sql`

### TC-ROOM-018 — Pool độc lập quán, GPS và giờ bán

- **Yêu cầu:** REQ-ROOM-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Người dùng từ chối vị trí.
- **Các bước:**
  1. Tạo phòng 10 món khi tắt vị trí.
- **Kết quả mong đợi:** Tạo được phòng; pool không lọc theo quán, vị trí hay giờ bán.
- **Tự động hóa:** `supabase/tests/http/GM-40.http`, `mobile/tests/component/createRoomEntry.test.tsx::entry is honest about a missing setup artifact and never asks for GPS or creates a room`

### TC-ROOM-019 — Lobby tự chuyển thành viên vào vòng 1 khi host bắt đầu

- **Yêu cầu:** REQ-ROOM-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Hai client trong cùng phòng.
- **Các bước:**
  1. Host bấm bắt đầu.
  2. Quan sát màn của thành viên (không tải lại).
- **Kết quả mong đợi:** Thành viên tự vào màn bình chọn một lần cho mỗi cặp phòng–tài khoản; polling bỏ phản hồi cũ.
- **Tự động hóa:** `mobile/tests/component/gm25FigmaParity.test.tsx::opens voting once when poll reads %s for a member`, `mobile/tests/component/gm25FigmaParity.test.tsx::opens voting once when manual reload reads %s for a member`, `mobile/tests/component/lobbySnapshotLifecycle.test.tsx::keeps the lobby ready when the initial load settles with a late %s`

### TC-ROOM-020 — Mời mã và QR hiển thị trong lobby

- **Yêu cầu:** REQ-ROOM-02 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Host ở lobby.
- **Các bước:**
  1. Mở khối chia sẻ mã.
  2. Sao chép mã.
- **Kết quả mong đợi:** Hiện mã, QR và nút sao chép/chia sẻ; sao chép được mã đúng.
- **Tự động hóa:** `mobile/tests/component/gm30FigmaParity.test.tsx::renders modal title, room code badge, QR matrix, copy button and triggers actions`

### TC-ROOM-021 — Hủy phòng

- **Yêu cầu:** REQ-ROOM-05 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Host trong lobby.
- **Các bước:**
  1. Host hủy phòng.
  2. Thành viên mở lại phòng.
- **Kết quả mong đợi:** Phòng ở trạng thái CANCELLED, thành viên thấy phòng đã đóng.
- **Tự động hóa:** `supabase/tests/database/GM-19_room_lifecycle.test.sql`, `mobile/tests/component/dishSetupRepair.test.tsx::lost cancellation acknowledgement replays the same intent and never cancels twice`

## PREF — Khẩu vị và bộ lọc (10 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-PREF-001 | P0 | functional | component | Lưu khẩu vị mặc định theo tài khoản | REQ-PREF-01 | 2 | Pass |
| TC-PREF-002 | P0 | privacy | api | Chỉ chính chủ đọc khẩu vị thô | REQ-PREF-01 | 2 | Not run |
| TC-PREF-003 | P0 | functional | sql | Bộ lọc nhiều nhãn chỉ ưu tiên mềm | REQ-PREF-02 | 2 | Not run |
| TC-PREF-004 | P1 | boundary | sql | Món thiếu nhãn không bị trừ điểm | REQ-PREF-02 | 1 | Not run |
| TC-PREF-005 | P1 | functional | component | Tránh món gần đây chỉ hiện khi có lịch sử | REQ-PREF-03 | 1 | Pass |
| TC-PREF-006 | P1 | boundary | sql | Món gần đây xếp cuối nhưng vẫn được chọn khi thiếu món | REQ-PREF-03 | 1 | Not run |
| TC-PREF-007 | P0 | resilience | component | Lỗi lưu khẩu vị giữ lựa chọn và cho thử lại | REQ-PREF-01 | 1 | Pass |
| TC-PREF-008 | P1 | functional | component | Bỏ qua khẩu vị vẫn vào được phòng | REQ-PREF-01 | 2 | Not run |
| TC-PREF-009 | P0 | privacy | api | Khẩu vị người khác không lộ qua polling | REQ-VOTE-09 | 2 | Not run |
| TC-PREF-010 | P2 | functional | component | Xếp hạng khẩu vị là nâng cao, không chặn luồng chính | REQ-PREF-02 | 1 | Pass |

### TC-PREF-001 — Lưu khẩu vị mặc định theo tài khoản

- **Yêu cầu:** REQ-PREF-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Đăng nhập.
- **Các bước:**
  1. Chọn khẩu vị và lưu.
  2. Tạo phòng mới.
- **Kết quả mong đợi:** Khẩu vị được nạp sẵn từ mặc định tài khoản và chụp riêng cho phòng.
- **Tự động hóa:** `mobile/tests/component/memberSetupFlow.test.tsx::member starts on preferences, saves once and reaches the lobby without touching room settings`, `mobile/tests/component/gm25FigmaParity.test.tsx::renders dish preferences with Anything choice, skip, save actions and privacy note`

### TC-PREF-002 — Chỉ chính chủ đọc khẩu vị thô

- **Yêu cầu:** REQ-PREF-01 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Hai thành viên chọn khẩu vị khác nhau.
- **Các bước:**
  1. Mỗi người đọc snapshot phòng.
  2. Host đọc snapshot phòng.
- **Kết quả mong đợi:** Mỗi người chỉ thấy khẩu vị của mình; snapshot chỉ có dữ liệu công khai của thành viên.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `supabase/tests/database/ADR-024_preference_ranking.test.sql`

### TC-PREF-003 — Bộ lọc nhiều nhãn chỉ ưu tiên mềm

- **Yêu cầu:** REQ-PREF-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Catalogue có món đa nhãn.
- **Các bước:**
  1. Chọn nhóm "Bún / Phở" và vị cay.
  2. Bắt đầu phòng.
- **Kết quả mong đợi:** Món khớp bất kỳ nhãn nào được xếp trước; không món nào bị loại khỏi pool.
- **Tự động hóa:** `supabase/tests/database/ADR-025_multi_label_filters.test.sql`, `supabase/tests/database/ADR-024_preference_ranking.test.sql`

### TC-PREF-004 — Món thiếu nhãn không bị trừ điểm

- **Yêu cầu:** REQ-PREF-02 · **Ưu tiên:** P1 · **Loại:** boundary · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Có món không có nhóm, miền, vị.
- **Các bước:**
  1. Chọn bộ lọc rồi bắt đầu.
- **Kết quả mong đợi:** Món thiếu nhãn vẫn ở trong pool, chỉ không được cộng điểm.
- **Tự động hóa:** `supabase/tests/database/ADR-025_multi_label_filters.test.sql`

### TC-PREF-005 — Tránh món gần đây chỉ hiện khi có lịch sử

- **Yêu cầu:** REQ-PREF-03 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Tài khoản có và không có lịch sử cá nhân còn hạn.
- **Các bước:**
  1. Mở màn khẩu vị với từng tài khoản.
- **Kết quả mong đợi:** Ô hiện khi consent bật và có lịch sử còn hạn; ngược lại ẩn.
- **Tự động hóa:** `mobile/tests/component/dishSetupRepair.test.tsx::recent-history helper stays in the checkbox row and does not disable the preference`

### TC-PREF-006 — Món gần đây xếp cuối nhưng vẫn được chọn khi thiếu món

- **Yêu cầu:** REQ-PREF-03 · **Ưu tiên:** P1 · **Loại:** boundary · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Người có avoidRecent bật và lịch sử gần đây.
- **Các bước:**
  1. Bắt đầu phòng với catalogue ít món.
- **Kết quả mong đợi:** Món gần đây ở cuối bốc thăm; vẫn được dùng khi không đủ món khác.
- **Tự động hóa:** `supabase/tests/database/ADR-028_lobby_ready.test.sql`

### TC-PREF-007 — Lỗi lưu khẩu vị giữ lựa chọn và cho thử lại

- **Yêu cầu:** REQ-PREF-01 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Mạng lỗi khi lưu.
- **Các bước:**
  1. Lưu khẩu vị.
  2. Bật lại mạng và thử lại.
- **Kết quả mong đợi:** Lựa chọn còn nguyên, có nút thử lại, lưu lại được.
- **Tự động hóa:** `mobile/tests/component/dishSetupFlow.test.tsx::save rejection retains own choices for retry; account defaults stay unchanged`

### TC-PREF-008 — Bỏ qua khẩu vị vẫn vào được phòng

- **Yêu cầu:** REQ-PREF-01 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** Thành viên mới vào phòng.
- **Các bước:**
  1. Bấm Bỏ qua ở màn khẩu vị.
- **Kết quả mong đợi:** Vào lobby, được tính là sẵn sàng theo luật hiện hành.
- **Tự động hóa:** `mobile/tests/component/dishPreferences.test.tsx::unknown taxonomy is disabled; skip is explicit and does not expose another member`, `supabase/tests/database/ADR-028_lobby_ready.test.sql`

### TC-PREF-009 — Khẩu vị người khác không lộ qua polling

- **Yêu cầu:** REQ-VOTE-09 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng đang ở lobby.
- **Các bước:**
  1. Poll snapshot phòng bằng token của người ngoài và thành viên.
- **Kết quả mong đợi:** Người ngoài bị từ chối; thành viên không thấy khẩu vị người khác.
- **Tự động hóa:** `supabase/tests/http/GM-17.http`, `supabase/tests/http/GM-45.http`

### TC-PREF-010 — Xếp hạng khẩu vị là nâng cao, không chặn luồng chính

- **Yêu cầu:** REQ-PREF-02 · **Ưu tiên:** P2 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Người dùng bỏ qua phần xếp hạng nâng cao.
- **Các bước:**
  1. Bắt đầu phòng mà không dùng xếp hạng.
- **Kết quả mong đợi:** Luồng vào phòng và bầu chọn không bị chặn.
- **Tự động hóa:** `mobile/tests/component/appEntryEdgeCases.test.tsx (tag)`

## VOTE1 — Bình chọn vòng 1 và chờ kết quả (22 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-VOTE1-001 | P0 | functional | component | Ba nút WANT, OK, NO bắt đầu ở UNSET | REQ-VOTE-01 | 2 | Pass |
| TC-VOTE1-002 | P0 | negative | component | Gửi phiếu chỉ bật khi đã chọn đủ mọi món | REQ-VOTE-01 | 1 | Pass |
| TC-VOTE1-003 | P0 | functional | component | Chạm đúp luôn đặt WANT, không bật tắt | REQ-VOTE-01 | 1 | Pass |
| TC-VOTE1-004 | P0 | negative | e2e | Cuộn, vuốt dọc và chạm đơn không tính phiếu | REQ-VOTE-01 | — | Not run |
| TC-VOTE1-005 | P0 | accessibility | component | Thay thế cử chỉ bằng nút và thao tác TalkBack | REQ-UI-03 | 1 | Partial |
| TC-VOTE1-006 | P0 | functional | component | Gửi phiếu: pending rồi ACK khóa phiếu | REQ-VOTE-02 | 3 | Pass |
| TC-VOTE1-007 | P0 | resilience | unit | Gửi lại cùng request id không nhân đôi phiếu | REQ-VOTE-02 | 3 | Not run |
| TC-VOTE1-008 | P0 | resilience | component | Lỗi gửi phiếu giữ lựa chọn và cho thử lại | REQ-VOTE-02 | 2 | Pass |
| TC-VOTE1-009 | P0 | resilience | unit | Phiếu đã ACK chặn ghi đè sau khi mở lại app | REQ-RT-03 | 2 | Partial |
| TC-VOTE1-010 | P0 | functional | api | Có người thắng ở vòng 1 khi mọi người cùng WANT | REQ-VOTE-03 | 2 | Not run |
| TC-VOTE1-011 | P0 | functional | api | Không có winner thì mở vòng 2 với món sống sót | REQ-VOTE-03 | 2 | Not run |
| TC-VOTE1-012 | P0 | boundary | api | Mọi món bị NO thì kết thúc ở vòng 1 | REQ-VOTE-03 | 2 | Not run |
| TC-VOTE1-013 | P0 | functional | api | Đồng hồ 60 giây bắt đầu từ lần vào phòng chờ đầu tiên | REQ-VOTE-04 | 2 | Not run |
| TC-VOTE1-014 | P0 | resilience | e2e | Mất mạng sau ACK không gia hạn hay đặt lại đồng hồ | REQ-VOTE-04 | — | Not run |
| TC-VOTE1-015 | P0 | boundary | unit | Chốt sớm cần hơn một nửa roster đã ACK | REQ-VOTE-05 | 3 | Pass |
| TC-VOTE1-016 | P0 | security | component | Chỉ host mới có nút chốt sớm | REQ-VOTE-05 | 1 | Pass |
| TC-VOTE1-017 | P0 | resilience | api | Hết 60 giây với một phiếu hợp lệ vẫn chuyển vòng | REQ-VOTE-06 | 1 | Not run |
| TC-VOTE1-018 | P0 | resilience | component | Thành viên chưa gửi tự sang vòng 2 khi server hết giờ | REQ-VOTE-06 | 1 | Partial |
| TC-VOTE1-019 | P0 | resilience | component | Polling nền dừng khi rời màn và có backoff | REQ-RT-04 | 2 | Pass |
| TC-VOTE1-020 | P0 | privacy | api | Phiếu của người khác không lộ khi chờ | REQ-VOTE-09 | 2 | Not run |
| TC-VOTE1-021 | P0 | resilience | unit | Snapshot cũ không ghi đè snapshot mới | REQ-RT-04 | 2 | Pass |
| TC-VOTE1-022 | P1 | security | unit | Ban nháp phiếu tách theo danh tính, phòng, vòng | REQ-AUTH-07 | 1 | Pass |

### TC-VOTE1-001 — Ba nút WANT, OK, NO bắt đầu ở UNSET

- **Yêu cầu:** REQ-VOTE-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Phòng ở vòng 1, người chơi chưa chọn gì.
- **Các bước:**
  1. Mở màn bình chọn.
  2. Quan sát thẻ món đầu tiên.
- **Kết quả mong đợi:** Một thẻ mỗi lần, ba nút WANT, OK, NO luôn hiện và chưa nút nào được chọn.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Ba nút WANT, OK, NO luôn hiện và bắt đầu ở trạng thái UNSET`, `mobile/tests/component/gm26FigmaParity.test.tsx::renders the flashcard deck and records WANT/OK/NO; the last answer sends the ballot`

### TC-VOTE1-002 — Gửi phiếu chỉ bật khi đã chọn đủ mọi món

- **Yêu cầu:** REQ-VOTE-01 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Phòng 10 món, đã chọn 9 món.
- **Các bước:**
  1. Kiểm tra nút Gửi.
  2. Chọn nốt món cuối.
- **Kết quả mong đợi:** UNSET khác OK: nút Gửi chỉ bật khi đã chọn đủ cho tất cả món.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::UNSET khác OK: nút Gửi chỉ bật khi đã chọn đủ phiếu cho tất cả các món`

### TC-VOTE1-003 — Chạm đúp luôn đặt WANT, không bật tắt

- **Yêu cầu:** REQ-VOTE-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Thẻ món ở trạng thái UNSET, OK hoặc NO.
- **Các bước:**
  1. Chạm đúp lên thẻ ở từng trạng thái.
  2. Chạm đúp lần nữa.
- **Kết quả mong đợi:** Thẻ chuyển WANT và giữ WANT, không về UNSET, không tự gửi.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Double-tap đặt WANT từ UNSET, OK, NO và lặp lại vẫn là WANT (không toggle về UNSET, không tự gửi)`

### TC-VOTE1-004 — Cuộn, vuốt dọc và chạm đơn không tính phiếu

- **Yêu cầu:** REQ-VOTE-01 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Đang xem thẻ món.
- **Các bước:**
  1. Vuốt dọc để cuộn.
  2. Chạm đơn lên thẻ.
  3. Mở chi tiết bằng nút.
- **Kết quả mong đợi:** Không phiếu nào thay đổi; chi tiết mở bằng nút, không bằng chạm đơn.
- **Tự động hóa:** chưa có

### TC-VOTE1-005 — Thay thế cử chỉ bằng nút và thao tác TalkBack

- **Yêu cầu:** REQ-UI-03 · **Ưu tiên:** P0 · **Loại:** accessibility · **Tầng:** component · **Môi trường:** ci, android
- **Tiền điều kiện:** Bật TalkBack.
- **Các bước:**
  1. Duyệt thẻ bằng TalkBack.
  2. Dùng nút WANT/OK/NO thay vì vuốt.
- **Kết quả mong đợi:** Mọi hành động có nút thay thế, có nhãn đọc được.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Flashcard Vòng 1: một thẻ mỗi lần, cử chỉ (thao tác TalkBack), Hoàn tác trên header, xong thẻ cuối là tự gửi`

### TC-VOTE1-006 — Gửi phiếu: pending rồi ACK khóa phiếu

- **Yêu cầu:** REQ-VOTE-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Đã chọn đủ phiếu.
- **Các bước:**
  1. Bấm Gửi.
  2. Quan sát khi chờ.
  3. Nhận ACK.
- **Kết quả mong đợi:** Pending khóa tương tác; sau ACK phiếu bị khóa, không sửa hay nộp lại.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Trạng thái Pending hiển thị rõ ràng và khóa tương tác trong khi chờ phản hồi`, `mobile/tests/component/votingScreens.test.tsx::Sau ACK: khóa toàn bộ phiếu, không thể sửa hay nộp lại trùng`, `mobile/tests/component/gm26FigmaParity.test.tsx::submits ballot via VoteRepository, enters pending state, and locks interaction on ACK`

### TC-VOTE1-007 — Gửi lại cùng request id không nhân đôi phiếu

- **Yêu cầu:** REQ-VOTE-02 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** Mất mạng ngay khi gửi, kết quả chưa rõ.
- **Các bước:**
  1. Gửi phiếu.
  2. Thử lại với cùng request id.
  3. Thử với request id cũ nhưng nội dung khác.
- **Kết quả mong đợi:** Lần thử lại nhận biên nhận đã lưu; request id dùng lại với nội dung khác bị từ chối.
- **Tự động hóa:** `mobile/tests/unit/voteRepository.test.ts::preserves idempotency and returns cached receipt on retry with identical requestId`, `mobile/tests/unit/voteRepository.test.ts::rejects reused requestId with mismatched payload (F6)`, `supabase/tests/http/GM-20.http`

### TC-VOTE1-008 — Lỗi gửi phiếu giữ lựa chọn và cho thử lại

- **Yêu cầu:** REQ-VOTE-02 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Server trả lỗi khi gửi.
- **Các bước:**
  1. Bấm Gửi.
  2. Bấm Thử lại khi mạng ổn.
- **Kết quả mong đợi:** Lựa chọn còn nguyên, thử lại thành công và không gửi trùng.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Mô phỏng lỗi nộp phiếu (Error state fixture) và nút Thử lại gửi thành công`, `mobile/tests/component/gm26FigmaParity.test.tsx::handles error state gracefully and allows retry without losing choices`

### TC-VOTE1-009 — Phiếu đã ACK chặn ghi đè sau khi mở lại app

- **Yêu cầu:** REQ-RT-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci, avd
- **Tiền điều kiện:** Đã ACK phiếu, người chơi force-stop app.
- **Các bước:**
  1. Mở lại app.
  2. Quan sát màn bình chọn.
- **Kết quả mong đợi:** App khôi phục trạng thái chờ, không cho gửi phiếu thứ hai.
- **Tự động hóa:** `mobile/tests/component/votingSnapshotLifecycle.test.tsx::recovers the waiting transition after reopening with an ACKed ballot in ROUND_%s`, `mobile/tests/unit/gm31Outbox.test.ts::identity isolation, ACK scrub, and logout deletion apply to outbox and cache`

### TC-VOTE1-010 — Có người thắng ở vòng 1 khi mọi người cùng WANT

- **Yêu cầu:** REQ-VOTE-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Mọi thành viên đã ACK và có ít nhất một món được tất cả WANT.
- **Các bước:**
  1. Gửi phiếu của mọi thành viên.
  2. Đọc kết quả.
- **Kết quả mong đợi:** Server chọn một winner một lần, trạng thái DECIDED ở vòng 1.
- **Tự động hóa:** `supabase/tests/http/GM-20.http`, `supabase/tests/http/GM-20-canonical.http`

### TC-VOTE1-011 — Không có winner thì mở vòng 2 với món sống sót

- **Yêu cầu:** REQ-VOTE-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Không món nào được tất cả WANT; có món không bị ai NO.
- **Các bước:**
  1. Gửi phiếu hai thành viên khác nhau.
  2. Đọc trạng thái phòng.
- **Kết quả mong đợi:** Phòng sang vòng 2 với tập món bằng pool trừ hợp NO của mọi phiếu đã ACK (N≥1, kể cả N=1).
- **Tự động hóa:** `supabase/tests/http/GM-20.http`, `supabase/tests/http/DISH-POLICY-V3.http`

### TC-VOTE1-012 — Mọi món bị NO thì kết thúc ở vòng 1

- **Yêu cầu:** REQ-VOTE-03 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Hợp NO của mọi phiếu phủ toàn bộ pool.
- **Các bước:**
  1. Gửi phiếu khiến N=0.
- **Kết quả mong đợi:** Kết thúc NO_CONSENSUS với lý do EMPTY_INTERSECTION ngay ở vòng 1, không mở vòng 2.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `mobile/tests/component/dishResultStates.test.tsx::%s has the correct terminal reason and no winner/podium/places`

### TC-VOTE1-013 — Đồng hồ 60 giây bắt đầu từ lần vào phòng chờ đầu tiên

- **Yêu cầu:** REQ-VOTE-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Hai thành viên, chưa ai gửi.
- **Các bước:**
  1. Thành viên A gửi phiếu và vào phòng chờ.
  2. Đọc waitingStartedAt và deadline.
- **Kết quả mong đợi:** deadline = waitingStartedAt + 60 giây; lần ACK đầu tiên mới đặt mốc; người thứ hai không đổi mốc.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `mobile/tests/component/votingSnapshotLifecycle.test.tsx::computes the countdown using server clock offset on a skewed client`

### TC-VOTE1-014 — Mất mạng sau ACK không gia hạn hay đặt lại đồng hồ

- **Yêu cầu:** REQ-VOTE-04 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** e2e · **Môi trường:** avd, android
- **Tiền điều kiện:** Thành viên đã ACK và đang chờ.
- **Các bước:**
  1. Tắt mạng 20 giây rồi bật lại.
  2. So sánh đồng hồ và danh sách phiếu.
- **Kết quả mong đợi:** Đồng hồ vẫn theo deadline server, không có phiếu mới, không lộ phiếu người khác.
- **Tự động hóa:** chưa có

### TC-VOTE1-015 — Chốt sớm cần hơn một nửa roster đã ACK

- **Yêu cầu:** REQ-VOTE-05 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Roster khóa M thành viên.
- **Các bước:**
  1. Host bấm Chốt ngay khi A = M/2.
  2. Lặp lại khi A = floor(M/2)+1.
- **Kết quả mong đợi:** Bị chặn khi A ≤ M/2; cho phép khi A > M/2; host không chọn món thắng.
- **Tự động hóa:** `mobile/tests/unit/voteRepository.test.ts::blocks early finish when A_r is less than or equal to half the roster`, `mobile/tests/unit/voteRepository.test.ts::permits early finish only when strictly more than half has acknowledged ballots`, `mobile/tests/component/gm26FigmaParity.test.tsx::disables Chốt ngay when A_r <= M/2 and enables when quorum A_r > M/2 is reached`

### TC-VOTE1-016 — Chỉ host mới có nút chốt sớm

- **Yêu cầu:** REQ-VOTE-05 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Hai vai host và thành viên ở phòng chờ.
- **Các bước:**
  1. Mở phòng chờ bằng từng vai.
- **Kết quả mong đợi:** Thành viên không thấy hoặc không bật được nút chốt sớm.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Waiting: Countdown 60s và nút Host kết thúc chờ sớm chỉ bật khi A_r > M/2`

### TC-VOTE1-017 — Hết 60 giây với một phiếu hợp lệ vẫn chuyển vòng

- **Yêu cầu:** REQ-VOTE-06 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** api · **Môi trường:** qa-local, staging
- **Tiền điều kiện:** Phòng 3 người, chỉ một người ACK.
- **Các bước:**
  1. Chờ hết 60 giây (không dùng worker chạy tay trên hosted).
  2. Đọc trạng thái phòng.
- **Kết quả mong đợi:** Server xử lý theo quorum tối thiểu 1; phòng sang vòng 2 hoặc có kết quả, không kẹt.
- **Tự động hóa:** `supabase/tests/http/GM-20.http`

### TC-VOTE1-018 — Thành viên chưa gửi tự sang vòng 2 khi server hết giờ

- **Yêu cầu:** REQ-VOTE-06 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Thành viên chưa gửi phiếu, người khác đã hết giờ.
- **Các bước:**
  1. Giữ nguyên màn bình chọn.
  2. Server mở vòng 2.
- **Kết quả mong đợi:** App tự sang vòng 2, bản nháp chưa gửi được giữ lại.
- **Tự động hóa:** `mobile/tests/component/votingSnapshotLifecycle.test.tsx::observes the move to round two for an unsubmitted member and preserves an unsent draft before that move`

### TC-VOTE1-019 — Polling nền dừng khi rời màn và có backoff

- **Yêu cầu:** REQ-RT-04 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Màn bình chọn đang mở.
- **Các bước:**
  1. Làm server trả lỗi hoặc NOT_READY.
  2. Thoát màn hình.
- **Kết quả mong đợi:** Backoff hữu hạn, phục hồi không mất nháp, timer dọn khi unmount kể cả phản hồi đang bay.
- **Tự động hóa:** `mobile/tests/component/votingSnapshotLifecycle.test.tsx::backs off round %s errors/NOT_READY and recovers without losing a draft`, `mobile/tests/component/votingSnapshotLifecycle.test.tsx::stops round %s polling on unmount, including an in-flight response`

### TC-VOTE1-020 — Phiếu của người khác không lộ khi chờ

- **Yêu cầu:** REQ-VOTE-09 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Hai thành viên, một người đã ACK.
- **Các bước:**
  1. Người còn lại đọc snapshot và danh sách phiếu.
  2. Host đọc.
- **Kết quả mong đợi:** Chỉ thấy số người đã ACK; không có lựa chọn WANT/OK/NO của ai khác.
- **Tự động hóa:** `supabase/tests/http/GM-17.http`, `supabase/tests/http/GM-20-canonical.http`

### TC-VOTE1-021 — Snapshot cũ không ghi đè snapshot mới

- **Yêu cầu:** REQ-RT-04 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Hai phản hồi snapshot đến sai thứ tự.
- **Các bước:**
  1. Áp phản hồi version cao.
  2. Áp phản hồi version thấp đến muộn.
- **Kết quả mong đợi:** Version thấp bị bỏ, vòng và trạng thái kết thúc không thụt lùi.
- **Tự động hóa:** `mobile/tests/unit/voteSessionState.test.ts::never accepts a lower version even when it claims a forward state transition`, `mobile/tests/unit/voteSessionState.test.ts::ignores an older snapshot response after a newer version has been applied`

### TC-VOTE1-022 — Ban nháp phiếu tách theo danh tính, phòng, vòng

- **Yêu cầu:** REQ-AUTH-07 · **Ưu tiên:** P1 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Hai tài khoản dùng chung máy.
- **Các bước:**
  1. Chọn dở phiếu ở tài khoản A.
  2. Chuyển sang tài khoản B.
- **Kết quả mong đợi:** Bản nháp và biên nhận ACK không sang B và bị xóa khi đăng xuất.
- **Tự động hóa:** `mobile/tests/unit/voteSessionState.test.ts::partitions drafts and ACK receipts by scope and clears them on logout`

## VOTE2 — Bình chọn vòng 2 (13 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-VOTE2-001 | P0 | functional | component | Vòng 2 liệt kê món sống sót và giới hạn loại | REQ-VOTE-07 | 2 | Pass |
| TC-VOTE2-002 | P0 | boundary | unit | Giới hạn loại = max(1, ceil(0.30*N)) theo N | REQ-VOTE-07 | 4 | Pass |
| TC-VOTE2-003 | P0 | negative | unit | Chọn quá giới hạn bị chặn trước khi gọi server | REQ-VOTE-07 | 3 | Not run |
| TC-VOTE2-004 | P0 | boundary | component | N=1: vẫn mở vòng 2 và được phép loại món duy nhất | REQ-VOTE-07 | 3 | Pass |
| TC-VOTE2-005 | P0 | functional | api | Không tự chốt và không tự ghi KEEP cho người chưa gửi | REQ-VOTE-08 | 2 | Not run |
| TC-VOTE2-006 | P0 | boundary | api | Loại hết thì NO_CONSENSUS/ALL_REMOVED | REQ-VOTE-08 | 3 | Not run |
| TC-VOTE2-007 | P0 | functional | unit | Còn món thì chốt theo điểm vòng 1 | REQ-VOTE-08 | 3 | Not run |
| TC-VOTE2-008 | P0 | boundary | api | Hòa điểm xử lý một lần và ổn định | REQ-RES-02 | 2 | Not run |
| TC-VOTE2-009 | P1 | functional | component | Gửi vòng 2 đi thẳng tới phòng chờ không hộp xác nhận | REQ-VOTE-07 | 2 | Pass |
| TC-VOTE2-010 | P1 | functional | component | Cảnh báo khi loại hết mọi món | REQ-VOTE-08 | 1 | Pass |
| TC-VOTE2-011 | P0 | resilience | component | Vòng 2 chốt trước khi người chưa gửi nộp | REQ-VOTE-06 | 1 | Partial |
| TC-VOTE2-012 | P0 | resilience | unit | Reload giữa vòng 2 khôi phục đúng phiếu | REQ-RT-03 | 2 | Pass |
| TC-VOTE2-013 | P2 | functional | component | Nút Giữ tất cả đặt lại mọi lựa chọn | REQ-VOTE-07 | 2 | Pass |

### TC-VOTE2-001 — Vòng 2 liệt kê món sống sót và giới hạn loại

- **Yêu cầu:** REQ-VOTE-07 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Phòng vào vòng 2 với N món.
- **Các bước:**
  1. Mở màn vòng 2.
- **Kết quả mong đợi:** Chỉ hiện tên món kèm ô chọn; hiện giới hạn loại tối đa.
- **Tự động hóa:** `mobile/tests/component/roundTwoView.test.tsx::lists only dish names with an unticked box, and shows the removal limit`, `mobile/tests/component/votingScreens.test.tsx::Hiển thị banner Vòng 2, các món ứng viên và nút toggle đôi Giữ/Loại`

### TC-VOTE2-002 — Giới hạn loại = max(1, ceil(0.30*N)) theo N

- **Yêu cầu:** REQ-VOTE-07 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** N lần lượt 1, 3, 4, 7, 10, 11, 20.
- **Các bước:**
  1. Tính giới hạn loại cho từng N.
- **Kết quả mong đợi:** Giới hạn lần lượt 1, 1, 2, 3, 3, 4, 6; luôn tối thiểu 1 kể cả N=1.
- **Tự động hóa:** `mobile/tests/unit/voteRepository.test.ts::enforces cap = 1 for N = 1..3`, `mobile/tests/unit/voteRepository.test.ts::enforces cap = 2 for N = 4..6 (5 dishes already allow 2 removals)`, `mobile/tests/unit/voteRepository.test.ts::enforces cap = 3 for N = 7..10`, `mobile/tests/unit/voteRepository.test.ts::grows with the pool up to 20 dishes without float rounding errors`

### TC-VOTE2-003 — Chọn quá giới hạn bị chặn trước khi gọi server

- **Yêu cầu:** REQ-VOTE-07 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** Giới hạn loại là 2.
- **Các bước:**
  1. Đánh dấu loại 3 món.
  2. Gửi phiếu.
- **Kết quả mong đợi:** Ô còn lại bị khóa khi chạm giới hạn; gửi quá giới hạn bị từ chối ngay, server không bị gọi.
- **Tự động hóa:** `mobile/tests/unit/voteRepository.test.ts::rejects Round 2 submission before calling server when REMOVE count exceeds cap`, `mobile/tests/component/roundTwoView.test.tsx::ticking removes a dish; at the limit the other boxes are disabled; unticking frees one`, `supabase/tests/http/GM-20-canonical.http`

### TC-VOTE2-004 — N=1: vẫn mở vòng 2 và được phép loại món duy nhất

- **Yêu cầu:** REQ-VOTE-07 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Vòng 1 còn đúng 1 món sống sót.
- **Các bước:**
  1. Mở vòng 2.
  2. Loại món duy nhất rồi gửi.
- **Kết quả mong đợi:** Vòng 2 mở thật; giới hạn 1; gửi hợp lệ.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::N=1 có thể loại món duy nhất (Loại hết) và nộp phiếu hợp lệ theo Cap R2=1`, `mobile/tests/component/gm26FigmaParity.test.tsx::supports N=1 candidate with cap=1, allows marking ✕ ĐÃ LOẠI and submitting ALL_REMOVED`, `mobile/tests/unit/voteRepository.test.ts::allows Round 2 submission with N=1 and REMOVE choice (Node 638:9369)`

### TC-VOTE2-005 — Không tự chốt và không tự ghi KEEP cho người chưa gửi

- **Yêu cầu:** REQ-VOTE-08 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng vòng 2, một người chưa gửi.
- **Các bước:**
  1. Hết 60 giây.
  2. Đọc kết quả.
- **Kết quả mong đợi:** Phiếu chưa gửi không được ghi KEEP; kết quả chỉ tính các phiếu hợp lệ đã nhận.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `supabase/tests/http/DISH-POLICY-V3.http`

### TC-VOTE2-006 — Loại hết thì NO_CONSENSUS/ALL_REMOVED

- **Yêu cầu:** REQ-VOTE-08 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Phiếu vòng 2 loại hết các món.
- **Các bước:**
  1. Gửi phiếu loại toàn bộ.
- **Kết quả mong đợi:** Kết quả NO_CONSENSUS, lý do ALL_REMOVED, không bù món và không có vòng 3.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `mobile/tests/component/dishResultStates.test.tsx::%s has the correct terminal reason and no winner/podium/places`, `mobile/tests/component/gm26FigmaParity.test.tsx::supports N=1 candidate with cap=1, allows marking ✕ ĐÃ LOẠI and submitting ALL_REMOVED`

### TC-VOTE2-007 — Còn món thì chốt theo điểm vòng 1

- **Yêu cầu:** REQ-VOTE-08 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** Vòng 2 còn nhiều món.
- **Các bước:**
  1. Gửi phiếu loại một món.
  2. Đọc kết quả.
- **Kết quả mong đợi:** Winner là món điểm vòng 1 cao nhất (điểm = 2·WANT + OK) trong tập còn lại; vòng 2 không cộng điểm.
- **Tự động hóa:** `mobile/tests/dishPolicyV4.test.mjs::cutoff ties always include the seeded winner; NO/REMOVE never rank`, `mobile/tests/decision.test.mjs::2W+OK equals n+W; even/odd tier boundaries across 2–8 members`, `supabase/tests/http/GM-20-canonical.http`

### TC-VOTE2-008 — Hòa điểm xử lý một lần và ổn định

- **Yêu cầu:** REQ-RES-02 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Hai món bằng điểm sau vòng 2.
- **Các bước:**
  1. Chốt kết quả.
  2. Đọc lại nhiều lần.
- **Kết quả mong đợi:** Thứ tự và winner giống nhau mọi lần đọc.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `mobile/tests/unit/podiumOrder.test.ts::keeps score order and the server order for equal scores`

### TC-VOTE2-009 — Gửi vòng 2 đi thẳng tới phòng chờ không hộp xác nhận

- **Yêu cầu:** REQ-VOTE-07 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Đã chọn món loại.
- **Các bước:**
  1. Bấm Gửi vòng 2.
- **Kết quả mong đợi:** Chuyển thẳng tới phòng chờ; lỗi gửi giữ các ô đã chọn kèm một nút thử lại.
- **Tự động hóa:** `mobile/tests/component/roundTwoView.test.tsx::sending goes straight to the waiting screen without a confirmation dialog`, `mobile/tests/component/roundTwoView.test.tsx::a failed send keeps the ticks and offers one retry button`

### TC-VOTE2-010 — Cảnh báo khi loại hết mọi món

- **Yêu cầu:** REQ-VOTE-08 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Giới hạn loại cho phép loại tất cả.
- **Các bước:**
  1. Đánh dấu loại mọi món.
- **Kết quả mong đợi:** Hiện cảnh báo rõ ràng nhưng vẫn gửi được.
- **Tự động hóa:** `mobile/tests/component/roundTwoView.test.tsx::ticking every dish warns the person (only possible when the limit allows it)`

### TC-VOTE2-011 — Vòng 2 chốt trước khi người chưa gửi nộp

- **Yêu cầu:** REQ-VOTE-06 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Thành viên đang ở vòng 2 chưa gửi, server đã có kết quả.
- **Các bước:**
  1. Giữ màn vòng 2.
  2. Server chốt kết quả.
- **Kết quả mong đợi:** App tự chuyển sang kết quả, không giữ ở màn chọn món.
- **Tự động hóa:** `mobile/tests/component/votingSnapshotLifecycle.test.tsx::observes the terminal result before the round-two caller submits`

### TC-VOTE2-012 — Reload giữa vòng 2 khôi phục đúng phiếu

- **Yêu cầu:** REQ-RT-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Đã gửi phiếu vòng 2 (ACK) hoặc chưa rõ kết quả.
- **Các bước:**
  1. Force-stop và mở lại.
- **Kết quả mong đợi:** Phiếu đã ACK không gửi lại; phiếu chưa rõ được đối chiếu server trước khi phát lại cùng request.
- **Tự động hóa:** `mobile/tests/unit/gm31Outbox.test.ts::does not submit an unknown outbox ballot when live snapshot is unavailable but cache exists`, `mobile/tests/component/votingSnapshotLifecycle.test.tsx::keeps the whole unknown-ACK request stable after snapshot version changes`

### TC-VOTE2-013 — Nút Giữ tất cả đặt lại mọi lựa chọn

- **Yêu cầu:** REQ-VOTE-07 · **Ưu tiên:** P2 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Đã đánh dấu loại vài món.
- **Các bước:**
  1. Bấm Giữ tất cả hoặc Bỏ chọn.
- **Kết quả mong đợi:** Mọi món về KEEP, thông báo giới hạn biến mất.
- **Tự động hóa:** `mobile/tests/component/votingScreens.test.tsx::Nút Giữ tất cả đặt lại toàn bộ món về KEEP và xóa thông báo cap`, `mobile/tests/component/roundTwoView.test.tsx::"Bỏ chọn" clears every tick`

## RES — Kết quả, Top 3 và Places (15 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-RES-001 | P0 | functional | component | Kết quả winner và Top 3 hiển thị đúng | REQ-RES-02 | 2 | Fail |
| TC-RES-002 | P0 | boundary | component | Đồng hạng: cùng hạng, bục riêng theo thứ tự server | REQ-RES-02 | 3 | Pass |
| TC-RES-003 | P0 | resilience | e2e | Kết quả ổn định khi tải lại và thử lại | REQ-RES-01 | 2 | Not run |
| TC-RES-004 | P0 | security | unit | Server từ chối kết quả sai schema | REQ-RES-01 | 3 | Pass |
| TC-RES-005 | P0 | functional | component | NO_CONSENSUS hiện đúng lý do | REQ-RES-03 | 1 | Pass |
| TC-RES-006 | P0 | functional | component | Places chỉ gọi sau khi có winner | REQ-RES-04 | 2 | Partial |
| TC-RES-007 | P0 | negative | component | Từ chối vị trí không đổi kết quả | REQ-RES-04 | 2 | Pass |
| TC-RES-008 | P0 | resilience | unit | Places lỗi, 403 hoặc hết quota không phá kết quả | REQ-RES-04 | 3 | Pass |
| TC-RES-009 | P1 | resilience | unit | Yêu cầu Places cũ bị hủy khi đổi kết quả | REQ-RT-04 | 2 | Pass |
| TC-RES-010 | P1 | boundary | unit | Giá hiển thị theo observation mới nhất | REQ-RES-05 | 2 | Pass |
| TC-RES-011 | P1 | functional | unit | Mở Google Maps chỉ là hỗ trợ | REQ-RES-04 | 2 | Pass |
| TC-RES-012 | P1 | negative | component | Kết quả không khớp resultId báo lỗi | REQ-RES-01 | 1 | Pass |
| TC-RES-013 | P1 | resilience | component | Màn kết quả có lỗi và thử lại | REQ-UI-04 | 2 | Pass |
| TC-RES-014 | P0 | security | component | Kết quả khi cache khác tài khoản | REQ-HIS-02 | 1 | Pass |
| TC-RES-015 | P2 | accessibility | component | Hiệu ứng ăn mừng tôn trọng giảm chuyển động | REQ-UI-03 | 1 | Pass |

### TC-RES-001 — Kết quả winner và Top 3 hiển thị đúng

- **Yêu cầu:** REQ-RES-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Phòng có kết quả DECIDED.
- **Các bước:**
  1. Mở màn kết quả.
- **Kết quả mong đợi:** Hiện winner, tối đa 3 món trên bục kèm điểm và giá (nếu có).
- **Tự động hóa:** `mobile/tests/component/liveDishResultScreen.test.tsx::renders DECIDED result with Top 3 podium, winner and price`, `mobile/tests/component/dishResultPodium.test.tsx::podium %s shows one dish on each pedestal, in server order`

### TC-RES-002 — Đồng hạng: cùng hạng, bục riêng theo thứ tự server

- **Yêu cầu:** REQ-RES-02 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Kết quả có hai món đồng hạng 1.
- **Các bước:**
  1. Mở màn kết quả.
- **Kết quả mong đợi:** Thứ hạng dày (1, 1, 2); món đồng hạng đứng bục riêng theo thứ tự server; app không tự tính lại.
- **Tự động hóa:** `mobile/tests/unit/resultRepository.test.ts::maps valid tied podium (dense ranks 1, 1, 2)`, `mobile/tests/component/liveDishResultScreen.test.tsx::puts tied dishes on separate pedestals in server order`, `mobile/tests/unit/podiumOrder.test.ts::keeps score order and the server order for equal scores`

### TC-RES-003 — Kết quả ổn định khi tải lại và thử lại

- **Yêu cầu:** REQ-RES-01 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** e2e · **Môi trường:** qa-local, avd, android
- **Tiền điều kiện:** Phòng đã chốt kết quả.
- **Các bước:**
  1. Mở kết quả, force-stop, mở lại, đọc từ Inbox.
- **Kết quả mong đợi:** Cùng winner, cùng Top 3 và điểm ở mọi lần đọc.
- **Tự động hóa:** `supabase/tests/http/GM-20-canonical.http`, `supabase/tests/http/GM-21-canonical.http`

### TC-RES-004 — Server từ chối kết quả sai schema

- **Yêu cầu:** REQ-RES-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Phản hồi kết quả thiếu trường hoặc sai kiểu.
- **Các bước:**
  1. Cho app nhận phản hồi sai.
- **Kết quả mong đợi:** App trả MALFORMED_RESPONSE, không điền giá trị mặc định, không hiển thị kết quả.
- **Tự động hóa:** `mobile/tests/unit/resultRepository.test.ts::rejects payload missing policyVersion`, `mobile/tests/unit/resultRepository.test.ts::rejects score exceeding 2 * round1BallotCount`, `mobile/tests/unit/resultRepository.test.ts::rejects dish missing description key`

### TC-RES-005 — NO_CONSENSUS hiện đúng lý do

- **Yêu cầu:** REQ-RES-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Kết quả NO_CONSENSUS với EMPTY_INTERSECTION hoặc ALL_REMOVED.
- **Các bước:**
  1. Mở màn không đồng thuận.
- **Kết quả mong đợi:** Hiện đúng lý do, không có winner, bục hay Places; có nút tạo phòng mới.
- **Tự động hóa:** `mobile/tests/component/dishResultStates.test.tsx::%s has the correct terminal reason and no winner/podium/places`

### TC-RES-006 — Places chỉ gọi sau khi có winner

- **Yêu cầu:** REQ-RES-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, android, ios
- **Tiền điều kiện:** Phòng có winner, đã cấp quyền vị trí.
- **Các bước:**
  1. Mở kết quả.
  2. Xem phần quán gần đây.
- **Kết quả mong đợi:** Hiện quán, bản đồ và ghi công Google; liên kết ngoài chỉ mở đường dẫn được cho phép.
- **Tự động hóa:** `mobile/tests/component/gm30FigmaParity.test.tsx::Figma 206:913 & 379:1478 — Places loaded and external actions trigger allowlisted URLs`, `mobile/tests/component/nearbyResult.test.tsx::map capability renders in-app, retains attribution and never uses a mock illustration in real mode`

### TC-RES-007 — Từ chối vị trí không đổi kết quả

- **Yêu cầu:** REQ-RES-04 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Người dùng từ chối quyền vị trí.
- **Các bước:**
  1. Mở kết quả.
- **Kết quả mong đợi:** Hiện lời nhắc cấp quyền; winner và Top 3 không đổi.
- **Tự động hóa:** `mobile/tests/component/gm30FigmaParity.test.tsx::Figma 622:8962 — Location permission prompt shown when location is not granted`, `mobile/tests/unit/placesRepository.test.ts::denied permission returns status denied`

### TC-RES-008 — Places lỗi, 403 hoặc hết quota không phá kết quả

- **Yêu cầu:** REQ-RES-04 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Google trả 403, 500 hoặc hết quota.
- **Các bước:**
  1. Mở kết quả.
- **Kết quả mong đợi:** Trạng thái lỗi an toàn, không ném lỗi; winner và bục giữ nguyên.
- **Tự động hóa:** `mobile/tests/unit/placesRepository.test.ts::never throws on network error or quota exceeded; returns safe ReadResult with status error`, `mobile/tests/unit/placesRepository.test.ts::returns error status when Google Places API responds with 403 or 500`, `mobile/tests/component/gm30FigmaParity.test.tsx::Absolute Winner Isolation: places failure never corrupts or alters decided winner`

### TC-RES-009 — Yêu cầu Places cũ bị hủy khi đổi kết quả

- **Yêu cầu:** REQ-RT-04 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Đổi kết quả khi Places đang tải.
- **Các bước:**
  1. Chuyển sang kết quả khác.
- **Kết quả mong đợi:** Yêu cầu cũ bị hủy và không ghi đè.
- **Tự động hóa:** `mobile/tests/unit/placesRepository.test.ts::superseded request is aborted and does not overwrite current result`, `mobile/tests/component/nearbyResult.test.tsx::late action response from a previous result cannot update the new result feedback`

### TC-RES-010 — Giá hiển thị theo observation mới nhất

- **Yêu cầu:** REQ-RES-05 · **Ưu tiên:** P1 · **Loại:** boundary · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Món có nhiều observation giá, một số có amount null hoặc trùng timestamp.
- **Các bước:**
  1. Mở kết quả.
- **Kết quả mong đợi:** Hiện giá mới nhất hợp lệ; amount null hoặc timestamp trùng thì ẩn giá, không dùng giá cũ.
- **Tự động hóa:** `mobile/tests/unit/resultRepository.test.ts::rejects malformed raw price with null amount`, `mobile/tests/unit/voteSessionState.test.ts::hides a price if amount, currency, or unit is unknown`

### TC-RES-011 — Mở Google Maps chỉ là hỗ trợ

- **Yêu cầu:** REQ-RES-04 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Winner có thông tin địa điểm.
- **Các bước:**
  1. Bấm mở Google Maps.
- **Kết quả mong đợi:** Mở đường dẫn Google Maps hợp lệ; bản đồ trong app vẫn hiển thị.
- **Tự động hóa:** `mobile/tests/unit/externalLinks.test.ts::allows official Google Maps, TikTok, and YouTube URLs`, `mobile/tests/unit/externalLinks.test.ts::buildGoogleMapsUrl with place coordinates and id`

### TC-RES-012 — Kết quả không khớp resultId báo lỗi

- **Yêu cầu:** REQ-RES-01 · **Ưu tiên:** P1 · **Loại:** negative · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Link kết quả với resultId không khớp phòng.
- **Các bước:**
  1. Mở màn kết quả.
- **Kết quả mong đợi:** Hiện lỗi, không hiển thị kết quả của phòng khác.
- **Tự động hóa:** `mobile/tests/component/liveDishResultScreen.test.tsx::transitions to error notice when resultId does not match server response`

### TC-RES-013 — Màn kết quả có lỗi và thử lại

- **Yêu cầu:** REQ-UI-04 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Server trả lỗi khi tải kết quả.
- **Các bước:**
  1. Mở kết quả.
  2. Bấm thử lại.
- **Kết quả mong đợi:** Hiện thông báo lỗi kèm nút thử lại; NOT_READY có timer và dọn khi thoát màn.
- **Tự động hóa:** `mobile/tests/component/liveDishResultScreen.test.tsx::renders error state with retry button on failure`, `mobile/tests/component/liveDishResultScreen.test.tsx::cancels NOT_READY poll timer upon unmount`

### TC-RES-014 — Kết quả khi cache khác tài khoản

- **Yêu cầu:** REQ-HIS-02 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Hai tài khoản dùng chung máy.
- **Các bước:**
  1. Xem kết quả bằng tài khoản A.
  2. Đổi sang tài khoản B và mở kết quả.
- **Kết quả mong đợi:** Cache được tách theo danh tính, B không thấy dữ liệu của A.
- **Tự động hóa:** `mobile/tests/component/gm27ReviewRegression.test.tsx::the production roomRepository composition partitions cache using the active identity`

### TC-RES-015 — Hiệu ứng ăn mừng tôn trọng giảm chuyển động

- **Yêu cầu:** REQ-UI-03 · **Ưu tiên:** P2 · **Loại:** accessibility · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Bật giảm chuyển động.
- **Các bước:**
  1. Mở kết quả có winner.
- **Kết quả mong đợi:** Không phát hiệu ứng chuyển động mạnh.
- **Tự động hóa:** `mobile/tests/component/winnerCelebration.test.tsx::Reduce Motion requests zero-duration native animations`

## SOC — Bạn bè, lời mời và hộp thư (13 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-SOC-001 | P0 | functional | sql | Gửi lời mời kết bạn và chấp nhận | REQ-SOC-01 | 3 | Not run |
| TC-SOC-002 | P0 | functional | sql | Từ chối và hủy kết bạn | REQ-SOC-01 | 2 | Not run |
| TC-SOC-003 | P0 | functional | component | Tìm bạn theo mã | REQ-SOC-01 | 1 | Not run |
| TC-SOC-004 | P1 | resilience | component | Danh sách bạn phân biệt lỗi mạng và rỗng | REQ-UI-04 | 1 | Pass |
| TC-SOC-005 | P0 | functional | api | Mời bạn vào phòng và bạn chấp nhận | REQ-SOC-02 | 2 | Not run |
| TC-SOC-006 | P1 | negative | sql | Lời mời hết hạn hoặc đã trả lời | REQ-SOC-02 | 2 | Not run |
| TC-SOC-007 | P0 | functional | component | Hộp thư hiển thị sự kiện và đánh dấu đã đọc | REQ-SOC-03 | 2 | Not run |
| TC-SOC-008 | P0 | functional | unit | Banner khi có dòng mới qua Realtime | REQ-SOC-03 | 3 | Not run |
| TC-SOC-009 | P0 | resilience | component | Mất Realtime thì đọc mỗi 30 giây và đóng khi nền | REQ-SOC-03 | 2 | Pass |
| TC-SOC-010 | P1 | functional | sql | Sự kiện chấp nhận kết bạn có trong hộp thư | REQ-SOC-03 | 1 | Not run |
| TC-SOC-011 | P1 | boundary | unit | Hộp thư không trùng sự kiện | REQ-SOC-03 | 1 | Pass |
| TC-SOC-012 | P0 | security | api | Người ngoài không đọc được hộp thư của người khác | REQ-SEC-01 | 2 | Not run |
| TC-SOC-013 | P1 | negative | unit | Thông báo hết hạn hoặc tham chiếu bị cấm được xử lý | REQ-SOC-03 | 2 | Pass |

### TC-SOC-001 — Gửi lời mời kết bạn và chấp nhận

- **Yêu cầu:** REQ-SOC-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Hai tài khoản email.
- **Các bước:**
  1. A gửi lời mời cho B.
  2. B chấp nhận.
- **Kết quả mong đợi:** Hai người thành bạn hai chiều; chưa chấp nhận thì chưa là bạn.
- **Tự động hóa:** `supabase/tests/database/GM-22_social.test.sql`, `supabase/tests/http/GM-22.http`, `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::social adapter delegates invite/accept/reject/unfriend to session-aware API methods`

### TC-SOC-002 — Từ chối và hủy kết bạn

- **Yêu cầu:** REQ-SOC-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** A và B đã là bạn hoặc có lời mời chờ.
- **Các bước:**
  1. B từ chối lời mời.
  2. A hủy kết bạn một người đã là bạn.
- **Kết quả mong đợi:** Lời mời bị từ chối biến mất; hủy kết bạn gỡ quan hệ ở cả hai phía.
- **Tự động hóa:** `supabase/tests/database/GM-22_social.test.sql`, `supabase/tests/http/GM-28.http`

### TC-SOC-003 — Tìm bạn theo mã

- **Yêu cầu:** REQ-SOC-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Có mã bạn hợp lệ và không hợp lệ.
- **Các bước:**
  1. Nhập mã đúng.
  2. Nhập mã không tồn tại.
- **Kết quả mong đợi:** Mã đúng hiện tên chủ mã; mã lạ báo không tìm thấy; không lộ thông tin riêng.
- **Tự động hóa:** `mobile/tests/integration/gm32ClientStates.test.tsx::a typed friend code shows the owner\'s name (not the bare code); an unknown code says so; the invite names who it went to`

### TC-SOC-004 — Danh sách bạn phân biệt lỗi mạng và rỗng

- **Yêu cầu:** REQ-UI-04 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Không có bạn hoặc mạng lỗi.
- **Các bước:**
  1. Mở Bạn bè trong từng trường hợp.
- **Kết quả mong đợi:** Phân biệt lỗi mạng, chưa có bạn và không tìm thấy.
- **Tự động hóa:** `mobile/tests/integration/gm32ClientStates.test.tsx::G01 friends distinguishes network failure, no friends and no search match`

### TC-SOC-005 — Mời bạn vào phòng và bạn chấp nhận

- **Yêu cầu:** REQ-SOC-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Host và bạn đã kết bạn.
- **Các bước:**
  1. Host mời bạn.
  2. Bạn mở hộp thư và chấp nhận.
- **Kết quả mong đợi:** Bạn vào phòng qua cùng kiểm tra như vào bằng mã (đầy, đã bắt đầu vẫn bị từ chối); không tự vào.
- **Tự động hóa:** `supabase/tests/http/GM-22.http`, `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::resolves an accepted invite to the latest room route and verifies result references against the server`

### TC-SOC-006 — Lời mời hết hạn hoặc đã trả lời

- **Yêu cầu:** REQ-SOC-02 · **Ưu tiên:** P1 · **Loại:** negative · **Tầng:** sql · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Lời mời quá hạn hoặc đã chấp nhận.
- **Các bước:**
  1. Chấp nhận lại.
- **Kết quả mong đợi:** Báo hết hạn hoặc đã xử lý; không vào phòng, không nhân đôi.
- **Tự động hóa:** `supabase/tests/database/GM-22_social.test.sql`, `mobile/tests/component/socialAndHistoryScreens.test.tsx::tapping a notification marks that one read; an invite shows the sender, with Từ chối left of Đồng ý`

### TC-SOC-007 — Hộp thư hiển thị sự kiện và đánh dấu đã đọc

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** Hộp thư có lời mời và kết quả.
- **Các bước:**
  1. Mở hộp thư.
  2. Chạm một thông báo.
- **Kết quả mong đợi:** Chỉ thông báo đó được đánh dấu đã đọc; lời mời hiện người gửi; kết quả mở đúng màn.
- **Tự động hóa:** `mobile/tests/component/socialAndHistoryScreens.test.tsx::tapping a notification marks that one read; an invite shows the sender, with Từ chối left of Đồng ý`, `supabase/tests/database/GM-28_inbox_read_all.test.sql`

### TC-SOC-008 — Banner khi có dòng mới qua Realtime

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci, qa-local
- **Tiền điều kiện:** App đang mở, kết nối Realtime sống.
- **Các bước:**
  1. Server thêm dòng hộp thư mới.
- **Kết quả mong đợi:** App nhận dòng mới qua Realtime (không đọc theo chu kỳ), hiện banner; nhiều dòng cùng lúc chỉ một lần đọc.
- **Tự động hóa:** `mobile/tests/unit/inboxRealtime.test.ts::a new row calls onInsert, and the status turns live once the database subscription is confirmed`, `mobile/tests/component/inboxBadgePolling.test.tsx::several pushes together cause one read`, `supabase/tests/database/ADR-026_inbox_realtime.test.sql`

### TC-SOC-009 — Mất Realtime thì đọc mỗi 30 giây và đóng khi nền

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Kênh Realtime bị đóng.
- **Các bước:**
  1. Chờ vài chu kỳ.
  2. Đưa app xuống nền rồi quay lại.
- **Kết quả mong đợi:** Chỉ đọc theo chu kỳ khi mất kết nối; không có timer khi kết nối sống; quay lại app thì đọc một lần.
- **Tự động hóa:** `mobile/tests/component/inboxBadgePolling.test.tsx::nothing is read while nothing happens: no timer while the push connection is live`, `mobile/tests/component/inboxBadgePolling.test.tsx::the connection closes in the background and comes back with a read on return`

### TC-SOC-010 — Sự kiện chấp nhận kết bạn có trong hộp thư

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** A gửi lời mời, B chấp nhận.
- **Các bước:**
  1. A mở hộp thư.
- **Kết quả mong đợi:** A nhận sự kiện FRIEND_ACCEPTED.
- **Tự động hóa:** `supabase/tests/database/ADR-026_inbox_friend_accepted.test.sql`

### TC-SOC-011 — Hộp thư không trùng sự kiện

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P1 · **Loại:** boundary · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Cùng một event đến hai lần.
- **Các bước:**
  1. Đọc hộp thư hai lần.
- **Kết quả mong đợi:** Chỉ một dòng, con trỏ tiến theo inbox item ID.
- **Tự động hóa:** `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::inbox adapter deduplicates by eventId and advances by inbox item ID`

### TC-SOC-012 — Người ngoài không đọc được hộp thư của người khác

- **Yêu cầu:** REQ-SEC-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Hai tài khoản.
- **Các bước:**
  1. B đọc hộp thư bằng token của B.
  2. Thử đọc hộp thư của A.
- **Kết quả mong đợi:** B chỉ thấy dòng của B; truy cập chéo bị chặn.
- **Tự động hóa:** `supabase/tests/http/GM-23.http`, `supabase/tests/http/GM-28.http`

### TC-SOC-013 — Thông báo hết hạn hoặc tham chiếu bị cấm được xử lý

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P1 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Thông báo trỏ tới kết quả đã hết hạn.
- **Các bước:**
  1. Chạm thông báo.
- **Kết quả mong đợi:** Không mở dữ liệu không được phép; hiện thông báo phù hợp và không cấp quyền ngầm.
- **Tự động hóa:** `mobile/tests/unit/notificationInboxResolver.test.ts::fails closed when the server repeats a pagination cursor`, `mobile/tests/component/socialAndHistoryScreens.test.tsx::notification retry resolves the same event from authenticated inbox after a network error`

## HIS — Lịch sử và đồng ý lưu (10 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-HIS-001 | P0 | privacy | component | Lưu lịch sử mặc định tắt, chỉ bật khi người dùng đồng ý | REQ-HIS-01 | 2 | Pass |
| TC-HIS-002 | P0 | privacy | api | Consent cá nhân và nhóm độc lập | REQ-HIS-01 | 3 | Not run |
| TC-HIS-003 | P0 | negative | api | Không lưu lịch sử khi thiếu consent | REQ-HIS-01 | 2 | Not run |
| TC-HIS-004 | P0 | functional | api | Xóa lịch sử cá nhân | REQ-HIS-02 | 2 | Not run |
| TC-HIS-005 | P0 | functional | api | Thu hồi consent và hết hạn | REQ-HIS-02 | 2 | Not run |
| TC-HIS-006 | P0 | security | unit | Cache lịch sử không vượt sang tài khoản khác | REQ-HIS-02 | 2 | Pass |
| TC-HIS-007 | P1 | functional | component | Lịch sử mở lại kết quả đã lưu, không đọc lại thao tác | REQ-HIS-02 | 1 | Pass |
| TC-HIS-008 | P1 | privacy | api | Danh sách Cùng ăn chỉ gồm người đồng ý | REQ-HIS-03 | 1 | Not run |
| TC-HIS-009 | P1 | resilience | component | Lịch sử trống và lỗi offline | REQ-UI-04 | 1 | Pass |
| TC-HIS-010 | P1 | negative | unit | Winner kết quả hợp lệ mới được lưu | REQ-HIS-01 | 1 | Pass |

### TC-HIS-001 — Lưu lịch sử mặc định tắt, chỉ bật khi người dùng đồng ý

- **Yêu cầu:** REQ-HIS-01 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Tài khoản mới đăng nhập lần đầu.
- **Các bước:**
  1. Đi qua màn xin quyền đầu tiên mà không tích lưu lịch sử.
  2. Chơi hết một ván.
  3. Mở Lịch sử.
- **Kết quả mong đợi:** Không có lịch sử nào được lưu; tích đồng ý thì consent được ghi lên tài khoản.
- **Tự động hóa:** `mobile/tests/component/permissionsWelcome.test.tsx::keeping the meal history is off until ticked and is saved on the account when ticked`, `mobile/tests/component/permissionsWelcome.test.tsx::history is not saved when the box stays unticked`

### TC-HIS-002 — Consent cá nhân và nhóm độc lập

- **Yêu cầu:** REQ-HIS-01 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Một thành viên bật cá nhân, tắt nhóm; thành viên khác ngược lại.
- **Các bước:**
  1. Chốt kết quả phòng.
  2. Mỗi người đọc lịch sử cá nhân và nhóm.
- **Kết quả mong đợi:** Mỗi phạm vi lưu đúng theo consent riêng; thiếu consent thì không lưu phạm vi đó.
- **Tự động hóa:** `supabase/tests/http/GM-21.http`, `supabase/tests/http/GM-21-canonical.http`, `supabase/tests/history.sql`

### TC-HIS-003 — Không lưu lịch sử khi thiếu consent

- **Yêu cầu:** REQ-HIS-01 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Không ai bật lưu lịch sử.
- **Các bước:**
  1. Chốt một phòng.
  2. Đọc lịch sử của từng thành viên.
- **Kết quả mong đợi:** Không có dòng lịch sử nào trong database cho phòng đó.
- **Tự động hóa:** `supabase/tests/http/GM-21-canonical.http`, `supabase/tests/history.sql`

### TC-HIS-004 — Xóa lịch sử cá nhân

- **Yêu cầu:** REQ-HIS-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Có lịch sử cá nhân.
- **Các bước:**
  1. Xóa một mục (vuốt hoặc nút).
  2. Đọc lại lịch sử.
- **Kết quả mong đợi:** Mục đã xóa không còn ở mọi lần đọc; xóa theo ngưỡng một nửa hàng thì xóa đúng một lần.
- **Tự động hóa:** `supabase/tests/http/GM-21.http`, `mobile/tests/component/historyCard.test.tsx::a swipe deletes once it passes half of the row`

### TC-HIS-005 — Thu hồi consent và hết hạn

- **Yêu cầu:** REQ-HIS-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Có lịch sử còn hạn; sau đó thu hồi consent hoặc quá hạn.
- **Các bước:**
  1. Thu hồi consent.
  2. Đọc lịch sử.
  3. Chờ quá hạn lưu và đọc lại.
- **Kết quả mong đợi:** Dữ liệu đã thu hồi hoặc hết hạn biến mất và không thể khôi phục từ cache.
- **Tự động hóa:** `supabase/tests/http/GM-21-canonical.http`, `supabase/tests/history.sql`

### TC-HIS-006 — Cache lịch sử không vượt sang tài khoản khác

- **Yêu cầu:** REQ-HIS-02 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Hai tài khoản dùng chung máy, mạng chập chờn.
- **Các bước:**
  1. A xem lịch sử.
  2. Đổi sang B khi phản hồi của A đến muộn.
- **Kết quả mong đợi:** Phản hồi muộn của A bị bỏ; cache được tách theo danh tính và xóa khi đăng xuất.
- **Tự động hóa:** `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::history cache is scoped to the authenticated identity and cleared after consent or logout cleanup`, `mobile/tests/unit/socialInboxHistoryRepositories.test.ts::drops a late A history response after switching to B`

### TC-HIS-007 — Lịch sử mở lại kết quả đã lưu, không đọc lại thao tác

- **Yêu cầu:** REQ-HIS-02 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Có mục lịch sử đã lưu.
- **Các bước:**
  1. Mở một mục lịch sử.
- **Kết quả mong đợi:** Hiện kết quả đã lưu (winner, Top 3) mà không đọc lại thao tác gốc.
- **Tự động hóa:** `mobile/tests/component/socialAndHistoryScreens.test.tsx::live history opens the saved projection without re-reading the operational room`

### TC-HIS-008 — Danh sách Cùng ăn chỉ gồm người đồng ý

- **Yêu cầu:** REQ-HIS-03 · **Ưu tiên:** P1 · **Loại:** privacy · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Một người trong nhóm không đồng ý chia sẻ.
- **Các bước:**
  1. Mở lịch sử nhóm.
- **Kết quả mong đợi:** Danh sách Cùng ăn không có người không đồng ý.
- **Tự động hóa:** `supabase/tests/http/GM-42.http`

### TC-HIS-009 — Lịch sử trống và lỗi offline

- **Yêu cầu:** REQ-UI-04 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Chưa có lịch sử hoặc mất mạng.
- **Các bước:**
  1. Mở Lịch sử.
- **Kết quả mong đợi:** Phân biệt rỗng và lỗi; hồi phục về danh sách rỗng khi có mạng.
- **Tự động hóa:** `mobile/tests/integration/gm32ClientStates.test.tsx::G03 history without a cache reports offline failure and recovers to an empty list`

### TC-HIS-010 — Winner kết quả hợp lệ mới được lưu

- **Yêu cầu:** REQ-HIS-01 · **Ưu tiên:** P1 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Kết quả sai schema (vòng 1 mang lý do vòng 2).
- **Các bước:**
  1. Cho repository nhận dữ liệu sai.
- **Kết quả mong đợi:** Bị từ chối trước khi ánh xạ.
- **Tự động hóa:** `mobile/tests/unit/canonicalHistory.test.ts::rejects a DECIDED round-one result carrying the round-two reason`

## RT — Realtime, phục hồi và ngoại tuyến (13 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-RT-001 | P0 | functional | api | Thay đổi version phòng đến app qua Realtime | REQ-RT-01 | 2 | Not run |
| TC-RT-002 | P0 | privacy | api | Tín hiệu Realtime không chứa phiếu bầu | REQ-RT-01 | 1 | Not run |
| TC-RT-003 | P0 | resilience | unit | Mất kết nối thì đọc bù và backoff hữu hạn | REQ-RT-01 | 2 | Pass |
| TC-RT-004 | P1 | negative | unit | Thiếu capability backend thì báo rõ, không kết nối | REQ-RT-01 | 1 | Pass |
| TC-RT-005 | P0 | resilience | e2e | Chuyển vòng khi hết giờ không cần worker (hosted) | REQ-RT-02 | — | Not run |
| TC-RT-006 | P0 | resilience | unit | Outbox lưu trước khi gọi mạng và không phát lại phiếu đã ACK | REQ-RT-03 | 2 | Pass |
| TC-RT-007 | P0 | security | unit | Outbox hết hạn và xóa theo danh tính | REQ-RT-03 | 2 | Pass |
| TC-RT-008 | P0 | resilience | component | Một request nền tại một thời điểm, bỏ phản hồi cũ | REQ-RT-04 | 2 | Pass |
| TC-RT-009 | P0 | security | unit | Guard epoch khi đổi tài khoản | REQ-AUTH-07 | 2 | Pass |
| TC-RT-010 | P0 | resilience | component | Mở lại app khi backend không thể kết nối | REQ-REL-03 | 2 | Pass |
| TC-RT-011 | P1 | resilience | unit | Token hết hạn khi nghe Realtime hộp thư | REQ-SOC-03 | 2 | Pass |
| TC-RT-012 | P1 | boundary | unit | Nhiều tín hiệu liên tiếp chỉ đọc lại một lần | REQ-RT-01 | 1 | Pass |
| TC-RT-013 | P0 | resilience | e2e | Force-stop khi gửi phiếu và khôi phục ở máy thật | REQ-RT-03 | — | Not run |

### TC-RT-001 — Thay đổi version phòng đến app qua Realtime

- **Yêu cầu:** REQ-RT-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** api · **Môi trường:** qa-local, ci
- **Tiền điều kiện:** Hai client, một người mở lobby.
- **Các bước:**
  1. Client kia vào phòng.
  2. Quan sát lobby.
- **Kết quả mong đợi:** Lobby nhận tín hiệu room_id/version, đọc lại snapshot theo contract mà không cần polling.
- **Tự động hóa:** `supabase/tests/http/GM-45.http`, `mobile/tests/unit/roomRealtime.test.ts::validates minimal version signals`

### TC-RT-002 — Tín hiệu Realtime không chứa phiếu bầu

- **Yêu cầu:** REQ-RT-01 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng đang bình chọn.
- **Các bước:**
  1. Nghe kênh Realtime của phòng bằng thành viên và người ngoài.
- **Kết quả mong đợi:** Payload chỉ có room_id và version; người ngoài và người bị loại không nhận được.
- **Tự động hóa:** `supabase/tests/http/GM-45.http`

### TC-RT-003 — Mất kết nối thì đọc bù và backoff hữu hạn

- **Yêu cầu:** REQ-RT-01 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Kênh Realtime mất kết nối.
- **Các bước:**
  1. Ngắt mạng.
  2. Bật lại.
- **Kết quả mong đợi:** Retry với backoff hữu hạn, sau khi nối lại đọc bù đúng một lần, token muộn sau khi dừng không mở socket.
- **Tự động hóa:** `mobile/tests/unit/roomRealtime.test.ts::disconnect uses finite backoff, reconnect reads once, stop invalidates response guard`, `mobile/tests/unit/roomRealtime.test.ts::late token after stop cannot open a socket`

### TC-RT-004 — Thiếu capability backend thì báo rõ, không kết nối

- **Yêu cầu:** REQ-RT-01 · **Ưu tiên:** P1 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Backend cũ chưa có Realtime.
- **Các bước:**
  1. Mở lobby.
- **Kết quả mong đợi:** Thiếu capability báo lỗi rõ ràng và quay về polling, không kết nối giả.
- **Tự động hóa:** `mobile/tests/unit/roomRealtime.test.ts::missing backend capability fails explicitly and does not connect`

### TC-RT-005 — Chuyển vòng khi hết giờ không cần worker (hosted)

- **Yêu cầu:** REQ-RT-02 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** e2e · **Môi trường:** staging
- **Tiền điều kiện:** Staging hosted, không có worker chạy trên máy.
- **Các bước:**
  1. Phòng 3 người, hai người ACK.
  2. Chờ hết 60 giây.
- **Kết quả mong đợi:** Phòng tự chuyển vòng trong vài giây quanh deadline nhờ pg_cron.
- **Tự động hóa:** chưa có

### TC-RT-006 — Outbox lưu trước khi gọi mạng và không phát lại phiếu đã ACK

- **Yêu cầu:** REQ-RT-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Bấm Gửi phiếu khi mạng chập chờn.
- **Các bước:**
  1. Bấm Gửi.
  2. Force-stop trước khi nhận phản hồi.
  3. Mở lại app.
- **Kết quả mong đợi:** Payload đã lưu; mở lại đối chiếu server trước khi phát lại; phiếu đã ACK được quét khỏi outbox.
- **Tự động hóa:** `mobile/tests/unit/gm31Outbox.test.ts::recognizes canonical ballot ACKs and legacy submission receipts`, `mobile/tests/unit/gm31Outbox.test.ts::does not replay a future expectedVersion for an otherwise matching room snapshot`

### TC-RT-007 — Outbox hết hạn và xóa theo danh tính

- **Yêu cầu:** REQ-RT-03 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Có hàng đợi của tài khoản A.
- **Các bước:**
  1. Đăng xuất.
  2. Mô phỏng quá thời hạn TTL.
- **Kết quả mong đợi:** Payload an toàn và hàng của danh tính bị xóa; lỗi xóa SecureStore được ghi để thử lại.
- **Tự động hóa:** `mobile/tests/unit/gm31Outbox.test.ts::TTL expiry removes the secure payload and identity-scoped rows`, `mobile/tests/unit/gm31Outbox.test.ts::retains cleanup metadata when SecureStore deletion fails, then retries successfully`

### TC-RT-008 — Một request nền tại một thời điểm, bỏ phản hồi cũ

- **Yêu cầu:** REQ-RT-04 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Lobby polling 4 giây.
- **Các bước:**
  1. Chuyển phòng khi một request cũ còn bay.
- **Kết quả mong đợi:** Phản hồi phòng cũ bị bỏ; snapshot mới không bị ghi đè bởi version thấp hơn.
- **Tự động hóa:** `mobile/tests/component/gm25FigmaParity.test.tsx::ignores an old room poll after switching to another room`, `mobile/tests/component/gm25FigmaParity.test.tsx::keeps the newer lobby snapshot when a poll returns an older round snapshot`

### TC-RT-009 — Guard epoch khi đổi tài khoản

- **Yêu cầu:** REQ-AUTH-07 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Đang đổi tài khoản.
- **Các bước:**
  1. Gửi yêu cầu trong lúc chuyển.
- **Kết quả mong đợi:** Yêu cầu của phiên cũ dừng trước transport.
- **Tự động hóa:** `mobile/tests/unit/authSession.test.ts::business response received after logout is rejected before exposure to caller`, `mobile/tests/unit/authSession.test.ts::server-detected auth loss also drops an already-running business response`

### TC-RT-010 — Mở lại app khi backend không thể kết nối

- **Yêu cầu:** REQ-REL-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Backend tắt hoặc mất mạng khi mở app.
- **Các bước:**
  1. Mở app.
  2. Chờ vài giây.
  3. Thử lại khi backend sống.
- **Kết quả mong đợi:** Không crash; báo lỗi rõ và nút thử lại; thiếu cấu hình hiện "Chưa cấu hình máy chủ".
- **Tự động hóa:** `mobile/tests/component/liveRoomLifecycle.test.tsx::P5: RoomRepositoryProvider throws when forcedMode=real and publicKey is missing`, `mobile/tests/integration/gm32ClientStates.test.tsx::G02 inbox distinguishes a failed request from an empty authenticated page`

### TC-RT-011 — Token hết hạn khi nghe Realtime hộp thư

- **Yêu cầu:** REQ-SOC-03 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Token hết hạn khi đang nghe.
- **Các bước:**
  1. Chờ token hết hạn.
- **Kết quả mong đợi:** Kênh đóng và tham gia lại bằng token mới; dừng thì hủy mọi timer.
- **Tự động hóa:** `mobile/tests/unit/inboxRealtime.test.ts::an expired token closes the channel and it joins again`, `mobile/tests/unit/inboxRealtime.test.ts::stopping closes the socket and cancels every timer`

### TC-RT-012 — Nhiều tín hiệu liên tiếp chỉ đọc lại một lần

- **Yêu cầu:** REQ-RT-01 · **Ưu tiên:** P1 · **Loại:** boundary · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Server đẩy nhiều thay đổi version.
- **Các bước:**
  1. Nhận 5 tín hiệu trong 1 giây.
- **Kết quả mong đợi:** Gộp tín hiệu, bỏ version cũ, chỉ đọc lại snapshot khi cần.
- **Tự động hóa:** `mobile/tests/unit/roomRealtime.test.ts::temporary token refresh failures keep both retries alive until the room reconnects`

### TC-RT-013 — Force-stop khi gửi phiếu và khôi phục ở máy thật

- **Yêu cầu:** REQ-RT-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Máy thật, phiên bình chọn đang diễn ra.
- **Các bước:**
  1. Gửi phiếu rồi force-stop ngay.
  2. Mở lại và so sánh với server.
- **Kết quả mong đợi:** Không có phiếu trùng, không có phiếu sai vòng; kết quả cuối giống hai máy.
- **Tự động hóa:** chưa có

## SEC — Bảo mật và quyền riêng tư (12 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-SEC-001 | P0 | security | sql | RLS: người ngoài không đọc được dữ liệu phòng | REQ-SEC-01 | 2 | Not run |
| TC-SEC-002 | P0 | security | sql | Người bị loại không đọc được nữa | REQ-SEC-01 | 2 | Not run |
| TC-SEC-003 | P0 | security | api | RPC đặc quyền kiểm danh tính và quyền | REQ-SEC-01 | 2 | Not run |
| TC-SEC-004 | P0 | privacy | sql | Phiếu thô không thể đọc bằng quyền host | REQ-VOTE-09 | 2 | Not run |
| TC-SEC-005 | P0 | security | unit | Khóa nhạy cảm bị từ chối trong cấu hình client | REQ-SEC-02 | 2 | Pass |
| TC-SEC-006 | P0 | security | e2e | Không có secret trong repo và bundle | REQ-SEC-02 | — | Not run |
| TC-SEC-007 | P0 | privacy | unit | Không log phiếu bầu, token, email | REQ-SEC-02 | 2 | Pass |
| TC-SEC-008 | P0 | security | unit | Liên kết chứa token hoặc userinfo bị chặn | REQ-SEC-02 | 2 | Pass |
| TC-SEC-009 | P0 | security | e2e | Khóa Places giới hạn theo app và API | REQ-SEC-03 | — | Not run |
| TC-SEC-010 | P0 | security | api | Tài khoản đã xóa không đọc được dữ liệu cũ | REQ-AUTH-08 | — | Not run |
| TC-SEC-011 | P0 | security | unit | Danh tính do server xác minh, không tin metadata | REQ-SEC-01 | 1 | Pass |
| TC-SEC-012 | P1 | privacy | e2e | Dữ liệu chỉ gửi tới Supabase và Google Places | REQ-SEC-03 | — | Not run |

### TC-SEC-001 — RLS: người ngoài không đọc được dữ liệu phòng

- **Yêu cầu:** REQ-SEC-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Phòng có thành viên và một người ngoài.
- **Các bước:**
  1. Người ngoài đọc phòng, thành viên, phiếu, kết quả.
- **Kết quả mong đợi:** Mọi truy vấn trả rỗng hoặc bị từ chối.
- **Tự động hóa:** `supabase/tests/rls.sql`, `supabase/tests/http/GM-17.http`

### TC-SEC-002 — Người bị loại không đọc được nữa

- **Yêu cầu:** REQ-SEC-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Thành viên bị host loại.
- **Các bước:**
  1. Thành viên đọc phòng và Realtime.
- **Kết quả mong đợi:** Không đọc được dữ liệu phòng và không nhận tín hiệu.
- **Tự động hóa:** `supabase/tests/database/GM-19_room_lifecycle.test.sql`, `supabase/tests/http/GM-45.http`

### TC-SEC-003 — RPC đặc quyền kiểm danh tính và quyền

- **Yêu cầu:** REQ-SEC-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** api · **Môi trường:** qa-local
- **Tiền điều kiện:** Có các RPC quản trị phòng.
- **Các bước:**
  1. Gọi RPC bằng token không có quyền.
  2. Gọi bằng host.
- **Kết quả mong đợi:** Từ chối đúng lỗi khi thiếu quyền; chỉ host hoặc thành viên hợp lệ thực hiện được.
- **Tự động hóa:** `supabase/tests/http/GM-17.http`, `supabase/tests/http/GM-19.http`

### TC-SEC-004 — Phiếu thô không thể đọc bằng quyền host

- **Yêu cầu:** REQ-VOTE-09 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** sql · **Môi trường:** qa-local
- **Tiền điều kiện:** Host và thành viên đã gửi phiếu.
- **Các bước:**
  1. Host truy vấn bảng phiếu trực tiếp.
- **Kết quả mong đợi:** Bị từ chối; host chỉ thấy số liệu công khai.
- **Tự động hóa:** `supabase/tests/rls.sql`, `supabase/tests/finalize.sql`

### TC-SEC-005 — Khóa nhạy cảm bị từ chối trong cấu hình client

- **Yêu cầu:** REQ-SEC-02 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Cấu hình có khóa quyền cao.
- **Các bước:**
  1. Khởi tạo client với service-role key.
- **Kết quả mong đợi:** Client từ chối khóa quyền cao và endpoint không an toàn.
- **Tự động hóa:** `mobile/tests/unit/authTransport.test.ts::reject privileged/unrecognized configured key %s`, `mobile/tests/unit/authTransport.test.ts::legacy anon JWT allowed, legacy service-role JWT rejected`

### TC-SEC-006 — Không có secret trong repo và bundle

- **Yêu cầu:** REQ-SEC-02 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** e2e · **Môi trường:** ci
- **Tiền điều kiện:** Mã nguồn và gói release.
- **Các bước:**
  1. Quét repo và bundle JS tìm service_role, khóa SMTP, app password.
- **Kết quả mong đợi:** Không tìm thấy secret; chỉ có publishable key và khóa Places đã giới hạn.
- **Tự động hóa:** chưa có — Chưa có script quét secret; bổ sung ở GM-57.

### TC-SEC-007 — Không log phiếu bầu, token, email

- **Yêu cầu:** REQ-SEC-02 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Lỗi mạng xảy ra khi gửi.
- **Các bước:**
  1. Gây lỗi mạng và đọc log, thông báo lỗi công khai.
- **Kết quả mong đợi:** Thông báo lỗi và log không chứa token, phiếu hay email.
- **Tự động hóa:** `mobile/tests/unit/authSession.test.ts::read verification transient retry is bounded; secrets never enter public errors`, `mobile/tests/unit/authTransport.test.ts::network failure raw token message suppressed`

### TC-SEC-008 — Liên kết chứa token hoặc userinfo bị chặn

- **Yêu cầu:** REQ-SEC-02 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Liên kết vào phòng chứa token trong query.
- **Các bước:**
  1. Mở liên kết.
- **Kết quả mong đợi:** Bị từ chối, không điền mã phòng.
- **Tự động hóa:** `mobile/tests/unit/joinLinks.test.ts::rejects suspicious payloads containing tokens or passwords in query params`, `mobile/tests/unit/externalLinks.test.ts::rejects URLs containing embedded credentials or suspicious token params`

### TC-SEC-009 — Khóa Places giới hạn theo app và API

- **Yêu cầu:** REQ-SEC-03 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** e2e · **Môi trường:** staging, android, ios
- **Tiền điều kiện:** Khóa Places dùng trong bản release.
- **Các bước:**
  1. Gọi Places API từ ngoài app bằng khóa đó.
  2. Gọi từ app.
- **Kết quả mong đợi:** Chỉ gọi được từ app (package/bundle), chỉ hai API cho phép, quota ngày đã đặt.
- **Tự động hóa:** chưa có

### TC-SEC-010 — Tài khoản đã xóa không đọc được dữ liệu cũ

- **Yêu cầu:** REQ-AUTH-08 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** api · **Môi trường:** qa-local, staging
- **Tiền điều kiện:** Tài khoản đã bị xóa.
- **Các bước:**
  1. Dùng token cũ đọc phòng, bạn bè, lịch sử.
- **Kết quả mong đợi:** Mọi truy cập bị từ chối; dữ liệu người khác nguyên vẹn.
- **Tự động hóa:** chưa có — Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57).

### TC-SEC-011 — Danh tính do server xác minh, không tin metadata

- **Yêu cầu:** REQ-SEC-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Token có metadata userId giả.
- **Các bước:**
  1. Gọi xác minh phiên.
- **Kết quả mong đợi:** Danh tính lấy từ GoTrue, metadata userId không thành caller.
- **Tự động hóa:** `mobile/tests/unit/authTransport.test.ts::GET user verifies bearer on server; metadata userId never becomes caller`

### TC-SEC-012 — Dữ liệu chỉ gửi tới Supabase và Google Places

- **Yêu cầu:** REQ-SEC-03 · **Ưu tiên:** P1 · **Loại:** privacy · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Build release chạy qua proxy ghi log domain.
- **Các bước:**
  1. Dùng đủ luồng chính và kết quả.
- **Kết quả mong đợi:** Chỉ gọi tới Supabase và domain Google Places/Maps; không gửi sang AI hay bên thứ ba khác.
- **Tự động hóa:** chưa có

## DATA — Dữ liệu món ăn (10 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-DATA-001 | P0 | functional | unit | Catalogue có version và hash ghim | REQ-DATA-01 | 2 | Pass |
| TC-DATA-002 | P0 | security | unit | Importer từ chối database không được phép | REQ-DATA-01 | 2 | Pass |
| TC-DATA-003 | P0 | functional | unit | Hosted import có cờ xác nhận, dry-run, rollback | REQ-DATA-01 | — | Not run |
| TC-DATA-004 | P0 | boundary | api | Mỗi bữa tạo được phòng 10 món | REQ-DATA-02 | 1 | Not run |
| TC-DATA-005 | P0 | negative | unit | Món thiếu mealSlots không vào pool | REQ-DATA-02 | 1 | Pass |
| TC-DATA-006 | P0 | functional | unit | Mã taxonomy và ID ổn định | REQ-DATA-03 | 2 | Pass |
| TC-DATA-007 | P0 | negative | unit | Thiếu nguồn thì unknown, không bịa | REQ-DATA-03 | 2 | Pass |
| TC-DATA-008 | P1 | boundary | unit | Giá giữ đủ amount, đơn vị và nguồn | REQ-RES-05 | 2 | Pass |
| TC-DATA-009 | P1 | functional | unit | Ảnh cần license và ghi công | REQ-DATA-04 | 1 | Pass |
| TC-DATA-010 | P0 | functional | unit | Độ phủ theo bữa và nhóm sau bổ sung dữ liệu | REQ-DATA-02 | — | Not run |

### TC-DATA-001 — Catalogue có version và hash ghim

- **Yêu cầu:** REQ-DATA-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Bundle catalogue 1.1.0.
- **Các bước:**
  1. Build lại bundle hai lần.
  2. So hash.
- **Kết quả mong đợi:** Hai lần build giống hệt; version và hash khớp manifest.
- **Tự động hóa:** `tests/test_dish_catalogue.py::test_two_offline_builds_identical_and_saved_artifacts_current`, `tests/test_catalogue_projection.py::test_two_builds_are_byte_identical_without_database`

### TC-DATA-002 — Importer từ chối database không được phép

- **Yêu cầu:** REQ-DATA-01 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Cố nạp vào database ứng dụng hoặc namespace sai.
- **Các bước:**
  1. Chạy importer với DB lạ.
- **Kết quả mong đợi:** Bị từ chối trước khi chạy SQL, không đụng DB ứng dụng.
- **Tự động hóa:** `tests/test_dish_catalogue_import.py::test_owned_db_guards_refuse_application_and_wrong_namespace`, `tests/test_catalogue_projection.py::test_application_database_is_refused_before_sql`

### TC-DATA-003 — Hosted import có cờ xác nhận, dry-run, rollback

- **Yêu cầu:** REQ-DATA-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci, staging
- **Tiền điều kiện:** Project Supabase staging.
- **Các bước:**
  1. Chạy dry-run.
  2. Chạy import có cờ xác nhận.
  3. Rollback về bản trước.
- **Kết quả mong đợi:** Dry-run mặc định không ghi; import cần cờ xác nhận; kích hoạt nguyên tử; rollback được.
- **Tự động hóa:** chưa có — Chức năng thuộc GM-51 chưa có; test thêm khi GM-51 hoàn tất.

### TC-DATA-004 — Mỗi bữa tạo được phòng 10 món

- **Yêu cầu:** REQ-DATA-02 · **Ưu tiên:** P0 · **Loại:** boundary · **Tầng:** api · **Môi trường:** qa-local, staging
- **Tiền điều kiện:** Bundle đã nạp.
- **Các bước:**
  1. Với từng bữa sáng, trưa, tối, ăn vặt tạo phòng 10 món.
- **Kết quả mong đợi:** Cả bốn bữa tạo được phòng 10 món không bị INSUFFICIENT_DISHES.
- **Tự động hóa:** `supabase/tests/http/GM-40.http`

### TC-DATA-005 — Món thiếu mealSlots không vào pool

- **Yêu cầu:** REQ-DATA-02 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Món không có mealSlots.
- **Các bước:**
  1. Tạo phòng ở từng bữa.
- **Kết quả mong đợi:** Món không xuất hiện ở bữa nào.
- **Tự động hóa:** `tests/test_dish_catalogue.py::test_meal_enrichment_coverage_and_unknown_preserved`

### TC-DATA-006 — Mã taxonomy và ID ổn định

- **Yêu cầu:** REQ-DATA-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Taxonomy v2.
- **Các bước:**
  1. Kiểm ID, family và nhóm.
- **Kết quả mong đợi:** ID dùng đúng stable_id của pipeline, mọi family trong nhóm tồn tại, không trùng ID.
- **Tự động hóa:** `tests/test_filter_taxonomy.py::test_ids_use_the_pipeline_stable_id_and_match_the_bundle`, `tests/test_filter_taxonomy.py::test_every_group_family_exists_and_ids_are_unique`

### TC-DATA-007 — Thiếu nguồn thì unknown, không bịa

- **Yêu cầu:** REQ-DATA-03 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Mẫu có phân loại không nguồn.
- **Các bước:**
  1. Nạp mẫu vào validator.
- **Kết quả mong đợi:** Phân loại không nguồn bị từ chối; giá trị chưa biết giữ unknown/null; không ảnh hay dị ứng suy diễn.
- **Tự động hóa:** `tests/test_editorial_catalogue.py::test_reject_unsourced_classification`, `tests/test_editorial_catalogue.py::test_no_allergy_or_menu_image_promotion`

### TC-DATA-008 — Giá giữ đủ amount, đơn vị và nguồn

- **Yêu cầu:** REQ-RES-05 · **Ưu tiên:** P1 · **Loại:** boundary · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Món có nhiều observation giá.
- **Các bước:**
  1. Kiểm giá sau khi build.
- **Kết quả mong đợi:** Mọi trường giá được giữ nguyên, giá null giữ null.
- **Tự động hóa:** `tests/test_dish_catalogue.py::test_price_observations_preserve_amount_unit_and_source`, `tests/test_editorial_catalogue.py::test_prices_preserve_every_source_field`

### TC-DATA-009 — Ảnh cần license và ghi công

- **Yêu cầu:** REQ-DATA-04 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Ảnh ứng viên chỉ có license.
- **Các bước:**
  1. Duyệt ảnh trong pipeline.
- **Kết quả mong đợi:** License đơn thuần không đủ; thiếu căn cứ giữ null.
- **Tự động hóa:** `tests/test_editorial_catalogue.py::test_image_license_alone_is_insufficient`

### TC-DATA-010 — Độ phủ theo bữa và nhóm sau bổ sung dữ liệu

- **Yêu cầu:** REQ-DATA-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci, staging
- **Tiền điều kiện:** Bundle kế tiếp từ GM-41 và GM-47.
- **Các bước:**
  1. Chạy báo cáo độ phủ.
- **Kết quả mong đợi:** Mỗi bữa đạt ngưỡng; mỗi nhóm có đủ món; ghi rõ món chưa có nguồn.
- **Tự động hóa:** chưa có — Bundle kế tiếp thuộc GM-41/GM-47 chưa có; kiểm bằng scripts/dish_filter_coverage.py khi bàn giao.

## UI — Giao diện và trợ năng (13 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-UI-001 | P0 | compatibility | e2e | Bố cục dùng được ở 320dp, 360dp và 412dp | REQ-UI-01 | — | Not run |
| TC-UI-002 | P0 | accessibility | e2e | Chữ phóng 200% không cắt nội dung | REQ-UI-02 | 1 | Partial |
| TC-UI-003 | P0 | accessibility | e2e | Nhãn và vai trò cho TalkBack/VoiceOver | REQ-UI-03 | 1 | Partial |
| TC-UI-004 | P0 | accessibility | component | Vùng chạm tối thiểu 48dp | REQ-UI-03 | 1 | Pass |
| TC-UI-005 | P1 | accessibility | component | Giảm chuyển động được tôn trọng | REQ-UI-03 | 2 | Pass |
| TC-UI-006 | P0 | functional | component | Bàn phím và nút Back | REQ-UI-01 | 2 | Partial |
| TC-UI-007 | P1 | compatibility | e2e | Chế độ tối giữ nội dung và độ tương phản | REQ-UI-04 | — | Not run |
| TC-UI-008 | P0 | functional | component | Mọi màn có loading, rỗng, lỗi, thử lại | REQ-UI-04 | 3 | Pass |
| TC-UI-009 | P1 | functional | component | Thông báo toast chỉ cho lỗi API và thao tác của chính mình | REQ-UI-04 | 3 | Pass |
| TC-UI-010 | P1 | compatibility | e2e | Safe area và tai thỏ | REQ-UI-01 | — | Not run |
| TC-UI-011 | P1 | resilience | component | Phông chữ tải và dự phòng | REQ-UI-01 | 2 | Pass |
| TC-UI-012 | P0 | accessibility | e2e | Màn tài khoản ở 320dp và chữ 200% | REQ-UI-02 | — | Not run |
| TC-UI-013 | P0 | compatibility | e2e | Đối chiếu Figma cùng state ở 412dp | REQ-UI-01 | — | Not run |

### TC-UI-001 — Bố cục dùng được ở 320dp, 360dp và 412dp

- **Yêu cầu:** REQ-UI-01 · **Ưu tiên:** P0 · **Loại:** compatibility · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Máy hoặc AVD ở ba độ rộng.
- **Các bước:**
  1. Mở lần lượt: Welcome, Home, Tạo phòng, Lobby, Bình chọn, Kết quả, Hồ sơ.
- **Kết quả mong đợi:** Không nội dung hay nút bị cắt; cuộn được; hành động chính luôn tới được.
- **Tự động hóa:** chưa có

### TC-UI-002 — Chữ phóng 200% không cắt nội dung

- **Yêu cầu:** REQ-UI-02 · **Ưu tiên:** P0 · **Loại:** accessibility · **Tầng:** e2e · **Môi trường:** ci, avd, android
- **Tiền điều kiện:** Font scale 2.0 ở 320dp.
- **Các bước:**
  1. Mở Hồ sơ, Cài đặt giao diện, Lobby, Kết quả.
- **Kết quả mong đợi:** Nhãn đọc trọn trên nhiều dòng, không bẻ giữa từ, vẫn cuộn được.
- **Tự động hóa:** `mobile/tests/component/dishPreferences.test.tsx::long dish-group labels break at their last separator`

### TC-UI-003 — Nhãn và vai trò cho TalkBack/VoiceOver

- **Yêu cầu:** REQ-UI-03 · **Ưu tiên:** P0 · **Loại:** accessibility · **Tầng:** e2e · **Môi trường:** ci, android, ios
- **Tiền điều kiện:** Bật TalkBack hoặc VoiceOver.
- **Các bước:**
  1. Đi qua luồng khách → tạo phòng → bình chọn → kết quả bằng trình đọc màn hình.
- **Kết quả mong đợi:** Mọi nút, ô nhập, lỗi có nhãn và vai trò đúng; thứ tự focus hợp lý.
- **Tự động hóa:** `mobile/tests/component/sharedComponents.test.tsx::shared controls expose labels, touch actions and selected state`

### TC-UI-004 — Vùng chạm tối thiểu 48dp

- **Yêu cầu:** REQ-UI-03 · **Ưu tiên:** P0 · **Loại:** accessibility · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Các nút chính.
- **Các bước:**
  1. Đo vùng chạm của nút, ô chọn, biểu tượng.
- **Kết quả mong đợi:** Mọi mục tương tác có vùng chạm không nhỏ hơn 48dp.
- **Tự động hóa:** `mobile/tests/component/appEntryEdgeCases.test.tsx (tag)`

### TC-UI-005 — Giảm chuyển động được tôn trọng

- **Yêu cầu:** REQ-UI-03 · **Ưu tiên:** P1 · **Loại:** accessibility · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Bật giảm chuyển động của hệ điều hành.
- **Các bước:**
  1. Mở hướng dẫn, kết quả, chuyển bước.
- **Kết quả mong đợi:** Hiệu ứng được rút gọn hoặc tắt.
- **Tự động hóa:** `mobile/tests/component/winnerCelebration.test.tsx::Reduce Motion requests zero-duration native animations`, `mobile/tests/component/tutorialCardMotion.test.tsx::reduced motion keeps gesture choices without moving the card`

### TC-UI-006 — Bàn phím và nút Back

- **Yêu cầu:** REQ-UI-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, avd, android
- **Tiền điều kiện:** Màn có ô nhập (tên, mã phòng, mật khẩu).
- **Các bước:**
  1. Mở bàn phím.
  2. Bấm nút Back khi đang chờ và khi không chờ.
- **Kết quả mong đợi:** Bàn phím không che nút chính; Back không gửi nhầm; khi đang chờ Back bị khóa theo thiết kế.
- **Tự động hóa:** `mobile/tests/component/guestEntryScreen.test.tsx::pending submission locks input, button and hardware Back, including repeated presses`, `mobile/tests/component/roomCodeField.test.tsx::pasting a whole code fills all cells once, including when replacing from a middle cell`

### TC-UI-007 — Chế độ tối giữ nội dung và độ tương phản

- **Yêu cầu:** REQ-UI-04 · **Ưu tiên:** P1 · **Loại:** compatibility · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Bật chế độ tối.
- **Các bước:**
  1. Mở các màn chính.
- **Kết quả mong đợi:** Nội dung đọc được, không mất biểu tượng hay trạng thái.
- **Tự động hóa:** chưa có

### TC-UI-008 — Mọi màn có loading, rỗng, lỗi, thử lại

- **Yêu cầu:** REQ-UI-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Từng màn danh sách và màn dữ liệu.
- **Các bước:**
  1. Giả lập đang tải, danh sách rỗng, lỗi mạng.
- **Kết quả mong đợi:** Mỗi trạng thái hiện rõ và có nút thử lại khi áp dụng.
- **Tự động hóa:** `mobile/tests/integration/gm32ClientStates.test.tsx::G01 friends distinguishes network failure, no friends and no search match`, `mobile/tests/component/voteLoadingScreens.test.tsx::the round 1 skeleton has the flashcard layout (title, progress, card) and no home-style header`, `mobile/tests/component/dishResultStates.test.tsx::%s never masquerades as no consensus or calls a finalization action`

### TC-UI-009 — Thông báo toast chỉ cho lỗi API và thao tác của chính mình

- **Yêu cầu:** REQ-UI-04 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Có sự kiện do người khác gây ra.
- **Các bước:**
  1. Nhận lời mời, chấp nhận kết bạn, kết quả chốt.
- **Kết quả mong đợi:** Sự kiện của người khác dùng banner thông báo, không dùng toast.
- **Tự động hóa:** `mobile/tests/component/feedbackRules.test.tsx::an API error is a red toast; the retry button stays on the page`, `mobile/tests/component/feedbackRules.test.tsx::a notification from someone else is a banner, not a toast, and opens where it points`, `mobile/tests/unit/inboxNotice.test.ts::a friend request names who sent it and opens the inbox`

### TC-UI-010 — Safe area và tai thỏ

- **Yêu cầu:** REQ-UI-01 · **Ưu tiên:** P1 · **Loại:** compatibility · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Máy có tai thỏ hoặc thanh gesture.
- **Các bước:**
  1. Mở các màn chính ở dọc và ngang.
- **Kết quả mong đợi:** Nội dung tránh vùng hệ thống; nút dưới cùng không bị che.
- **Tự động hóa:** chưa có

### TC-UI-011 — Phông chữ tải và dự phòng

- **Yêu cầu:** REQ-UI-01 · **Ưu tiên:** P1 · **Loại:** resilience · **Tầng:** component · **Môi trường:** ci
- **Tiền điều kiện:** Phông Inter chưa tải xong hoặc tải lỗi.
- **Các bước:**
  1. Mở app.
- **Kết quả mong đợi:** Dùng phông dự phòng, không chặn màn hình.
- **Tự động hóa:** `mobile/tests/component/AppFontProvider.test.tsx::a font load failure keeps Vietnamese text available with system weights`, `mobile/tests/component/AppFontProvider.test.tsx::a delayed font load keeps usable children on screen`

### TC-UI-012 — Màn tài khoản ở 320dp và chữ 200%

- **Yêu cầu:** REQ-UI-02 · **Ưu tiên:** P0 · **Loại:** accessibility · **Tầng:** e2e · **Môi trường:** avd, android
- **Tiền điều kiện:** Chữ 200% ở 320dp.
- **Các bước:**
  1. Mở Hồ sơ, Cài đặt, Đăng nhập, Đăng ký.
- **Kết quả mong đợi:** Nhãn Giao diện và Cỡ chữ đọc trọn trên hai dòng, form cuộn được.
- **Tự động hóa:** chưa có

### TC-UI-013 — Đối chiếu Figma cùng state ở 412dp

- **Yêu cầu:** REQ-UI-01 · **Ưu tiên:** P0 · **Loại:** compatibility · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Frame Figma và app cùng dữ liệu, vai trò.
- **Các bước:**
  1. Chụp app ở 412dp, chữ chuẩn.
  2. So với frame Figma tương ứng.
- **Kết quả mong đợi:** Khác biệt nằm trong phần đã được Trí chấp nhận bằng văn bản.
- **Tự động hóa:** chưa có

## REL — Phát hành và nâng cấp (12 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-REL-001 | P0 | functional | e2e | Cài mới chạy được | REQ-REL-01 | — | Not run |
| TC-REL-002 | P0 | functional | e2e | Nâng cấp từ bản trước giữ phiên | REQ-REL-01 | — | Not run |
| TC-REL-003 | P0 | functional | unit | Bản app cũ thấy màn Cần cập nhật khi dưới phiên bản tối thiểu | REQ-REL-02 | — | Not run |
| TC-REL-004 | P0 | resilience | unit | Không đọc được cấu hình phiên bản thì vẫn dùng được | REQ-REL-02 | — | Not run |
| TC-REL-005 | P0 | resilience | e2e | Backend tạm ngừng khi review store | REQ-REL-03 | — | Not run |
| TC-REL-006 | P0 | functional | e2e | Liên kết chính sách và điều khoản mở được khi chưa đăng nhập | REQ-REL-04 | — | Not run |
| TC-REL-007 | P1 | functional | component | Hiển thị phiên bản app | REQ-REL-04 | — | Not run |
| TC-REL-008 | P0 | security | unit | Build release không có route dev hay nút QA | REQ-REL-05 | — | Not run |
| TC-REL-009 | P0 | functional | component | Mục thông báo đẩy ẩn khi chưa cấu hình | REQ-REL-05 | — | Not run |
| TC-REL-010 | P1 | functional | e2e | Phiên bản và build ghi nhận đúng | REQ-REL-01 | — | Not run |
| TC-REL-011 | P0 | privacy | e2e | Quyền camera và vị trí chỉ khi dùng, không chạy nền | REQ-ENTRY-02 | — | Not run |
| TC-REL-012 | P0 | functional | e2e | Closed testing và hướng dẫn cho người review | REQ-REL-03 | — | Not run |

### TC-REL-001 — Cài mới chạy được

- **Yêu cầu:** REQ-REL-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** avd, android, ios
- **Tiền điều kiện:** Máy sạch, bản release candidate.
- **Các bước:**
  1. Cài app.
  2. Mở và vào Home bằng khách.
- **Kết quả mong đợi:** Mở độc lập không cần Metro, vào được Home.
- **Tự động hóa:** chưa có

### TC-REL-002 — Nâng cấp từ bản trước giữ phiên

- **Yêu cầu:** REQ-REL-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Đã cài bản trước và có phiên.
- **Các bước:**
  1. Cài bản mới đè lên.
  2. Mở app.
- **Kết quả mong đợi:** Giữ phiên và dữ liệu cục bộ hợp lệ, không crash khi đổi schema SQLite.
- **Tự động hóa:** chưa có

### TC-REL-003 — Bản app cũ thấy màn Cần cập nhật khi dưới phiên bản tối thiểu

- **Yêu cầu:** REQ-REL-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** unit · **Môi trường:** ci, staging
- **Tiền điều kiện:** Cấu hình phiên bản tối thiểu cao hơn bản đang chạy.
- **Các bước:**
  1. Mở app.
- **Kết quả mong đợi:** Hiện màn Cần cập nhật kèm liên kết store.
- **Tự động hóa:** chưa có — Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57).

### TC-REL-004 — Không đọc được cấu hình phiên bản thì vẫn dùng được

- **Yêu cầu:** REQ-REL-02 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** unit · **Môi trường:** ci
- **Tiền điều kiện:** Cấu hình phiên bản lỗi hoặc sai schema.
- **Các bước:**
  1. Mở app.
- **Kết quả mong đợi:** Vẫn cho dùng bình thường, không chặn người dùng.
- **Tự động hóa:** chưa có — Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57).

### TC-REL-005 — Backend tạm ngừng khi review store

- **Yêu cầu:** REQ-REL-03 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Staging bị tạm dừng hoặc mất mạng.
- **Các bước:**
  1. Mở app và thử tạo phòng.
- **Kết quả mong đợi:** Báo lỗi rõ, cho thử lại, không crash.
- **Tự động hóa:** chưa có

### TC-REL-006 — Liên kết chính sách và điều khoản mở được khi chưa đăng nhập

- **Yêu cầu:** REQ-REL-04 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Chưa đăng nhập.
- **Các bước:**
  1. Mở liên kết chính sách, điều khoản, hỗ trợ, xóa dữ liệu từ app và từ web.
- **Kết quả mong đợi:** Các trang mở được công khai, đúng nội dung, có email liên hệ.
- **Tự động hóa:** chưa có

### TC-REL-007 — Hiển thị phiên bản app

- **Yêu cầu:** REQ-REL-04 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, avd
- **Tiền điều kiện:** Đang ở Hồ sơ hoặc Cài đặt.
- **Các bước:**
  1. Mở Hồ sơ.
- **Kết quả mong đợi:** Hiện số phiên bản app.
- **Tự động hóa:** chưa có — Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57).

### TC-REL-008 — Build release không có route dev hay nút QA

- **Yêu cầu:** REQ-REL-05 · **Ưu tiên:** P0 · **Loại:** security · **Tầng:** unit · **Môi trường:** ci, android, ios
- **Tiền điều kiện:** Build production.
- **Các bước:**
  1. Mở /dev/icons và các route dev.
  2. Mở màn thông báo đẩy.
- **Kết quả mong đợi:** Route dev chuyển về Home; không có nút QA; cờ giả lập vô hiệu.
- **Tự động hóa:** chưa có — Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57).

### TC-REL-009 — Mục thông báo đẩy ẩn khi chưa cấu hình

- **Yêu cầu:** REQ-REL-05 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** component · **Môi trường:** ci, android, ios
- **Tiền điều kiện:** Build không có EAS project ID.
- **Các bước:**
  1. Mở Hồ sơ và Cài đặt.
- **Kết quả mong đợi:** Không hiện mục thông báo đẩy hay lời nhắc thiếu cấu hình; hộp thư và banner vẫn dùng được.
- **Tự động hóa:** chưa có — Tính năng của task release v1 chưa merge; test được thêm khi task đó hoàn tất (GM-56/57).

### TC-REL-010 — Phiên bản và build ghi nhận đúng

- **Yêu cầu:** REQ-REL-01 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ci
- **Tiền điều kiện:** Build từ EAS.
- **Các bước:**
  1. Đọc version và buildNumber/versionCode.
- **Kết quả mong đợi:** Khớp với hồ sơ phát hành và tăng sau mỗi build.
- **Tự động hóa:** chưa có

### TC-REL-011 — Quyền camera và vị trí chỉ khi dùng, không chạy nền

- **Yêu cầu:** REQ-ENTRY-02 · **Ưu tiên:** P0 · **Loại:** privacy · **Tầng:** e2e · **Môi trường:** android, ios
- **Tiền điều kiện:** Build release.
- **Các bước:**
  1. Kiểm manifest và Info.plist.
  2. Dùng app và để chạy nền.
- **Kết quả mong đợi:** Chỉ khai báo camera, vị trí khi dùng; không có audio, không theo dõi nền.
- **Tự động hóa:** chưa có

### TC-REL-012 — Closed testing và hướng dẫn cho người review

- **Yêu cầu:** REQ-REL-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** staging
- **Tiền điều kiện:** Hồ sơ store.
- **Các bước:**
  1. Người review làm theo ghi chú: cần hai người mới bắt đầu phòng.
- **Kết quả mong đợi:** Người review chơi hết một ván với tài khoản hoặc người thứ hai được chuẩn bị.
- **Tự động hóa:** chưa có

## IOS — iOS (10 ca)

| ID | Ưu tiên | Loại | Tầng | Tiêu đề | Yêu cầu | Tự động | Trạng thái |
| --- | --- | --- | --- | --- | --- | --- | --- |
| TC-IOS-001 | P0 | functional | e2e | Quét QR vào phòng trên iPhone | REQ-IOS-01 | — | Not run |
| TC-IOS-002 | P0 | negative | e2e | Từ chối camera trên iOS vẫn nhập mã tay | REQ-IOS-01 | — | Not run |
| TC-IOS-003 | P0 | functional | e2e | Vị trí chỉ khi dùng và Places trên iOS | REQ-IOS-02 | — | Not run |
| TC-IOS-004 | P0 | resilience | e2e | Phiên khôi phục sau khi mở lại bằng Keychain | REQ-IOS-02 | — | Not run |
| TC-IOS-005 | P0 | functional | e2e | Liên kết vào phòng khi lạnh và khi nóng | REQ-IOS-03 | — | Not run |
| TC-IOS-006 | P0 | compatibility | e2e | Tai thỏ, bàn phím và cử chỉ Back | REQ-IOS-03 | — | Not run |
| TC-IOS-007 | P0 | functional | e2e | Bình chọn hai vòng trên iPhone | REQ-VOTE-02 | — | Not run |
| TC-IOS-008 | P0 | functional | e2e | Xóa tài khoản trên iPhone | REQ-AUTH-08 | — | Not run |
| TC-IOS-009 | P1 | accessibility | e2e | Chế độ tối và chữ lớn trên iPhone | REQ-UI-02 | — | Not run |
| TC-IOS-010 | P1 | functional | e2e | Quyền thông báo trên iPhone khi chưa có push từ xa | REQ-ENTRY-02 | — | Not run |

### TC-IOS-001 — Quét QR vào phòng trên iPhone

- **Yêu cầu:** REQ-IOS-01 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** iPhone thật, bản TestFlight.
- **Các bước:**
  1. Chọn quét QR, cho phép camera.
  2. Quét mã phòng.
- **Kết quả mong đợi:** Quét thành công hiện màn xác nhận trước khi vào.
- **Tự động hóa:** chưa có

### TC-IOS-002 — Từ chối camera trên iOS vẫn nhập mã tay

- **Yêu cầu:** REQ-IOS-01 · **Ưu tiên:** P0 · **Loại:** negative · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** Đã từ chối quyền camera.
- **Các bước:**
  1. Chọn quét QR.
  2. Mở Cài đặt từ app.
  3. Nhập mã tay.
- **Kết quả mong đợi:** Có lời nhắc mở Cài đặt; nhập mã tay vẫn hoạt động; mô tả quyền hiển thị đúng.
- **Tự động hóa:** chưa có

### TC-IOS-003 — Vị trí chỉ khi dùng và Places trên iOS

- **Yêu cầu:** REQ-IOS-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** iPhone, kết quả có winner.
- **Các bước:**
  1. Cho phép vị trí khi dùng.
  2. Mở kết quả.
  3. Lặp lại khi từ chối.
- **Kết quả mong đợi:** Hiện quán và bản đồ khi cho phép; từ chối thì kết quả giữ nguyên.
- **Tự động hóa:** chưa có

### TC-IOS-004 — Phiên khôi phục sau khi mở lại bằng Keychain

- **Yêu cầu:** REQ-IOS-02 · **Ưu tiên:** P0 · **Loại:** resilience · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** Đã đăng nhập trên iPhone.
- **Các bước:**
  1. Thoát hẳn app.
  2. Mở lại.
- **Kết quả mong đợi:** Khôi phục đúng danh tính, không tạo khách mới.
- **Tự động hóa:** chưa có

### TC-IOS-005 — Liên kết vào phòng khi lạnh và khi nóng

- **Yêu cầu:** REQ-IOS-03 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** Có liên kết phòng.
- **Các bước:**
  1. Mở liên kết khi app đã tắt.
  2. Mở khi app ở nền.
- **Kết quả mong đợi:** App mở màn xem trước đúng mã phòng, vẫn cần xác nhận.
- **Tự động hóa:** chưa có

### TC-IOS-006 — Tai thỏ, bàn phím và cử chỉ Back

- **Yêu cầu:** REQ-IOS-03 · **Ưu tiên:** P0 · **Loại:** compatibility · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** iPhone có tai thỏ.
- **Các bước:**
  1. Nhập tên, mã phòng, mật khẩu.
  2. Vuốt từ mép để quay lại.
- **Kết quả mong đợi:** Nội dung tránh tai thỏ; bàn phím không che nút; cử chỉ Back không gửi nhầm.
- **Tự động hóa:** chưa có

### TC-IOS-007 — Bình chọn hai vòng trên iPhone

- **Yêu cầu:** REQ-VOTE-02 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** iPhone cùng một thiết bị khác trong phòng.
- **Các bước:**
  1. Chơi hết hai vòng.
- **Kết quả mong đợi:** Kết quả giống thiết bị kia; ACK và đồng hồ đúng.
- **Tự động hóa:** chưa có

### TC-IOS-008 — Xóa tài khoản trên iPhone

- **Yêu cầu:** REQ-AUTH-08 · **Ưu tiên:** P0 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** iPhone đã đăng nhập.
- **Các bước:**
  1. Vào Hồ sơ, Xóa tài khoản, xác nhận.
- **Kết quả mong đợi:** Về màn chào, dữ liệu bị xóa theo yêu cầu của App Store.
- **Tự động hóa:** chưa có

### TC-IOS-009 — Chế độ tối và chữ lớn trên iPhone

- **Yêu cầu:** REQ-UI-02 · **Ưu tiên:** P1 · **Loại:** accessibility · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** Bật Dark và cỡ chữ lớn nhất.
- **Các bước:**
  1. Mở các màn chính.
- **Kết quả mong đợi:** Không cắt nội dung, VoiceOver đọc đúng.
- **Tự động hóa:** chưa có

### TC-IOS-010 — Quyền thông báo trên iPhone khi chưa có push từ xa

- **Yêu cầu:** REQ-ENTRY-02 · **Ưu tiên:** P1 · **Loại:** functional · **Tầng:** e2e · **Môi trường:** ios
- **Tiền điều kiện:** Lần đầu sau đăng nhập.
- **Các bước:**
  1. Từ chối rồi cho phép thông báo.
- **Kết quả mong đợi:** App không crash, banner trong app vẫn hoạt động, không hứa push khi app tắt.
- **Tự động hóa:** chưa có
