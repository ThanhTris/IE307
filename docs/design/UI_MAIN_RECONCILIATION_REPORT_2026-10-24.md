# Báo cáo UI để rà soát và lập kế hoạch đồng bộ main

Ngày lập: **24/10/2026, 23:25 (UTC+7)**. Người duyệt cuối của dự án: **Trí / ThanhTris**.

## 1. Mục đích và cách đọc

Báo cáo này bàn giao các quyết định UI mới nhất từ hội thoại **FE**, hiện trạng Figma đã kiểm tra và các điểm phía **main** cần rà soát trước khi sửa contract, task và kế hoạch triển khai.

**Kết luận:** tiếp tục dùng các màn và component hiện có. Đợt điều chỉnh UI tập trung vào bục đồng hạng, điều hướng kết quả 1/2/3 món, dữ liệu mẫu nhất quán và Google Places trong trang kết quả. **Chưa làm Dark mode trong đợt UI này.**

Cần phân biệt bốn loại thông tin trong báo cáo:

- **Đã chốt UI:** yêu cầu trực tiếp mới nhất của chủ dự án trong hội thoại FE.
- **Đã quan sát:** nội dung/node/reaction đọc được từ Figma hoặc source tại commit được ghi rõ.
- **Đề nghị main rà soát:** phần contract, dữ liệu hoặc triển khai cần đối chiếu tiếp; chưa tự trở thành wire contract.
- **Chưa kiểm:** chưa có bằng chứng chạy Present, Android hoặc API tương ứng.

Báo cáo không xác nhận task Done, nghiệm thu revision Figma, runtime v4, API Google Places hoặc Android đã hoạt động. Đầu ra được yêu cầu ở main là **một bản rà soát có bằng chứng và kế hoạch điều chỉnh**, không áp dụng toàn bộ đề xuất vào code một cách tự động.

## 2. Nguồn và mốc đối chiếu

| Nguồn | Mốc / nội dung |
| --- | --- |
| Hội thoại FE | Các xác nhận mới nhất ngày 24/10: chưa cần Dark; dùng bục 1/2/3 món đã có; giữ Places/map trong kết quả; sửa dữ liệu mẫu và prototype |
| Kế hoạch do chủ dự án gửi | “Đồng bộ task BE–Data–UI với Figma và bổ sung Top 3” — nguồn đối chiếu liên phòng; các điểm mới hơn ở mục 3 dưới đây được ưu tiên |
| Main đã đọc | `3f77789cfa451f24967428985e8a444ec2821114` qua ref `origin/main` tại thời điểm lập báo cáo |
| Worktree FE | `C:\Users\ADMIN\.codex\worktrees\6524\Project`, HEAD `4a8cd642c8d908d9e6d2c75d19c0935a44cba042`; có các thay đổi local từ trước báo cáo |
| Figma | File `3Ysh0mOAEkAgA5DgZPSC1j`; `03 · Màn hình` = `33:2`, `02 · Components` = `8:2` |
| Cách kiểm Figma lượt này | Đọc cấu trúc, text, component properties, modes và reaction; không chạy lại toàn bộ Present trong lượt viết báo cáo |

Worktree FE không cùng HEAD với main. Khi main đọc báo cáo, phải kiểm tra lại SHA mới nhất và các bổ sung GM-07.B đang được thực hiện; không coi các file local FE là source đã merge. Phân công, trạng thái và deadline phải lấy lại trực tiếp từ GitHub Project #2.

Figma connector không cung cấp revision ID. Các phát hiện dưới đây được định danh bằng thời điểm kiểm, file/page/node và nội dung quan sát.

## 3. Các quyết định UI đã chốt

