# Phạm vi hiện hành: BE và Data — 2026-10-25

> Cập nhật sau final handoff UI ngày 2026-10-25: Trí đã giao task UI theo Figma tại [kế hoạch mới](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md). Phần BE/Data và phân công producer trong tài liệu này giữ nguyên. Các đoạn tạm hoãn/thu hồi FE bên dưới ghi lại phạm vi của đợt BE/Data trước, không tiếp tục cấm task UI mới đã được giao.


Trí đã xác nhận Figma hoàn tất và chuyển sang đồng bộ BE/Data theo UI hiện hành. Các đoạn dưới đây về hoãn/thu hồi FE là lịch sử của đợt trước khi Figma chốt, không còn là lệnh cấm UI task mới hoặc căn cứ chờ thiết kế. Dùng [handoff UI–BE–Data hiện hành](UI_BE_DATA_SYNC_HANDOFF_2026-10-25.md) cho mapping và blocker; scope này tiếp tục quy định ownership của producer BE/Data và không giao sửa app/runtime trong lượt tài liệu.

## Trạng thái code và trạng thái Project

Theo [audit tại main97f5dac](UI_BE_DATA_SYNC_AUDIT_2026-10-25.md), runtime source mới nhất là v3/schema0.8.0 (0026); contract B/v4 là đề xuất, chưa deploy. Cap cũ và nhánh một survivor tự chốt vẫn còn trong v3, result chưa có Top 3. History vẫn winner-only/nhóm tối đa8 và chưa nối result dish-only/no-consensus. Không coi các quyết định mới đã thành code chỉ vì có ADR hoặc task baseline đã nghiệm thu.

Task BE/Data baseline đã nghiệm thu còn cần bổ sung dùng cột Status **Needs Update** trên Project; giữ evidence cũ. Không để Done kèm cờ Follow-up thay cột Status. Task chưa làm giữ Todo/In Progress/Review phù hợp; task FE đã merge giữ Done trong đợt hoãn FE. Agent không tự ghi nghiệm thu hoặc đổi status ngoài yêu cầu Trí.

## Luật và dữ liệu bàn giao hiện hành

- Host chọn chính xác 10–20 món unique; tối đa 20 thành viên, host bấm start, không ready/duyệt từng người. Pool độc lập quán/offering/coverage/giờ bán/GPS. Thiếu món trả available/requested; không tự giảm hoặc bù món.
- R1 kiểm winner trước. Nếu chưa winner, survivors là pool khóa trừ hợp NO của mọi ballot R1 hoàn chỉnh đã ACK. N=0 kết thúc R1 EMPTY_INTERSECTION; N>=1 luôn mở R2 thật, kể cả một món.
- R2 cap=max(1,floor(0.30*N)) với N khóa từ đầu R2. Người dùng có thể REMOVE hoặc không; không bắt phải loại. N=1 vẫn loại món duy nhất được; không auto-finalize/sinh KEEP. Loại hết trả ALL_REMOVED; không bù món/R3.
- Timer 60s bắt đầu khi người đầu tiên hoàn tất lượt, nhận ACK và vào waiting hợp lệ. Người khác còn gửi được tới deadline; không waiting thì chưa chạy timer. Host chỉ kết thúc chờ sớm khi quá nửa roster khóa đã ACK ballot của vòng hiện tại; server quyết định kết quả, timeout giữ quorum tối thiểu 1; BE/worker xử lý khi client tắt.
- Score=2*WANT+OK trên ballot R1 thực sự được tính, R2 chỉ loại. Top3 từ toàn eligible set sau veto, tối đa3, dense shared ranks, luôn có winner, cutoff/subset/order lưu cố định. NO_CONSENSUS có winner=null và Top3 rỗng. Aggregate chỉ sau terminal, không raw ballots/contributions/seed.
- History summary/detail đọc cùng projection đã lưu: result/version, status/reason/round, winner nullable, score/rank versions, Top3/locked card và cohort R1. Participants theo consent/ACL; phân biệt intended meal time và finalizedAt. Giữ dữ liệu qua operational cleanup đúng retention, không dựng lại bản đã xóa; legacy không backfill điểm/Top3 giả.
- Catalogue test_demo hiện 39 món là baseline kiểm thử, không quota production. Bổ sung taxonomy ID/code/label/version, temp/flavor unknown, nullable ảnh có quyền và chọn price observation mới nhất theo `observedAt`; amount/currency/unit/source có thể null, amount null hoặc timestamp trùng thì giá unknown, không fallback cũ hay đổi menu-item thành giá/người. Báo coverage thật, không đoán nhãn hoặc nới guard importer để đủ pool.

## Chi tiết owner phải chốt trước tích hợp

GM-07 đề xuất và Trí review transport opt-in B, concurrency/waiting/expiry và DTO history/cohort. Preference mặc định được lưu theo tài khoản, snapshot theo từng phòng, lựa chọn thô chỉ người đó xem; ranking là chức năng nâng cao, không chặn luồng chính, và nếu có thì mọi thành viên ngang trọng số. GM-18 cùng GM-40 phân biệt meal eligibility và selection price observation. Giá chọn theo timestamp mới nhất; field khác nullable, amount null hoặc timestamp trùng thì unknown. GM-17/21 chốt participant identity/time projection theo consent. Có thể làm phần độc lập trước; chưa được tuyên bố mọi consumer đủ đầu vào tích hợp khi artifact/version/privacy chưa được review.

