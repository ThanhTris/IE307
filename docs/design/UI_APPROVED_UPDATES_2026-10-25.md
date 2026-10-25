# Cập nhật Figma theo sáu UI đề xuất đã duyệt — 2026-10-25

> **Trạng thái hiện hành:** Trí đã chốt bộ UI sau các cập nhật; dùng các node dưới đây làm đầu vào BE/Data và implementation. Việc này không ghi approval thay Trí cho code/runtime. Các dòng bên dưới nói GitHub issue/Project chưa được sửa là snapshot tại thời điểm lập báo cáo; task body đã được đồng bộ sau đó theo handoff hiện hành.

> Sau lượt rà cuối, Trí xác nhận không cần các đề xuất bổ sung tiếp. [Phạm vi UI hiện tại đã chốt để rà BE/Data](UI_SCOPE_CONFIRMED_2026-10-25.md). Các ghi chú auth/mapping bên dưới không tự mở thêm điều kiện thiếu frame.

Trí đã xem sáu màn đề xuất và yêu cầu cập nhật Figma, sắp xếp đúng quy trình. Đã áp dụng U01–U05 tại file `3Ysh0mOAEkAgA5DgZPSC1j` bằng layer chỉnh sửa được; màn chạy ở `33:2`, component ở `8:2`. Giữ ID các màn hiện có và đúng 12 điểm bắt đầu prototype. Không nhập ảnh AI làm UI, không sửa code app/API/DB, không commit/push hoặc đổi Project status/owner/deadline.

## Màn và component đã cập nhật

| Nhóm | Node / thay đổi |
|---|---|
| Tạo phòng | [Dưới10 món — 1015:9957](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=1015-9957): ví dụ7 món, cần ít nhất10, chỉ Sửa thiết lập/Quay lại; không có nút giảm dưới10. Đặt ngay sau shortage15/20. |
| Thông báo | [Nội dung không khả dụng — 1015:10152](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=1015-10152): dùng cho đã xóa/không còn quyền, về inbox hoặc Home; không hiện dữ liệu riêng đã mất quyền. Đặt cạnh inbox rỗng/lỗi. |
| Xác nhận vào phòng | [268:2081](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=268-2081), [từ lời mời280:2276](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=280-2276): card chỉ có buổi/thời gian/mã/số người2/20; bỏ danh sách tên trước join. |
| Bạn bè | [232:2](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=232-2): search trong danh sách hiện có, nút Thêm bạn riêng; bỏ presence không có producer; request actions cùng hàng/cùng cao48. |
| Thêm bằng mã | [276:2037](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=276-2037): tái dùng frame cũ, query mẫu GCD-AN24, tách khỏi search bạn hiện có. Màn đã gửi276:2079 đồng bộ. |
| Trang chủ | [33:3](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=33-3): giữ hai ô vuông, CTA action xanh đậm/chữ trắng, bỏ chấm presence; nav về y827 để không che khung bạn bè. Hotspot bell đặt đúng header. |
| Inbox | [286:2245](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=286-2245): CTA xanh đậm, hai action cân/cao48; timestamp cùng hàng tiêu đề; fixture thông báo Phở5 điểm. |
| Component thiếu món | [Set1012:1702](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=1012-1702): Can reduce giữ node445:1492, Below minimum1012:1681. Mở rộng thay vì tạo hệ UI riêng. |
| Component dùng chung | Home Action Tile/Notification Item dùng action token `#238633`; Friend Avatar có Show status mặc định false và các instance được đồng bộ. Nội dung không khả dụng dùng Collection State998:1746 và icon vector mới1012:1703. |

Nội dung tên người/tên phòng đã bị bỏ khỏi hai bản preview trước join; đây là thay đổi UI, không chứng minh API preview đã đáp ứng privacy. Host/member roster trong phòng vẫn theo snapshot.

## Sắp xếp theo quy trình

