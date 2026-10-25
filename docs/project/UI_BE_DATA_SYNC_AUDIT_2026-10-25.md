# Đối chiếu hội thoại FE với Data và BE trên main — 2026-10-25

> **Cập nhật sau final Figma handoff 2026-10-25:** phần mô tả lịch sử bên dưới ghi đúng trạng thái của audit trước khi Trí giao lại toàn bộ task UI. Task/UI owner hiện hành lấy từ [kế hoạch Figma mới](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md) và [map máy đọc](../design/UI_FIGMA_TASK_MAP.json); các task cần đồng bộ theo Figma mới, còn producer BE/Data được rà sau mốc cập nhật UI/gap. Handoff cũ không còn là căn cứ để trì hoãn UI. Ma trận đầu ra UI → field/command → producer/thiếu hụt → task BE/Data đã được thêm vào kế hoạch Figma. Runtime observations và B01–B16 bên dưới vẫn là evidence audit tại baseline; không có nghĩa runtime đã thay đổi.

Mốc kiểm: **25/10/2026, khoảng 03:30 UTC+7**. Reviewer/chủ quyết định: Trí (`ThanhTris`).

**Kết quả: yêu cầu sản phẩm đã được ghi khá đầy đủ, nhưng runtime Data–BE trên main chưa đồng bộ với UI mong muốn.** Main có nền dish-only v3; contract B/Top 3 là đề xuất và phần việc đang chờ thực hiện. Ngoài các phần đã giao, lần rà này xác định thêm các chi tiết contract/storage cần viết rõ trước khi tích hợp: version của lobby có thể sửa, lịch sử 20 người/chưa đồng thuận, số ballot R1 dùng tính điểm, projection thành viên, và giao diện dữ liệu của Places.

Đây là báo cáo để bổ sung task BE/Data. Đợt này không giao lại FE. Các quan sát về UI/Figma là đầu vào; Trí sẽ chốt Figma và giao kế hoạch làm lại FE riêng.

## 1. Nguồn và giới hạn

| Nguồn | Đã đối chiếu |
| --- | --- |
| Git | Đang ở `main`; sau fetch, HEAD và origin/main cùng `97f5dac8e9136ba0f43989991afdb996277a1069`, không có commit lệch hai bên. |
| Hội thoại UI | Hội thoại tên **FE**, ID `01a145b9-5d6a-7e00-ae1f-a2f72809de03`: đọc các quyết định UI và cập nhật liên quan gần nhất, gồm xác nhận lịch sử/Places, luật vòng 2, thiết lập và phục hồi. Nguồn xác nhận của Trí được ưu tiên hơn câu trả lời/plan cũ của agent. |
| Làm rõ mới nhất bên FE | Trí xác nhận UI Places/map đúng: gọi tìm quán sau khi chốt món. UI Lịch sử giữ, code main phải cập nhật. FE vẫn cần sửa nhánh N=1 và kiểm Present; đây là công việc riêng bên FE. |
| Nguồn đã lưu | [Báo cáo UI](../design/UI_MAIN_RECONCILIATION_REPORT_2026-10-24.md), [phạm vi BE/Data](BE_DATA_ONLY_SCOPE_2026-10-25.md), [contract B](../architecture/DISH_SESSION_API_CONTRACT_B.md), [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md), [ADR-020](../architecture/decisions/ADR-020-public-top-three-result.md). |
| GitHub | Đọc live 40 card Project #2 và các issue BE/Data. Hiện có 16 Needs Update, 14 Done, 2 Review, 7 Todo, 1 In Progress. PR mở #123 là P2; #126/#127 là FE/native draft. Chưa có PR runtime B trong danh sách PR đang mở. |
| DB thực tế | Docker daemon không truy cập được (`dockerDesktopLinuxEngine` pipe không tồn tại). Chưa kiểm ledger/definitions hay SQL/HTTP của DB đang chạy trong lượt này. Source migration không chứng minh trạng thái DB. |
| Figma/Android | Lượt này đọc hội thoại và hồ sơ bàn giao, không chạy lại Figma Present, Expo hoặc Android. Những kết luận dưới đây về code có nguồn riêng, không suy Pass từ prototype. |