Các AC/ca kiểm cụ thể được đồng bộ trong task GM-03/06/07/15/17..23/32/40 và [handoff hiện hành](UI_BE_DATA_SYNC_HANDOFF_2026-10-25.md). Phần bổ sung là yêu cầu owner triển khai tiếp; đợt đồng bộ hồ sơ này không sửa runtime v3, mobile, schema B hoặc migration đã merge. Trí đã chọn Google Places gọi trực tiếp từ app cho màn kết quả; GM-30 sở hữu adapter/permission/config/native evidence, không tạo backend proxy. Quán/vị trí không quay lại điều kiện pool.

## Phân công phần bổ sung

Giữ người phụ trách theo Project #2. Trí review tất cả task. Các mục sau là phần bổ sung cần thực hiện, không là xác nhận hoàn thành.

| Owner | Task | Đầu ra BE/Data cần bàn giao |
| --- | --- | --- |
| Trang | GM-07 | Contract B có version, request/response/error schema, DTO/guards và ví dụ wire cho phòng, pool, ACK/waiting/finalize, Top 3, history/event. Xác định consumer boundary cho Google Places direct app theo GM-30; không tự chọn vendor-specific API details ngoài phần Trí đã chốt. |
| Vinh | GM-40 | Catalogue độc lập quán: ID/version/hash ổn định, taxonomy/nhãn, ảnh và giá nullable kèm đơn vị/nguồn, độ phủ đủ điều kiện và import/readback thật. Làm trước phần engine cần projection món. |
| Tâm | GM-06 | Migration tiến và schema/projection lưu kết quả ổn định; bảo toàn phiên cũ, ledger, kế hoạch upgrade/backup và handoff hash/version. |
| Tâm | GM-18 | Pool độc lập quán/vị trí, exact count 10–20, ưu tiên mềm, shortage rõ và không tự nới lọc. |
| Tâm | GM-21 | Lịch sử DECIDED/NO_CONSENSUS đọc cùng kết quả đã lưu, Top 3/điểm theo consent/ACL/retention. |
| Vinh | GM-15 / GM-20 | Parity domain–SQL: R1 winner trước; survivors sau NO; R2 thật với N>=1 và cap30%; ACK/retry/waiting/chốt; lưu winner và Top 3 trong cùng transaction. |
| Trí | GM-17 / GM-19 | Quyền đọc aggregate sau chốt; giữ kín ballots; lifecycle/snapshot, host start, 20 người, lobby edits/version, admission và reconnect theo trạng thái server. |
| Trí | GM-22 / GM-23 | Friends/invite theo admission mới; event/inbox tham chiếu kết quả canonical, không public phiếu hay tự tính lại kết quả. |
| Trí | GM-03 | Runner/runbook QA có Auth+REST cùng origin và worker; kiểm contract/schema/migration/catalogue version/hash, cleanup đúng tài nguyên QA; bàn giao cấu hình cho consumer sau này. |
| Vinh | GM-32 | Regression API/Data/security/race bằng request thật theo artifact producer; ghi expected/actual/assertion và version. |

GM-04/08 và nghiệm thu baseline giữ để truy vết. P1/P2 tiếp tục làm sau theo ưu tiên đã chốt. Không thêm task hoặc chia lại người phụ trách chỉ vì đổi phạm vi đợt này.

## Thứ tự bàn giao

1. Trang chốt contract B/schema/DTO và Vinh chuẩn bị catalogue/projection song song; chốt shape/version trước khi tích hợp.
2. Tâm chuẩn bị migration/storage và pool; Vinh làm engine/finalize theo projection; Trí làm lifecycle/ACL và runner QA. Phần độc lập được làm song song.
3. History, social và event nhận đúng terminal DTO/ID/projection và quyền đã bàn giao; không suy nội dung từ mock hoặc catalogue hiện tại.
4. GM-32 kiểm trên các producer đã merge/triển khai đúng version. UI dùng mock hoặc producer thật theo scope từng task; không lấy UI/API mock làm bằng chứng BE đã đạt.

Đây là gate theo artifact/PR/version, không thêm dependency số lớn vào task số nhỏ. Giữ policy/contract đã pin của phiên v2/v3. N=0 sau R1 kết thúc EMPTY_INTERSECTION; N>=1 mở R2 thật, kể cả một món; cap=max(1,floor(.30*N)); REMOVE hết thành ALL_REMOVED; Top 3 theo ADR-020.

## Thu hồi phần giao FE của đợt này

Thu hồi block supplement `followup-figma-be-data-20261024` / `figma-be-data-followup-20261024-vB` đã thêm vào GM-02/05/09..14/24..31/33/34/39 và bỏ cờ Follow-up của đợt này trên card FE. Giữ các nhiệm vụ, yêu cầu, evidence và PR trước supplement. Không hủy PR đang làm, đổi Status/assignee/Deadline, sửa app hay cài font/package.

Màu/font/components, các màn và mobile integration, Places/map trong app, Android và release sau đợt FE sẽ do Trí giao lại khi Figma chốt. Mô tả UI trong báo cáo giữ làm tham chiếu; không dùng để bắt đầu FE hoặc coi là nghiệm thu thiết kế. Backend vẫn chuẩn bị dữ liệu/hành vi cần thiết cho các màn, độc lập với layout cuối.
