# Rà soát dự án, UI và dữ liệu — 2026-10-22

> **Đính chính mới nhất của Trí:** host chọn chính xác **10–20 món** trên màn tạo phòng, thay 8–12. Đồng hồ **60 giây chỉ bắt đầu khi người đầu tiên hoàn tất lượt chọn và vào phòng chờ kết quả của vòng đó**, không từ bắt đầu game hoặc nhận từng lựa chọn món. Các dòng 8–12/phiếu đầu tiên bên dưới là lịch sử trao đổi, được thay bởi đính chính này và ADR-019 đã cập nhật. Chưa ai vào chờ thì chưa chạy đồng hồ. UI count cần gửi/lưu qua API và tạo đúng số món; thiếu dữ liệu không tự giảm số lượng. Bổ sung scope UI GM-09/25, DTO GM-07, API GM-18/19; giữ GM-40 riêng dữ liệu.

> Đã bổ sung quyết định của Trí trong **mục 10** và [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md): phòng 20 người, pool 8–12 món, bỏ ready, 60 giây từ phiếu đầu tiên, host chốt ngay, quorum 1 phiếu và cap loại động vòng 2. Mục 1–9 giữ kết quả audit baseline; phương án cũ xung đột được thay bằng quyết định mục 10. Chưa triển khai runtime.

Trạng thái: báo cáo đề xuất để Trí review trước khi đưa vào main; không phải approval, nghiệm thu APK hoặc quyết định thay đổi schema. Không thay Status/assignee trên Project.

## 1. Kết luận

**Hướng sản phẩm và nhận diện Figma đã rõ, nhưng chưa có một bản sản phẩm thống nhất giữa thiết kế, contract và code main.** Nút thắt lớn nhất không phải thiếu thêm màn đẹp: đó là các quyết định UI mới chưa được chuyển thành thay đổi nghiệp vụ có version và đầu ra tích hợp.

- Giữ hướng “chọn món trước, tìm quán sau”, hai vòng tối đa, phiếu riêng tư và server chốt kết quả một lần.
- Giữ màu xanh–kem–sage, hai ô Tạo/Tham gia, card thao tác bằng cử chỉ, checklist vòng 2, phần Cá nhân gộp cài đặt, tutorial theo ngữ cảnh.
- Trước triển khai tiếp cần giải quyết ready, giới hạn người, gửi phiếu cuối, giới hạn loại vòng 2, Top 3/điểm và catalogue độc lập. Không chỉ ẩn control để vượt luật API cũ.
- Hoàn thành GM-40 theo đúng scope, rồi nhận contract dữ liệu mới vào consumer được giao; GM-40 không tự giải quyết thay đổi vote/score/ready/UI/Places.
- Không thể kết luận app sẵn sàng release từ số card Done. Các task tích hợp vote/result/reconnect và QA/release còn Todo; evidence thiết bị của một số task đã Done vẫn chưa đủ rõ trong hồ sơ trên main.

## 2. Phạm vi và nguồn kiểm

