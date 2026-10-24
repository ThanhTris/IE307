# Đối chiếu báo cáo UI để chuẩn bị BE và Data

> **Phạm vi Trí làm rõ ngày 2026-10-25:** chỉ cập nhật và giao BE/Data. Báo cáo UI dùng để hiểu yêu cầu đầu ra, không giao sửa FE. Các gói H/I/J và phần việc mobile/Places UI/Android/release bên dưới chỉ là tham chiếu hoãn; FE giữ như trước, chờ Figma chốt rồi Trí giao làm lại riêng. [Bảng phân công BE/Data hiện hành](BE_DATA_ONLY_SCOPE_2026-10-25.md) là nguồn thực thi của đợt này; GM-07 chưa sửa mobile client/mock.

Ngày kiểm: **24/10/2026, 23:49 UTC+7**. Chủ dự án/reviewer cuối: Trí (`ThanhTris`).

**Phần giao thực hiện hiện hành:** giữ cấu trúc BE/Data và mã/owner các task; hoàn thiện contract B, projection dữ liệu, policy/producer và consumer BE theo thứ tự artifact. Báo cáo UI chỉ mô tả dữ liệu/hành vi cần phục vụ; Figma và kế hoạch làm lại FE do Trí chốt ở đợt sau. Các đề xuất giao UI cũ trong tài liệu không còn là yêu cầu thực hiện của đợt này. Luật nghiệp vụ vẫn giữ: **vòng 2 cho quyết định loại/không loại khi chỉ còn một món; không tự chốt**.

Tài liệu này là **báo cáo và kế hoạch**, chưa triển khai runtime, cài package, sửa migration, cập nhật task/PR/Project hoặc xác nhận nghiệm thu. Các trường wire mới nêu dưới đây là đề xuất để GM-07 chốt trong schema/DTO trước implementation.

## 1. Baseline và nguồn kiểm

| Nguồn | Đã kiểm / giới hạn |
|---|---|
| Git | `main` và `origin/main` sau fetch cùng `3f77789cfa451f24967428985e8a444ec2821114` — merge PR #133. Không chuyển branch. |
| Working tree | Có phần supplement tài liệu/task chưa commit từ lượt trước. Không có diff runtime trong `mobile`, `supabase`, `scripts`. GM-07.B/ADR-020/schema B đang ở local; không coi là artifact đã có trên GitHub main. |
| Báo cáo UI | [Bản gốc do chủ dự án gửi](../design/UI_MAIN_RECONCILIATION_REPORT_2026-10-24.md), giữ nguyên nội dung; SHA256 `fc1ffc67e618efaab50c6149e7930434be1757ab8feace3a77e7882d58921f25`. Các làm rõ của Trí trong cuộc trao đổi sau báo cáo được ưu tiên. |
| Figma | File `3Ysh0mOAEkAgA5DgZPSC1j`; đã đọc trực tiếp component `379:1401`, `113:866` và các node kết quả/router/chờ ở page `33:2`. Xác nhận 12 flow starts. Không chạy Present/visual QA/Android. Connector không cấp revision ID. |
| GitHub Project #2 | Đọc trực tiếp 40 card; GM-01 dùng alias baseline GM-00/#37. Bảng task bên dưới ghi status tại thời điểm kiểm, không thay nguồn Project cho trạng thái/deadline sau này. |
| PR đang mở | #126 GM-28 và #127 GM-29 là Draft/Review; #123 thuộc GM-36/P2. Chưa có PR runtime v4.B để lấy làm producer đã bàn giao. Lượt này không phải review lại nội dung ba PR. |
| DB/HTTP | Docker daemon hiện không truy cập được. **Chưa xác minh ledger/definitions/RPC của DB thực tế**; source migration 0026 không chứng minh DB đang chạy ở version đó. Không start/reset/migrate DB trong lượt lập kế hoạch. |

## 2. Luật hiện hành sau làm rõ của Trí

### 2.1 Vòng 1 → vòng 2

