# GM-10 — bàn giao context và khẩu vị

**Bản bàn giao sau cập nhật main (2026-10-16):** PR #122 đã nhận `origin/main` `1862c86` vào merge commit `58b2849`; conflict chỉ ở README, đã giữ hướng dẫn GM-10 và baseline Expo. Đã chạy lại trên bản merge: Expo baseline 5/5, route 17/17, mobile 19 suites/566 tests, Android export pass 1309 modules, Python 550 pass/6 skipped, validator/index/diff pass. Xem [MAIN_SYNC_2026-10-16](MAIN_SYNC_2026-10-16.md). Reviewer Trí vẫn cần kiểm revision mới và quyết định merge/Done; các kiểm thiết bị riêng và API/native ngoài scope chưa được tự ghi Pass.

Owner Tuấn (`mtuan2491`), reviewer Trí (`ThanhTris`), contract `food-v1/roadmap-v2/GM-10.1`. Nhánh `codex/gm-10-context-and-preferences`, base `origin/main`30ecb56, HEAD giữ tại base + working tree chưa commit; [manifest source/test](PATCH_MANIFEST.json). Agent không tạo commit/merge commit/push hoặc đổi Project/Done/Approved.

**Trạng thái mới nhất:** người dùng xác nhận đã kiểm tra bản sửa cuối và ổn thỏa trên Expo Go; [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md) ghi Pass theo xác nhận chung, không tự ghi Pass riêng từng fixture/a11y. [DATE_UI_REVIEW](DATE_UI_REVIEW.md) ghi ba sửa đổi: chọn ngày/giờ riêng, ngân sách card riêng, checkbox xanh. Mobile551/Python550/export Android đạt; [CHECKS](CHECKS.md) ghi kết quả và giới hạn, manifest18 source/test files. A6/A7/A8 ngoài lần đánh giá GM-10 theo chỉ dẫn người dùng; check Expo online exit1 do khuyến nghị patch nền vẫn giữ nguyên. Hồ sơ đã chuẩn bị để gửi Trí review, chưa commit/review/nghiệm thu. [Mô tả PR](PR_BODY.md) và [hướng dẫn commit/push](COMMIT_AND_PUSH.md).

## Input và scope đã nhận

GM-05.1 tokens/components (merge9e9f5ba), GM-07.1 DTO/client/mock (0711782/9f71bba) có trên base và Done theo Project gate. Issue #71 có assignment:accepted; AC và comments của #65/#66/#68/#85/#86 đã đọc, không có yêu cầu bổ sung trong comments. Áp dụng ADR-011/013 thay các câu workflow lịch sử trong issue. Xem [PLAN](PLAN.md).

GM-09/PR121 chưa merge khi bắt đầu và không phải dependency GM-10. Sau đó Trí đã merge PR121 và GM-23/PR118; nhánh đã cập nhật base sang main30ecb56 và nhận artifacts đã merge, giữ Home/room-entry/shared AppButton fix. Navigation mới dùng callback tùy chọn của Home, giữ routes cũ và entry shell. Đây vẫn là màn mock độc lập: provider phòng mẫu GM-10 khác provider GM-09; nối cùng room/session/context thật thuộc GM-25, không giả tạo/vào phòng ở GM-09 đã tích hợp với GM-10.

## Chạy và mở màn

```powershell
cd mobile
npm ci --no-audit --no-fund
npm start -- --clear
```

Expo Go tương thích SDK57 cùng LAN. Tại Home `/`, mở **Công cụ kiểm thử** cuối màn → **Chọn điểm ăn và khẩu vị** → `/gm10/context` → xác nhận điểm/buổi/giờ → **Xem món mẫu theo bối cảnh** → **Lưu bối cảnh mẫu** → **Chọn khẩu vị →** → `/gm10/preferences`. Shell `/shell` cũng có nút mở GM-10. Hai route GM-10 trong cùng provider giữ mock room/version qua điều hướng; direct link vào một trong hai route cũng tạo riêng phòng mẫu cho route group.

