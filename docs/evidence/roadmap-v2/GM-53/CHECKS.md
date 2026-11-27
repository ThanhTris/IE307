# GM-53 — Kiểm thử và bằng chứng

Nhánh `codex/gm-53-delete-account`, base `d7b89f2`, code `beb4f59`. Hợp đồng
`release-v1/2026-11-20/GM-53.1`; backend GM-49.1, migration 0064,
schema 0.31.8 của GM-49. Upstream profile GM-35 đã merge ở `d9332f7`
và máy chủ QA phải có cả migration 0066. Ngoại lệ/trạng thái thực tế
của từng lượt kiểm bên dưới.

| Phạm vi | Lệnh / đầu vào | Kết quả |
| --- | --- | --- |
| Gate bắt đầu | `python scripts/task_readiness.py --task GM-53 --base-ref origin/main` | Pass, READY_TO_CLAIM ngày 26/11/2026. |
| Cài dependencies | `npm ci --no-audit --no-fund` ở mobile, sau đó cài hai JS dependency được duyệt | Pass. React Hook Form 7.92.0 và Zod 4.6.7. |
| Expo | `npm run check:expo` với EXPO_OFFLINE=1 | Pass, SDK 58.0.25 và lockfile khớp. |
| TypeScript / ESLint | `npm run typecheck`, `npx eslint src tests scripts --max-warnings 0` và lint lại màn sau sửa cooldown | Pass, source và test. |
| Kiến trúc | `npm run check:architecture` | Pass. |
| GM-50 | GET ba URL pháp lý trong handoff | HTTP 200 cả ba trang privacy, terms và support. |
| API client / phiên | Jest accountDeletion + authSession: email/khách, 401/403/409/429/503, thrown/envelope, ACK sai, retry, epoch/cleanup | 49/49 Pass ở bước 2. |
| Giao diện và hồi quy liên quan | Jest deleteAccountScreen, profileScreen, accountDeletion, authSession và liveDishResultScreen | 85/85 Pass trong 5 suites trên `beb4f59`. Bao gồm route qua Hồ sơ, Back, replay và mở URL từ app. |
| QA Auth/REST/worker | `npm run qa:verify -- --run-id gm53-1126` | Pass. 52 migrations, 237 định nghĩa hàm, 2 bộ catalogue, worker có heartbeat. |
| QA Edge GM-49 | `node scripts/gm49_http_check.mjs` với manifest của run trên | 33 assertions Pass. 401 khi thiếu JWT, xóa email/khách, 409 khi trong phòng, replay ACK, rollback khi lỗi và ACL với JWT cũ. |
| Android export | `npx expo export --platform android --output-dir ../.work/gm53-android-final` | Pass trên `beb4f59`, bundle Hermes `entry-550a40e4d30a7665634bb5c071f1b7af.hbc`. Kiểm thiết bị ghi riêng. |
| Repo và task indexes | `python scripts/validate_repository.py`, `python scripts/task_readiness.py --check-docs` | Pass sau khi có đầy đủ hồ sơ. |
| Python regression | `python -m unittest discover -s tests -p 'test_*.py'` | Lượt đầy đủ 731 ca có 11 fail, 2 error, 7 skip. 141 ca của ba bộ validator/project gate/readiness chạy lại đều Pass sau khi hồ sơ có đủ file. Hai error môi trường Windows còn lại ở git init và quyền symlink. |
| Gate trước review | `python scripts/task_readiness.py --task GM-53 --gate merge --base-ref origin/main --verify-outputs` | READY_FOR_MERGE_REVIEW ở kiểm đầu vào, file và ownership. Bước AVD trong AC còn chờ kết quả. |
| Expo Go trên điện thoại Android thật | Xác nhận của Tuấn ngày 26/11/2026 | Đã chạy kiểm thủ công. Chưa có SHA bản mở trên điện thoại hoặc kết quả từng ca để đối chiếu. |
| Kiểm lại bàn phím trên Expo Go điện thoại thật | Xác nhận của Tuấn ngày 27/11/2026 sau khi nhận `ef6ee889` | Pass cho lỗi bàn phím của màn Xóa tài khoản. Bề ngang và cỡ chữ của điện thoại chưa được ghi trong kết quả. |
| Expo Go AVD nối Auth/REST/worker/Edge | [Kết quả của Trí trên PR #223](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7206330070) | Đạt một phần. Lỗi bàn phím đã sửa và kiểm lại. Xem bảng kết quả bên dưới. |
| Visual / trợ năng | Đối chiếu [FIGMA_PARITY](FIGMA_PARITY.md) | Bàn phím 320dp và chữ 200% đạt sau sửa. Đối chiếu node Figma, TalkBack và các cấu hình còn thiếu vẫn Not run. |

Jest chạy với Node 24.20.0, npm 11.19.0 và SDK 58.0.25. QA riêng dùng
API 54381, DB 54382 và Mailpit 54384. Phiên bản ứng dụng và dữ liệu
dùng để đo visual phải được ghi tại lượt AVD.

Khi kiểm lại ngày 26/11/2026, gateway QA trả 502 vì container Edge đã
dừng. Sau khi khởi động lại Edge và worker của `gm53-1126`, endpoint
trả 401 cho POST không bearer, `qa:verify` đạt và runner HTTP GM-49 đạt
33 ca, gồm xóa khách, xóa tài khoản email và thử lại cùng request ID.

### Hồi quy sau lượt Expo Go trên điện thoại thật

- Ở revision `4031bfb`, QA GoTrue và Mailpit xác nhận gửi email kèm mật khẩu vẫn giữ phiên
  khách, địa chỉ chưa đăng nhập được trước OTP. OTP chuyển đúng UUID
  sang tài khoản email và đăng nhập được bằng mật khẩu mới. Sau khi
  đóng riêng phiên xác minh mật khẩu, bearer của app vẫn xóa được tài
  khoản và nhận lại cùng ACK khi gửi lại UUID.
- Jest Auth transport, Auth session và xóa tài khoản đạt 89/89 ca trước
  lần khôi phục thứ tự liên kết. Bộ UI luồng truy cập tài khoản đạt trên
  revision tương ứng.
- Jest quyền app đạt 9/9 ca. Các bộ UI xóa tài khoản, Trang chủ,
  component chung và route khách đạt 61/61 ca khi chạy lại với timeout
  30 giây trên Windows. Lượt đầu dùng timeout mặc định có ca timeout
  và lỗi điều hướng ở các ca theo sau.
- TypeScript, ESLint trên các tệp chỉnh sửa, kiểm kiến trúc và
  validator tài liệu đạt. Python toàn repo chạy 731 ca khi dùng
  dependency có sẵn trong workspace. Còn ba ca lỗi liên quan đến
  cấu hình Git subprocess và quyền tạo symlink Windows.
- Tuấn xác nhận đã kiểm Expo Go trên điện thoại thật ngày 26/11/2026.
  Phản hồi trong quá trình thử đã dẫn đến các sửa đổi về banner sáng/tối,
  bố cục Cá nhân, luồng xóa tài khoản, quyền theo bản cài đặt và luồng
  mật khẩu. Hồ sơ chưa có kết quả từng ca hoặc xác nhận ảnh đối chiếu
  trên revision cuối. Kết quả AVD của Trí và xác nhận bàn phím của Tuấn
  được ghi trong mục ngày 27/11/2026 bên dưới.

### Kiểm lại sau khi khôi phục thứ tự OTP trước mật khẩu

- QA `gm53-1126`: GoTrue và Mailpit xác nhận OTP liên kết đúng UUID
  khi chưa đặt mật khẩu. Phiên vừa liên kết vẫn gọi được Auth, còn
  đăng nhập bằng mật khẩu bị từ chối cho đến khi có mật khẩu.
- Khôi phục bằng OTP đặt được mật khẩu cho cùng UUID. Đăng nhập, xác
  minh lại mật khẩu và xóa tài khoản qua Edge đều đạt. Đăng nhập sau
  xóa bị từ chối.
- Lượt đầu gặp HTTP 504 lúc thử Auth. Lượt tiếp theo hoàn thành trên
  cùng stack với tài khoản QA mới. Trạng thái trên thiết bị và ảnh đối
  chiếu vẫn ghi riêng sau lượt kiểm thực tế.
- Jest đạt 108/108 ca trong 6 bộ Auth và tài khoản, gồm quay lại sau
  OTP mà vẫn giữ phiên liên kết. TypeScript, ESLint trên các tệp sửa
  và kiểm kiến trúc đạt.
- Gate `--verify-outputs` với `origin/main` ở `35c60f1` trả
  `READY_FOR_MERGE_REVIEW` tại lượt kiểm ngày 26/11/2026.

### AVD Chặng 3A và kiểm lại bàn phím ngày 27/11/2026

Trí chạy lượt đầu trên `261b4c7a`, Android API 37, Expo Go 58.0.5,
QA GM-03 `gm53-1127-000055` có Auth, REST, worker và Edge. Stack đã
dừng sau lượt kiểm. Ảnh hiện lưu trên máy người review.
[Báo cáo AVD của Trí](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7206330070)

| Ca | Kết quả |
| --- | --- |
| Xóa tài khoản, 320dp, chữ 200%, có bàn phím | Trên `261b4c7a`, bàn phím che ô XÓA và hai nút. `ef6ee889` đặt `KeyboardAvoidingView` dùng `behavior="padding"` trên Android. Trí ghép bản sửa lên revision đã kiểm và xác nhận thấy ô XÓA, cuộn tới cả hai nút. Ở kích thước gốc, hai nút nằm trên bàn phím. Đóng bàn phím không để lại khoảng trống. |
| Đăng ký, 320dp, chữ 200%, có bàn phím | Trí kiểm riêng trên nhánh từ `main` có bản sửa, thấy được ô mật khẩu và cuộn tới hai nút. |
| Kiểm lại trên điện thoại thật | Tuấn xác nhận lỗi bàn phím của màn Xóa tài khoản đã được sửa khi dùng Expo Go sau khi đồng bộ `ef6ee889`. |
| HTTP GM-49 và các luồng xóa | 33/33 kiểm tra HTTP đạt. Hủy về Hồ sơ, nhập sai cụm hiện lỗi dưới ô. Xóa khách và email đúng mật khẩu về Welcome, tài khoản không còn trong DB. Mật khẩu sai giữ phiên và xóa ô mật khẩu. |
| Bấm đôi, Back và Hủy | Khi tạm dừng Edge, màn đang xử lý khóa Back và Hủy. Kong ghi đúng một POST và trả 200. |
| Mất kết nối và thử lại | Khi dừng Kong, lỗi xảy ra ở bước xác minh mật khẩu, người dùng vẫn ở form và tài khoản còn. Khi Kong hoạt động, nhập lại mật khẩu và xóa được. Thử lại cùng `requestId` sau khi đã gửi lệnh xóa vẫn Not run trên AVD. |
| Phòng và phiên | Khách đang trong phòng được nhắc rời hoặc hủy phòng, sau khi hủy có thể thử lại để xóa. Phiên khách bị thu hồi hiện lỗi và nút về màn chào mừng hoạt động. Mở lại app sau khi xóa vẫn ở Welcome. |
| Quyền, legal, phiên bản và dark mode | Màn xin quyền hiện lần đầu và bỏ qua khi đăng nhập lại. Phiên bản 0.1.0 khớp cấu hình. Cả ba link mở trình duyệt, privacy hiển thị, terms và support còn trắng sau 6 giây. Cả ba HTTP 200 từ host. Màn Xóa tài khoản, Trang chủ và Cá nhân đã được xem ở chế độ tối. Email được che ở màn OTP. |

Trí báo 74/74 ca trong 6 bộ tài khoản, hồ sơ và phiên trên `ef6ee889`.
TypeScript, ESLint thư mục account, kiểm kiến trúc, validator và merge
gate đạt trong lượt đó. [Bản sửa và kết quả kiểm lại](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7207748920)

**Còn Not run trên AVD:** TalkBack, đối chiếu ảnh theo node Figma, 360dp,
chữ 200% ở bề ngang thường, phiên email hết hạn, đăng nhập lại bằng tài
khoản đã xóa, quay lại app từ trình duyệt, vị trí Đăng xuất, so nền hai ô
xác nhận ở chế độ tối, kiểm lịch sử và nháp của khách mới sau xóa, đặt
mật khẩu sau OTP rồi đăng nhập, hồi quy ba ô Đổi mật khẩu giống nhau,
và kiểm bàn phím ở Đăng nhập, Sửa hồ sơ, Đổi mật khẩu. Cần xác nhận
terms và support hiển thị trong trình duyệt trên thiết bị.

Góp ý UX nhắc nhập lại mật khẩu khi lần thử trước dừng ở bước xác minh
vẫn mở. PR #221 cũng sửa `AccountFormFrame`. Nhánh của PR merge sau cần
kiểm lại diff và xử lý xung đột sau khi đồng bộ với `main`.

### Khôi phục mật khẩu từ màn Xóa tài khoản

Theo quyết định ngày 27/11/2026, form email có dòng gợi ý và nút
**Quên mật khẩu?** khi yêu cầu mật khẩu hiện tại. Nút khóa trong lúc
gửi. Luồng dùng cùng route và chính sách khôi phục theo email của tài
khoản đang đăng nhập như màn Đổi mật khẩu.
[Quyết định của Trí](https://github.com/ThanhTris/IE307/pull/223#issuecomment-7213447136)

| Bằng chứng | Kết quả |
| --- | --- |
| Jest tài khoản và xóa | 71/71 ca trong 5 bộ. Kiểm email thấy lối khôi phục, khách không thấy, route chỉ gửi OTP cho email đang đăng nhập, và nút khóa khi POST xóa đang chờ. TypeScript, ESLint và kiểm kiến trúc đạt. |
| Auth, Mailpit và Edge trên `gm53-1126` | Pass. OTP liên kết cùng UUID trước khi đặt mật khẩu. OTP khôi phục cho phép đặt mật khẩu, đăng nhập lại và xóa với ACK. GoTrue trả 403 khi đóng phiên cũ đã bị thu hồi, trường hợp tương ứng `AUTH_REQUIRED` mà app đã xử lý khi đăng xuất. Đăng nhập sau xóa bị từ chối. |
| Android export | Pass. `npx expo export --platform android --output-dir ../.work/gm53-recovery-android` tạo bundle Hermes `entry-2ba4af112f9ecd014d6b4e9c7537a7a8.hbc`. |
| Trọn luồng trên Expo Go điện thoại Android | Pass theo xác nhận của Tuấn ngày 27/11/2026 sau hướng dẫn chạy bản `8e95361`. Ca kiểm gồm liên kết email qua OTP, Back ở màn đặt mật khẩu, mở Quên mật khẩu từ màn xóa, khôi phục qua OTP, đăng nhập lại và xóa tài khoản theo đúng luồng yêu cầu. |
| Trọn luồng trên AVD | Not run cho thay đổi này. Máy thực hiện chưa có Android Emulator hoặc AVD được cấu hình. Ca tái lập ở [HANDOFF](HANDOFF.md#bước-5--kiểm-expo-go-trên-avd). |

Lượt full Jest đầu gặp timeout ở màn kết quả và dừng sau khi source
thay đổi. Bộ màn kết quả đã đạt ở lượt kiểm tập trung, chạy với
`--testTimeout=20000` trên máy Windows này. Cấu hình và giới hạn
thời gian trong repo giữ nguyên. Full mobile chưa có kết quả Pass.

Hai lỗi môi trường của lượt Python đầy đủ: Git subprocess thiếu
`GIT_CONFIG_VALUE_0` khi tạo checkout tạm trong `test_field_contracts`
và Windows WinError 1314 khi tạo symlink trong `test_gm40_manifest`.
Các fail còn lại của lượt đầu xuất hiện vì regression đọc HANDOFF
trước khi CHECKS hoàn tất. Ba module liên quan đã chạy lại sau khi đủ
file, với 69 + 38 + 34 ca đạt.

## Rà các nhóm kiểm chặn review

- Composition dùng RoomRepositoryProvider thật tạo service GM-53. Không
  cần callback test để route Hồ sơ nối tới Edge. Component test dùng
  production routes/provider với phản hồi HTTP và storage giả lập.
- Chỉ ACK JSON đúng cấu trúc và đúng requestId mới hoàn tất. Ca thiếu
  hoặc cặp field sai trả MALFORMED_RESPONSE. Ca throw có status/body và
  response chứa ok:false đi chung cơ chế map lỗi.
- Request đi qua hàng đợi phiên, kiểm epoch/danh tính trước xóa và
  trước khi dọn sau ACK. Hai lần submit không tạo hai request đang bay.
- Retry thủ công, tôn trọng Retry-After, có khoảng chờ tăng dần cho lỗi
  5xx và giới hạn thời gian chờ request. Form hủy scope khi unmount. Request đã gửi vẫn nhận ACK
  và chỉ dọn nếu cùng phiên. Không polling hoặc tự gửi lại lệnh xóa.
- Phạm vi route Hồ sơ, form xóa, adapter và các điểm dùng chung cần cho
  cleanup. Kiểm Git diff/ownership trước khi mở PR.
- Xác nhận AVD là bằng chứng riêng. Sự hiện diện của file, bundle thành
  công và Jest không thay lượt kiểm này.