| Mã | Quyết định | Cách thể hiện / ranh giới |
| --- | --- | --- |
| UI-01 | Giữ nhận diện hiện tại | Logo, màu xanh và font Inter theo Figma hiện hành. Lấy token từ file Figma; không chọn lại palette dựa trên ảnh chụp hoặc màu app cũ. |
| UI-02 | Chưa làm Dark mode trong đợt này | Tạm hoãn thiết kế/đồng bộ Dark của đợt bổ sung UI. Main ghi rõ phạm vi này trong AC; không suy thành lệnh xóa chức năng Dark đã có hoặc xóa yêu cầu accessibility của các task khác. |
| UI-03 | Giữ kiểu bục đã duyệt | Có 1/2/3 món hợp lệ thì dùng đúng bục tương ứng đã có. Không vẽ lại kiểu bục chỉ vì số món ít. |
| UI-04 | Bổ sung đồng hạng | Điểm bằng nhau có cùng số hạng và cùng chiều cao. Ví dụ `8,8,7` → `1,1,2`; `5,5,5` → `1,1,1`. Vẫn chỉ có một winner, có nhãn riêng **“Món được chọn”**. |
| UI-05 | Hiển thị điểm từ BE | Điểm = `2 × WANT + OK` từ ballot Vòng 1 hoàn chỉnh đã được server nhận và thuộc tập tính điểm đã khóa. Vòng 2 chỉ loại món, không cộng điểm. UI không tính winner/thứ hạng từ những thẻ đang hiện. |
| UI-06 | Giữ vinh danh | Tự đóng sau 3 giây, có “Chạm để bỏ qua”, không thêm thanh đếm thời gian. Món, ảnh và điểm khớp với kết quả bên dưới. |
| UI-07 | Google Places nằm trong trang kết quả | Hiển thị bản đồ và quán gợi ý theo **món chiến thắng** ngay trong app. Bấm quán có thể mở Google Maps. Mở Maps bằng liên kết ngoài là hành động hỗ trợ, không thay toàn bộ vùng Places/map. |
| UI-08 | Vị trí phục vụ tìm quán sau kết quả | Không dùng vị trí/quán để quyết định pool hoặc winner. Không thêm bước bắt buộc chọn điểm ăn/bán kính trước vote, không chia sẻ GPS cá nhân cho nhóm. |
| UI-09 | Lỗi Places chỉ ảnh hưởng vùng quán | Có đang tải, không tìm thấy quán, lỗi tải và chưa cấp quyền vị trí. Bục/món thắng vẫn được giữ nguyên. |
| UI-10 | Đồng bộ fixture và prototype | Số người, số phiếu đã nhận, món, ảnh, điểm, winner và số món trên bục phải khớp trong cùng tình huống. Host/member nhận cùng outcome. Giữ 12 điểm bắt đầu chính. |

### Hai điểm thay thế nội dung trong bản kế hoạch main đã gửi

1. Dòng yêu cầu bổ sung **Dark** trong đợt UI: chuyển thành **tạm hoãn trong đợt hiện tại** theo UI-02.
2. Dòng “trước mắt chỉ mở Google Maps theo tên món”: điều chỉnh thành **Places + map trong trang kết quả**, với liên kết mở Google Maps từ quán/nút hỗ trợ theo UI-07.

Đây là các quyết định về trải nghiệm mong muốn. Main vẫn cần xác minh và lập kế hoạch triển khai provider, dữ liệu, SDK/API, quyền vị trí và kiểm thiết bị.

## 4. Luồng sản phẩm mà UI phải giữ

### 4.1 Tạo phòng và chọn món

- Host chọn chính xác 10–20 món ban đầu; phòng tối đa 20 thành viên; không ready.
- Khẩu vị/ngân sách theo semantics ưu tiên mềm mà main đang bổ sung. UI không hứa bộ lọc cứng hoặc giá/người nếu dữ liệu không hỗ trợ.
- Vòng 1 dùng flashcard: trái = NO, phải = OK, nhấn đúp = WANT. Nút thay cử chỉ chỉ hiện theo thiết lập/trợ năng.
- Thẻ cuối bắt đầu gửi một ballot và khóa Hoàn tác. ACK của request khác với snapshot hiện hành; sau ACK/retry/reconnect phải đọc trạng thái phòng mới.
- Đồng hồ chỉ nằm ở chờ kết quả. Mốc 60 giây đến từ lần vào chờ hợp lệ đầu tiên sau ACK; mở lại màn không gia hạn.

### 4.2 Chuyển vòng và kết thúc