1. Chốt vòng 1 dưới lock giao dịch; kiểm winner theo policy trước. Nếu đã có winner, lưu kết quả và kết thúc tại vòng 1.
2. Nếu chưa có winner: `survivors = initialLockedPool − union(NO)` từ **mọi ballot vòng 1 hoàn chỉnh đã ACK và thuộc cohort đã khóa**. Không dùng phiếu nháp, không tính thiếu phiếu là OK, không thêm món bù.
3. `N=0`: kết thúc vòng 1 với `NO_CONSENSUS/EMPTY_INTERSECTION`, không mở vòng 2.
4. `N>=1`: **luôn mở vòng 2 thực sự**, kể cả một món. Khóa N/poolVersion cho toàn vòng; không giảm N/cap theo checkbox hoặc REMOVE của từng người.
5. Vòng 2 là quyết định **loại hoặc không loại**. Còn một món vẫn cho loại món đó. Cap áp dụng theo yêu cầu tối thiểu một lượt: `max(1, floor(0.30*N))` cho N=1..20; N=1/2/3 là ngoại lệ tối thiểu một lượt. Không bắt ai phải loại; 0 REMOVE là hợp lệ.
6. Gửi đủ ballot mới thành submission. Giá trị `KEEP` trong wire chỉ biểu diễn không loại sau khi người dùng hoàn tất lượt; không tạo thêm nút “chọn món thắng/Giữ món” hoặc tự ghi KEEP cho người chưa gửi.
7. Khi chốt vòng 2, trừ hợp các REMOVE hợp lệ. Hết ứng viên → `NO_CONSENSUS/ALL_REMOVED`; còn ứng viên → chọn winner theo điểm vòng 1 đã khóa. Không tự chốt chỉ vì pool có một món, không mở vòng 3.

Đây là phần làm rõ mới hơn các đoạn **N=1 bỏ REMOVE/tự chốt** trong báo cáo UI gốc. Các tài liệu định hướng, schema B và task bổ sung được cập nhật theo quyết định này; phiên v2/v3 đã pin không đổi nghĩa. Lịch sử ghi `round=2` nếu phiên đã thực sự chuyển sang vòng 2, kể cả pool chỉ có một món.

### 2.2 Gửi phiếu, điểm và thời gian

- Server chỉ tính ballot hoàn chỉnh đã nhận. Request ACK có thể cũ do replay; consumer đọc snapshot hiện hành để định tuyến.
- Mốc 60 giây của mỗi vòng bắt đầu từ transition vào chờ hợp lệ đầu tiên sau ACK. Chọn món trước thời điểm đó có thể lâu hơn 60 giây; mở lại màn không gia hạn. Host chốt với ít nhất một ballot hợp lệ của vòng đó. R2 một món vẫn theo luồng gửi/chờ/chốt này, không có ngoại lệ tự finalize.
- Đóng cohort vòng 1 cùng transaction chuyển vòng/kết thúc; submit race sau thời điểm khóa không thay cohort/điểm cũ. Người bỏ lỡ vòng 1 có thể gửi vòng 2 nếu phòng đang ở vòng đó; họ không bổ sung điểm R1.
- `score = 2*WANT + OK` trên cohort R1 đã khóa. R2 không cộng điểm. Top 3 lấy từ **toàn bộ món hợp lệ** sau veto, không chỉ tập highest-score dùng chọn winner.
- Tối đa ba món; dense ranks; đúng một `isWinner` khi DECIDED; winner nằm trong tập đã lưu. `NO_CONSENSUS` trả winner null và Top 3 rỗng. Lưu thứ tự/subset đồng điểm một lần, không tính lại khi retry/history/catalogue đổi.
- Mọi member được xem aggregate sau finalize, kể cả ít người gửi; có thể suy luận lựa chọn trong nhóm nhỏ. Không hứa “không thể suy ra phiếu”; vẫn bảo vệ raw ballot/contribution/seed và consent/ACL lịch sử.

### 2.3 Vị trí, quán và phạm vi hiển thị

Places + Google Map ở trang kết quả của winner; không tham gia chọn pool/chấm điểm. Trí đã chọn: khi chưa có quyền vị trí, hiện **cấp quyền hoặc mở Google Maps**, không thêm chọn khu vực bằng tay trong đợt này. Vị trí thuộc caller, không dùng GPS host làm vị trí chung hoặc ghi vào room/history/inbox. Places lỗi không đổi winner/outcome. Dark của đợt bổ sung UI được hoãn; không xóa Dark đang có hoặc miễn các AC accessibility khác.

## 3. Đối chiếu UI-01…10 và OBS