- Context: khu vực → điểm công cộng trong khung riêng → bán kính 1/2/5km; giờ UTC+7, buổi, ngân sách nullable VNĐ/người, avoidRecent; GPS action chỉ gợi ý public anchor và luôn cần xác nhận. Ăn ngay dùng serverTime + elapsed +15 phút một lần; theo phản hồi bugs.md, bấm sáng/trưa/tối gợi ý 07:00/12:00/19:00 lần kế tiếp so với server clock (mốc đã tới/qua → ngày mai); Ăn nhẹ giữ giờ. Custom không cộng thêm, giá trị intent giữ nguyên khi retry. Đây không là fallback tự đổi giờ khi pool rỗng/lỗi.
- Ngày ăn mở picker inline Hôm nay/Ngày mai/danh sách7 ngày mỗi trang, trước/sau và nhập YYYY-MM-DD; giờ HH:mm riêng. Đổi ngày giữ giờ, desiredAt UTC được ghép khi preview/save; ngày sai/quá giờ báo lỗi, không tự normalize. Budget trong card riêng. Confirmation là role checkbox với ô xanh+✓+text, bấm cả hàng; đổi date/time/budget bỏ checked/preview; không tự xác nhận/save. Trường hợp pending/member/stale/ACK vẫn khóa controls.
- Phải xác nhận trước preview pool và lưu; sửa bất kỳ bối cảnh làm mất xác nhận/preview. Rỗng/ngoài vùng/chưa rõ giờ bán/dữ liệu cũ không cho lưu hoặc tiếp tục, không tự nới giờ/vùng. Giá thiếu hiện Chưa có giá, không loại món hoặc coi giá0; origin, nơi bán và nhiệt độ tách riêng. Danh sách preview giới hạn tối đa8 mục, render bounded trong ScrollView; không tải artwork từ ngoài.
- Thành viên chỉ đọc context rồi chọn khẩu vị; chỉ host sửa bối cảnh. Save context gọi updateContext rồi đọc lại snapshot: mọi ready về false. Save preferences/consent chỉ reset own ready theo mock GM-07. Không tự ready/start.
- Preferences: hero Gì cũng được mặc định khi không có ưu tiên mềm; cuisine/category chọn nhiều, nhiệt độ/4 vị độc lập, nhấn hero xóa ưu tiên mềm nhưng giữ lựa chọn consent. Bỏ qua sở thích mềm vẫn gửi consent đã chọn. Không tạo phiếu NO/WANT/OK; preview món chỉ xem. Không thêm origin vào UserPreferences vì contract không có field đó.
- Hai switch ở cùng hàng với nhãn, nhãn dài tự xuống dòng. Giảm ưu tiên món đã ăn gần đây nằm ở Bối cảnh → Lịch sử và chống lặp, chính là Chống lặp của phòng hiển thị ở Khẩu vị. Không cần history có sẵn mới bật control; hiệu lực chống lặp cần history/consent đúng rule.
- Sau Lưu/Bỏ qua khẩu vị + ACK + snapshot, form được thay bằng biên nhận Đã hoàn tất chọn khẩu vị ở đầu màn; Chỉnh lại tải version mới, Quay lại bối cảnh trở về bước trước. Route mẫu kết thúc tại đây và nói rõ chưa nối phòng chờ; callback onContinue chỉ hiện nút phòng chờ khi được caller inject. Không tự dựng GM-11 hoặc giả hoàn tất tích hợp GM-25. [Đối chiếu từng phản hồi và cách thử lại](BUG_REVIEW.md).
- Sau lưu bối cảnh, Chỉnh lại bối cảnh tải snapshot mới trên cùng room, mở draft mới và yêu cầu xác nhận/preview lại trước lần lưu tiếp. Stale khóa form/save tới reload. Khoảng cách m/km ở preview là đường chim bay từ điểm ăn chung; thiếu là Chưa có khoảng cách. onHome tách onBack, routes về Home bằng dismissTo('/'); khi pending/unknown khóa navigation, khi caller không truyền onHome thì brand disabled.
- Consent mặc định false nếu chưa lưu. Không gọi getHistory/updateHistoryConsent hoặc lưu history thật; consent đi cùng UpdatePreferencesRequest của phòng. avoidRecent thuộc context host, chỉ giảm ưu tiên mềm nếu dữ liệu/đồng ý phù hợp, không thay luật phiếu.
- Pending và possible delivery khóa sửa/back/fixtures, retry dùng cùng payload/requestId/expectedVersion. ACK khóa gửi; lỗi đọc snapshot sau ACK có retry chỉ đọc, không gửi lại. Snapshot hợp lệ mới bật bước tiếp. Stale yêu cầu refetch; bỏ phản hồi read cũ/unmount.

## Controls fixture

Mở **Công cụ kiểm thử GM-10** cuối màn. Đổi fixture dựng phòng mẫu mới và xóa nháp/receipt mẫu, cần mở disclosure lại nếu bị remount.