`UI_MAIN_RECONCILIATION_REPORT_2026-10-24.md` có đoạn N=1 tự chốt thuộc bản bàn giao cũ. Luật hiện hành ở AGENTS/ADR-019/contract B và làm rõ của Trí là **N>=1 luôn mở R2 thật khi R1 chưa có winner**. Không sửa BE trở lại theo đoạn UI cũ đó.

## 2. Các yêu cầu dùng để đối chiếu

- Host chọn đúng một số nguyên 10–20 món khởi tạo; tối đa 20 thành viên; host bắt đầu, không ready hay duyệt từng người.
- Chọn món độc lập quán/GPS/coverage/lịch bán. Places/map phục vụ món thắng sau kết quả.
- R1 kiểm winner trước. Chưa có winner: lấy pool khóa trừ hợp NO của mọi ballot R1 hoàn chỉnh đã ACK. N=0 kết thúc `EMPTY_INTERSECTION`; N>=1 mở R2 thật, kể cả N=1.
- R2 giữ nguyên pool và cap đã khóa: `max(1, floor(0.30*N))`. Được gửi với 0 REMOVE; N=1 vẫn được REMOVE món cuối. Không tự sinh KEEP. Hết ứng viên thì `ALL_REMOVED`; không có R3 hoặc món bù.
- 60 giây bắt đầu từ lần vào waiting hợp lệ đầu tiên sau ACK của từng vòng. Đây không phải giới hạn tổng thời gian chọn món. Host chốt cần >=1 ballot hợp lệ; server xử lý cả khi client tắt.
- Điểm `2*WANT+OK` từ tập R1 hoàn chỉnh đã khóa; R2 không cộng điểm. Tối đa ba món hợp lệ, dense ranks, một winner riêng; kết quả cố định qua retry/reconnect/history.
- Thành viên bỏ lỡ R1 vẫn được gửi R2 khi vòng còn mở, dùng pool/cap đã khóa và không cộng điểm R1. Nếu đã terminal thì đọc kết quả cũ; reconnect không gia hạn hoặc phục hồi món bị loại.
- Result, history và inbox-linked reads dùng cùng projection kết quả đã lưu. Tên/ảnh/điểm không được tính lại từ catalogue mới. `NO_CONSENSUS` không có winner/podium.
- History giữ consent/ACL/retention. Thành viên được xem aggregate sau chốt theo ADR-020; không lộ raw ballots hoặc đóng góp riêng.

## 3. Phần main đã có để tiếp tục sử dụng

| Phần | Bằng chứng trên source | Ý nghĩa |
| --- | --- | --- |
| Catalogue dish-only có ID/version/hash | `supabase/seed/catalogue/manifest.json`; importer vào namespace `dish_v3_private` | Không cần làm lại dữ liệu quán để chọn món. Bundle 39 món vẫn là draft/test-demo. |
| Count 10–20 và shortage rõ | `0026_dish_session_policy.sql:233–254` | Kiểm integer, unique pool, thiếu trả `available/requested`, không tự hạ số món. |
| Direct join 20 người, host start, bỏ ready guard | `0026:279–302` | Không giao làm lại toàn bộ phần này. Cột ready legacy còn tồn tại nhưng v3 không dùng nó làm điều kiện start. |
| ACK/intent và complete ballot | `0026:223–230`, `293–325` | Có request replay, pool/round guard, không ghi ballot thiếu hoặc thay ballot đã nhận. Cần đưa về đúng wire B. |
| Waiting và worker | `0026:327–338`, `353–368` | Submit riêng waiting; mốc chung giữ nguyên, có timeout server, quorum một ballot. Cần kiểm tích hợp lại sau policy mới. |
| Snapshot đã có host và hạn phòng | `0026:183–196` | `hostUserId` và `expiresAt` đã có. Không coi hai trường này là thiếu hoàn toàn; vấn đề là phần wire/snapshot B còn lại. |
| R1 winner-first, hợp NO, không tự OK người thiếu phiếu | `0026:129–147`; `dishPolicy.ts:45–54` | Reuse logic đã có, sửa nhánh N=1 và policy version thay vì viết lại quy tắc NO. |
| Auth và các nền privacy/social | GM-16, RLS private v3, history consent, friends và sender legacy | Giữ lại. Thiếu chủ yếu ở nối policy mới và projection mới, không phải chưa có nền BE. |

