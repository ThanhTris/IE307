# Kế hoạch kiểm thử release v1

Tài liệu mô tả cách kiểm thử ứng dụng "Gì Cũng Được" trước khi đăng Google Play và App Store. Phạm vi phát hành xem [RELEASE_V1_SCOPE](../project/RELEASE_V1_SCOPE.md); yêu cầu được kiểm xem [REQUIREMENTS](REQUIREMENTS.md). Đầu ra cho báo cáo gồm [TEST_CASES](TEST_CASES.md), [TRACEABILITY](TRACEABILITY.md), [TEST_REPORT](TEST_REPORT.md) và file Excel xuất bằng `scripts/test_cases.py`.

## 1. Mục tiêu và phạm vi

- Chứng minh các yêu cầu P0 của release v1 hoạt động trên cả hai nền tảng với backend Supabase hosted: tài khoản, phòng, bình chọn hai vòng, kết quả Top 3, Places, bạn bè và hộp thư, lịch sử, xóa tài khoản, bảo mật và quyền riêng tư, trợ năng, nâng cấp.
- Ngoài phạm vi: OCR menu, AI sở thích, weather/mood, push từ xa FCM, Google Sign-In (hoãn sau khi lên store).
- Đây là bộ test case cho ứng dụng, không chỉ liệt kê tính năng: mỗi ca có tiền điều kiện, dữ liệu, các bước, kết quả mong đợi, mức ưu tiên, loại ca, tầng kiểm, môi trường và liên kết tới yêu cầu.

## 2. Cấu trúc bộ test case

| Thành phần | Vị trí | Ghi chú |
| --- | --- | --- |
| Yêu cầu (REQ) | `REQUIREMENTS.md` | Bảng yêu cầu hiện hành; yêu cầu cũ ghi `Superseded` để không mâu thuẫn |
| Test case | `cases/*.json` (15 module) | Nguồn dữ liệu duy nhất; ID dạng `TC-<MODULE>-NNN` |
| Kết quả chạy | `results/*.json` | Mỗi lượt chạy một file; không có kết quả thì trạng thái là `Not run` |
| Bản trình bày | `TEST_CASES.md`, `TRACEABILITY.md`, `TEST_REPORT.md`, Excel | Sinh tự động, không sửa tay |

Module: AUTH, ENTRY, ROOM, PREF, VOTE1, VOTE2, RES, SOC, HIS, RT, SEC, DATA, UI, REL, IOS.

Mỗi test case có các trường: `id`, `title`, `req`, `priority` (P0–P2), `type` (functional, negative, boundary, security, privacy, accessibility, compatibility, resilience), `level`, `preconditions`, `data`, `steps`, `expected`, `automation`, `env`, và `gap` khi chưa có test tự động.

## 3. Các tầng kiểm thử

| Tầng (`level`) | Công cụ | Nơi chạy |
| --- | --- | --- |
| `unit` | Jest (`mobile/tests/unit`), `node --test` (engine), `unittest` (Python, dữ liệu, validator) | CI, máy lập trình |
| `component` | Jest + Testing Library (`mobile/tests/component`) | CI |
| `sql` | Bộ `supabase/tests/database/*.sql` và `supabase/tests/*.sql` trên QA cô lập | QA local (GM-03) |
| `api` | Bộ `supabase/tests/http/*.http`, runner GM-20/21/40 và script E2E hai client (GM-57) | QA local, staging |
| `e2e` | Chạy trên thiết bị: AVD, Android thật, iPhone thật, iOS Simulator | Thiết bị, nối staging |

Liên kết tự động hóa (`automation`) cho biết test nào chịu trách nhiệm kiểm ca đó. Liên kết chỉ có giá trị truy vết: **một ca chỉ được coi là Pass khi có kết quả chạy thật trong `results/`**, không suy ra từ việc có test. Với liên kết tới cả file `.sql` hay `.http`, người chạy xác nhận trong kết quả rằng suite thực sự bao phủ ca đó; ca nào suite không bao phủ thì ghi Fail hoặc bổ sung test ở GM-57.

## 4. Môi trường

| Mã (`env`) | Môi trường | Dùng cho |
| --- | --- | --- |
| `ci` | Máy chạy Jest/unittest/node:test | Ca tự động mức unit và component |
| `qa-local` | Supabase local do GM-03 dựng (Auth + REST + worker), catalogue 1.1.0 | Ca SQL/API, E2E hai client |
| `staging` | Supabase staging hosted (GM-52), build release candidate | Ca cần hosted: chuyển vòng bằng pg_cron, quota Places, review store |
| `avd` | Android Virtual Device API 35–37 nối QA local hoặc staging | Giao diện và luồng đầu cuối |
| `android` | Điện thoại Android thật qua USB | QR thật, camera, quyền, force-stop, chữ lớn, TalkBack |
| `ios` | iPhone thật (TestFlight) và iOS Simulator trên Mac | Toàn bộ nhóm IOS và ca dùng chung cần xác nhận trên iOS |