- **03 · Tạo phòng** `330:3068`: setup → biên10/20 → shortage15/20 → dưới10 → hẹn giờ và các tình huống đang có. Các cột sau được dịch492 để không đè frame mới.
- **05 · Vào phòng** `330:3069`: giữ nhập mã → QR → xác nhận → xác nhận lời mời → các lỗi vào phòng.
- **12 · Bạn bè** `330:3076`: danh sách → tìm bạn đang tải/rỗng/lỗi → thêm bằng mã → đã gửi → đồng ý/từ chối.
- **14 · Thông báo** `330:3079`: inbox → rỗng → tải lỗi → nội dung không khả dụng.
- **02 · Trang chủ** `330:3067`: sửa tại frame gốc, không thêm luồng song song.

Các màn cùng nhóm trên một hàng, bước492 = frame412 + gap80, labels y104 và frame y176, không đè tiêu đề hoặc frame. Các trang04–06 giữ vai trò tham khảo; bản chạy mới vẫn ở trang03. Không thêm điểm bắt đầu cho mỗi lỗi.

## Kiểm tra

| Hạng mục | Kết quả / giới hạn |
|---|---|
| UI sửa và hai state mới | Pass visual: đã xem ảnh từng màn liên quan, gồm cả preview thường/lời mời và form thêm bằng mã |
| Bố cục | Pass visual/structural cho hàng Bạn bè/Thông báo và vị trí cột mới ở Tạo phòng; labels không đè màn |
| Home | Đã sửa lỗi nav che mép quick-friends; body727 và nav y827 |
| Shared shortage / actions | Pass visual; icon được căn giữa, state giảm15 và dưới10 nằm cạnh nhau; actions lời mời48px |
| Prototype | Readback vẫn12 entry points; các CTA mới có destination cơ bản nhưng **Present Not run**, chưa nghiệm thu các case API/fixture/retry |
| Runtime / thiết bị | Not run: Android, TalkBack/font scaling, network, privacy/ACL, ACK/provider ngoài phạm vi Figma |
| Review cuối | Trí review kết quả cập nhật; AI không ghi Approved/Done thay Trí |

Evidence/ledger tại `C:/Users/ADMIN/.codex/visualizations/2026/10/16/01a145b9-5d6a-7e00-ae1f-a2f72809de03/ui-approved-update-2026-10-25/`. Ảnh hậu tố `final` thay bản trước sửa; `friends-row.png`, `notifications-row.png` chứng minh bố cục hàng ngang. Không có revision Figma: dùng ngày, file/page/node và ảnh thực tế.

## Hồ sơ và phần còn lại

Task map, component map và link local GM-05/10/14/24/28/29/31/35 đã được cập nhật theo frame thật; các câu G01–G05 chưa có frame được sửa, không đổi frontmatter/status. Bản audit U01–U05 trước đó giữ làm lịch sử và có ghi chú đã áp dụng. GitHub issue/Project chưa được sửa trong lượt này.

G01–G05 đã có12 frame từ đợt trước, hai state ở đợt này bổ sung cho các task tích hợp còn lại. Auth P1 liên quan conflict/reauth/provider vẫn chờ mapping theo contract, không được suy thành lỗi runtime đã giải quyết từ việc có UI. Chưa thực hiện review toàn bộ pixel trên mọi frame hoặc chạy lại12 luồng Present.

## Kiểm tra hồ sơ local

- Repository validator, task index check và diff whitespace: Pass. Frontmatter8 task đã sửa body giữ nguyên so với HEAD.
- `test_ui_refinement_task.py`: 5/5 Pass.
- Regression toàn repo: 594 tests trong95,506s; 21 failures và6 skipped. Cùng21 assertion cũ trong `test_mobile_api_test_plan.py` đã ghi ở đợt trước: thiếu link handoff `MOBILE_API_TEST_MATRIX.md` và literal `Android thật` trong task/manifest. Không báo toàn repo Pass và không sửa lan sang checklist API/thiết bị để làm xanh đợt Figma này. Output tại `ui-approved-update-2026-10-25/regression.txt` trong evidence directory nêu trên.
- Figma readback: nhóm Create/Join/Friends/Notifications không có cột chồng nhau, label không chạm frame, tất cả trong bounds; presence text hiển thị0, nav Home y827 và số entry12. `readback.json` lưu state/destination thực tế. Đây vẫn là kiểm cấu trúc, không phải Present Pass.