Các đường dẫn SQL ở bảng này đều nằm trong `supabase/migrations`; số dòng chỉ source tại baseline được ghi ở mục 1.

## 4. Những phần còn thiếu hoặc chưa khớp

P0 dưới đây nghĩa là chặn nghiệm thu **luồng mới**, không kết luận phiên v2/v3 đang vi phạm contract đã pin của chúng. P1 là phần cần làm rõ/bổ sung trước handoff hoàn chỉnh hoặc demo tính năng tương ứng.

| Mã / mức | Hiện trạng đã xác minh | Bổ sung cần thực hiện | Task |
| --- | --- | --- | --- |
| B01 / P0 | SQL `cap()` và domain vẫn dùng `min(3,floor((N-1)/2))`. R1 chỉ mở R2 khi còn hơn một món. Probe N=1 trả DECIDED; REMOVE món cuối bị RangeError. | Version policy mới, cap30% min1 cho N=1..20, luôn mở R2 khi chưa winner và N>=1; parity SQL/domain. | GM-15/20, storage GM-06 |
| B02 / P0 | `sessions.result` v3 chỉ có winner/reason/tier/round/time/policy. Không có Top 3, rank, score hoặc các version tính điểm. `final_pool` chỉ là tập dẫn đầu để chọn winner. | Chấm/xếp **toàn bộ ứng viên còn hợp lệ**, tách khỏi winner tie-set; lưu winner + Top 3 + thứ tự + phiên bản trong cùng transaction. | GM-15/20, GM-06/07 |
| B03 / P0 | `get_history` trả winnerName, artwork null, date, memberCount, scope; writer cũ bỏ kết quả không có winner. B chưa định nghĩa DTO history trong JSON Schema. | History summary/detail đọc projection đã lưu cho DECIDED và NO_CONSENSUS, theo ACL. Định nghĩa schema cụ thể và đường đọc sau cleanup. | GM-07/21/17/06 |
| B04 / P0 | Result v3 chỉ nằm trong JSON của session; finish không gọi writer history/event. Registry result_refs được đăng ký từ `public.results`, không từ JSON này. | Chốt canonical result identity/registry/ownership giữa producer, history, event và ACL; không chỉ thêm field vào HistoryItem. | GM-06/20/21/23/17 |
| B05 / P0 | History group constraint vẫn 2–8, presentations.member_count vẫn 2–8; histories yêu cầu dish_id/dish_name và tier thắng; dish_id vẫn FK catalogue legacy. | Migration tiến cho group20, no-consensus và catalogue riêng. Bảo toàn FK/version/legacy; không đưa winner giả hoặc dữ liệu catalogue test vào bảng legacy chỉ để vượt constraint. | GM-06/21/17 |
| B06 / P0 | Snapshot thiếu `poolVersion` dù submit/waiting bắt buộc gửi; chưa có role/submissionStatus từng người hoặc ownPreferences. NO_CONSENSUS vẫn có thể trả pool trước đó từ view. | Snapshot response đủ dữ kiện cho request sau và routing; terminal no-consensus có active pool rỗng; dữ liệu phiếu chỉ của caller. | GM-19/20/07 |
| B07 / P0 | Command runtime không có previewJoin/updateSettings/updatePreferences. Create chỉ nhận count/meal/cuisine/category; cuisine/category đang lọc cứng. | Join preview tối thiểu; sửa lobby có version; hẹn giờ/budget/flavor/recent theo semantics đã chốt; ưu tiên mềm và unknown neutral, không nhận field rồi bỏ qua. | GM-07/18/19 |
| B08 / P0 | Schema B bắt `poolVersion=1` trong LOBBY, trái yêu cầu tăng version khi sửa pool ở lobby. | Sửa invariant schema B; fixture lobby đã sửa có version>1 phải hợp lệ, stale mutation bị chặn. | GM-07 |
| B09 / P1 | Schema snapshot/preview B không nhận EXPIRED; envelope request chỉ có command/payload, chưa chốt nơi ràng buộc version B. Semantics WAITING toàn phòng và ownWaiting chưa được diễn đạt đủ rõ. | Chốt đường RPC/discriminator B và routing legacy; định nghĩa response cho expiry; mọi người còn chọn vẫn được gửi khi người đầu tiên waiting. | GM-07/19/20 |
| B10 / P1 | Result DTO chưa có số ballot R1 đã khóa để tính điểm. submittedCount snapshot hiện là vòng hiện tại. | Thêm field/metadata nguồn tính điểm do GM-07 chốt; không lấy số ACK R2 hoặc roster thay A. Kiểm score<=2*A và không cộng người bỏ lỡ R1. | GM-07/15/20/21 |
| B11 / P1 | Importer chỉ chuyển 7 trường card, không có label taxonomy, temperature/flavor, priceReference hoặc roundDishId. | Adapter Data→BE projection B, null/unknown rõ; roundDishId do BE cấp, nhãn từ taxonomy, ảnh chỉ có quyền dùng mới hiện. Cần nguồn metadata để form trước-create dùng đúng ID/label. | GM-40/06/07/18/19 |
| B12 / P0 cho invite | accept_room_invite cũ còn cap8, reset ready, refresh pool legacy; không dùng writer/admission dish-only. | Direct join và accept invitation dùng cùng admission/version/state/cap20; kiểm 20/21 và join/start/invite race. | GM-22/19/17 |
| B13 / P1 | Sender/inbox có nền ID-based nhưng finish v3 không phát result event. | Outbox/event đúng một lần tham chiếu canonical result; đọc kết quả sau mở thông báo theo quyền; không gửi raw votes/score contribution. | GM-20/23/17 |
| B14 / P1 | Main chưa có tích hợp Places tìm quán mới; vùng Places/map là thiết kế/mẫu. Chưa chốt contract provider và ranh giới client/proxy trong phạm vi BE/Data. | Thiết kế interface search/detail, query theo winner, quyền vị trí và lỗi/quota/attribution; Places không đổi result. Việc dựng UI/provider integration theo task sau khi Trí giao. | GM-07 hỗ trợ contract; phần tích hợp đang thuộc GM-30, chưa giao lại FE |
| B15 / P0 trước QA tích hợp | Worker verifier pin schema0.8/0026. QA GM40 tạo REST/JWT riêng, không cấp GoTrue cùng origin. Docker hiện chưa dùng được. | QA/runbook có Auth+REST và worker nhận migration/contract/catalogue mới; xác minh definitions thật. Không tắt hash check, reset DB app hay dùng RPC-only làm bằng chứng app login. | GM-03/06/32 |
| B16 / P1 | Checker contract hiện chỉ đọc schema A; kiểm pass không bao phủ B. Main docs còn hướng dẫn Follow-up trong khi Project nay dùng cột Status Needs Update; chi tiết history bổ sung mới có trên issue. | B fixtures/semantic checks và đồng bộ task/handoff docs. Trạng thái live Project có ưu tiên, không lấy markdown hoặc Issue Closed làm nghiệm thu supplement. | GM-07/32; tài liệu chung |

