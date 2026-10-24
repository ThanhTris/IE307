# Phạm vi hiện hành: BE và Data — 2026-10-25

Trí làm rõ: báo cáo UI/Figma chỉ cung cấp ngữ cảnh để BE và Data chuẩn bị đầu ra phù hợp. FE giữ nguyên phần việc trước đợt supplement Figma/contract B. Trí sẽ chốt Figma rồi giao kế hoạch làm lại FE riêng. Phạm vi này ưu tiên hơn các dòng giao FE trong matrix/review plan ngày 2026-10-24.

## Phân công phần bổ sung

Giữ người phụ trách theo Project #2. Trí review tất cả task. Các mục sau là phần bổ sung cần thực hiện, không là xác nhận hoàn thành.

| Owner | Task | Đầu ra BE/Data cần bàn giao |
| --- | --- | --- |
| Trang | GM-07 | Contract B có version, request/response/error schema, DTO/guards và ví dụ wire cho phòng, pool, ACK/waiting/finalize, Top 3, history/event. Chỉ hợp đồng dùng chung; mobile client/mock chờ đợt FE. |
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
4. GM-32 kiểm trên các producer đã merge/triển khai đúng version. FE chỉ nhận handoff sau; không lấy UI/API mock làm bằng chứng BE đã đạt.

Đây là gate theo artifact/PR/version, không thêm dependency số lớn vào task số nhỏ. Giữ policy/contract đã pin của phiên v2/v3. N=0 sau R1 kết thúc EMPTY_INTERSECTION; N>=1 mở R2 thật, kể cả một món; cap=max(1,floor(.30*N)); REMOVE hết thành ALL_REMOVED; Top 3 theo ADR-020.

## Thu hồi phần giao FE của đợt này

Thu hồi block supplement `followup-figma-be-data-20261024` / `figma-be-data-followup-20261024-vB` đã thêm vào GM-02/05/09..14/24..31/33/34/39 và bỏ cờ Follow-up của đợt này trên card FE. Giữ các nhiệm vụ, yêu cầu, evidence và PR trước supplement. Không hủy PR đang làm, đổi Status/assignee/Deadline, sửa app hay cài font/package.

Màu/font/components, các màn và mobile integration, Places/map trong app, Android và release sau đợt FE sẽ do Trí giao lại khi Figma chốt. Mô tả UI trong báo cáo giữ làm tham chiếu; không dùng để bắt đầu FE hoặc coi là nghiệm thu thiết kế. Backend vẫn chuẩn bị dữ liệu/hành vi cần thiết cho các màn, độc lập với layout cuối.
