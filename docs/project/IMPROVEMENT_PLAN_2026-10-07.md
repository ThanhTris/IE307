# Kế hoạch cải thiện sau góp ý giảng viên — bản nghiên cứu

> Đã được chuyển thành baseline tài liệu v0.2 theo yêu cầu tiếp theo. Đọc [mô tả hiện hành](../product/SYSTEM_OVERVIEW.md), [spec](../specs/README.md) và [tiến độ](PROJECT_PLAN.md). Các GM-17A/B/18A/B bên dưới là phương án phân rã lúc nghiên cứu; bản hiện hành dùng GM-17/18 core, GM-25 push, GM-26 account P1 và GM-27 venue P1. Chưa có independent review hoàn tất.
Ngày 2026-10-07. Trạng thái: Proposed — kế hoạch để chủ dự án/nhóm review, chưa đổi policy v1, task status hay phân công trên GitHub. Được soạn theo yêu cầu nghiên cứu và lên lại plan; không phải chấp thuận triển khai hoặc nghiệm thu của giảng viên. Nguồn: [nghiên cứu 8 app](../research/LECTURER_APPS_REVIEW_2026-10-07.md), nội dung góp ý chủ dự án cung cấp, [baseline](PROJECT_PLAN.md).

## Định hướng

Gì Cũng Được: ứng dụng mobile giúp nhóm chọn món thỏa hiệp có giải thích, sử dụng được khi mạng yếu, rồi tìm quán theo bối cảnh. Ba đóng góp cần đo: không chốt món bị từ chối; đồng bộ đúng trên nhiều thiết bị; giảm bước thao tác nhờ QR/link, bạn quen, notification, vị trí và cache. Đây là cải thiện của sản phẩm nhóm, chưa chứng minh mới trên thị trường.

Giữ Android-first, React Native/Expo, 6 người/8 tuần, mục tiêu chi phí dịch vụ gần 0. Giữ 2–8 người, hai vòng tối đa, NO không được thành winner, server chốt một lần. Không dùng AI để tăng độ phức tạp cho có.

## Đối chiếu đủ 9 góp ý

| Góp ý | Baseline đã có | Bổ sung đề xuất |
| --- | --- | --- |
| 1. Group consensus | Vòng 2 ưu tiên số WANT trong tập mọi người giữ | Công thức, ví dụ, nhãn mức đồng thuận và giải thích; thử so với random trong tập hợp lệ |
| 2. Giá trị mobile | QR/mã, realtime, vị trí và link review đã có trong spec | Join deep link, push mời/kết quả, SQLite cache/outbox, bạn quen và lịch sử tối thiểu thành phạm vi mục tiêu |
| 3. Card/gesture | Ba nút, swipe shortcut, tags cơ bản | Ảnh có quyền, giá tham khảo có nguồn/ngày, chạm hai lần cho WANT, nút thay thế và swipe ngang có ngưỡng, hướng dẫn ngắn và undo trước submit |
| 4. Realtime | Snapshot/version, tiến độ tổng, server finalize | Demo 4 máy, chỉ ACK mới tăng số hoàn tất; event lỗi vẫn refetch/poll; tự chuyển kết quả đúng resultId |
| 5. Mức kết quả/no-match | Hai vòng, không match có kết thúc/tạo phiên mới | Perfect/Consensus/Compromise/No Consensus định nghĩa không chồng lấn; cho chuẩn bị bộ món khác cho phiên mới |
| 6. Context | Buổi ăn tự chọn, category mềm; vị trí dùng sau chốt | Gợi ý buổi theo giờ, ngân sách mềm, lịch sử gần đây; khoảng cách thật chỉ khi có dữ liệu quán–món, pilot riêng |
| 7. Món trước, quán sau | Đã đúng hướng | Giữ; việc mở TikTok/YouTube là khám phá review, không phải bằng chứng quán đang bán món |
| 8. Pending/retry/sync | Idempotency, nháp, reconnect; chưa đủ outbox bền vững | Phân biệt nháp/chờ gửi/đã nhận/không còn hợp lệ; persist trước gửi, refetch trước replay |
| 9. Lịch sử/sở thích nhóm | History/account P1 | Lịch sử kết quả tối thiểu, sở thích tự khai; chống lặp mềm theo nhóm, không lưu raw votes để suy đoán gu |