## 5. Những gì history thực sự cần để phục vụ UI

Yêu cầu Top 3/history đã được ghi trong contract B và các issue [GM-06](https://github.com/ThanhTris/IE307/issues/67), [GM-07](https://github.com/ThanhTris/IE307/issues/68), [GM-20](https://github.com/ThanhTris/IE307/issues/81), [GM-21](https://github.com/ThanhTris/IE307/issues/82), [GM-40](https://github.com/ThanhTris/IE307/issues/125). Các issue hiện ở Needs Update; cập nhật yêu cầu không tự thêm runtime.

Trước khi GM-21 bàn giao cần có đủ:

1. **Kết quả canonical đã lưu:** resultId, contract/policy, status/reason/round, finalizedAt, scoreVersion/rankingVersion, winner nullable và Top 3. Mỗi dòng Top 3 có card khóa, score, rank, isWinner; kết quả không đồng thuận có danh sách rỗng.
2. **Nguồn điểm:** metadata xác định số ballot R1 thực sự được tính. Tên field cụ thể là phần GM-07 phải chốt, không tự dùng submittedCount của R2.
3. **“Cùng ăn”:** projection danh tính/tên hiển thị/avatar nullable được phép đọc theo consent/ACL; roster tham gia khác người gửi từng vòng. Đây là dữ liệu BE/identity/history, không phải phần Data món GM-40. Không public phiếu hoặc gán tên người vào điểm.
4. **Ngày giờ:** hiện `mealDate` lấy từ finalized_at (`0021:247`). Khi có hẹn giờ, cần phân biệt thời điểm ăn dự kiến với thời điểm chốt. Có thể bàn giao cả hai field; nhãn/field wire phải thống nhất trước khi FE nhận.
5. **Lưu trữ và retention:** cleanup hiện có thể xóa room/result operational trong khi summary history còn thời hạn. Projection history không được phụ thuộc vào session JSON đã cascade-delete. Revoke/delete/TTL phải tiếp tục hiệu lực; không tạo lại bản đã xóa khi retry.
6. **Legacy:** kết quả v2/v3 winner-only giữ thông tin thật hiện có. Không gán điểm0/Top3 giả, không backfill thiếu nguồn. Contract history cần phân biệt format/version hoặc capability của bản ghi cũ.

`mobile/src/data/api/contracts.ts:476` hiện vẫn là HistoryItem legacy. Phần cập nhật type/consumer trên mobile thuộc đợt FE sau; BE/Data bàn giao wire DTO và projection đã lưu trước.

Ảnh/tên/điểm trên Lịch sử Figma không tự sai chỉ vì một màn chờ khác có 3 người gửi: có thể là bữa khác. Chỉ kiểm nhất quán xuyên màn khi cùng result/scenario. UI Lịch sử đã được Trí giữ; phần việc hiện tại là BE/Data cung cấp dữ liệu đúng.

## 6. Data: đã đủ làm nền, chưa đủ mọi tình huống dữ liệu thật

Bundle hiện tại: dataset **1.1.0**, 39 món, `usageScope=test_demo`, draft. SHA256:

`776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`

| Đo trực tiếp từ bundle | Số lượng | Cách xử lý |
| --- | --- | --- |
| Món có mealSlots / chưa có | 30 / 9 | [] là chưa có evidence, không phải mặc nhiên hợp mọi bữa. |
| Sáng / trưa / tối / ăn nhẹ | 14 / 23 / 7 / 1 | Với lọc meal như v3, sáng không đủ20; tối/ăn nhẹ không đủ10. Đây là shortage đúng của test data. |
| Món có cuisine / chưa biết cuisine | 5 / 34 | V3 lọc cứng cuisine dễ thiếu dưới10; B cần ưu tiên mềm, không ép Data bịa nhãn để đủcount. |
| Món có category | 39 | Cần bàn giao ID→code→label và version để form/tags dùng cùng vocabulary. |
| Temperature có thông tin / flavor có thông tin | 2 / 0 | Cho null/unknown và xử lý neutral theo policy; không suy từ tên. |
| Ảnh có căn cứ quyền dùng | 0 | Fallback là đầu ra hợp lệ. Không bắt nạp ảnh thiếu quyền để khớp ảnh mẫu Figma. |
| Quan sát giá | 247, tất cả VND và unit=`menu_item_unspecified` | Chưa có giá/người đáng tin để so ngân sách/người. Giữ nguyên đơn vị, unknown neutral; cần quy tắc chọn observation cho public priceReference. |

Không coi 39 món là quota production hoặc yêu cầu mở lại GM-08. Chọn ca thật có đủ data, dùng fixture tổng hợp có nhãn cho các edge case, và chỉ mở rộng GM-40 sau khi chốt bộ lọc/độ phủ cần đạt. Nếu muốn demo bữa tối10 món bằng dữ liệu thật thì cần bổ sung nhãn/món có nguồn trước; không tự bù hoặc nới lọc.

## 7. Bổ sung task nào và theo thứ tự nào

Giữ mã và assignee live. Các nội dung sau có thể đưa vào supplement hiện có; chưa cần thêm task Data hoặc FE mới.

| Task / owner | Điểm cần ghi rõ thêm khi triển khai |
| --- | --- |
| GM-07 / Trang | Sửa invariant lobby/version và expiry; chốt versioned transport, shared result/history DTO, metadata R1 tính điểm, participant projection và error/ACK examples; có validator/fixtures B. Chưa sửa mobile client/mock. |
| GM-40 / Vinh | Projection card/labels/null/price/artwork và metadata taxonomy có version; báo coverage thực tế. Giữ ID/hash, test-demo, nguồn và quyền ảnh; không nhận tính điểm/lịch sử người dùng. |
| GM-06 / Tâm | Migration tiến cho canonical result/history20/no-consensus; registry/FK catalogue riêng, snapshot lưu bền đúng retention, kế hoạch upgrade và mixed-policy. |
| GM-15/20 / Vinh | Policy30% min1 và N1 R2; rank toàn survivors, metadata R1, winner cố định, storage/outbox atomic; SQL/domain parity. |
| GM-18 / Tâm | Soft-preference ranking rõ, taxonomy lookup/handoff, unknown/unit budget và shortage; nhận projection GM40. |
| GM-19 / Trí | Snapshot đủ input request tiếp theo, lobby edits, previewJoin, admission20 và pool version; no-consensus active pool rỗng; expiry/desiredAt. |
| GM-17 / Trí | ACL aggregate/participant/history projection và retention mới; mixed-policy, outsider, revoke/delete; giữ kín raw ballots. |
| GM-21 / Tâm | History summary/detail cùng terminal snapshot; lưu cả no-consensus, group20, đồng ý/không đồng ý, ngày ăn dự kiến, legacy format và dữ liệu sau cleanup. |
| GM-22 / Trí | Invitation accept nhận cùng admission v4, cap20 và state/version; không đi qua reset-ready/refresh-pool legacy. |
| GM-23 / Trí | Producer event canonical và dedupe; notification chỉ reference; fetch authorized result và không làm mất quyền sau revoke/expiry. |
| GM-03 / Trí | QA origin có Auth+REST, worker/version verification, config mẫu và runbook tái lập; giữ ownership/cleanup guard. |
| GM-32 / Vinh | Kiểm wire B thật theo chuỗi response-driven, policy parity, top3/history/consent/event và cases version/race/retention. |

Thứ tự handoff theo artifact, không thêm dependency ngược theo số task:

1. **GM-07 + GM-40:** chốt wire/schema/projection và các semantics còn mở dưới đây. GM-03 có thể chuẩn bị môi trường QA song song.
2. **GM-06** chốt storage/migration; pool/lifecycle **GM-18/19** và engine/finalize **GM-15/20** làm phần độc lập song song theo đúng version đã bàn giao. GM-17 kiểm ACL cùng thiết kế storage.
3. **GM-21/22/23** nhận canonical result/admission/outbox đã có, rồi kiểm tích hợp. Không lấy status baseline của producer làm bằng chứng supplement đã xong.
4. **GM-32** chạy regression trên producer thực tế đã deploy đúng version. FE nhận handoff ở đợt Trí giao sau; test API không thay kiểm UI/Android sau này.

GM-36/37/38 tiếp tục P2; account/recovery GM-35 tiếp tục P1. Màn có trong prototype không làm các task này tự hoàn thành hoặc phải triển khai ngay.

## 8. Chi tiết còn cần thống nhất trong contract/patch plan

Các luật count, cap, timer, no-consensus và Top 3 đã chốt; không cần hỏi lại những luật này. Các chi tiết dưới đây cần owner đề xuất cụ thể để Trí review khi đóng contract:

- **Ưu tiên mềm:** cách tổng hợp host/member, trọng số/tie-break và trường hợp mọi giá trị unknown. Phải phân biệt luật meal eligibility với ưu tiên cuisine/category/flavor/budget; không tự coi mealSlots=[] là match-all.
- **History participants và thời điểm:** thông tin nào được lưu/đọc ở personal/group theo consent hiện hành; planned meal time và finalizedAt là hai khái niệm khác nhau. Không tự mở rộng quyền lưu danh tính chỉ vì UI có “Cùng ăn”.
- **Giá:** chọn observation nào cho một card; xử lý nhiều nguồn/thời điểm/unit khác nhau; dữ liệu hiện chưa cho phép hứa giá/người.
- **Places:** ranh giới client/proxy, dữ liệu tối thiểu, cấu hình/quyền/attribution và lỗi. Có thể định nghĩa interface trong GM-07; phần triển khai provider/UI theo phạm vi tích hợp sau khi được giao. Không đưa quán/lịch bán trở lại điều kiện chọn món.
- **Version/waiting:** cách opt-in B cụ thể, concurrency guard theo từng command, và quan hệ room state với ownWaiting. Không đưa cả phòng sang trạng thái cấm gửi ngay khi người đầu tiên vào chờ.

Readiness checker chỉ xác nhận gate baseline/metadata và artifact tồn tại; kết quả READY không xác nhận các chi tiết mới này đã có implementation hoặc đã được khóa. Nhận task/phần độc lập được, nhưng chưa đủ để tất cả consumer tích hợp ngay theo một contract B chưa hoàn thiện.

### Ca cần có khi nghiệm thu supplement

- Count từng số10–20, 9/21/fraction/null bị chặn; shortage giữ requested đến khi host xác nhận; 20/21 thành viên và join/start/invite đồng thời.
- R1 winner-first, pool rỗng/1/nhiều; R2 N1..20 cap/cap+1/0REMOVE, tập bị REMOVE hết, bỏ lỡ R1 nhưng tham gia R2, không món bù.
- Đồng hồ59/60/61s, chưa ai waiting, hai người vào waiting đồng thời, submit trễ, host/tick race, worker down, mọi client tắt và reconnect.
- Chuỗi create → snapshot → start → submit → waiting → finalize chỉ dùng field response; lobby sau edit có poolVersion>1; phân biệt finalize chuyển vòng với terminal và expiry.
- Top3 cho1/2/3/nhiều món; dense ties và cutoff ties; winner luôn có trong projection; thứ tự/điểm không đổi qua retry, hai client và history.
- History có20 người và no-consensus; personal/group/outsider/opt-out/revoke/delete/TTL; dữ liệu vẫn đúng sau catalogue đổi và room cleanup; legacy không bị tạo điểm giả.
- Places/provider lỗi chỉ đổi vùng tìm quán; phần contract/backend liên quan kiểm riêng, không suy Pass UI từ HTTP hoặc fixture.

## 9. Kiểm đã chạy và giới hạn bằng chứng

| Kiểm | Kết quả | Phạm vi |
| --- | --- | --- |
| Domain suites `decision`, `decisionSeeded`, `dishPolicy` | **179/179 Pass** | Baseline v2/v3. Suite hiện còn test khẳng định single-survivor bỏ R2, nên Pass không chứng minh luật mới. |
| `dish_catalogue.py --check` | **Pass**, 5 artifacts, stale=[] | Build/hash offline; không import DB. |
| `test_dish_catalogue.py` | **33/33 Pass** | Data/validator offline. |
| `gm07a_contract_check.py` | **27 assertions Pass** | Schema A, không kiểm B. |
| Probe domain tổng hợp riêng | **Tái hiện mismatch luật mới** | N1 R1 actual=DECIDED; target=ROUND_2. Cap N1/2/7/14/20 actual=0/0/3/3/3; target=1/1/2/4/6. REMOVE món cuối actual=RangeError; target=ALL_REMOVED. |
| B schema/source inspection | **Xác nhận khoảng trống** | LOBBY poolVersion const1; thiếu history DTO, expiry state/version routing cần thống nhất. Không dùng generic JSON-Schema engine hoặc API thật trong phép này. |
| Docker/DB/HTTP v4.B | **Not run** | Daemon không sẵn sàng; chưa đối chiếu ledger/definitions của DB thật. |
| Places thật, Figma Present, Expo/Android | **Not run trong lượt này** | Prototype và UI test nằm ở scope khác. |

Không sửa migration đã merge, runtime hoặc FE trong lượt audit. Không đổi Project/issue/assignee/deadline, không tự ghi Done/Approved. Tại thời điểm audit, báo cáo và raw artifacts mới ở local; phần hồ sơ được đồng bộ tiếp theo tại mục11. Raw artifacts vẫn local-only.

Raw evidence local-only: `review-results/ui-be-data-sync-audit-20261025/source-audit.json`, `domain-probe.json`, project/issue snapshot. Không đưa review-results lên Git.

## 10. Source chính tại baseline

- [Runtime v3, cap và finish](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0026_dish_session_policy.sql#L112); [snapshot](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0026_dish_session_policy.sql#L183); [commands và selection](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0026_dish_session_policy.sql#L208).
- [Domain cap/nhánh N1](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/mobile/src/domain/decision/dishPolicy.ts#L22); [test baseline N1](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/mobile/tests/dishPolicy.test.mjs#L42).
- [History RPC output](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0021_history.sql#L230); [history member_count 2–8](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0021_history.sql#L19); [history group2–8/no winner fields](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0001_core_schema.sql#L1072).
- [Reference registry/FK](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0004_access_policies.sql#L8); [cleanup](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0004_access_policies.sql#L208); [writer bỏ winner=null](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0024_history_integration.sql#L136).
- [Invite accept legacy](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0022_social.sql#L280); [legacy result/history/event producer](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/migrations/0023_finalize.sql#L170).
- [Schema B lobby invariant](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/docs/architecture/schemas/dish-session-v4b.schema.json#L824); [terminal DTO B](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/docs/architecture/schemas/dish-session-v4b.schema.json#L1294); [checker chỉ dùng A](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/scripts/gm07a_contract_check.py#L17).
- [Importer card projection](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/seed/import_dish_catalogue.py#L47); [catalogue quality/coverage](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/supabase/seed/catalogue/QUALITY_REPORT.md); [worker pin 0026](https://github.com/ThanhTris/IE307/blob/97f5dac8e9136ba0f43989991afdb996277a1069/scripts/dish_policy_worker.py#L14).

## 11. Đồng bộ hồ sơ sau audit — 2026-10-25

Theo yêu cầu Trí, AGENTS, README/điểm vào tài liệu và supplement13 task BE/Data đã được đồng bộ lại với kết luận audit. Task map/checklist chuyển yêu cầu kiểm hiện hành cho các task này sang contract B, policy R2/Top3/history/projection và QA tương ứng. Hướng dẫn Follow-up cũ được thay bằng cột Status Needs Update cho baseline còn cần bổ sung; FE, assignee/Deadline, dependency số và approval giữ theo Project.

Các bằng chứng/mismatch tại baseline97f5dac ở các phần trên vẫn giữ nguyên để truy vết. Đây là đợt đồng bộ yêu cầu cho owner làm tiếp: không sửa runtime v3, mobile, merged migrations hoặc giả định schema B đã hoàn thiện. Các khoảng trống B01–B16 chỉ được đóng khi producer implementation có CHECKS/HANDOFF/version đúng; cập nhật hồ sơ không phải bằng chứng đã sửa runtime.

Kiểm sau cập nhật: repository validator, task indexes và diff whitespace đạt; regression Python chạy 594 tests, kết quả OK với6 skipped. Kiểm scope xác nhận không sửa runtime/FE/migration, owner hoặc dependency metadata. Docker Linux engine vẫn không kết nối được trong lượt này, nên SQL/HTTP v4 và Android tiếp tục Not run. `review-results/` giữ local, không đưa lên Git.