Một ca có nhiều môi trường chỉ đạt khi đủ mọi môi trường liệt kê đều Pass.

## 5. Quy trình chạy và ghi kết quả

1. `python scripts/test_cases.py --check` phải đạt trước mọi lượt chạy.
2. **Tự động:** chạy `npm test -- --json --outputFile=jest.json` trong `mobile/`, và `python -m unittest discover -s tests -p "test_*.py" -v` rồi ghi vào kết quả bằng `--import-jest` và `--import-unittest` (kèm `--run-id`, `--commit`). Chỉ các ca có môi trường `ci` và toàn bộ automation là Jest hoặc unittest được tự ghi; ca còn lại ghi tay.
3. **QA local và staging:** chạy suite HTTP/SQL tương ứng, tạo `results/<run-id>.json` với các trường `case`, `env`, `status`, `actual`, `evidence`, `device`, `tester`.
4. **Thiết bị:** người chạy thực hiện từng bước trong ca trên build release candidate (hash APK/IPA ghi ở `build`), chụp ảnh đã che dữ liệu nhạy cảm, ghi kết quả thực tế.
5. Ca Fail ghi `defect` (issue hoặc PR); sửa xong chạy lại, kết quả mới ghi đè kết quả cũ của cùng `(case, env)`.
6. `python scripts/test_cases.py --write` cập nhật bản trình bày; `--xlsx <file>` xuất Excel cho báo cáo.

Trạng thái hợp lệ: `Pass`, `Fail`, `Blocked`, `N/A` (kèm lý do). `Not run` nghĩa là chưa chạy, không phải đạt.

## 6. Tiêu chí bắt đầu và kết thúc

- **Bắt đầu chạy trên release candidate:** GM-52 (staging), GM-53, GM-54, GM-35, GM-46 hoàn tất, GM-55/56/57 đã merge và `--check` đạt.
- **Kết thúc (đủ điều kiện nộp store):** mọi ca P0 là Pass hoặc lỗi đã được Trí chấp nhận bằng văn bản; không còn `Not run` hoặc `Blocked` ở phạm vi bắt buộc; mọi hạng mục checklist store có bằng chứng; báo cáo cuối và file Excel được xuất.

## 7. Mức độ lỗi

| Mức | Mô tả | Ví dụ |
| --- | --- | --- |
| Nghiêm trọng | Crash, mất hoặc lộ dữ liệu, sai kết quả bình chọn, không vào được phòng | Lộ phiếu của người khác; kết quả đổi giữa hai lần đọc |
| Cao | Luồng chính không hoàn thành nhưng có cách vòng | Kẹt ở lobby sau khi host bắt đầu |
| Trung bình | Sai hành vi phụ hoặc giao diện, có cách khắc phục | Nhãn bị cắt ở chữ 200% |
| Thấp | Sai nhỏ về câu chữ hoặc căn chỉnh | Lệch vài dp so với Figma |

Lỗi nghiêm trọng và cao chặn việc nộp store.

## 8. Rủi ro và khoảng trống đã biết

- Ca thuộc GM-35 (đăng ký, đăng nhập email, khôi phục, đổi mật khẩu) và các ca của GM-46, GM-48, GM-49, GM-51, GM-53, GM-54 chưa có test tự động vì tính năng chưa merge; được liệt kê trong mục "Ca chưa có test tự động" của [TEST_REPORT](TEST_REPORT.md) và do GM-56/GM-57 lấp.
- Nhóm UI, REL, IOS chủ yếu chạy tay trên thiết bị (GM-58); không có thiết bị thật thì ghi `Blocked`, không đánh dấu đạt.
- FCM, push từ xa và Google Sign-In nằm ngoài phạm vi; các ca chỉ kiểm rằng app không hứa tính năng này.
- Quota và key Places chỉ kiểm được trên staging với key thật; ghi kết quả có che khóa.

## 9. Phụ lục — kế hoạch food-v1 (lịch sử, 2026-10-07)

Nội dung dưới đây là bản test plan food-v1 có từ trước, giữ nguyên để các task và tài liệu khác còn tham chiếu được mã `T-01`..`T-26`. Bộ test case release v1 ở trên không thay thế các kịch bản đó; ánh xạ giữa chúng nằm trong [TRACEABILITY](TRACEABILITY.md) qua yêu cầu `REQ-*`.

### Test plan food-v1

[Ma trận Android–API bổ sung ngày 2026-10-12](MOBILE_API_TEST_MATRIX.md) ánh xạ producer/consumer/người kiểm và case điện thoại thật. HTTP/SQL máy tính, unit/mock trong mobile và app Android gọi API thật là ba lớp evidence khác nhau; không hoán đổi Pass giữa các lớp hoặc thêm dependency ngược.

