# ADR-019 — Chọn món độc lập và điều phối phiên nhóm

Ngày: 2026-10-22. Chủ quyết định/reviewer: Trí (ThanhTris).

## Supplement hiện hành — 2026-10-24

Trí xác nhận lại cap vòng2 theo **30% số món còn sau NO vòng1**: N>=2 dùng max(1, floor(0.30*N)); N=1 bỏ loại, N=0 không mở vòng2. Trần được phép tối thiểu một lượt với N>=2, không bắt buộc người chơi phải loại. N=2/3 là ngoại lệ một lượt vượt30%; N=2–6/7–9/10–13/14–16/17–19/20 có cap1/2/3/4/5/6. Giữ Chưa đồng thuận nếu cả nhóm loại hết.

Quyết định này thay mục cap ngày22/10 cho **policy mới sắp triển khai**. Mục cũ bên dưới là lịch sử và vẫn mô tả runtime dish-decision-v3 ở main033693c. Cần policy version/migration tiến và SQL/domain parity; không sửa0026 hoặc đổi nghĩa phiên v2/v3 đang chạy. Mốc60s vẫn từ command waiting hợp lệ sau ACK và vào phòng chờ, không từ submit hoặc ACK đơn thuần.

Theo lựa chọn trực tiếp của Trí, đợt này **PR yêu cầu bổ sung để người đang phụ trách triển khai tiếp**, chỉ BE/Data; UI giữ nguyên. [Audit](../../project/BE_DATA_AUDIT_2026-10-24.md) ghi những phần PR131/129 đã triển khai và phần còn thiếu. [Gói việc/AC/thứ tự](../../project/BE_DATA_FOLLOWUPS_2026-10-24.md) là đầu vào cho PR implementation tiếp theo. Top3/score/privacy, filter budget/giá và các chi tiết chưa chốt vẫn cần review trước code; tài liệu không tự phê duyệt phát dữ liệu mới.

Các nhận xét bên dưới về PR129 còn lỗi/chưa import là **trạng thái tại ngày22/10**, đã được PR129 và kiểm QA sau đó cập nhật; giữ để truy vết, không dùng làm blocker hiện hành.

Phạm vi thực hiện cập nhật mới nhất của Trí: **đợt này chỉ Data/BE; FE làm sau**. Supplement UI vẫn là yêu cầu đích, chưa phải yêu cầu triển khai FE ngay. Patch backend/engine có version riêng và request suite; không dùng kết quả SQL/HTTP thay nghiệm thu màn ứng dụng.
Trạng thái: **chấp nhận các yêu cầu tại mục 1 theo xác nhận trực tiếp trong hội thoại; cap vòng 2, quorum và cách vào phòng cũng đã được Trí xác nhận qua câu trả lời; chỉ các chi tiết được đánh dấu còn mở cần chốt**. Chưa là nghiệm thu implementation hoặc duyệt toàn bộ thiết kế SQL của ADR-018 trong PR #129.

## 1. Yêu cầu đã chốt

Nguồn: phản hồi bảy điểm của Trí ngày 2026-10-22, sau báo cáo PROJECT_UI_DATA_AUDIT_2026-10-22. Đây là nguồn quyết định; Figma chỉ mô tả thiết kế, không tự duyệt luật.

- Phòng tối đa **20 người**. Host chọn số món vòng 1 bằng một số nguyên **10–20** trên màn tạo phòng; hệ thống lấy đúng số món khác nhau host đã chọn, không tự random số lượng. Nếu không đủ món hợp lệ thì báo thiếu và chặn bắt đầu; host có thể chủ động giảm số lượng trong khoảng 10–20 hoặc sửa bộ lọc. Không tự giảm, lặp món hay bỏ lọc. Vòng 2 chỉ dùng món còn lại, không bổ sung cho đủ số ban đầu. Quyết định này thay ngưỡng 8–12 trước đó.
- Bỏ bước ready/unready của thành viên. Vào phòng là sẵn sàng; host quyết định bắt đầu. Người dùng vào phòng được tham gia ngay; host chỉ bấm bắt đầu cả nhóm, không duyệt từng người.
- **60 giây bắt đầu khi người đầu tiên hoàn tất lượt chọn và vào phòng chờ kết quả của vòng tương ứng.** Không tính từ bắt đầu game/vòng, vào lobby hoặc nhận lựa chọn của từng món. Host vẫn có Chốt ngay; chỉ xem kết quả tổng hợp.
- Luồng chọn món **không phụ thuộc điểm đến/GPS/bán kính/quán/offering/coverage/lịch bán**. Nguồn gốc vùng miền món là thuộc tính món, không phải vị trí người ăn. Tìm quán là bước sau khi chọn món, không chặn kết quả.
- Task/scope có thể được điều chỉnh sau khi chốt kế hoạch tổng thể; chưa đổi assignee/dependency/status trên Project trong đợt cập nhật tài liệu này.
- Giữ GM-40 là một task Data do Vinh làm. Luật phòng, pool, bình chọn và UI thuộc các phần việc riêng; dữ liệu tài khoản/phòng/phiếu/kết quả/social/history hiện hữu được bảo toàn.
- Các PR đang chờ hoàn tất/merge sẽ kiểm điện thoại tích hợp theo đợt sau merge theo yêu cầu Trí. Ghi rõ Not run và revision sau merge; không biến trì hoãn kiểm thiết bị thành Pass, miễn lỗi code hay nghiệm thu release.

