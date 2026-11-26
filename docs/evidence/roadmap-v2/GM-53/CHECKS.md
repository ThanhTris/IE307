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
| Expo Go AVD nối Auth/REST/worker/Edge | Các ca [HANDOFF](HANDOFF.md#bước-5--kiểm-expo-go-trên-avd) | Not run. Tuấn kiểm Expo Go trên điện thoại thật và bàn giao lượt AVD cho Trí. |
| Visual / trợ năng | Đối chiếu [FIGMA_PARITY](FIGMA_PARITY.md) | Not run trên AVD, chưa có ảnh app. |

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
- Chờ Tuấn kiểm lại ca hồi quy trên Expo Go điện thoại thật và Trí
  kiểm lượt AVD. Xem danh sách trong [HANDOFF](HANDOFF.md).

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
  `READY_FOR_MERGE_REVIEW`. Lượt AVD và ảnh đối chiếu vẫn chờ Trí.

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