2026-10-07. Đây là kế hoạch, chưa có kết quả native/backend. Test IDs dùng truy vết FR/task; dependency/package runner chốt ở GM-02.

| ID | Kiểu | Scenario / expected |
| --- | --- | --- |
| T-01 | Native/auth | Guest restart/session expired/names; secure restore/lost-session copy |
| T-02 | RPC race | Ghế thứ8/start-join, join retry unique; snapshot roster/pool giống nhau |
| T-03 | Domain/catalogue | Nướng/lẩu category mềm, pool<=8 không duplicate, snapshot không đổi khi catalogue publish |
| T-04 | Domain + SQL | Fixtures decision-v2, NO/UNSET/missing member/score/tie/candidate parity |
| T-05 | Transaction | Last submit race/lostACK/cancel-vote; một resultId, event sau commit, replay immutable |
| T-06 | UI | Round1 complete/edit trước Gửi, queued/unknown/ACK khóa đúng; lỗi giữ draft |
| T-07 | Domain/UI | Round2 keep/remove, một món explicit confirm, all removed/no third |
| T-08 | Security | UserA/B/host/outsider/anonymous-no-session; vote/invite/history/token ACL, spoof fail |
| T-09 | Network | Mất mạng/reconnect stale version/refetch/poll, không fake completed |
| T-10 | Native | Location first grant/deny/revoke/GPS off/approx/geocode timeout; review query tiếng Việt/app absent/browser/copy/return winner |
| T-11 | Social | Pair pending/accepted/reject/unfriend, avatar room invite accept không mã; full/locked/expiry/race/retry |
| T-12 | A11y | 320/390/768,font200,48dp,TalkBack,dark,reduced motion,image fallback |
| T-13 | Multi-client | 2/4/8 máy, host/member leave/cancel, disconnect giữ roster, progress ACK và same result |
| T-14 | Data | Migration fresh/upgrade,TTL cleanup/public catalogue/license/price nullable |
| T-15 | User pilot | >=5 nhóm, bàn miệng/random hợp lệ/app, đảo thứ tự, thời gian/chọn nhầm/fairness và phiên không match |
| T-16 | Outbox | Persist before send/kill/restart, pending vs ACK,unknown delivery same ID,version conflict attempt mới,stale round/auth/expiry và logout clear |
| T-17 | Push | Development/release build, grant/deny/inbox, event commit,dedupe,receipt/invalid token,offline, cold/warm tap auth/refetch |
| T-18 | Incoming link | QR/schema/host/path/code allowlist, cold/warm session,manual fallback/full/locked/expiry,no app; không deferred claim |
| T-19 | Context | Hour/timezone boundaries,meal override,budget null/unit/source,seed/category diversity,roster/context ready reset |
| T-20 | History | Opt-in partial/all, group key ACL,TTL/delete/rút consent,offline cache,3 recent soft preference không phá pool |
| T-21 | Gesture | Double tap only WANT, no toggle/submit,scroll/single/vertical no vote,detail control,left/right thumb,TalkBack button |
| T-22 | Explainability | Perfect/strict majority/half/allOK/odd n,NO excluded,shared tier không matrix,no-consensus copy/new room |
| T-23 | P0 coverage/data | Dataset verified/source/license/freshness/rollback; origin khác nơi bán; Haversine tới anchor mét, manual/out-of-coverage/unknown không giả có món |
| T-24 | P1 account | Link conflict/fail giữ guest,provider proof,auth change không replay user cũ,history sync/delete |
| T-25 | P0 eligibility/time | FOOD-01..10/12..14 phần core: lịch quán giao lịch món, nhiều ca/overnight/date exception/local timezone/[start,end)/last order; desiredAt/buffer một lần; stale/sold_out/empty; dataset/start race/reset ready; offering sau start không reroll |
| T-26 | P2 weather/mood | FOOD-11 và mood FOOD-12: forecast đúng giờ/khu vực, stale/timeout/opt-out, privacy/TTL; không override eligibility/NO hoặc đổi pool sau start |

Domain runner dùng sau GM-02, SQL đa auth user trong môi trường test, native recording + logs sanitized. Evidence mỗi task gồm lệnh/version/ngày/device/network/fixture/output và kết quả AC; không token/raw vote/tọa độ thật. HTML prototype không chứng minh push/realtime/native. Negative cases là bắt buộc ở feature rủi ro.

Mục tiêu NFR cập nhật <=2s trên Wi-Fi ổn định cần đo server/client timestamp, không là SLA. User pilot nhỏ không chứng minh thị trường hoặc độ an toàn dị ứng. Không chạy test placeholder rồi báo feature đạt.


Food-v1 review gate GM-01. GM-06 bàn giao SQL setup/runner; GM-02 native/domain runner; GM-08 data thật trước GM-18 query. GM-32, GM-33 không chờ GM-38 P2. [Food spec/AC](../specs/FOOD_DATA_SPEC.md), [dependency map](../project/TASK_DEPENDENCIES.md).