## 1. Consensus có giải thích, không ép thiểu số

Baseline đã làm hơn phép giao đơn thuần: sau vòng 2, chọn món có số WANT cao nhất. Không ghi đây là thuật toán hoàn toàn mới; cần đặc tả rõ và chứng minh hiệu quả.

Đề xuất điểm: WANT=2, OK=1; NO là điều kiện loại, không phải 0 để bù bằng phiếu số đông. Với n thành viên và món hợp lệ d, score(d)=2×WANT(d)+OK(d)=n+WANT(d). Vì n cố định, cách này tương đương policy ưu tiên WANT hiện tại. UNSET không có điểm và chặn finalize.

Luồng mặc định giữ hai vòng theo yêu cầu trước: nếu có unanimous WANT thì chốt; nếu không, vòng 2 chỉ chứa món không NO. Mọi người Giữ/Loại thêm; server chọn điểm cao nhất trong tập tất cả Giữ, hòa thì bốc một lần và lưu. Không đưa top 3 thành một vòng vote thứ ba; có thể giải thích phương án cùng hạng mà không reroll.

| Nhãn đề xuất | Điều kiện sau khi đủ phiếu và đủ điều kiện chốt |
| --- | --- |
| Perfect Match — Cùng muốn ăn | WANT=n |
| Consensus Match — Đa số muốn, cả nhóm chấp nhận | n/2 < WANT < n và không NO; qua xác nhận vòng 2 |
| Compromise Match — Phương án cả nhóm ăn được | 0 <= WANT <= n/2 và không NO; qua xác nhận vòng 2 |
| No Consensus — Chưa có phương án chung | Không còn món hợp lệ hoặc mọi món bị loại ở vòng 2 |

Ngưỡng đa số trên là đề xuất của nhóm, không phải tiêu chuẩn học thuật hoặc nội dung thầy đã chốt. Compromise có thể không tồn tại dù tổng điểm món có NO rất cao. Không lách NO bằng thông báo xin phép host; chỉ chính người dùng mới được đổi lựa chọn trong thời điểm được phép.

Ví dụ 4 người: phở [WANT,WANT,OK,OK] có 6 điểm; cơm tấm [WANT,WANT,WANT,OK] có 7; lẩu [WANT,WANT,WANT,NO] bị loại. Nếu mọi người giữ cả phở/cơm tấm ở vòng 2 thì cơm tấm thắng. Đây là tổng hợp trên các lựa chọn khả thi, không biểu quyết ép người từ chối lẩu.

Giải thích công khai: “Mọi người đều giữ món này; đây là lựa chọn được ưu tiên theo mức muốn ăn.” Nhãn Perfect/Consensus/Compromise đã tiết lộ thông tin tổng hợp; không thêm tên/matrix/số phiếu cá nhân. Ở nhóm 2 người vẫn có thể suy luận; phải cập nhật privacy copy.

No Consensus: đưa hai hành động Kết thúc và Chuẩn bị phiên mới. Phiên mới có thể đổi category/ngân sách hoặc host thêm món trước ready; tất cả được thấy pool mới và xác nhận, phiếu cũ không tự mang sang. Khả năng thêm món do người dùng nhập cần validation/limit và task riêng; bản tối thiểu dùng catalogue hiện có.

## 2. Context theo luật, có dữ liệu mới tính

Tách hai thời điểm: context tạo pool món và context tìm quán sau chốt. Context chốt tại lúc start, có policy/catalogue version, không để mỗi máy tự thay pool theo giờ/GPS riêng.