| Fixture | Cách kiểm / giới hạn |
| --- | --- |
| Bình thường | Flow context → preferences → Back; giữ cùng room và version trong provider |
| Tải chậm | Delay1200ms cho reads/writes; nhìn loading/disabled; không là network thật |
| Rỗng theo buổi | Chọn và xác nhận context, preview trả pool rỗng; yêu cầu sửa bối cảnh, không auto broaden |
| Thiếu điểm công cộng | Discovery rỗng, manual không bịa anchor; chặn preview/lưu |
| Từ chối vị trí | Bấm Gợi ý điểm ăn từ vị trí; hiện manual fallback, không xin quyền Android thật |
| Ngoài vùng / Chưa rõ giờ bán / Dữ liệu cũ | Preview trả ErrorCode tương ứng; stale write cũng trả VERSION_CONFLICT; chọn Bình thường để thử dữ liệu mới |
| Mất mạng | Reads lỗi và có Tải lại, không giữ form cũ; đổi Bình thường để khôi phục mẫu |
| Chưa có giá | Cả legacy price và price object null; vẫn hiển thị đủ món, không fake giá0 |
| Nhóm đã sẵn sàng | Mock seed hai member ready=true; context save reset cả hai, preferences save chỉ reset caller |
| Thành viên | Current user là peer, không được sửa context; vẫn chọn/lưu own preferences |
| Mất phản hồi sau lưu | Write đầu đã áp dụng vào mock nhưng UI nhận TIMEOUT; thử lại cùng intent nhận cached ACK, không tăng version lần nữa |

Các fixture minh họa UI/contract, không triển khai hay nghiệm thu eligibility/history/RLS/server transaction.

## Interfaces cho consumers

| Artifact | Consumer / cách inject |
| --- | --- |
| `features/context/screens/ContextScreen.tsx` | GM-24/25/39 nhận repository, roomId, userId, onBack/onHome/onContinue/onSaved; onHome tùy chọn và độc lập Back, onContinue nhận snapshot sau ACK+refetch, lần sửa tiếp refetch version mới |
| `features/preferences/screens/PreferencesScreen.tsx` | GM-25/39 nhận cùng repository và PreferenceCatalogue, onHome/onSaved/onContinue tùy chọn; không nối lobby khi chưa có callback; receipt ưu tiên ownPreferences của snapshot |
| `features/context/services/roomSetup.ts` | Pick<ApiClient> giữ nguyên DTO GM-07; parse/format thời gian, budget, price, labels; không import bootstrap/fixtures |
| `SuggestAnchor` | GM-24 inject action trả `{status:'suggested',anchorId}` hoặc denied/unavailable/outside; xử lý GPS/permissions và quy đổi sang public anchor ngoài screens; không đưa lat/lng cá nhân vào room requests |
| `PreferenceCatalogue` | Caller inject cuisine/category `{id,label}` từ upstream; mock hiện chỉ có IDs thật đang dùng trong mock GM-07, không bịa thêm taxonomy |
| `createRequestId` | GM-25/31 inject ID generator/durable intent. Default gm10-preview-* chỉ dùng mock, không là secure entropy hoặc persistent outbox |
| `bootstrap/roomSetupPreview.tsx` | Mock-only fixture/provider/controls; GM-25 thay composition bằng real repository/auth và catalogue/location đã bàn giao, không fallback fixture khi lỗi API |

## Kiểm và giới hạn còn lại

[CHECKS](CHECKS.md) ghi kết quả tự động mới nhất và source/test hashes. Package/lockfile/shared UI/tokens/API/schema/backend giữ nguyên. Những rule native/camera/GPS/auth/persistence hoặc API nhiều máy không được chứng minh bằng Jest/bundle.

Sau các sửa trong [BUG_REVIEW](BUG_REVIEW.md), SCOPE_FIX và DATE_UI_REVIEW, người dùng xác nhận “tôi đã kiểm tra và ổn thỏa”. **Expo Go sau sửa: Pass theo xác nhận chung của người dùng**, ghi tại [MANUAL_DEVICE_CHECK](MANUAL_DEVICE_CHECK.md). Model/Android/Expo Go, kết quả riêng từng fixture/light-dark/font200/TalkBack/keyboard/hardware Back chưa được cung cấp; agent không tự bổ sung. Không yêu cầu ảnh/video theo chỉ dẫn người dùng, không kế thừa xác nhận GM-09. Các ca bắt buộc chưa có kết quả riêng cần Trí đối chiếu trước nghiệm thu; chỉ Trí được merge và chuyển Done.