| Mã UI | Đã khớp / cần sửa / chưa xác minh | Bằng chứng và hành động |
|---|---|---|
| UI-01 | Cần sửa app; nhận diện đã có trong thiết kế | App `tokens.ts:33` còn `#FF5A36`, package chưa có font loader. GM-02/05 nhận token Light/Inter từ Figma, không tự chọn palette. |
| UI-02 | Cần sửa AC bổ sung cũ | Matrix/task local còn yêu cầu Dark trong đợt mới. Ghi hoãn phần design/đồng bộ Dark bổ sung; giữ kiểm không hồi quy capability hiện có. |
| UI-03 | Khớp inventory; cần nối consumer | Figma `379:1401` có Count 1/2/3; màn `382:7598`, `382:7884`, `114:753` đều tồn tại. Count = số phần tử Top 3, không phải requested dish count. |
| UI-04 | Thiếu biến thể/producer | `113:866` chỉ có Rank 1/2/3, chưa có winner property riêng. GM-39 bổ sung đồng hạng/cùng cao và badge; BE trả rank/isWinner. |
| UI-05 | Runtime và client chưa khớp | SQL 0026 chỉ lưu winner; DTO mobile hiện là food-v1; B local mới có schema/proposal. Cần cohort count, điểm, ranking và parser riêng. |
| UI-06 | Timeout/tap tồn tại; route chưa khớp | Node `114:825` có timeout 3s và tap, cả hai vẫn đến `114:753`. Route theo resultId/Count; nền và vinh danh dùng chung projection; không thêm thanh đếm. |
| UI-07 | Cần đổi scope plan và triển khai provider | App chưa có map SDK/provider. GM-30 bổ sung Places-backed list/map trong app; Maps link là hành động hỗ trợ, không thay Places/map. |
| UI-08 | Một phần đã khớp source | SQL 0026 tạo dish-only session không cần vị trí/quán. GM-24/25/client/result legacy vẫn cần đổi wiring; GPS chỉ dùng sau result. |
| UI-09 | Chưa có provider để kiểm | Cần loading/success/empty/network/quota/permission states riêng vùng quán; lỗi này không làm lại decision. |
| UI-10 | Cần thống nhất fixture và kiểm thực | Chờ `107:657` là 3/5 ACK, các màn kết quả có 8/7/6. Chưa biết số phiếu đến trước finalize: không kết luận 8 sai chỉ từ snapshot chờ; phải khóa A để kiểm `score<=2*A`. |

| OBS | Đối chiếu độc lập / việc còn thiếu |
|---|---|
| OBS-01/02 | Đã đọc lại props Count/Rank và ba màn; không tạo bục/màn mới để thay chúng. Thiếu shared-rank/winner variants. |
| OBS-03 | Đã xác nhận chuỗi N=1 → đang chốt → vinh danh → Top 3 cố định. Phải sửa cả chuỗi theo rule mới bắt buộc R2 một món, không chỉ đích cuối. |
| OBS-04 | Đã đọc lại roster/ACK và điểm mẫu. Tạo fixture R1 cohort/late ACK có giải thích; không lấy count R2 thay A. |
| OBS-05 | Đã thấy map/quán/khoảng cách/URL mẫu; chưa có request provider. Copy “Quán có món này” cần tránh ngụ ý menu đã verified; dùng quán gợi ý tìm theo món. |
| OBS-06 | Light-only/Inter theo báo cáo FE; lượt này chưa kiểm lại toàn bộ collections hoặc visual tương phản. Không dùng thiếu Dark để chặn đợt này. |
| OBS-07 | Đã đọc lại đúng 12 flow starts. Node ACK/retry/error có trong inventory nguồn; Present, Back/Cancel và phản hồi lỗi vẫn Not run. |

## 4. Các khoảng trống source có bằng chứng