- Giờ: thiết bị host đề xuất buổi ăn bằng bảng giờ theo múi giờ, host sửa được; server lưu buổi đã xác nhận. Ví dụ 05:00–10:59 sáng, 11:00–14:59 trưa, 15:00–17:59 xế, 18:00–21:59 tối, còn lại ăn khuya. Đây là cấu hình thử nghiệm, không loại món tuyệt đối theo đồng hồ.
- Giá: card có khoảng VNĐ/người kèm nguồn/khu vực/ngày hoặc Chưa có giá. Budget là ưu tiên mềm với giá ước lượng; không hứa giá thanh toán hoặc lọc cứng dữ liệu thiếu. Với món chia nhóm, phải quy đổi theo giả định suất và ghi rõ.
- Lịch sử: nếu nhóm bật lưu, giảm thứ tự món đã chốt ở 3 phiên gần nhất; cho tắt Đổi món hôm nay. Đây là ưu tiên pool, không phạt phiếu hiện tại hoặc thay NO. Không có lịch sử dùng catalogue bình thường.
- Thứ tự pool đề xuất: buổi ăn đã chọn → xen category để giữ đa dạng → ưu tiên phù hợp ngân sách có dữ liệu → giảm lặp → seed ổn định. Giữ tối đa 8 món, không tự nhân bản cho đủ.
- Vị trí: xin quyền lần mở đầu như đã thống nhất; dùng vị trí hiện tại của người bấm khi mở Maps/review. Không suy “quán cách 2 km” chỉ từ tên món hoặc khu vực geocoding.
- Nếu muốn đáp ứng lọc bán kính thật: pilot một khu vực quanh trường, nhóm tự kiểm 20–30 quán với 15–20 món có mapping và ngày xác minh. Chỉ hiển thị quán có dữ liệu trong phạm vi pilot; Haversine là đường chim bay, không phải quãng đường đi. Không có dữ liệu thì báo không biết, không báo không có quán. Đây là phần mở rộng ưu tiên sau core, chưa cam kết Việt Nam toàn quốc.
- Mưa/không muốn đi xa: trước mắt là tùy chọn người dùng “Ưu tiên đi gần”; không gọi weather API. Không tính điểm khoảng cách vào món nếu chưa có mapping quán hợp lệ. Không hiển thị nút bán kính như đã thực hiện lọc khi chỉ mở search URL.

Location host dùng làm điểm hẹn chung là thay đổi privacy: cần host đồng ý chia sẻ khu vực/điểm hẹn, thành viên xác nhận; không thu GPS tất cả thành viên. Baseline mặc định vẫn vị trí người bấm.

## 3. Các tương tác mobile cần chứng minh

- Vào phòng: QR camera, mã và link. Link chứa định danh lời mời/phòng, không auth token; cold/warm start đều kiểm server trước join. Android App Links cần domain được kiểm soát; nếu chưa có thì demo custom scheme trên app đã cài kèm mã fallback, không hứa deferred linking sau cài đặt.
- Bạn quen: bấm avatar → chọn buổi/context → gửi lời mời → đối phương accept. Đề xuất GM-17A thành core; account link/recovery phức tạp vẫn P1. Khách vẫn có thể mất bạn khi mất phiên, UI phải nói rõ.
- Push tối thiểu: mời vào phòng và phòng đã có kết quả. Chỉ gửi sau sự kiện server đã commit, token thuộc đúng user, giới hạn spam, dedupe theo eventId, xử lý token hết hạn. Từ chối push vẫn có inbox/refetch. Không đưa phiếu hoặc tọa độ vào notification. Chạm notification đọc lại snapshot/auth, không tin payload làm nguồn kết quả.
- Realtime: 3/4 hoàn tất dựa trên submission đã ACK, không dựa vào local swipe. Người cuối submit thì server chốt; tất cả refetch và chuyển cùng resultId. Push không thay realtime, realtime không thay server transaction.
- Card một tay (cập nhật theo chủ dự án): chạm hai lần vùng ảnh/card để chọn WANT; bỏ gán phiếu cho vuốt dọc. Swipe ngang nếu giữ: phải WANT, trái NO, có threshold và nhãn xem trước; OK chọn bằng nút. Ba nút luôn hiện, undo/sửa trước submit. Chạm đơn dành cho xem chi tiết qua nút riêng, không chạy đồng thời với double-tap; chuyển động kéo/scroll phải hủy nhận diện tap. Double-tap chỉ đặt WANT, không toggle hoặc tự gửi cả vòng. Có hướng dẫn lần đầu, phản hồi nhãn/animation nhẹ và reduced motion; TalkBack dùng nút có label thay vì bắt thực hiện double-tap tùy biến. Không yêu cầu sử dụng khi đang lái xe. Ảnh có bản quyền/nguồn; ảnh lỗi vẫn đọc tên/tag/giá.
- Không thêm Socket.IO cạnh Supabase Realtime nếu ADR-001 được duyệt; giảm hai cơ chế trạng thái cạnh tranh. Native module chỉ cài sau bootstrap/dependency review.