1. Sau Vòng 1 kiểm winner trước. Có winner thì mở vinh danh và đúng biến thể kết quả, không mở Vòng 2.
2. Nếu chưa có winner, lấy pool đầu trừ hợp NO từ ballot Vòng 1 hoàn chỉnh đã ACK. OK được giữ; thiếu phiếu không phải OK; không bù món cho đủ 10.
3. Còn 0 món: “Chưa chọn được món”, kết thúc Vòng 1.
4. Còn 1 món: bỏ thao tác loại, hiện đang chốt và nhận kết quả BE. Nếu không thực sự mở Vòng 2 thì nhãn vòng/lịch sử không được ghi thành đã chơi hai vòng.
5. Còn từ 2 món: thông báo chuyển vòng ở giữa màn, tự chuyển sau 3 giây. Cap là `max(1, floor(0.30 × N))`; được giữ toàn bộ. N là số món khi khóa pool Vòng 2, không giảm theo số món vừa tick loại.
6. Vòng 2 trả winner thì mở kết quả; trả `NO_CONSENSUS / ALL_REMOVED` thì kết thúc “Chưa chọn được món”.

Đính chính nguồn cũ: **ADR-019 trên main tại `3f77789` đã có supplement 24/10 áp dụng luật 30% và N=1 bỏ loại.** Công thức cũ `min(3, floor((N-1)/2))` trong phần lịch sử không phải luật UI hiện hành. Runtime v3 còn dùng policy cũ phải được xử lý bằng phiên bản/migration tiến; không sửa nghĩa các phiên đã pin.

## 5. Hiện trạng Figma đã xác nhận

| Mã | Quan sát | Ý nghĩa đối với kế hoạch main |
| --- | --- | --- |
| OBS-01 | Bục `GCD / Result Podium` (`379:1401`) có `Count=1/2/3`; món trên bục `113:866` có `Rank=1/2/3`, tên và điểm. Chưa có state winner riêng/biến thể đồng hạng trong các property đã đọc. | Tái sử dụng component hiện có; bổ sung đồng hạng và tách winner khỏi số hạng. |
| OBS-02 | Màn kết quả 1 món `382:7598`, 2 món `382:7884` và Top 3 `114:753` đều đã tồn tại. | Không liệt kê chúng như các màn còn thiếu cần vẽ mới. |
| OBS-03 | Router R1_ONE `570:8854` → đang chốt `382:7461` → vinh danh `114:825`; cả tap và timeout của vinh danh đều đi cố định đến Top 3 `114:753`. | Cần route theo fixture/result thực tế để còn 1/2 món mở đúng bục. Không kết luận nhánh N=1 đã hoàn tất chỉ vì đã bỏ REMOVE. |
| OBS-04 | Chờ host `107:657` hiển thị `3/5 người đã gửi`. Top 3 `114:753` hiển thị `8,7,6` điểm. Màn 1/2 món cũng dùng điểm 8 và các tên mẫu khác cách biểu diễn roster ở chờ. | Chốt lại tập ballot tính điểm, roster và dữ liệu từng scenario. Nếu đóng với đúng 3 ballot Vòng 1 thì điểm tối đa là 6. |
| OBS-05 | Các màn kết quả có map, “Quán phở A”, “0,6 km”, “Mở bản đồ” và “Tìm quán”. | Đây là fixture UI, không chứng minh Places đã tích hợp. Giữ bố cục theo UI-07 và bổ sung states/provider data thực. |
| OBS-06 | Collection `GCD / UI colors` hiện chỉ có mode Light. Inter được dùng trong text của bục. | Thiếu Dark được ghi là hoãn phạm vi hiện tại, không dùng làm blocker cho đợt này. Đồng bộ Light/Inter trước. |
| OBS-07 | Trang 03 có đúng 12 flow starting points. Các màn gửi, ACK chưa rõ, gửi lỗi, vòng đóng, xác nhận chốt và chưa chọn được món đã có trong inventory kiểm trước đó ngày 24/10. | Rà lại đường tới/đi và tương tác, tránh tạo trùng màn hoặc thêm nhiều flow start. Sự tồn tại của node không chứng minh Present đã pass. |

Các khối “Cùng ăn”, cách gọi “Bạn”, danh sách thành viên và CTA cuối màn cần được rà đồng bộ giữa kết quả 1/2/3 món, chưa đồng thuận và lịch sử. Quan sát hiện tại cho thấy cách thể hiện khác nhau; main/FE cần đối chiếu mục đích từng màn trước khi kết luận phải sao chép cùng một layout sang tất cả.

### Link node để kiểm trực tiếp