| Ưu tiên | Source/hiện trạng | Cần sửa và task chính |
|---|---|---|
| P0 | [SQL cap](../../supabase/migrations/0026_dish_session_policy.sql#L112) và [domain cap](../../mobile/src/domain/decision/dishPolicy.ts#L24) còn `min(3,floor((N-1)/2))` | Policy mới cho N=1..20, kiểm cap+1; giữ v3 immutable. GM-15/20. |
| P0 | [SQL chuyển vòng](../../supabase/migrations/0026_dish_session_policy.sql#L140) chỉ khi `good>1`; domain tương tự tại [dishPolicy.ts:54](../../mobile/src/domain/decision/dishPolicy.ts#L54) | Chưa có winner + `good=1` phải chuyển R2 thật và cho REMOVE/không REMOVE, không terminal R1 như source hiện tại. GM-15/19/20. |
| P0 | [finish SQL](../../supabase/migrations/0026_dish_session_policy.sql#L163) lưu winner/reason/tier/round, không Top 3 | Tách eligible set khỏi winner candidates, khóa cohort R1, persist score/rank/order/projection/result một lần. GM-06/15/20. |
| P0 | [view SQL](../../supabase/migrations/0026_dish_session_policy.sql#L183) có host/expiry/count/time nhưng không trả poolVersion/own preferences/per-member accepted status | Hoàn thiện B snapshot và settings/preferences/previewJoin. Không mô tả host/expiry/max20 như những thứ hoàn toàn chưa có. GM-07/19. |
| P0 | [create SQL](../../supabase/migrations/0026_dish_session_policy.sql#L247) đang lọc cứng cuisine/category | Chuyển các ưu tiên đã chốt thành xếp ưu tiên mềm; meal eligibility vẫn có policy riêng, không tự đổi unknown thành mọi bữa. GM-18/19. |
| P0 | DTO [contracts.ts](../../mobile/src/data/api/contracts.ts#L358) vẫn food-v1/decision-v2; [result model](../../mobile/src/features/result/model.ts#L39) chỉ nhận decision-v2 | Client B riêng, không dùng DTO offering/anchor để ép nhận dish-only; không silent mock/fake score cho legacy. GM-07/27. |
| P0 | [history writer](../../supabase/migrations/0024_history_integration.sql#L136) dựa `public.results`; 0026 dùng result JSON riêng và pin history consent false khi start | Cần canonical result seam + history consent/versioned writer + event/outbox; không coi GM-21/23 legacy đã có nghĩa B cũng có. GM-17/20/21/23. |
| P0 | [import cards](../../supabase/seed/import_dish_catalogue.py#L47) chỉ chiếu identity/name/description/artwork/meal/cuisine/category IDs | Data đã có giá/provenance nhưng runtime card chưa đưa vào; bổ sung nhãn, giá có đơn vị và field nullable, schema/import/readback mới. GM-40/06/18. |
| P0 tích hợp | B local thêm snapshot/ACK/Top 3 nhưng chưa có runtime/client; terminal result chưa có số ballot R1 tính điểm | Hoàn tất B trước publish: cohort count và version/hash kết quả, rule N1 mới, Places contract riêng. GM-07/15/20. |
| P0 scope mới | [GM-30 local](../../tasks/backlog/GM-30.md#L30) chỉ yêu cầu search Maps URL; package không có map/provider | GM-30 nhận cả adapter Places và map consumer; cần review dependency/key/quota trước thực thi. Không đẩy sang bộ dữ liệu quán GM-40. |

Đây là chênh lệch yêu cầu/source, không phải các lỗi đã tái hiện trên DB/Android. Source v3 đã có đúng initial count 10–20, capacity20, host start không ready, waiting riêng sau submit và timer server. Tái sử dụng nền đã có, bổ sung version mới thay vì làm lại toàn bộ.

## 5. Yêu cầu Data: giữ một luồng bổ sung GM-40

Dataset hiện tại `1.1.0`, SHA256 `776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f`, là draft/test-demo. [Quality report](../../supabase/seed/catalogue/QUALITY_REPORT.md) cho biết 39 món, 247 quan sát giá, cuisine 5/39, category 39/39, meal 30/39, temperature 2/39, flavor 0/39, artwork 0/39.

| Nhóm | Bàn giao cần có | Điều kiện sử dụng |
|---|---|---|
| Định danh | dish UUID ổn định, release/dataset/card version/hash, taxonomy IDs và nhãn giải nghĩa | Producer và consumer pin artifact; giữ 39 ID hiện có, không cấp ID khác vì đổi tên/ảnh. |
| Nội dung card | name, description nullable, meal slots có nguồn, label/temperature/flavor unknown rõ | Thiếu nhãn/ảnh không làm parse fail hoặc bịa tag; trường mềm unknown trung tính. |
| Giá | Quan sát được chọn bằng rule xác định, amount/currency/unit/source/checkedAt; có thể null | Không lấy trung bình tùy ý của 247 giá; không đổi giá/phần thành giá/người; không gán 0 cho thiếu giá. |
| Ảnh | URI hoặc asset hợp lệ, quyền/nguồn/attribution; null khi chưa đủ | UI hiện fallback. Bổ sung ảnh theo nguồn thực là việc Data riêng trong GM-40, không dùng ảnh Places làm ảnh catalogue. |
| Lịch sử | Locked display projection cùng kết quả; fallback khi URL hỏng | Không tải catalogue hiện tại để thay tên/điểm cũ; quyền lưu/dùng asset vẫn phải phù hợp. |
| Độ phủ | Báo số đủ điều kiện theo meal và requested10..20, không cộng unknown | Sáng14, trưa23, tối7, snack1. Nếu giữ buổi làm điều kiện bắt buộc thì dinner/snack hiện chưa đủ10; sáng chưa đủ20. |

Có thể làm schema/API bằng fixture tổng hợp và kiểm fallback ngay; thiếu số lượng Data thật không chặn phần độc lập. Khi demo luồng thật, trường hợp đủ món phải có đủ đúng số yêu cầu; trường hợp shortage phải trả available/requested. Trước release phải bổ sung nguồn/độ phủ cho từng bữa thực sự đưa ra UI; không bỏ luật bữa ăn hoặc tăng số bằng nhãn bịa. Không mở lại GM-04/08 đã nghiệm thu chỉ vì GM-40 cần release mới.

## 6. Contract và Places adapter đề xuất

### 6.1 GM-07.B trước khi publish

- Giữ định danh `dish-session-v4/roadmap-v2/GM-07.B` cho draft chưa publish; nếu có consumer/version đã merge trong lúc nhận việc thì đánh giá version tiến thay vì đổi nghĩa artifact đã dùng.
- Schema/DTO/parser/fixture phải cùng mô tả request contract, snapshot host/settings/ownPreferences/member ACK, poolVersion, serverTime/expiry, removalCap và caller ballot/waiting.
- N=1 của R2 có cap1 và hành vi người dùng như mục 2; không có auto-finalize một món. `ROUND_ADVANCED` không có resultId/finalizedAt; terminal ACK có đủ. Replay ACK không thay snapshot hiện hành.
- Đề xuất thêm `scoredRound1BallotCount` vào terminal result (tên chốt trong GM-07), kèm catalogue/card version/hash hoặc canonical reference đã pin. Danh tính cohort và lựa chọn từng người giữ private; count là aggregate.
- Public Top 3 được tính từ eligible set, không từ `DishDecision.candidates` vốn chỉ là nhóm highest-score của evaluator hiện tại. Lưu winner/tie order/podium cùng transaction; kiểm `score<=2*A`, unique dish, dense rank, winner nhất quán.
- Version-aware result reader hỗ trợ v2/v3 winner-only và v4.B ranking. Legacy thiếu điểm dùng trạng thái “không có dữ liệu điểm”; không gán0, không tự xếp hạng hoặc fallback mock.

### 6.2 GM-30 chịu trách nhiệm Places end-to-end trong task hiện có

Đề xuất gom producer Places và consumer map vào **GM-30, Trang**, đúng phạm vi UI–BE của task; Trí kiểm quyền/config ở GM-17/03. Không tạo task Data quán hoặc giao producer không có owner.

- Adapter server riêng, dự kiến `supabase/functions/result-places/index.ts`; request có resultId và tâm tìm kiếm do caller cho phép. Server xác thực JWT/quyền đọc result, tự lấy tên winner, giới hạn fields/query/page size; không làm proxy nhận URL tùy ý. Endpoint này không mutate room/result.
- Dùng Google Places Text Search (New), dữ liệu địa điểm là gợi ý tìm theo tên món, không xác minh thực đơn hoặc món còn bán. Dùng location bias/restriction có chủ đích; không dựa IP của server proxy để giả vị trí điện thoại.
- Response dự kiến có resultId/winnerDishId/provider/fetchedAt và danh sách place ID/name/address/location/openMapsUrl/attribution; photo và distance nullable. Không lưu GPS caller vào room/history/inbox/log. Khoảng cách nếu có phải là phép đo và nhãn rõ, không gọi đường chim bay là quãng đường đi.
- Consumer dự kiến `mobile/src/features/result/services/placesRepository.ts` và component map trong result. Map/pin/card theo winner hiện tại; request cũ không được thay quán của result mới. Native map và Places search là hai phần riêng.
- Khi chưa cấp quyền: cấp quyền hoặc mở Maps; không tự định vị theo host, không thêm khu vực thủ công. Lỗi/empty/quota/timeout/retry chỉ thay vùng Places; không đổi podium/winner hoặc trả về vote.
- Không ghi Places response vào snapshot bất biến của món, catalogue hay cache/outbox lâu dài. Tách cache Places khỏi result cache, tuân theo chính sách Google; không coi URL ảnh/giờ mở cửa/khoảng cách mẫu là dữ liệu đã được phép lưu.
- Chọn `react-native-maps` qua Expo baseline hiện hành. Local bundled modules hiện đề xuất maps `1.27.2`, font `~57.0.4`; chưa cài package. Trước implementation chạy lại dependency review/Expo check, không copy số “latest” từ web sang SDK57.
- Hai cấu hình tách biệt: credential Places phía server và key Maps SDK Android có restriction package/certificate/API. Chủ dự án cấu hình Google Cloud billing/key/quota trước kiểm provider thật; không đưa secret Places vào `EXPO_PUBLIC_*`.

Google yêu cầu map hiển thị dữ liệu Places dùng Google Map, có attribution và giới hạn lưu dữ liệu; [policy chính thức](https://developers.google.com/maps/documentation/places/web-service/policies). Text Search cần field mask và billing phụ thuộc fields: [tài liệu API](https://developers.google.com/maps/documentation/places/web-service/text-search). Mô hình authenticated proxy theo [hướng dẫn bảo vệ key](https://developers.google.com/maps/api-security-best-practices). `react-native-maps` hỗ trợ Expo Go nhưng build riêng cần cấu hình Google Maps: [Expo docs](https://docs.expo.dev/versions/latest/sdk/map-view/); version phải theo lockfile/bundled map của dự án.

## 7. Task/PR dự kiến, owner và thứ tự artifact

Mã và owner giữ theo Project. Tên PR dưới đây là **gói việc dự kiến**, chưa tạo PR/branch; mọi thao tác repo ở `main` theo yêu cầu Trí. Khi được giao implementation, ghi PR/head/schema hash cụ thể vào HANDOFF, không dùng số task/Status baseline làm bằng chứng supplement đã sẵn sàng.

| Gói / task / owner / status lúc kiểm | File/phạm vi dự kiến | Input → output và AC trước bàn giao |
|---|---|---|
| A. Contract — GM-07 Trang / Needs Update | B spec/schema/builder; `mobile/src/data/api` DTO/guards/client/mock có version; ADR-019/020/DECISION_SPEC, AGENTS | Nhận rule hiện hành + UI report → B reviewed/hash + request/response từ cùng fixture; cap1 ở N1, cohort count, finalize chuyển vòng/terminal, legacy reader, Places DTO riêng. Không silent mock. |
| B. Catalogue — GM-40 Vinh / Needs Update | Dictionary/schema/template, `dish_catalogue.py`, importer, catalogue/manifest/quality report, HTTP/SQL checks | Nhận display-card schema từ A → release mới giữ UUID, projection nullable/source/unit và report coverage. Import/readback đúng hash; release cũ bất biến. Bổ sung bữa/ảnh thật theo mức cần cho demo/release. |
| C. Storage — GM-06 Tâm / Needs Update | Migration tiến sau0026 (số cấp lúc triển khai), schema registry và result/card/cohort storage | Nhận A + projection B → storage version/migration/upgrade checks. Không sửa0026; bảo toàn v2/v3, FK/consent/TTL. |
| D. Domain/finalize — GM-15/20 Vinh / Needs Update | Policy version mới trong domain; migration/RPC version mới; worker/HTTP/fixtures | Nhận A; phần persistence nhận B/C → cap30% tối thiểu1, N1 mở R2 có loại/không loại; ranking toàn eligible set; frozen cohort; atomic result/outbox; retry/concurrency ổn định; SQL–domain parity. |
| E. Pool/lobby — GM-18 Tâm, GM-19 Trí / Needs Update | Pool selector, lifecycle RPC/view, settings/preferences/previewJoin và request suites | Nhận A; merge cần B/C → soft preferences, meal policy rõ, exact count, available/requested, max20, lobby-only updates, poolVersion; chuyển vòng theo D; snapshot đủ để client không đoán. |
| F. ACL — GM-17 Trí / Needs Update | RLS/RPC grants/reader/retention + access suites | Thiết kế song song A/C; phải kiểm trước merge D/G. Member đọc aggregate sau finalize; outsider/private ballots/seed bị chặn; small-group inference được ghi đúng, không thêm threshold tự phát. |
| G. History/social/event — GM-21 Tâm, GM-22/23 Trí / Needs Update | Versioned history writer/reader, consent, invites, terminal result reference/outbox | Nhận A + terminal seam từ D/F → history và inbox cùng resultId/podium/cohort; DECIDED/NO_CONSENSUS/legacy đều đúng; revoke/delete/TTL và event dedupe thật. |
| H. Figma/foundation — GM-39 Trang / In Progress; GM-02 Trí, GM-05 Trung / Done baseline | Figma/prototype; approved token export; theme/font/components | Nhận UI decisions → Count/tie/winner variants, route toàn scenario, Light/Inter, font fallback. Hoãn Dark bổ sung, giữ accessibility. Có thể song song B–G. |
| I. Màn hiện có — GM-09/10 Tuấn, GM-11 Trung, GM-12 Trang, GM-13 Tuấn, GM-14 Trung / Done baseline | Home/setup/lobby/vote/result/history screens và fixtures | Nhận A + H → mock typed có nhãn; không dựng màn trùng. GM-13 nhận podium 1/2/3, badge và no-consensus; fixture source chung. Không báo đã gọi API từ mock. |
| J. Tích hợp chính — GM-24/25 Trang / Done baseline; GM-26/27 Trang / Todo | Setup/preferences repositories, vote/wait/result adapters và navigation | Nhận producer E/D/F/G reviewed → setup không bắt GPS, ACK/refetch, N1 R2 có quyết định loại, winner/Count thật; legacy không bị ép sang DTO mới. |
| K. Places/links — GM-30 Trang / Todo | Server Places adapter, map/repository/external links và QR/join preview | Nhận A, authorized result reader D/F và contract join E/G; provider/config riêng → Places/map thật + states, key/quota/attribution và cold/warm links. Maps link không thay vùng map. |
| L. Inbox/reconnect — GM-28/29 Trung / Review; GM-31 Trung / Todo | Social/history/inbox repositories, notification routing, outbox/cache | Nhận A/G/J → PR126/127 chỉ tiếp nhận B sau producer bàn giao; cache pin contract/pool/result; không replay old ballot hoặc refetch Places vô hạn. Không làm push native driver thành đã đạt chỉ từ seam. |
| M. QA/release — GM-03 Trí / Needs Update; GM-32 Vinh / Needs Update; GM-33 Vinh, GM-34 Trí / Todo | QA Auth+REST/DB, suites, mobile matrix và release docs | GM03 chuẩn bị môi trường song song; GM32/33/34 nhận exact merged producer versions. HTTP/SQL, Expo, Android và provider evidence tách riêng, required Not run còn chặn nghiệm thu. |

**Không mở thêm task.** GM-04/08 giữ baseline field/import; GM-16 auth tiếp tục được dùng. GM-00/01 giữ lịch sử/alias. GM-35/P1, GM-36/37/38/P2 chưa đưa vào đường bắt buộc; PR123 không trở thành điều kiện hoàn thành MVP.

Đề xuất đổi tên scope khi cập nhật task: GM-10 thành setup/bữa ăn/sở thích; GM-18 thành catalogue/ưu tiên pool; GM-19 bỏ “ready” khỏi scope mới; GM-24 bỏ “coverage bắt buộc trước vote”; GM-27 bỏ “offering bắt buộc”; GM-30 nêu Places + Map. Không xóa code/evidence legacy chỉ vì đổi scope mới.

### Cách làm song song và gate tích hợp

1. **A trước**: chốt B/policy/card/result/Places DTO và fixture nguồn. H hoàn thiện Figma theo các quyết định đã rõ cùng lúc.
2. **B và C**: Vinh làm projection/catalogue; Tâm làm storage. GM03 chuẩn bị QA, Trí thiết kế F và lifecycle E. Domain D có thể làm phần thuần từ A trước khi C xong.
3. **D và E song song** sau A; phần API/persist cần C và projection B. Vinh không chờ người khác nạp dữ liệu để làm evaluator; dùng fixture có nguồn đánh dấu QA. Phần GM40 của Vinh đi trước chỗ D cần projection.
4. **G** triển khai theo terminal result seam; **K** có thể chuẩn bị authenticated adapter/map với typed fixture nhưng chỉ kiểm tích hợp sau result reader/F. Owner Trang nối một chuỗi result → Places để tránh adapter không ai nhận.
5. **I/J/L** nhận từng producer đã bàn giao: setup → lobby → vote/chờ → result → history/inbox/reconnect. Layout/mock có thể làm trước, không merge wiring giả là API thật.
6. **M** chạy full flow và regression sau các producer/consumer liên quan; không chờ tất cả màn/P1/P2 mới kiểm từng endpoint.

Không thêm dependency ngược bằng số task. Supplement ghi artifact/version/schema hash/PR cụ thể; `Done` hoặc `Needs Update` chỉ xác nhận baseline để bắt đầu, không chứng minh producer v4.B đã merge. Giữ primary status/deadline hiện hành; khi giao triển khai mới cập nhật AC/Follow-up/comment đúng task và PR đang Review.

## 8. Ma trận QA cần chạy sau implementation

Các ca bên dưới hiện **Not run cho v4.B**, không lấy kiểm schema local hoặc Figma thay runtime.

| Nhóm / nơi chạy | Input/case | Expected / evidence |
|---|---|---|
| Contract + SQL/domain | R1 có winner; chưa winner còn0/1/2..20; N1 vote REMOVE hoặc không REMOVE | Có winner → terminal R1; N0 → EMPTY_INTERSECTION R1; N1 → R2 thực sự, không auto chốt; REMOVE món duy nhất → ALL_REMOVED R2, không REMOVE → DECIDED R2 theo finalize. |
| Cap + UI | N1..20; cap/cap+1; 0 REMOVE; nhiều member hợp REMOVE hết pool | Cap = max(1,floor(.30*N)); N luôn từ locked pool2; checkbox không đổi cap; chưa gửi không tự KEEP; hết pool sau chốt không còn podium. |
| Điểm/Top3 | A=1/2/3; R2 có thêm người bỏ lỡ R1; eligible nhiều hơn winner candidates; 1/2/3/>3 món | R2 không tăng điểm; score<=2*A; Top3 có món hợp lệ thấp điểm hơn winner, không chỉ highest candidates; count tối đa3 và một winner. |
| Tie/persistence | 1–1–2, 1–2–2, 1–1–1; >3 đồng điểm; catalogue/ảnh đổi; retry hai máy | Dense rank; subset/order cố định; winner nằm trong Top3; result/history giữ tên/score; ảnh hỏng dùng fallback. |
| HTTP lifecycle thật | create→snapshot→start→submit→waiting→finalize, request sau lấy từ response | ACK chuyển vòng khác terminal; poolVersion thực có trong snapshot; parser đọc B; không hardcode round/state/result ID. |
| Deadline/race | Chọn>60s trước waiting; hai waiting đồng thời; 59/60/61s; host/submit/tick; replay ACK cũ | Một mốc server mỗi vòng; >=1 ballot vòng hiện hành; freeze cohort đúng lock; request cũ không điều hướng lùi hoặc đổi kết quả. |
| Pool/Data | 10..20 count; thiếu15/request20; dinner7; unknown labels/price/photo; soft preference rất hiếm | Exact count hoặc available/requested; chỉ hạ count sau host xác nhận>=10; không biến unknown meal thành match hoặc thêm quán/GPS. |
| Capacity/lobby | 20/21 người; sửa setup/preferences và start/join đồng thời | Capacity và expectedVersion; lock pool sau start; ownPreferences private; preview không lộ roster/ballot và không giữ chỗ. |
| ACL/history | Member/outsider, small cohort, consent opt-in/out/revoke/delete/TTL, NO_CONSENSUS/legacy | Aggregate đúng quyền; không raw ballots/seed; cohort count không lộ phiếu; canonical result seam, không bịa điểm cho legacy. |
| Places server + Android | Success/loading/empty/error/quota/timeout, permission deny/GPS unavailable, stale result | Query winner đúng result; map/card/attribution thật; GPS caller không share; denied chỉ cấp quyền/Maps; mọi lỗi Places giữ winner/Top3. |
| Figma Present và app riêng | 12 starts; N1→R2; Count1/2/3; vinh danh3s/tap; host/member | Không route cố định Top3; không nền ba món cũ; cùng result/roster/cohort; không tạo flow/màn trùng. |
| Expo/Android | Light/Inter, 320/360/412, font200%, TalkBack, tên dài, ảnh/giá null, Back/background | Expo/mock/API thật ghi riêng; map/font native capability và key của build riêng kiểm riêng; Dark bổ sung hoãn. |

Mỗi task bàn giao CHECKS/HANDOFF: SHA thật, contract/schema/card/dataset hashes, environment không secret, precondition/input/expected/actual/assertion và evidence. DB QA riêng phải có Auth+REST, ledger/definitions đúng revision; không reset DB đang dùng hoặc lấy RPC-only gateway làm đã kiểm auth. Chỉ dọn tài nguyên QA thuộc lượt chạy.

## 9. Các việc chờ giao triển khai

- Chủ dự án đã chốt hành vi N1 vẫn có quyết định loại/không loại và phương án không GPS; không mở lại hai quyết định này trong lúc triển khai.
- Chưa xác minh Google Cloud project/billing/key/quota đã có. Đây là đầu vào cấu hình trước test provider thật, không chặn thiết kế DTO/adapter/mock; không tự bật billing trong lượt này.
- Chính xác field names/cohort metadata và migration number do GM07/06 bàn giao trước code consumer. Chốt thuật toán tie-order bằng fixture SQL–domain; không để mỗi client tự chọn.
- Task/Project bổ sung từ lượt trước vẫn chứa Maps-only/Dark/N1 skip ở một số nơi. Khi kế hoạch được giao triển khai, cập nhật một lượt ADR/spec/B/schema/task/Project có liên quan; giữ task codes/owners/baseline và xử lý PR126/127 như consumer đang Review.
- Chưa chạy DB/HTTP/Expo/Android/Places thật trong lượt audit. Bằng chứng cấu trúc Figma và code đọc không phải nghiệm thu các bước đó.
