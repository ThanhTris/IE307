# UI spec — Figma final 2026-10-25

Nguồn hiện hành: [final handoff](../design/UI_FINAL_HANDOFF_2026-10-25.md), [task và thiết kế](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md), [map máy đọc](../design/UI_FIGMA_TASK_MAP.json). Chủ dự án đã giao cập nhật task UI theo Figma; chỉ dẫn tạm hoãn FE trước đó không còn áp dụng cho phần UI này. Code/màn cũ chưa được coi là khớp thiết kế mới. P1/P2 vẫn làm sau.

| UI | Nội dung | Owner thực hiện / trạng thái bắt buộc |
| --- | --- | --- |
| UI-01 | Welcome/guest/Home/continue/tutorial | GM-09 mock, GM-25 auth thật; restore/loading/error/guest expiry, tutorial tách phiên thật |
| UI-02 | Thiết lập buổi/thời điểm/số món10–20/budget/avoidRecent/invite | GM-09 entry, GM-10 form, GM-24 preview, GM-25 create; past time/shortage/pending/offline, không yêu cầu GPS |
| UI-03 | Mã/QR/lời mời → preview → confirm join | GM-09/25/30; trước join chỉ số thành viên, sau join mới roster; full/expired/invalid/permission/error |
| UI-04 | Khẩu vị mềm/Anything/nháp/sửa từ lobby | GM-10/25; loading/save error/offline/discard/room closed, taxonomy unknown |
| UI-05 | Lobby host/member, code/share/QR/invite, sửa/start/hủy | GM-11/25/30; tối đa20, không ready; join/leave/settings change/reconnect/start fail/expired |
| UI-06 | Flashcard R1 + ACK | GM-12/26; trái NO, phải OK, double-tap WANT; nút thay gesture; undo trước gửi; cuối thẻ gửi một ballot |
| UI-07 | R2 loại hoặc không loại; waiting host/member | GM-12/26; N≥1 kể cả N1, cap30% min1; pending/unknown/retry/deadline/Chốt ngay |
| UI-08 | Winner/Top1–3/điểm/đồng hạng | GM-13/27; projection server đã lưu, finalizing/error/legacy thiếu trường; không tự chấm lại |
| UI-09 | NO_CONSENSUS | GM-13/27; EMPTY_INTERSECTION/ALL_REMOVED, winner null/top[], tạo phiên/Home/Back, không lộ ai đã NO |
| UI-10 | Mạng/cache/reconnect/expiry/cancel | GM-25/26/27/28/31; refetch trước replay, route đúng server, stale có nhãn |
| UI-11 | Friends/find existing/add by code/invites | GM-14/28; loading/empty/error bổ sung Figma G01, không fake online |
| UI-12 | Inbox/push permission/open notification | GM-14/28/29; inbox empty/error G02, denied vẫn inbox, refetch ACL cold/warm |
| UI-13 | History DECIDED/NO_CONSENSUS/consent/delete | GM-14/28/31; error/offline G03, persisted projection, legacy ẩn score/Top3 thiếu |
| UI-14 P1 | Login/register/link/recovery/profile/password | GM-35; G04/G05 lưu lỗi/pending/retry bổ sung Figma; không chặn core |
| UI-15 | Places/list/map cho winner và mở Maps | GM-13 mock, GM-27 composition, GM-30 capability; grant/deny/loading/empty/error, độc lập kết quả |
| UI-16 P2 | Weather/mood/AI/OCR tùy chọn | Task P2 giữ làm sau; không đưa vào điều kiện hoàn thành UI core |

## Luật tương tác

R1 WANT/OK/NO; không gửi phiếu là chưa tham gia, không phải OK. Cuối thẻ tạo một ballot đủ và khóa undo từ khi gửi; ACK unknown phải reconcile/retry ổn định. Không có UI tự chốt winner hoặc đếm local pending là server nhận.

R1 kiểm winner trước; nếu chưa có, survivors từ pool khóa trừ NO của các ballot hoàn chỉnh ACK. N=0 → NO_CONSENSUS/EMPTY_INTERSECTION, N≥1 mở R2 thật. R2 là quyết định REMOVE hoặc không, cap max(1,floor(0.30*N)) kể cả N1; không bắt buộc loại ít nhất một món, không tự KEEP cho người chưa gửi, không auto-finalize. Loại hết → ALL_REMOVED; không bù món/R3.

Waiting60s từ lần vào chờ hợp lệ đầu tiên sau ACK; các thành viên khác vẫn chọn/gửi trước deadline. Host Chốt ngay cần ít nhất một ballot hợp lệ. Client dùng server time/deadline/snapshot, không khởi countdown cả game từ start.

Top3 lấy score R1=2*WANT+OK, R2 chỉ loại; tối đa3 món còn hợp lệ. Dense rank, đồng điểm cùng hạng/cùng chiều cao; winner có nhãn riêng và nằm trong Top3. NO_CONSENSUS không dựng podium. History/result giữ projection đã lưu, legacy thiếu trường thì ẩn. Phiếu cá nhân/seed không public.

## Nhận diện, quyền và accessibility

Light xanh/kem và Inter từ Figma variables/styles, không dùng bộ màu cam HTML. #46C34F chỉ trang trí, CTA theo token primary-contrast. Không nhận fixture/quán/khoảng cách mẫu là dữ liệu thật. Pool không phụ thuộc GPS/offering/quán/giờ bán; vị trí chỉ cho Places/map sau kết quả. Chưa cấp quyền thì xin quyền hoặc mở Maps, không thêm yêu cầu chọn khu vực tay.

Figma final chỉ có Light đã chốt; Dark redesign hoãn, giữ capability/a11y hiện có. Touch48dp, font200/TalkBack, safe area/keyboard, Back/scroll, nút thay gesture. Header/nav/layout theo component Figma, không khôi phục header cũ vì code đang dùng.

## Nghiệm thu

Theo [chuẩn đầu ra](../project/TASK_OUTPUT_REQUIREMENTS.md) và [kế hoạch visual](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md). Đầu ra màn/component phải chạy Expo, có tất cả state và hành động trong scope, ảnh đối chiếu Figma/app; task API/native phải kiểm thật tương ứng. Thiếu frame phụ: task GM-14/35 bổ sung vào Figma và cập nhật node map trước nghiệm thu. Mock tách production, không fallback âm thầm. Figma đủ màn chưa là runtime Pass.