- [Chờ Vòng 1 — host](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=107-657)
- [Bục dùng chung Count 1/2/3](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=379-1401)
- [Món trên bục, Rank 1/2/3](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=113-866)
- [Vinh danh](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=114-825)
- [Kết quả 1 món](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=382-7598), [2 món](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=382-7884), [Top 3](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=114-753)
- [Chưa chọn được món — Vòng 1](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=323-3619), [Vòng 2](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=226-1286)
- [Bảng fixture vote trong Present](https://www.figma.com/proto/3Ysh0mOAEkAgA5DgZPSC1j/Gi-Cung-Duoc?node-id=559-8899&page-id=33%3A2&starting-point-node-id=559%3A8899&scaling=scale-down)

## 6. Yêu cầu điều chỉnh Figma và FE

| Hạng mục | Yêu cầu có thể kiểm được |
| --- | --- |
| Bục và đồng hạng | Có Count 1/2/3; các món đồng hạng cùng số/cùng cao; winner có nhãn riêng. FE không suy winner từ vị trí giữa hoặc phần tử đầu. Tối đa ba món, không phải ba nhóm điểm. |
| Số món kết quả | Bục lấy từ số món BE trả về trong Top 3. Không luôn hiện đủ ba món và không dùng số món ban đầu 10–20 để quyết định Count. |
| Vinh danh và màn nền | Cùng winner/ảnh/điểm/resultId; khi đóng hoặc tự tắt đi đúng biến thể kết quả. Nền modal không lộ ba món cũ trong tình huống chỉ còn một món. |
| Chưa đồng thuận | Không dựng podium, điểm hoặc winner giả. Giữ nhãn vòng/reason phù hợp và đường tạo phòng mới/về Trang chủ. |
| Map/quán | Nằm trong kết quả của winner; các states thay riêng vùng quán. Kết quả đã chốt vẫn xem được khi mất mạng hoặc Places lỗi. |
| Thiếu dữ liệu món | Dùng fallback ảnh/giá/nhãn đã có; không tự điền giá hoặc ảnh chưa được phép. Giá có tiền tệ/đơn vị rõ khi xuất hiện. |
| Lịch sử | Dùng kết quả đã lưu; đầy đủ mục thành viên theo consent/ACL và quyết định UI đã chốt. Rà thêm kết quả legacy chỉ có winner, chưa có điểm/Top 3; không tự gán điểm 0 hoặc bịa hạng. |
| Thành viên và quyền | Phân biệt roster tham gia với số ballot đã ACK từng vòng. Host/member cùng kết quả; khác nhau ở quyền Chốt ngay. Không hiển thị phiếu riêng của người khác. |
| Tổ chức file | Màn chạy ở trang 03, component ở trang 02; nhóm liên quan xếp ngang, tên không đè frame; giữ 12 flow start chính. |

### Các states của vùng Places/map

1. **Đang tải:** skeleton/loading trong vùng quán; bục kết quả vẫn đọc được.
2. **Có kết quả:** map/pin và thẻ quán theo món thắng; thẻ/nút quán mở Google Maps tương ứng.
3. **Không có kết quả:** thông báo ngắn và đường tìm trên Google Maps; không đổi món thắng.
4. **Lỗi mạng/provider:** thử lại và đường mở Maps hỗ trợ; không đưa người dùng về chọn món.
5. **Chưa có quyền vị trí:** giải thích ngắn theo ngữ cảnh và hành động cấp quyền/mở Maps; không chặn xem kết quả.

Không tạo một flow bắt buộc chọn quán/điểm ăn/bán kính. Quán là gợi ý tìm theo món, không phải bằng chứng menu hiện tại chắc chắn còn món. Tên quán, tọa độ, ảnh, địa chỉ và khoảng cách chỉ hiển thị khi có nguồn/semantics phù hợp; các giá trị mẫu trong Figma được quản lý trong fixture.

## 7. Dữ liệu mẫu: điều gì phải đồng bộ

“Dữ liệu mẫu xuyên suốt” là những tên, số và outcome điền sẵn để bấm thử prototype. Nó không yêu cầu dựng lại engine trong Figma.

Mỗi scenario cần một bộ fixture xác định: roster, vai trò, pool đầu, tập ballot Vòng 1 được tính, số ACK từng vòng, pool Vòng 2, outcome, Top 3, winner và dữ liệu quán giả lập. Các màn cùng scenario đọc cùng bộ này.

Gọi `A` là số ballot Vòng 1 hoàn chỉnh thực sự được tính tại lúc khóa kết quả. Mỗi món hợp lệ có điểm không vượt `2 × A`. **A là số được server xác định khi chốt, không nhất thiết bằng số ACK ở snapshot cuối cùng client vừa nhìn thấy.** Nếu prototype giữ 8 điểm sau màn 3/5 thì phải mô tả thêm ballot đến trước lúc chốt; nếu fixture đóng với đúng 3 ballot thì sửa điểm xuống mức hợp lệ.

Ví dụ fixture để main/FE dùng khi rà soát, không phải công thức winner mới:

| Fixture | A | Outcome và dữ liệu mẫu hợp lệ |
| --- | --- | --- |
| F01 — Thắng ngay Vòng 1 | 3 | Ba món Top 3 có thể là `6,5,4`; winner 6 điểm là unanimous WANT trong tập được tính. |
| F02 — Thắng sau Vòng 2 | 3 | Có thể dùng `5,4,3`; không đặt món 6 điểm trong cùng cohort này rồi lại mô phỏng chưa có unanimous winner ở Vòng 1. |
| F03 — Sau NO chỉ còn 1 món | 3 | Ví dụ món còn lại 4 điểm; bỏ loại, chốt và hiển thị đúng một món. Không tự thêm hai món lên bục. |
| F04 — Kết thúc còn 2 món | 3 | Ví dụ `5,4`; hai bục, đúng một winner. |
| F05 — Đồng hạng | 3 | `5,5,4` → `1,1,2`, chỉ một món có nhãn “Món được chọn”. |
| F06 — Cả ba đồng điểm | 3 | `5,5,5` → `1,1,1`, cùng chiều cao, vẫn một winner. |
| F07 — Bốn món đồng điểm ở ranh giới | 3 | BE/fixture chọn một tập tối đa ba món cố định, luôn có winner; retry/history không chọn tập khác. |
| F08 — Chưa đồng thuận | >=1 | Winner null, Top 3 rỗng, không hiện map của một món cũ. |
| F09 — Places lỗi/rỗng/từ chối vị trí | Như F01/F02 | Giữ nguyên kết quả và điểm; chỉ thay trạng thái vùng quán. |

Tên/ảnh món thắng phải trùng giữa thẻ, trạng thái gửi, vinh danh, bục, lịch sử và thông báo. Các danh sách người cần dùng cùng định danh, không đổi người chỉ do đổi vai trò xem; nhãn “Bạn” chỉ là cách trình bày theo caller.

## 8. Những điểm main cần rà soát ở BE, Data và contract

### 8.1 Kết quả và Top 3

- Đối chiếu supplement GM-07.B mới nhất với phần GM-07.A tại baseline. GM-07.A ở `3f77789` vẫn ghi Top 3/score chưa bật và `FinalizeAck` chỉ trả terminal state.
- Phân biệt rõ ACK **đã chuyển vòng** với ACK **đã kết thúc**. Result ID/thời điểm kết quả cuối chỉ có khi thực sự terminal; client đọc snapshot mới để điều hướng.
- Cung cấp kết quả có version tính điểm/xếp hạng, Top 3, score, dense rank, isWinner và projection món đã khóa. Tên field cụ thể phải được main chốt trong schema/DTO, không lấy bảng UI này làm wire contract.
- Khóa tập ballot R1 dùng tính điểm. Đề nghị có trường nguồn như số ballot R1 đã tính điểm để kết quả/lịch sử có thể kiểm nhất quán; không dùng submittedCount của R2 thay cho nó.
- Top 3 lấy từ **toàn bộ món còn hợp lệ**, không chỉ tập điểm cao nhất dùng để chọn winner. Với món không có NO và cùng cohort A, `2W+OK=A+W`; xếp theo điểm tương đương xếp theo WANT hiện có, nhưng danh sách Top 3 rộng hơn tập winner candidates.
- Lưu winner, Top 3, điểm và thứ tự cùng transaction; không để retry, thiết bị khác hoặc catalogue thay đổi làm đổi kết quả.
- Dense rank theo mức điểm; tối đa ba món; exactly one isWinner khi DECIDED; NO_CONSENSUS có winner null và danh sách rỗng. Cần quy tắc tie/order xác định và SQL–domain parity.
- Kết quả v2/v3 cũ vẫn đọc theo phiên bản đã pin. Thiếu Top 3 trong phiên legacy không đồng nghĩa lỗi result v4 và không được lặng lẽ tạo fixture thay API.

### 8.2 Snapshot, pool và phục hồi

- Đủ host/role, thiết lập phòng, own preferences, round/poolVersion, removalCap, trạng thái ballot caller, số đã gửi, deadline, serverTime, expiry và result để dựng UI.
- Cho phép trạng thái ACK của từng thành viên để dựng màn chờ theo quyền đã chốt, nhưng không trả nội dung phiếu riêng của người khác.
- N của cap được khóa theo pool đầu Vòng 2. Không giảm N/cap theo local checkbox hoặc ballot riêng đang đến từ thành viên khác.
- “Reconnect không khôi phục món bị loại” phải được định nghĩa rõ: giữ pool sau NO, own draft/ACK và outcome hiện hành; không công khai REMOVE riêng bằng cách cắt pool theo thời gian thực khi vòng còn mở.
- Retry/reconnect phân nhánh theo snapshot: đang chọn, đã ACK/đang chờ, sang vòng mới, có kết quả, hủy/đóng/hết hạn. Không luôn quay về chờ host.

### 8.3 Data món và projection

- Đủ tên, nhãn, ảnh nullable, giá nullable kèm tiền tệ/đơn vị và version/hash để dựng card/bục/lịch sử. Ảnh cần nguồn/quyền sử dụng; fallback giữ khi chưa có asset hợp lệ.
- Giá/phần không tự đổi thành giá/người. Unknown không bị điền thành 0, không biến thành cam kết đáp ứng ngân sách.
- Catalogue phục vụ chọn món độc lập vị trí/quán; Places sau kết quả không được kéo yêu cầu coverage/offering cũ trở lại bước tạo pool.
- Lưu projection kết quả đủ ổn định cho lịch sử; định nghĩa cách xử lý ảnh/URL không còn tải được mà vẫn giữ tên/điểm/outcome cũ.

### 8.4 Google Places và Maps

- Phạm vi đã chốt là tìm quán theo winner và hiển thị trong app. Main rà lại GM-30 và producer/adapter liên quan, không chỉ triển khai Maps URL rồi ghi đạt UI-07.
- Chốt nguồn vị trí, cách render map, request/response Places, trường trả về, permission/error model và đường mở Maps. SDK/package mới theo Expo baseline và quy trình dependency hiện hành.
- Nếu hiển thị khoảng cách: ghi rõ nguồn, cách tính và đơn vị; không dựng sẵn “0,6 km” cho dữ liệu thật. Không suy một kết quả tìm kiếm thành quan hệ menu/quán–món verified của catalogue.
- Rà quyền/key restrictions, chi phí/quota, attribution/ảnh và xử lý dữ liệu vị trí. Không đưa secret/server credential vào client hoặc log dữ liệu vị trí/phiếu ngoài mục đích đã cho phép.
- Không tìm được quán hoặc provider lỗi không được đổi trạng thái phiên từ DECIDED sang NO_CONSENSUS.

### 8.5 Privacy của điểm tổng

Kế hoạch chủ dự án gửi cho phép thành viên xem tổng điểm sau khi chốt, kể cả nhóm ít người đã gửi. Main cần ghi chính xác đánh đổi này: bảo vệ phiếu thô/seed và kiểm quyền truy cập **không bảo đảm không suy ra lựa chọn cá nhân**. Ví dụ một người đã gửi thì điểm 1/2 thể hiện OK/WANT; với hai người và biết phiếu của mình có thể suy ra người còn lại.

Không tự thêm ngưỡng nhóm hoặc đổi luật hiển thị trong UI. Cập nhật policy/AC privacy phù hợp quyết định hiện tại; history tiếp tục theo consent/ACL/retention.

## 9. Bảng tác động task để main đối chiếu

Đây là mapping phạm vi từ kế hoạch chủ dự án gửi, **không phải cập nhật assignee/status/deadline**. Main phải lấy lại trạng thái Project và PR/artifact mới nhất trước khi sửa task.

| Nhóm task | Đầu vào cần nhận / nội dung cần rà |
| --- | --- |
| GM-39 | UI-01…10; component đồng hạng; fixture; route Count 1/2/3; Places states; bỏ Dark khỏi đợt bổ sung hiện tại |
| GM-02 / GM-05 | Token xanh/Inter từ Figma; font loading/fallback và component; giữ baseline Expo/dependency gate |
| GM-07 | Contract supplement/schema/DTO/guards/client/mock tương ứng; finalize chuyển vòng; result/ranking/projection; không silent fallback sang mock |
| GM-06 / GM-40 | Migration tiến, metadata/projection nullable, version/hash và lưu tham chiếu ổn định |
| GM-15 / GM-20 | Eligibility/veto/score/Top 3/tie/order/winner, transaction và replay; runtime v4/30% và SQL–domain parity |
| GM-17 | ACL của aggregate, giữ kín ballot/seed, history consent/retention và ghi nhận suy luận ở nhóm ít người |
| GM-18 / GM-19 | Pool độc lập, setup ưu tiên mềm, sửa lobby/version, snapshot và lifecycle chuyển vòng |
| GM-12 / GM-13 / GM-26 / GM-27 | Flashcard/gửi/ACK/chờ; result đúng Count/rank/winner; consumer dữ liệu BE thật |
| GM-21 / GM-14 / GM-28 / GM-29 / GM-31 | History/inbox cùng result đã lưu, legacy result, link/recovery/cache/response cũ |
| GM-30 và phần provider liên quan | Places + map trong kết quả, mở Maps từ quán, permission/error/empty/loading; xác định rõ producer và consumer |
| GM-03 / GM-32 / GM-33 / GM-34 | Bằng chứng API/Android/tích hợp sau implementation, regression và release theo phạm vi thực tế |

Các task setup/Home/Friends khác tiếp tục nhận contract mới theo kế hoạch main; không mở lại tất cả màn chỉ vì thay outcome projection. Auth/liên kết/recovery vẫn theo GM-35/P1 trong kế hoạch chủ dự án gửi, không tự thành điều kiện bắt buộc của luồng khách.

## 10. Đề bài rà soát và đầu ra main cần tạo

Main nên thực hiện theo thứ tự dưới đây và trả ra một kế hoạch trước khi sửa runtime:

1. **Chốt baseline:** SHA main mới, các PR đang Review, migration ledger/runtime thực tế, phiên contract/client/mock; phân biệt artifact đã merge với bản đang sửa local.
2. **Đối chiếu quyết định:** áp UI-01…10 vào ADR/spec/task hiện hành. Đánh dấu hai thay đổi Dark và Places so với plan cũ; giữ lịch sử quyết định cũ rõ ràng.
3. **Lập ma trận màn–component–contract–data–task:** mỗi dòng có source hiện có, field/behavior thiếu, producer, consumer, artifact/version cần nhận và AC kiểm được.
4. **Rà contract B:** đặc biệt finalize chuyển vòng, tập tính điểm, winner/Top 3/tie/order, snapshot status, legacy result và Places adapter. Field mới phải có schema/parser/fixture tương ứng.
5. **Lập kế hoạch triển khai:** chỉ rõ file dự kiến sửa, phần độc lập làm song song, điều kiện tích hợp, migration tiến nếu cần, kiểm và bàn giao từng task. Giữ mã/owner theo Project; không thêm dependency ngược chỉ để diễn tả supplement.
6. **Chốt kế hoạch QA:** test case, nơi chạy, expected output, bằng chứng và trạng thái Not run. Không lấy Figma hoặc test mock làm bằng chứng server/Android.

Đầu ra tối thiểu của lượt main:

- Bảng **đã khớp / cần sửa / chưa xác minh** cho từng UI decision và phát hiện OBS.
- Bảng khác biệt với kế hoạch main cũ, chỉ rõ thay đổi được người dùng xác nhận.
- Kế hoạch task/PR theo artifact/version, phạm vi file, AC, test và trình tự nhận đầu vào.
- Danh sách câu hỏi còn mở về triển khai; không mở lại quyết định UI đã rõ chỉ vì contract cũ chưa có.
- Danh sách UI thực sự còn thiếu sau khi tìm trong trang 03, component và các trang tình huống; không tạo trùng màn 1/2 món, ACK/retry/lỗi đã có.

Không tự chuyển Done, đổi assignee/deadline, ghi approval, deploy/reset DB hoặc commit/push chỉ từ báo cáo này. Những hành động đó cần phạm vi giao việc riêng theo workflow dự án.

## 11. Ma trận kiểm và giới hạn hiện tại

| Kiểm | Trạng thái của báo cáo này | Điều kiện để ghi đạt ở lượt sau |
| --- | --- | --- |
| Tồn tại bục/màn 1/2/3 món | Đã đọc cấu trúc Figma | Kiểm visual và chạy đúng đường đến từng Count |
| Nhánh N=1 không đi Top 3 cố định | Phát hiện cần sửa | Chạy từ fixture N=1 đến đúng vinh danh/nền/kết quả 1 món |
| Đồng hạng | Chưa có biến thể trong các property đã đọc | Chạy `1–1–2`, `1–2–2`, `1–1–1` và ranh giới >3 món; cùng hạng cùng cao, một winner |
| Điểm/roster/ACK | Phát hiện fixture cần đồng bộ | Kiểm từ cùng cohort đã khóa, cả hai vai trò và history/inbox |
| Places trong app | Có bố cục/fixture; chưa có bằng chứng provider | Có request/response thực và Android cho success/loading/empty/error/permission; lỗi không mất result |
| 12 flow start | Đã đọc cấu trúc: 12 | Chạy từng nhánh bắt buộc; Back/Cancel/Retry đúng state, không chỉ đếm link |
| Light/Inter | Đã đọc Figma; main baseline còn màu cam | Trích token đúng, load font đúng, kiểm tương phản và UI thật |
| Dark | Hoãn trong đợt UI này | Theo kế hoạch được giao sau; không ghi đạt thay cho task khác |
| N=0/1/2–20, cap, deadline, ACK thật | Chưa kiểm API/Android trong lượt báo cáo | Runtime/HTTP/thiết bị theo task; fixture Figma không chứng minh đạt |
| 320/360/412, chữ lớn, thiếu ảnh/giá, tên dài, TalkBack | Chưa kiểm lại toàn bộ | Bằng chứng thiết kế và Android ghi riêng, không dùng browser zoom thay native font scaling |

## 12. Nguồn kỹ thuật để main kiểm lại

- [ADR-019 tại main baseline](https://github.com/ThanhTris/IE307/blob/3f77789cfa451f24967428985e8a444ec2821114/docs/architecture/decisions/ADR-019-dish-first-room-policy.md)
- [Contract dish-session-v4 / GM-07.A tại baseline](https://github.com/ThanhTris/IE307/blob/3f77789cfa451f24967428985e8a444ec2821114/docs/architecture/DISH_SESSION_API_CONTRACT.md)
- [Runtime policy v3 / migration 0026 tại baseline](https://github.com/ThanhTris/IE307/blob/3f77789cfa451f24967428985e8a444ec2821114/supabase/migrations/0026_dish_session_policy.sql)
- [Token app tại baseline](https://github.com/ThanhTris/IE307/blob/3f77789cfa451f24967428985e8a444ec2821114/mobile/src/shared/theme/tokens.ts)
- [Google Places Text Search](https://developers.google.com/maps/documentation/places/web-service/text-search): tìm địa điểm theo truy vấn và khu vực, trả dữ liệu địa điểm; không thay phần render bản đồ.
- [Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): mở Google Maps ngoài app; là hành động hỗ trợ trong UI đã chốt.

### Nội dung có thể giao cho hội thoại main

> Đọc `docs/design/UI_MAIN_RECONCILIATION_REPORT_2026-10-24.md` tại worktree FE, cùng bản kế hoạch “Đồng bộ task BE–Data–UI với Figma và bổ sung Top 3”. Kiểm lại main/Project/PR/runtime mới nhất rồi lập báo cáo chênh lệch và kế hoạch điều chỉnh theo mục 10. Ưu tiên xác nhận mới: chưa làm Dark trong đợt UI này; giữ Places + map ngay trong kết quả; bục 1/2/3 đã có và cần nối đúng; bổ sung đồng hạng; đồng bộ fixture. Giữ phân công hiện hành, ghi rõ version/artifact và Not run. Lượt này rà soát/lập kế hoạch, chưa tự sửa runtime hoặc ghi task hoàn tất.

Báo cáo được tạo ở worktree FE. Nó chưa tự xuất hiện trên nhánh main; hội thoại main có thể đọc bằng đường dẫn tuyệt đối được bàn giao hoặc nhận đúng file này khi có phạm vi đồng bộ.