Mốc code: `origin/main` sau fetch, `afb1dca13b91bef30062aca018e5457908d244bc` (merge PR #128). Workspace đang ở `4a8cd64` và có sửa đổi chưa commit. Audit đọc main qua bản xuất riêng và checkout tạm; không trộn sửa đổi local thành code đã merge.

Nguồn hiện hành:

- [GitHub Project #2](https://github.com/users/ThanhTris/projects/2), đọc trực tiếp 40 item: 25 Done, 4 Review, 1 In Progress, 10 Todo. Card GM-00 là alias nghiệm thu baseline GM-01 theo ADR-014; không cộng thành hai task đã hoàn thành.
- [Main tại revision kiểm](https://github.com/ThanhTris/IE307/tree/afb1dca13b91bef30062aca018e5457908d244bc), workflow/DoD, contracts, domain, migrations, screen sources và HANDOFF/CHECKS liên quan.
- [Figma](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j): đọc các trang 01/02/03/04/05/06, nội dung màn, variables/components và một số reaction trọng yếu; xem ảnh render Home, Result, Profile. Đây là audit cấu trúc/nội dung toàn nhóm và visual mẫu, chưa phải kiểm từng pixel mọi màn hoặc thử toàn prototype bằng tay.
- [GM-40/#125](https://github.com/ThanhTris/IE307/issues/125) và [PR #129](https://github.com/ThanhTris/IE307/pull/129): chỉ dẫn chuyển dữ liệu món độc lập; PR mới là mốc A offline, chưa merge.
- PR #126/#127/#123 được đọc như đầu vào trạng thái, không phải review code toàn bộ PR hoặc nghiệm thu thay tác giả.
- `docs/data/DISH_CATALOGUE_CHANGE_PLAN.md` trong workspace là bản chưa tracked, có phân công/phạm vi dự kiến cũ. Issue #125 mới là nguồn scope GM-40 hiện hành: Vinh phụ trách, không tự thêm task UI.

Không kiểm database đang deploy, migration ledger/RPC của endpoint, Android thật, push thật hoặc Places thật trong lần này. Không suy backend đã triển khai từ Git fetch.

## 3. Task đã, đang và sẽ làm

Status dưới đây là snapshot Project, không phải trạng thái từ thư mục Markdown.

| Nhóm | Task/status | Ý nghĩa và việc kế tiếp |
| --- | --- | --- |
| Nền | GM-00 alias GM-01; GM-02..08: Done | Nền Expo, BE, field/schema, component/client và import đã có. GM-08 nghiệm thu DB test, không phải publish production. |
| Màn mẫu | GM-09..14: Done | Có code màn mock. Không đồng nghĩa tất cả màn đã khớp Figma mới hoặc nối API/native. |
| Nghiệp vụ BE | GM-15..23: Done | Có engine/auth/ACL/catalogue/phòng/phiếu/history/social/inbox. Main vẫn mang một số luật legacy đang lệch UI mới. |
| Tích hợp đầu luồng | GM-24, GM-25: Done | GM-25 đã merge #124. HANDOFF vẫn ghi Android–API, multi-client và GoTrue thật Not run; cần gắn bổ sung evidence nghiệm thu nếu đã có, không tự đổi Done hoặc bắt mở lại task. |
| Tích hợp chọn/kết quả | GM-26, GM-27: Todo — rosy179 | Ưu tiên sau chốt contract, dùng màn đã có; không dựng lại domain/room repository. |
| Social/history | GM-28: Review — TrungNQ2645 | PR #126 có adapters/routes; Android/API hai identity và consent/delete vẫn Not run theo PR. |
| Push | GM-29: Review — TrungNQ2645 | PR #127 chỉ có seam/injected driver; chưa concrete native driver/UI integration. Review không có nghĩa gần xong delivery thật. |
| QR/link/Maps | GM-30: Todo — rosy179 | UI QR đã có, cần payload/link validity, permission và mở ứng dụng thật. |
| Outbox/reconnect | GM-31: Todo — TrungNQ2645 | Cần giữ nháp/pending riêng identity và đối soát ACK/server; không giả offline nhóm. |
| Kiểm và release | GM-32,33: Todo — Vinh5905; GM-34: Todo — ThanhTris | Regression/race, Android pilot, APK/demo là các bước còn lại thực sự. |
| Tài khoản | GM-35: Todo — mtuan2491 | Figma email/Google/reset/profile đi trước implementation. Không trình bày như tính năng core hiện đã hoạt động. |
| Mở rộng | GM-36: Review — HoaiTam; GM-37: Todo — mtuan2491; GM-38: Todo — HoaiTam | OCR/AI/weather không nên chiếm ưu tiên của các khoảng trống core. |
| Cải thiện prototype | GM-39: In Progress — rosy179 | Scope HTML; không phải quyền áp dụng tự động vào mobile/backend. |
| Dữ liệu mới | GM-40: Review — Vinh5905 | P0 bổ sung. PR #129 là catalogue offline; ADR-018 Proposed và SQL/API/snapshot còn chưa triển khai. |

Snapshot ban đầu bỏ sót Deadline khi trích xuất. Đã đọc lại và bổ sung tại mục 10/JSON cùng thư mục: 35/40 card có ngày, 5 chưa đặt. Không đổi lịch hoặc assignee trên Project.

## 4. Các lệch nghiệp vụ cần sửa trước

| ID/ưu tiên | Bằng chứng | Ảnh hưởng | Hướng xử lý và tiêu chí đạt |
| --- | --- | --- | --- |
| A01 — P0 | Figma lobby `68:429` không ready; `Gm25LiveLobbyScreen.tsx`, contract `RoomMember.ready`, GM-19/25 vẫn có ready/reset | Làm theo Figma đơn thuần có thể khiến host không start được | Giữ yêu cầu UI bỏ ready của chủ dự án; viết supplement xác định điều kiện khóa roster/start và khi context đổi. Sửa server/client cùng đợt; test hai client và race join/start. Không tự set ready ngầm để che lỗi. |
| A02 — P0 | Figma `80:608` thể hiện 12 người; SQL `0019_room_lifecycle.sql` có `active_count>=8` trả ROOM_FULL | UI hứa cho nhóm lớn nhưng API từ chối | Đối chiếu mọi implementation mới nhất của join/constraint và chốt giới hạn vận hành phù hợp yêu cầu không giới hạn 8. Không chỉ bỏ nhãn 3/8; vẫn cần kiểm tải, cuộn và lỗi nếu có giới hạn thực tế. |
| A03 — P0 | Figma card `94:558` chỉ Undo; `VoteScreen.tsx` hiện danh sách card và nút Gửi phiếu riêng, nhắc UNSET | Thiết kế và hành vi nộp phiếu khác nhau | Giữ hướng card cuối xong thì chờ của chủ dự án; đặc tả thao tác cuối tạo submission một lần, pending/ACK/error/retry và thời điểm khóa Undo. Chỉ ghi “Đã gửi” sau server ACK; retry giữ requestId. Không thêm màn xem lại. |
| A04 — P0 | Figma `130:965` loại tối đa 3; `FinalRoundScreen.tsx` cho loại tất cả và nói hợp lệ | Hai phiên bản luật vòng 2 | Chốt cap phía server, UI lấy giới hạn từ contract; test 0/1/3/4 và pool nhỏ. GM-40 không có quyền đổi cap. Không sửa frontend đơn lẻ rồi gọi là hoàn tất. |
| A05 — P0 | Figma `114:753` Top 3/điểm; `RoomResult` chỉ winner/tier/reason, không rankings/score; domain README cấm public diagnostics/score/count | Chưa có dữ liệu hợp đồng để dựng bục và có xung đột privacy hiện hành | Giữ yêu cầu bục nhưng cần quyết định rõ dữ liệu tổng hợp nào được công bố, lúc nào, với nhóm ít người. Không đưa phiếu thô/matrix ra client để tự tính. Nếu được chốt: server persist projection được phép; định nghĩa đồng điểm, <3 món, NO/REMOVE, replay và lịch sử. |
| A06 — P0 | Figma chỉ món; main ContextDraftFields vẫn chọn bán kính/service mode, PreviewFoodPoolRequest yêu cầu anchor/radius | Luồng mới vẫn bị phụ thuộc quán/coverage | GM-40 mốc B cung cấp profile/adapter/snapshot tương thích trước kích hoạt. Consumer nhận version mới trong scope riêng; giữ phiên cũ đọc được. Không xóa toàn bộ dữ liệu quán hoặc bypass guard legacy. |
| A07 — P1 | Domain có NO_CONSENSUS/EMPTY_INTERSECTION ngay vòng 1; Figma terminal `226:1286` cố định “KẾT THÚC VÒNG 2” | Nhánh rỗng vòng 1 dễ bị hiển thị sai hoặc cố mở vòng 2 | Dùng variant terminal theo round/reason từ server. Chỉ hiển thị chuyển vòng 2 khi server thực sự trả vòng 2; không suy từ “chưa Perfect”. |

Đây là chênh lệch cần hòa giải, không phải lý do phủ nhận nghiệm thu task theo scope cũ. Chỉ dẫn UI trong hội thoại là thiết kế đích; code/spec legacy là thực trạng cần chuyển đổi có kiểm soát.

## 5. UI đã tốt và phần chưa phát huy

### Nên giữ

- Home phân cấp rõ, Create/Join hai ô cùng hàng; tông xanh–kem tạo nhận diện riêng. Nav làm rõ active bằng cả icon và chữ, không tô riêng nền icon.
- Form chọn buổi/giờ/ngân sách tương đối ngắn; lịch ngày và cuộn giờ/phút đã tách.
- Có khá nhiều tình huống: giờ quá khứ, tạo thất bại, offline, QR/camera bị từ chối, phòng hết hạn/hủy, host/member, cập nhật context, xác nhận rời phòng. Không cần vẽ lại các trạng thái này từ đầu.
- Profile gộp settings, phân khách/đăng nhập; history đã có thành công/chưa chốt và thành viên; thông báo dùng component chung.
- Tutorial ngắn theo thời điểm và thẻ mẫu không tính phiếu là hướng tốt hơn ép người dùng đi hết 13 màn.

### Cải thiện cụ thể

| ID | Hiện trạng kiểm được | Thay đổi đề xuất |
| --- | --- | --- |
| U01 | Main tokens còn primary `#FF5A36`; Figma brand/leaf `#46C34F`, cream `#FFFCF3`, sage `#B9CB9B`, ink `#043B22` | Có một bảng mapping Figma variable → code token, gồm pressed/disabled/error/dark. Không dùng sửa local chưa merge làm bằng chứng main đã xanh. |
| U02 | Trắng trên `#46C34F` chỉ khoảng **2,29:1**; trắng trên màu đề xuất cũ `#57D061` khoảng **1,98:1** | Giữ xanh sáng cho nhận diện; thử một token nền CTA đậm hơn nếu muốn chữ trắng. Duyệt bằng ảnh và đo lại. WCAG AA dùng 4,5:1 cho chữ thường, 3:1 cho chữ lớn; hiện chưa đạt cả ngưỡng chữ lớn. |
| U03 | Home screenshot chỉ lộ một phần card bạn bè; vùng nội dung 679px có cuộn VERTICAL, nav bắt đầu y779 | Không gọi đây là dữ liệu bị mất: nội dung có thể cuộn. Tuy nhiên nên giảm khoảng dọc/hero ở màn ngắn, để hành động bạn bè dễ thấy; kiểm 320/360px và font lớn. |
| U04 | Top 3 rõ thứ hạng nhưng tên dài đã xuống dòng; map chỉ là minh họa “Quán phở A / 0,6 km” | Quy định tên 2 dòng, ảnh fallback, 1–2 món, đồng điểm. Places có loading/empty/error/không quyền vị trí riêng; không mất món thắng vì không tìm được quán. Không coi map minh họa là Places đã tích hợp. |
| U05 | Profile khách `232:349` chỉ có đăng nhập/đăng ký; nút hỗ trợ chọn món nằm ở profile đã đăng nhập | Bổ sung cài đặt hỗ trợ thao tác cho cả khách hoặc entry ngay ở card Help. Khi TalkBack bật cần nút thay thế; không buộc đăng nhập để dùng trợ năng. |
| U06 | Figma có menu chủ đề/cỡ chữ nhưng brand token chỉ thấy một mode màu | Cần dark variants thực tế và thử font scaling/keyboard/safe area. Menu “Tối” không chứng minh các màn tối đã thiết kế. Không giả các mức Nhỏ/Vừa/Lớn thay được font scaling hệ thống. |
| U07 | History `261:1773` có 3 avatar B/L/N nhưng tên “Bạn · Linh”; `232:226` nói “Các bữa ăn đã chốt” dù có tab Chưa chốt | Sửa roster từ cùng data source; đổi mô tả hoặc bỏ câu thừa. Áp dụng cùng component cho cả kết quả có/không winner. |
| U08 | Chữ “Tránh món đã ăn trong 3 bữa” mạnh hơn hành vi giảm ưu tiên trong code; giá card ghi /phần trong khi form /người | Dùng “Ưu tiên món khác 3 bữa gần đây” nếu luật vẫn là mềm; chốt khi consent off/không history. Giá phải theo unit thật; không tự đổi món nhóm/kg/thực đơn thành giá/người. |
| U09 | Một số màn auth/notification/create/preferences chưa có reaction; card có phím mũi tên trên root | Hoàn thiện prototype mobile theo hotspot/gesture hoặc đường mô phỏng được ghi rõ. Kiểm root và descendant; không dùng chỉ số child reaction để kết luận màn không có tương tác. |
| U10 | Tutorial `309:2486` kế thừa ON_KEY_DOWN trỏ sang `99:626/746/864` (màn thật), không trỏ sang các bước practice tiếp theo | Bỏ liên kết kế thừa, nối tutorial thành luồng độc lập, Skip/đóng đúng chỗ. Component tay mới chỉ là hình vector, chưa chứng minh animation hoặc nhận cử chỉ thật. |
| U11 | Profile đã có settings nhưng bản đọc không thấy entry “Xem lại hướng dẫn” | Thêm entry gọn, đặt trạng thái shown/skipped/version riêng; không chặn quay lại nếu người dùng bỏ qua lần đầu. |

Tham chiếu ngưỡng đọc chữ: [W3C WCAG 2.2 — Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Tỷ lệ trên tính từ token solid, không đo từ pixel anti-alias của ảnh; đây không phải chứng nhận accessibility toàn app.

### Các trạng thái nên bổ sung/đối chiếu trước pilot

Ưu tiên dùng variant/component hiện có, không tạo một màn riêng cho mọi lỗi:

1. Phiếu cuối: đang gửi, timeout chưa rõ ACK, retry, ACK đã nhận, phiên đã chuyển vòng trong lúc reconnect; Undo disabled có lý do ở thời điểm không thể sửa.
2. Đang chờ: người khác chưa gửi, phiên hết hạn, lỗi tải snapshot; không tự coi người rời/mất mạng là OK. Tránh lặp vô hạn chỉ có spinner.
3. Kết quả: EMPTY_INTERSECTION vòng 1; ALL_REMOVED vòng 2; lỗi đọc kết quả khác với không đồng thuận; chỉ 1–2 ứng viên nếu contract Top 3 được chốt.
4. Places trong màn kết quả: từ chối vị trí, chưa có vị trí, không tìm thấy quán, provider lỗi/hết quota, dữ liệu cũ. Kết quả món giữ nguyên. Không thêm màn chọn bán kính vào core đã chốt.
5. Auth khi triển khai GM-35: đang gửi/sai thông tin/email tồn tại/link hết hạn/Google hủy, bàn phím và điều hướng back. Đây là scope sau, không kéo toàn bộ vào core guest.
6. Social/history: lỗi mạng, danh sách rỗng, lời mời đã xử lý ở thiết bị khác, consent off, xóa thất bại; đối chiếu GM-28 trước vẽ thêm trùng.

## 6. Dữ liệu: cái đã có, cái chưa có và việc nên làm

### Phân biệt ba tập dữ liệu

| Tập | Bằng chứng | Cách sử dụng đúng |
| --- | --- | --- |
| Editorial draft | 39 món, 18 taxonomy, 27 sources trong catalogue legacy | Nguồn biên tập có ID; không tự gọi published hoặc cộng thêm 18 món của bundle GM-08. |
| GM-08 DB test | Handoff: 21 venues, 18 dishes, 190 offerings, 154 venue schedules, 0 coverage/anchor; dataset 0.4.1 | Đã được nghiệm thu theo ADR-014 cho DB test. Không mở lại task vì thiếu production publish; không giả coverage thật. |
| GM-40 mốc A | PR #129: giữ 39 ID; 219 mapping (216 mapped, 2 needs_review, 1 excluded), 247 quan sát giá, 123 field evidence | Profile offline độc lập với quán; chưa chứng minh SQL import/query/API/runtime. Số này lấy từ PR, chưa chạy kiểm branch PR trong audit này. |

`supabase/seed/verified/manifest.json` trên main vẫn chưa publication và hash/version verified chưa có. Điều này không phủ nhận GM-08 Done, nhưng cần ghi đúng giới hạn khi demo và khi chọn nguồn production.

### Đề xuất cải thiện theo thứ tự

1. **Ổn định catalogue contract trước tăng số món.** Giữ dishId/alias/variant rõ nghĩa, category/cuisine/meal slot theo dictionary. UI lấy options từ taxonomy được bàn giao, không hardcode nhãn Hàn/Nhật/Âu rồi tự suy dataset có đủ đại diện.
2. **Giá có đơn vị và provenance.** Giữ quan sát nguồn/ngày/currency/unit; không lấy min–max mọi quan sát khác đơn vị làm một khoảng. Null hiển thị “Chưa có giá tham khảo”, không 0đ. Ngân sách mềm/unknown cần thống nhất với luật pool.
3. **Ảnh là đầu ra riêng có quyền dùng.** Artwork null là hợp lệ; dùng illustration/fallback đẹp, alt text và tỷ lệ ảnh thống nhất. Ảnh món trên Figma không chứng minh dataset có license. Không lấy ảnh tìm kiếm rồi gắn mặc định vào seed.
4. **Snapshot bất biến.** Phiên đã mở giữ nội dung/ID/version; đổi catalogue không thay món/điểm/kết quả/history cũ. Kiểm migration tiến, reimport cùng hash, rollback, old/new room và ACL trước kích hoạt GM-40.
5. **Tách Places khỏi quyết định.** Chỉ dùng sau winner theo yêu cầu; query theo tên/alias món được chuẩn hóa. Nơi gần không có nghĩa chắc chắn đang bán đúng món/còn chỗ. Provider lỗi không đổi winner. Chính sách cache/attribution/billing cần kiểm tài liệu Google khi làm adapter; audit này chưa xác minh tích hợp đó.
6. **Kiểm coverage nội dung, không quota giả.** Lập ma trận món theo buổi/category/cuisine, tỷ lệ unknown/thiếu ảnh/giá, alias pending và tình huống pool ít món. Không tự gán nhãn từ tên hoặc bịa dữ liệu để lấp filter.
7. **Tách riêng tư khỏi trình bày hấp dẫn.** Nếu mở điểm tổng hợp/Top 3 cần review privacy cho nhóm ít người và history; không tái dùng evaluator diagnostics làm response công khai.

## 7. Thứ tự triển khai đề xuất

Đây là thứ tự công việc, không tạo task mới, đổi assignee hay thêm dependency ngược.

| Đợt | Việc và task liên quan | Đầu ra kiểm được |
| --- | --- | --- |
| 1 | Trí chốt bản reconciliation A01..A07; phối hợp owner GM-19/20/26/27 và GM-40 | Supplement/ADR nhỏ ghi quyết định, contract version, phần legacy giữ lại, test cases. Không áp dụng trọn plan local cũ. |
| 2 | Review GM-40 mốc A, chốt ADR-018 rồi làm mốc B theo issue | Import/query/HTTP/old-new snapshot thật; không chấp nhận chỉ JSON validator. |
| 3 | UI refinement trong scope được giao; GM-05 mapping token/components, GM-39 prototype | Ảnh Figma/code cùng fixture, CTA contrast, mobile dimensions, tutorial đúng links. Mobile chỉ đổi khi được giao scope, không lấy GM-39 làm quyền sửa app. |
| 4 | GM-26/27 nối vote/result; GM-28 hoàn thiện review; GM-30/31 native/reconnect | Một hành trình guest → room → chọn → ACK → kết quả/no-consensus → lịch sử đúng consent, trên Android + client thứ hai. |
| 5 | GM-29 driver/push và GM-32/33 QA, GM-34 release | Cold/warm open, logout/token rotation, race/retry, TalkBack/font lớn/dark, APK có evidence. |
| Sau core | GM-35 và P2 GM-36..38 | Không làm đăng nhập/AI/OCR trở thành điều kiện cho chọn món guest. |

Không nối Figma theo tất cả phương án cùng lúc: mỗi nhóm một hàng, chọn một màn canonical, biến thể theo thứ tự loading → success → empty/error. Page 03 giữ luồng dùng để demo; các page tình huống là reference được link rõ, tránh copy lệch nhiều bản.

## 8. Kiểm chứng thực hiện trong audit

| Kiểm | Kết quả |
| --- | --- |
| Fetch main, Project live và PR inventory | Đã đọc; main `afb1dca`, 40 cards. Không đổi trạng thái. |
| `validate_repository.py` trên export main sạch | Pass; chỉ documents/links/JSON/manifest, không runtime. |
| `task_readiness.py --check-docs` | Pass; không phải live start/merge gate cho task triển khai. |
| `validate_field_contracts.py --cases` | 166/166 Pass, fixtureOnly. |
| `build_field_contracts.py --check` | consistent=true, drift=[]; không ghi file. |
| Domain Node tests | 169/169 Pass, 0 skipped; không thay SQL/HTTP parity. |
| Python regression export main | 550 tests; 1 failure do bản archive không có `.git`, 6 skipped. Kiểm lại toàn bộ `test_task_readiness.py` trong checkout Git cùng revision: **33/33 Pass**, bao gồm ca đã lỗi. Không gọi toàn bộ regression là 550 Pass vì còn 6 skipped trong lần chạy đầy đủ. |
| Mobile typecheck/Jest/bundle mới | Chưa chạy trong audit; các số 705 mobile/550 Python trong HANDOFF GM-13 là evidence upstream, không kết quả mới ở đây. |
| Android/API live/DB deployed/Places/push | Not run. |
| Figma | Đọc nội dung/variables/reactions và 3 screenshot mẫu; chưa test toàn bộ prototype bằng thao tác. |
| Validator workspace sau thêm báo cáo / `git diff --check` | Pass. Không sửa các file mobile đang dở. |

## 9. Đưa báo cáo vào main

File này là artifact docs mới, có thể review/commit riêng mà không gom sửa đổi mobile đang dở trong workspace. Trước merge: kiểm diff chỉ scope báo cáo, link/validator; refresh Project nếu thời điểm quyết định đã thay đổi. Không đổi Done/approval để khớp tài liệu.

Sau Trí chốt hướng, cập nhật spec/ADR/contract và brief liên quan theo từng quyết định; giao lại scope cho owner hiện hành. Các đề xuất trong báo cáo chưa tự trở thành luật runtime. Không commit/push hoặc sửa Figma trong lần audit này.

## 10. Bổ sung theo quyết định Trí ngày 2026-10-22

**Phụ lục này ưu tiên hơn đề xuất chưa chốt ở các mục 1–9.** [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md) ghi nguồn xác nhận trực tiếp, phạm vi đã chốt, phương án chưa chọn và bản đồ task/owner/artifact/test. Đây là cập nhật yêu cầu, chưa phải code đã triển khai.

### Quyết định đã chốt và phần còn mở

- A01: bỏ ready; vào phòng được tham gia ngay, host chỉ bấm bắt đầu cả nhóm, không duyệt từng người.
- A02: tối đa **20 người**, thay phương án 12 người minh họa trên Figma.
- A04: N là số món thực sự ở vòng 2; mỗi người được loại tối đa **min(3, floor((N-1)/2))**. N=1 bỏ bước loại; N=0 không mở vòng. Giữ Chưa đồng thuận: giới hạn từng người không bảo đảm tổng nhóm luôn còn món.
- A08 — bổ sung P0: pool khởi đầu bắt buộc **8–12 món khác nhau**. Main vẫn có cap 8 tại mobile/src/data/discovery/index.ts và migrations 0018/0023; kiểm đồng bộ DTO/domain/SQL/fixtures/UI. 0–7 món chặn bắt đầu, 8/12 hợp lệ, >12 lấy tối đa 12 theo policy; không bịa/lặp món hoặc tự bỏ lọc. Vòng 2 được ít hơn 8 món.
- A09 — bổ sung P0: mỗi vòng chờ **60 giây từ phiếu hoàn chỉnh đầu tiên server nhận**, host có **Chốt ngay**. Trí chọn tối thiểu **1 phiếu hợp lệ**, chỉ tính phiếu đã gửi đủ, người chưa gửi là Không tham gia vòng này, không phải OK. UI hiện đã gửi/tổng. Contract phải chỉ rõ scheduler server, thời hạn, quorum, late submit/retry và race finalize.
- A06: bỏ vị trí/quán khỏi điều kiện chọn món; Places sau winner. GM-40 không tự hoàn thiện public create_room/RoomContext vốn được ADR-018 giữ nguyên; nhóm GM-18/19/24/25 nhận phần đó.
- A03/A05: auto-submit thẻ cuối và public Top3/điểm chưa được phản hồi này chốt. Giữ rõ Pending, không suy approval từ Figma.
- Trí làm rõ: người khôi phục mạng tham gia vòng 2 nếu server còn nhận phiếu; nếu đã có kết quả thì xem kết quả đó, không mở lại vòng/gửi bù/khôi phục món bị loại. 60 giây là thời gian chờ kết quả mỗi vòng từ phiếu đầu tiên, người chưa gửi vẫn được chọn trong thời hạn chung. Còn mở: thời gian chờ ban đầu khi chưa ai gửi, auto-submit/Undo và privacy/score. Kế hoạch implementation cuối và task mới/sửa task được chốt sau, không đổi graph vội.

Ví dụ cap: N=2 → 0; N=3–4 → 1; N=5–6 → 2; N>=7 → 3. N=4 không còn chuyện một người loại 3 ép món duy nhất. Tuy vậy nhiều người loại các món khác nhau vẫn có thể làm rỗng tập; không tự chọn món bị NO/REMOVE để đảm bảo có kết quả.

### PR/data và nghiệm thu

PR129 tại head `58890c274ebf5c67f370d946421f303762921141` còn hai lỗi validator đã tái hiện, [comment cụ thể](https://github.com/ThanhTris/IE307/pull/129#issuecomment-6321616549): nhận code taxonomy ngoài registry và nhận trùng price observation cùng natural key khi đổi UUID. Không yêu cầu bổ sung quán/lịch/coverage hoặc lấp trường nullable. Test của lần review PR là evidence riêng, không nhập thành kết quả audit main.

Trí yêu cầu kiểm điện thoại theo đợt sau khi các PR đang xử lý hoàn tất và merge; trước đó đã xác nhận trì hoãn kiểm PR126–128. Các ca vẫn **Not run — owner deferred until merged batch**; khi chạy ghi SHA sau merge và phiên bản backend/dataset. Việc trì hoãn không là test Pass, miễn code defect hoặc nghiệm thu APK.

Lệnh domain của audit trước: `node --test mobile/tests/decision.test.mjs mobile/tests/decisionSeeded.test.mjs` = 169 tests. Lần đối chiếu bổ sung thêm `mobile/tests/eligibility.test.mjs` = 237 tests; domain/files test không khác main trong checkout review. Hai số khác phạm vi; không thay Android/API/SQL runtime.

### Snapshot và bằng chứng còn thiếu

Project đọc lại lúc **2026-10-22T12:45:32+07:00**, 40 cards; vẫn 25 Done / 4 Review / 1 In Progress / 10 Todo. JSON cùng thư mục đã có Deadline: **35 có ngày, 5 chưa đặt**. Không biến null thành quá hạn, không sửa Deadline. Ref main đối chiếu `afb1dca13b91bef30062aca018e5457908d244bc`.

Figma: [Lobby 68:429](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=68-429), [nhóm 80:608](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=80-608), [vote 94:558](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=94-558), [vòng 2 130:965](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=130-965), [Top3 114:753](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=114-753). Đây là link node hiện hành, không phải snapshot version bất biến. Chưa có file ảnh/log gốc đầy đủ để tái lập mọi nhận xét cũ; không tự ghi đã bổ sung screenshot hoặc đã chạy lại Figma. Lần cập nhật này là docs, không runtime.

| Task | Owner hiện hành | Status | Deadline hiện có |
| --- | --- | --- | --- |
| GM-40 | Vinh5905 | Review | Chưa đặt |
| GM-13 | mtuan2491 | Done | 2026-10-26 |
| GM-28 | TrungNQ2645 | Review | 2026-10-30 |
| GM-29 | TrungNQ2645 | Review | 2026-11-03 |
| GM-25 | rosy179 | Done | 2026-10-29 |
| GM-36 | HoaiTam | Review | 2026-11-08 |
| GM-24 | rosy179 | Done | 2026-10-23 |
| GM-14 | TrungNQ2645 | Done | 2026-10-22 |
| GM-11 | TrungNQ2645 | Done | 2026-10-20 |
| GM-10 | mtuan2491 | Done | 2026-10-22 |
| GM-23 | ThanhTris | Done | 2026-10-29 |
| GM-09 | mtuan2491 | Done | 2026-10-20 |
| GM-22 | ThanhTris | Done | 2026-10-27 |
| GM-19 | ThanhTris | Done | 2026-10-23 |
| GM-20 | Vinh5905 | Done | 2026-10-26 |
| GM-18 | HoaiTam | Done | 2026-10-21 |
| GM-21 | HoaiTam | Done | 2026-10-28 |
| GM-17 | ThanhTris | Done | 2026-10-20 |
| GM-16 | ThanhTris | Done | 2026-10-19 |
| GM-05 | TrungNQ2645 | Done | 2026-10-16 |
| GM-08 | HoaiTam | Done | 2026-10-19 |
| GM-07 | rosy179 | Done | 2026-10-16 |
| GM-06 | HoaiTam | Done | 2026-10-15 |
| GM-04 | Vinh5905 | Done | 2026-10-13 |
| GM-15 | Vinh5905 | Done | 2026-10-20 |
| GM-00 | ThanhTris | Done | Chưa đặt |
| GM-02 | ThanhTris | Done | Chưa đặt |
| GM-03 | ThanhTris | Done | Chưa đặt |
| GM-12 | rosy179 | Done | 2026-10-20 |
| GM-26 | rosy179 | Todo | 2026-10-30 |
| GM-27 | rosy179 | Todo | 2026-11-02 |
| GM-30 | rosy179 | Todo | 2026-11-04 |
| GM-31 | TrungNQ2645 | Todo | 2026-11-02 |
| GM-32 | Vinh5905 | Todo | 2026-11-03 |
| GM-33 | Vinh5905 | Todo | 2026-11-05 |
| GM-34 | ThanhTris | Todo | 2026-11-06 |
| GM-35 | mtuan2491 | Todo | 2026-11-08 |
| GM-37 | mtuan2491 | Todo | 2026-11-08 |
| GM-38 | HoaiTam | Todo | 2026-11-08 |
| GM-39 | rosy179 | In Progress | Chưa đặt |

Ma trận chi tiết producer/consumer, files/contracts, thứ tự làm và test nằm ở mục 3–4 ADR-019. Các owner là ảnh chụp phân công hiện tại, không phải đã nhận thêm scope. Khi chốt plan cuối mới ước lượng lại lịch và cập nhật Project; không xóa lịch sử Done.

Kiểm cập nhật tài liệu lần này: validator tại workspace chính và worktree 6524 Pass; task indexes tại workspace chính khớp; git diff --check Pass. Regression workspace chính (HEAD 4a8cd64 + các sửa local đang có): `python -m unittest discover -s tests -p "test_*.py"` chạy **553 tests, OK, skipped=6** trong 76,215 giây. Đây không phải chạy main afb1dca hoặc chứng minh luật mới đã hoạt động. Comment bổ sung phạm vi đã đăng và đọc lại: [PR129 follow-up](https://github.com/ThanhTris/IE307/pull/129#issuecomment-6335584774). Chưa sửa app/SQL, commit/push hoặc đổi Project trong lần cập nhật này.