Yêu cầu này thay hướng đích 8 người/ready và chọn món theo coverage trong tài liệu cũ. Code/contract đã merge vẫn là baseline legacy cho phiên cũ cho đến khi có migration tiến, contract version và consumer mới. Không sửa migration/evidence lịch sử hoặc âm thầm đổi nghĩa phiên đã bắt đầu.

## 2. Quyết định bổ sung và chi tiết triển khai

### Loại ở vòng 2

Giới hạn cố định 3 không phù hợp mọi kích thước pool: N=4 cho phép một người chỉ chừa đúng 1 món; N<=3 có thể loại hết. Giới hạn N-1 cũng vẫn cho một người ép về một món. N là số món server thực sự chuyển sang vòng 2, không mặc định bằng số món host đã chọn hoặc trừ số món bị loại bởi riêng một người.

**Trí đã chọn phương án A trong hội thoại ngày 2026-10-22:** mỗi người loại tối đa min(3, floor((N-1)/2)).
Ví dụ N=1/2/3/4/5/6/7/8/12 thì cap=0/0/1/1/2/2/3/3/3.
Khi N=1, bỏ bước loại; khi N=0, không mở vòng 2. Việc tự chốt N=1 và tiêu chí thắng vẫn phải khớp policy được duyệt, không biến món từng bị veto thành hợp lệ.

A ngăn một người loại hết hoặc chừa duy nhất một món khi N>=3, nhưng **không bảo đảm nhóm luôn có winner**: ba người với N=3 vẫn có thể mỗi người loại một món. Giữ nhánh Chưa đồng thuận, tối đa hai vòng; không tự bỏ veto để buộc chọn.

Phương án B không được chọn: vòng 2 chỉ chọn món thích nhất trong tập hợp hợp lệ, không có lượt loại mới. Cần chốt lại ý nghĩa NO vòng 1, tiêu chí thắng và đồng điểm trước dùng; đây là thay đổi policy, không được tự coi là đã duyệt. Dị ứng/hạn chế an toàn không được biến thành lựa chọn mềm bằng suy đoán.

### Timeout/chốt sớm và phiếu thiếu

**Trí đã chốt:** chỉ tính phiếu hoàn chỉnh đã được server ACK; thiếu phiếu là Không tham gia vòng này, tuyệt đối không tính OK. Quorum tối thiểu 1 phiếu hợp lệ; UI hiện số người đã gửi/tổng roster. Không bắt quá nửa nhóm. Chưa ai vào phòng chờ kết quả thì chưa chạy đồng hồ 60 giây; không dùng đồng hồ này làm giới hạn tổng thời gian game.

Người đầu tiên hoàn tất lượt chọn vào màn chờ kết quả sẽ kích hoạt khoảng chờ chung 60 giây; người còn lại tiếp tục chọn trong khoảng đó. Ví dụ bắt đầu lúc 10:00, người đầu tiên vào chờ lúc 10:03 thì deadline là 10:04, không phải 10:01. Vòng 2 có lần kích hoạt độc lập. Server ghi nhận transition vào chờ hợp lệ sau khi lưu đủ phiếu; sự kiện chọn từng món, lưu nháp hoặc mở route chờ khi chưa hoàn tất không được kích hoạt timer.