## 4. Offline cache và outbox

SQLite đề xuất giữ snapshot phiên gần nhất có thời điểm đồng bộ, nháp của chính user, outbox và lịch sử đã consent; session token dùng secure storage. SQLite không tự làm sync hoặc mặc định mã hóa dữ liệu; review cơ chế bảo vệ/TTL, xóa khi logout/mất quyền, không cache phiếu người khác.

State: DRAFT → QUEUED (người dùng đã bấm Gửi) → SENDING → ACKED; lỗi có UNKNOWN_DELIVERY, CONFLICT, EXPIRED. Chỉ DRAFT được tự do sửa. QUEUED chưa từng gửi có thể hủy theo thao tác rõ; nếu request có thể đã tới server thì khóa nội dung cho tới khi reconcile để tránh đổi ý sau khi đã nộp.

1. Bấm Gửi: validate đủ pool; lưu payload bất biến, user/room/round/poolVersion, requestId và expectedVersion trước network.
2. Optimistic update chỉ báo “Đã lưu trên máy, chờ gửi”; không cộng vào tiến độ chung hoặc hiện winner local.
3. App foreground/resume và có mạng: đọc snapshot kiểm user/membership/round/pool/expiry và trạng thái submission.
4. Timeout không biết đã ghi chưa: retry đúng requestId/payload ban đầu hoặc tra ACK. Nếu server đã nhận thì ACKED; không tạo vote thứ hai.
5. VERSION_CONFLICT đã bị server từ chối rõ: refetch; nếu vẫn cùng vòng/pool, membership hợp lệ và chưa nộp thì tạo attempt ID mới cho cùng submission. Không reuse requestId với expectedVersion mới.
6. Round/pool/user đã đổi, phòng terminal hoặc quá hạn: đánh dấu không còn hợp lệ, thông báo; không âm thầm gửi phiếu vòng trước vào vòng mới.
7. App bị hệ điều hành dừng: gửi lại khi mở/resume; không cam kết background sync đúng giờ. Cache offline ghi rõ dữ liệu cũ, không tạo/chốt phiên nhóm offline.

GM-16 cần được chia thành các phần nhỏ hoặc có người hỗ trợ review. Outbox là công việc core, không chỉ thêm một dòng “offline support”.

## 5. Lịch sử tối thiểu

Đề xuất GM-18A thành core: mỗi thành viên xem local kết quả đã tham gia, món/buổi/thời điểm; không matrix phiếu. Ở nhóm bạn đã kết nối, server có summary tối thiểu theo group key từ roster chuẩn hóa và consent của các thành viên; chỉ thành viên đúng nhóm truy cập. Các nhóm khác nhau không trộn lịch sử; không đủ consent thì không tính chống lặp nhóm. Account sync/full history/delete đa thiết bị vẫn GM-18B/P1.

Không tự học sở thích cá nhân từ phiếu kín. Sở thích lâu dài do người dùng tự khai và sửa; lịch sử có xóa/tắt, TTL cần review trước code. Gợi ý giảm lặp 3 phiên là cấu hình đề xuất, chưa phải kết quả tối ưu.

## 6. Phạm vi và tác động task — đề xuất để chốt

| Cụm | Task hiện có | Thay đổi cần chuyển vào spec/AC khi duyệt | Owner / reviewer đề xuất |
| --- | --- | --- | --- |
| Nền mobile | GM-01/02 | Android development build sớm; adapter cache/push/link; card/gesture accessible | Tuấn/Trí; Trang/Tuấn |
| Catalogue/context | GM-03/10 | Ảnh có quyền, tags/giá/ngày nguồn; gợi ý giờ/budget; pool context versioned | Vinh/Tâm; Trang/Vinh |
| Data/privacy | GM-04/06 | Push tokens/events, history summary consent, outbox contract và RLS tests | Tâm/Trí; Trí/Tâm |
| Identity/room | GM-05/07/08/09 | Session restore, invitation link, lobby ACK progress; không auto join | Trung/Trí; Trang/Trung; Tâm/Trí; Tuấn/Trang |
| Consensus | GM-11/12/14/15 | Score/nhãn/lý do, NO invariant, no-consensus action; giữ hai vòng | Vinh/Trung; Trí/Tâm; Tuấn/Vinh; Trung/Vinh |
| Voting | GM-13 | Card double-tap WANT, bỏ vote vuốt dọc, swipe ngang tùy chọn, undo trước submit, pending khác ACK | Trang/Tuấn |
| Offline/realtime | GM-16 | SQLite outbox/cache, resume/refetch/retry, stale payload; giữ backend nguồn thật | Trí/Tâm, Trung hỗ trợ sau GM-15 |
| Bạn quen | GM-17A | Đề xuất core avatar/inbox/quick invitation; B account link vẫn P1 | Trung/Trí |
| History | GM-18A | Đề xuất core cache history/consent/minimal summary; B full sync P1 | Tâm/Vinh |
| Push | Work package mới, chưa cấp GM-ID | Token/permission, server events, sender/receipt/dedupe, cold/warm tap | Trung/Trí; dependency GM-05/06/12/17A và schema tương ứng |
| Link/vị trí | GM-20 | Giữ QR/location/review; thêm incoming link acceptance; pilot radius tách riêng | Tuấn/Trang |
| Regression/QA/demo | GM-19/21/22 | Network kill/restart, 4 mức match, push denied, đo nhóm, native recording | Vinh/Tâm; Vinh/Trang; Trí/Tuấn |
| Mở rộng | GM-23/24 | Dời OCR/AI để dành nguồn lực cho push/offline/core | Tâm/Vinh; Trung/Trí |

Đây là impact map, chưa sửa 24 task active hoặc issue GitHub để tránh hai baseline cùng có hiệu lực. Khi chủ dự án chốt: tách GM-17/18 A/B thành task thật có dependency riêng; tạo task push; cập nhật FR/spec/data/API/fixtures/UI/traceability và lịch, rồi mới code. Reviewer độc lập vẫn bắt buộc; bản plan không tự duyệt GM-00.

## Chi phí và khả thi React Native