Trí chốt reconnect: thành viên khôi phục mạng đọc trạng thái server; nếu vòng 2 đang nhận phiếu thì được tham gia với pool đã khóa, kể cả bỏ lỡ vòng 1. Nếu đã có kết quả thì xem kết quả đó, không mở lại vòng hoặc gửi bù làm đổi kết quả. Món đã bị loại vòng 1 không quay lại, kể cả người loại mất mạng ở vòng 2. Reconnect không gia hạn; quá deadline phải reconcile/finalize trước nhận phiếu.

### Các quyết định khác còn mở

- Admission đã chốt: host chỉ bấm bắt đầu, không duyệt từng người xin vào.
- Số món: host chọn chính xác 10–20; lựa chọn UI cần hỗ trợ từng số nguyên, không chỉ các mốc 10/15/20. Mặc định và bố cục cụ thể sẽ được duyệt cùng thiết kế; không coi đề xuất UI là đã sửa app.
- Flashcard tự gửi ở thẻ cuối, thời điểm khóa Undo; Top 3/điểm tổng hợp và privacy của nhóm ít người chưa được phản hồi này phê duyệt.
- Giữ thứ tự chọn món trước tìm quán; budget/giá unknown và taxonomy buổi ăn cần policy rõ, không suy giờ quán thành giờ phù hợp món.

### UI số lượng món — phạm vi bổ sung đã được yêu cầu

Màn Tạo phòng có mục “Số món để lựa chọn”, điều khiển tăng/giảm hoặc picker hỗ trợ 10–20, hiển thị giá trị đang chọn và vô hiệu nút ở hai biên. Hỗ trợ TalkBack và font lớn. Gửi count trong preview/create contract; lobby hiển thị count đã lưu. Thiếu dữ liệu hiển thị số món phù hợp thực tế và hướng sửa, không lặng lẽ tạo ít món hơn. Khi bắt đầu vòng 1, khóa count cùng pool; retry không bốc lại pool. Phần UI thuộc GM-09/25, DTO GM-07 và API GM-18/19, không gom vào GM-40. Đây là scope triển khai cần bàn giao, chưa là UI chạy được.

## 3. Yêu cầu kỹ thuật cho patch sau khi chốt

- Server khóa room/round và ghi waitingStartedAt khi thành viên đầu tiên chuyển hợp lệ sang chờ kết quả; deadline = waitingStartedAt + 60s, ghi đúng một lần. Tên field là đề xuất contract. Không tái dùng thời điểm nhận phiếu từng món làm mốc. Retry/remount/reconnect/người vào chờ sau không gia hạn; chống client tự kích hoạt trước khi hoàn tất.
- Finalize do timeout, mọi người gửi đủ hoặc host chốt dùng cùng transaction/idempotency; xác định ranh giới deadline và phiếu đến trễ. Client đồng bộ deadline server, không lấy đồng hồ máy làm authority.
- Timeout phải được xử lý khi mọi client tắt/mất mạng: chọn cơ chế server job phù hợp stack, kèm đường reconcile khi reconnect. Chỉ countdown UI hoặc đợi host gọi API không đủ.
- Host Chốt ngay cần xác nhận hiển thị số đã gửi/tổng; kiểm host/membership/round/version và điều kiện quorum được chốt. Không lộ danh tính gắn nội dung phiếu hoặc ma trận.
- Start khóa roster/pool theo policy; kiểm join/start đồng thời, slot thứ 20/21, reconnect không tạo thêm người, join sau start, host rời/hủy. Không set ready ngầm để vượt guard cũ.
- Snapshot có policy/catalogue/contract version, replay ổn định; phiên legacy dùng luật legacy, phiên mới dùng luật mới. Migration thêm mới, không sửa migration đã merge.
- Android hiển thị loading/error/ACK/deadline/chốt sớm/quá hạn; retry không lặp submission hoặc dùng pool cũ.
- Test bổ sung: count 9/21/số lẻ/null không hợp lệ; mỗi số nguyên 10–20 tạo đúng số món duy nhất; chọn 20 nhưng chỉ có 15 món không tự hạ count; pool vòng 2 nhỏ hơn 10 vẫn hợp lệ. Chọn món quá 60 giây trước khi ai vào chờ không bị timeout; phiếu từng món không kích hoạt timer; hai người vào chờ đồng thời chỉ có một mốc; vòng 2 có mốc riêng. Reconnect dùng trạng thái/kết quả server, không gia hạn.

## 4. Bản đồ tác động để lập lại task

Owner dưới đây là assignee Project đọc ngày 2026-10-22, **không phải phân công mới hoặc lệnh mở lại Done**. Chốt scope cuối rồi cập nhật task/AC theo một kế hoạch, giữ lịch sử nghiệm thu.

| Phần | Task / owner hiện hành | Artifact cần sửa và đầu vào | Kiểm đạt |
| --- | --- | --- | --- |
| Catalogue | GM-40 Vinh | Dictionary/template/validator/import; schema và API profile món, ADR-018; sửa 2 lỗi PR129 | Import/query không cần quán; nullable; ID/hash và phiên cũ ổn định |
| Contract dùng chung | GM-07 Trang | API_CONTRACT, DTO/client/mock; nhận policy mới được chốt trước consumer | Contract tests, lỗi/version tương thích, không suy dữ liệu còn thiếu |
| Pool và tạo phòng độc lập | GM-18 Tâm; GM-19 Trí; GM-24/25 Trang | Catalogue mới + create/preview/RoomContext không yêu cầu anchor/radius; host chọn 10–20 món; schema tiến | Count đúng và đủ; thiếu không tự hạ; không GPS vẫn tạo/chọn; legacy còn đọc được |
| Phòng 20 người, bỏ ready | GM-19 Trí; GM-11 Trung; GM-25 Trang | ROOM_SPEC, lifecycle RPC, lobby/repository, join/start contract | 20/21, join/start race, context update, host/member; không chờ ready |
| Loại món, đồng hồ và chốt | GM-15/20 Vinh; GM-12/26 Trang | DECISION_SPEC, domain/SQL parity, submit/finalize, server scheduling và screen | N=0..20; quorum; 59/60/61s; late/retry/race; không phiếu; cả nhóm disconnect |
| Kết quả | GM-13 Tuấn; GM-27 Trang; GM-21 Tâm | RoomResult/history projection; đợi policy Top3/privacy; terminal theo round/reason | Winner ổn định; thiếu phiếu không OK; 0/1/2/3 candidates; không lộ phiếu |
| Reconnect/social | GM-31/28 Trung | Nhận ACK/deadline/policy mới; cache identity và lịch sử đúng version | restart/offline/retry, timeout khi không mở app, auth isolation |
| Thiết kế và trợ năng | GM-05 Trung; GM-39 Trang | Brief + mapping tokens/Figma; scope HTML khác sửa mobile | Contrast, dark/font/TalkBack, tutorial độc lập, Figma không thay test app |
| QA/release | GM-32/33 Vinh; GM-34 Trí | Contract/version đã merge, suite và báo cáo Android/API sau merge | Ghi SHA/thiết bị/request assertions, Pass/Fail/Not run; APK riêng |

GM-40 mốc B **không tự hoàn tất luồng tạo phòng mới**: ADR-018 trong PR129 vẫn giữ public create_room/RoomContext; phải giao và sửa consumer/API tạo phòng ở nhóm GM-18/19/24/25. Không gắn dependency GM-40 ngược vào task số nhỏ đang Done; kế hoạch sửa/bổ sung sau cần ghi artifact prerequisite và version rõ.

Thứ tự triển khai đề xuất: hoàn thiện các chi tiết còn mở mục 2 → contract/policy supplement → GM-40 DB/API và engine/lifecycle làm song song theo contract → consumer/tích hợp → test API/race → merge các phần đã review → kiểm Android tích hợp theo đợt → release. P1/P2 giữ sau core. Chưa thay Deadline cũ vì phạm vi mới chưa ước lượng/chốt.

## 5. Lỗi đã báo và evidence

PR #129 head 58890c274ebf5c67f370d946421f303762921141 còn hai lỗi validator đã tái hiện: taxonomy code ngoài registry được nhận; quan sát giá cùng natural key nhận trùng nếu đổi UUID.
[Comment chi tiết](https://github.com/ThanhTris/IE307/pull/129#issuecomment-6321616549). Không đòi quán/coverage, không coi trường nullable là lỗi.

Báo cáo audit hiện nằm tại worktree 6524, docs/design/PROJECT_UI_DATA_AUDIT_2026-10-22.md; phụ lục ngày 2026-10-22 ghi quyết định này và snapshot Project có Deadline. Đây là cập nhật tài liệu, chưa có test runtime cho luật mới, chưa commit/push.