Expo Push Service hiện công bố không thu phí gửi thông báo; delivery không bảo đảm đúng một lần hoặc chắc chắn tới thiết bị, nên cần receipt/dedupe và inbox fallback. Chi phí/quota build, backend hoặc geocoding vẫn phải kiểm riêng; không suy toàn hệ thống miễn phí từ push miễn phí. [Nguồn Expo](https://docs.expo.dev/push-notifications/faq/).

Đề xuất local Android build và thiết bị thật để kiểm native; không cần phát hành store để bảo vệ đồ án. Expo Go không đủ kiểm remote push Android theo tài liệu hiện tại. SQLite/outbox là logic ứng dụng phải xây, Supabase Realtime không tự đồng bộ local queue. React Native phù hợp nhưng phần khó là consistency/privacy và kiểm nhiều máy, không phải chỉ cài thêm thư viện.

## 7. Kế hoạch 8 tuần sau khi duyệt baseline mới

| Tuần tương đối | Đầu ra/gate |
| --- | --- |
| 1 | Chốt scope/ADR; spike Android build, QR/deep link, push tới thiết bị và SQLite; xác định provider/quota. Nếu push/geocoding chưa chạy, xử lý sớm thay vì chờ cuối kỳ |
| 2 | Auth/schema/RLS, catalogue ảnh/tag/giá, context form; chốt có đủ nhân lực và dữ liệu cho pilot bán kính hay chỉ Maps sau chốt |
| 3 | Tạo/join/lobby hai máy, engine/fixtures, snapshot; kết bạn/invite cơ bản sau dependency nền |
| 4 | End-to-end 4 máy, hai vòng, nhãn/lý do, NO tests; bắt đầu cache/outbox trên RPC thật |
| 5 | App restart/mất ACK/reconnect/expiry; push mời/kết quả, cold/warm deep link, pending UX |
| 6 | History tối thiểu/chống lặp, GPS/Maps/review, card/a11y; pilot radius chỉ nếu gate tuần 2 đạt |
| 7 | >=5 nhóm, cùng kịch bản so baseline; sửa lỗi mất dữ liệu/duplicate/quyền; ghi cả No Consensus |
| 8 | Freeze, regression, APK và video demo, báo cáo kết quả thực đo và giới hạn |

Chưa có ngày bắt đầu/hạn môn học nên không đặt deadline ngày cụ thể. Mỗi người một task chính tại một thời điểm; Trí đang có backend + sync + release nên cần giảm việc nghiên cứu OCR/AI, chia nhỏ sync và giao push cho Trung. Không coi mỗi người 4 task là cân tải.

Thứ tự cắt nếu trễ: OCR/AI → weather/venue radius toàn diện → sync lịch sử nhiều máy/account recovery → polish. Giữ NO, transaction/RLS, hai vòng, basic realtime/outbox, QR và bằng chứng native. Push được spike sớm; nếu hạ scope push phải ghi lý do và trao đổi giảng viên, không báo hoàn thành bằng thông báo giả trên máy.

## 8. Demo và cách chứng minh cải thiện

Demo: 4 điện thoại vào bằng code/QR/link, một máy được mời qua avatar/push; card có ảnh/tag/giá tham khảo; một máy mất mạng vẫn xem và nộp vào queue. Ba máy khác thấy 3/4, máy offline thấy Chờ gửi. Kết nối lại, server ACK rồi chuyển cả nhóm đến cùng món/lý do. Có bộ fixture riêng cho Perfect/Consensus/Compromise/No Consensus; thử request trùng/expiry để chứng minh không chốt lại. Cuối cùng mở Maps hoặc review bằng vị trí; mở lại app thấy lịch sử cache.

- Độ đúng: 0 winner có NO trong bộ test; không finalize thiếu phiếu; một resultId khi retry/race; vòng <=2.
- Mạng: queued vote còn sau restart, replay đúng vòng, late vote bị từ chối; pending không thành completed trước ACK.
- Khả dụng mobile: QR/cold-warm link/push grant-deny/GPS off; gesture và button cho cùng ý nghĩa; TalkBack/font200/dark.
- Chất lượng lựa chọn: cùng tập phiếu offline, so điểm trung bình winner của policy với random trong tập không NO; báo tie/no-consensus và không suy độ hài lòng chỉ từ điểm tự định nghĩa.
- Người dùng: >=5 nhóm là pilot nhỏ; đảo thứ tự thử bàn miệng/random/app để giảm hiệu ứng học, đo thời gian đến quyết định, số thao tác và tự đánh giá công bằng. Không công bố kết luận thống kê lớn hoặc cam kết 98% match.
- Phạm vi quán: ghi rõ dataset pilot/ngày kiểm và khoảng cách đường chim bay; search ngoài app không được tính là đã lọc bán kính.

## Quyết định cần chủ dự án/nhóm review trước triển khai

1. Nhãn đồng thuận với ngưỡng đa số và mức thông tin tổng hợp được hiển thị.
2. Đưa GM-17A/18A + push vào core; tách task, cân tải và giới hạn history consent/TTL.
3. Áp dụng outbox tự gửi chỉ sau thao tác Gửi và kiểm snapshot; không auto-submit nháp.
4. Chọn Maps/review theo vị trí làm mức cơ bản; pilot quán có bán kính là phạm vi bổ sung có dữ liệu, không giả có sẵn toàn quốc.

[ADR đề xuất](../architecture/decisions/ADR-004-mobile-consensus-improvement.md). Các mục cần review là quyết định cụ thể của plan, không phải yêu cầu dừng nghiên cứu hoặc xác nhận lại để soạn tài liệu.
