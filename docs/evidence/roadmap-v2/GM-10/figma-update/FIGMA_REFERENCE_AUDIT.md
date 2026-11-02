# GM-10.2 — kiểm bộ ảnh Figma local

Ngày kiểm: 2026-11-02. Đây là kiểm độ phủ tham chiếu thiết kế,
không phải nghiệm thu app hoặc xác minh revision Figma live.

## Kết luận

Kết hợp bộ PNG mới trong `.work/figma-reference/gm-10` với bộ đã có trong
`.work/figma-reference/gm-09`, đã đủ tham chiếu màn chính và toàn bộ
P01–P11/R01–R15 để triển khai UI GM-10. Không cần yêu cầu export lại các
màn hoặc shortage chỉ vì chưa có file PNG riêng cho từng frame.

Danh sách ảnh cần bổ sung trong [kế hoạch](PLAN.md) là kết quả rà sơ bộ trước
lần phóng to này. Đã tìm thấy cả thiếu dưới10 món và biên stepper trong ảnh
tạo phòng của bộ GM-09, không phải thiết kế còn thiếu.

Đã inventory 16 PNG mới; kiểm chi tiết nhóm khẩu vị liên quan GM-10, nhóm
tạo phòng và component từ bộ GM-09. Các ảnh vote/result/social/account/QA
được cung cấp thêm không được coi là đã kiểm toàn bộ nội dung hoặc đưa vào
scope triển khai GM-10. Storyboard và router QA không dùng làm màn sản phẩm.

## Nguồn ảnh và cách đọc

| Nguồn local | Kích thước gốc | Nội dung đã đọc |
| --- | --- | --- |
| gm-10/03 - Màn hình/04 · Khẩu vị/Lưu nháp/Lỗi.png | 15752x2278 | Hai màn khẩu vị cơ sở, P01–P11 và bảng chạy P |
| gm-09/03 - Màn hình/03 · Tạo phòng/Hẹn giờ/Tình huống.png | 24608x2278 | Tạo phòng, min10/max20, hai shortage, hẹn giờ, R01–R15 |
| gm-09/02 - Components/06 · Form/Khẩu vị/Số món.png | 7180x984 | Chọn buổi/khẩu vị, checkbox, wheel, stepper và disabled |
| gm-09/04 - tạo phòng tình huống.png | 4504x9400 | TC00–TC14, tham chiếu bổ trợ đã xem khi lập kế hoạch |
| gm-09/05 - khẩu vị tình huống.png | 3616x7138 | KV01–KV11, tham chiếu bổ trợ đã xem khi lập kế hoạch |

PNG nguyên bản giữ nguyên. Các dải phóng to chỉ để đọc được lưu local tại
`.work/gm10-reference-inspection`, đã ignore; không dùng làm asset của app.
Ảnh rộng được xem theo từng vùng, tránh kết luận thiếu từ thumbnail thu nhỏ.

## Độ phủ trạng thái bắt buộc

| Nhóm | Frame nhìn thấy trong bộ PNG | Kết quả |
| --- | --- | --- |
| Thiết lập ban đầu/buổi ăn | R01 mặc định, R02 sáng, R03 tối/hẹn giờ, R04 ăn vặt | Có |
| Ngân sách/lịch sử | R05 không giới hạn, R15 chưa có lịch sử | Có |
| Hẹn giờ | R06 wheel giờ/phút, R07 lịch ngày, R08 giờ đã qua; thêm hẹn giờ giữ Ăn trưa và sau xác nhận | Có |
| Rủ bạn | R09 chọn bạn, R10 không tìm thấy; nhãn chỉ gửi lời mời sau khi tạo phòng | Có |
| Lỗi thiết lập | R11 đang tạo, R12 thất bại/thử lại, R13 offline, R14 bỏ thay đổi | Có |
| Số món | Default15, min10 nút trừ disabled, max20 nút cộng disabled | Có |
| Shortage còn >=10 | Chỉ có15 món phù hợp/đang chọn20, nút Giảm còn15 và Sửa thiết lập | Có |
| Shortage dưới10 | Chỉ có7 món/phòng cần ít nhất10, Sửa thiết lập và Quay lại | Có |
| Chọn khẩu vị | P01 Anything, P02 một khẩu vị, P03 nhiều nhóm, P04 sửa từ phòng chờ | Có |
| Lưu/giữ nháp | P05 đang lưu, P06 lưu thất bại, P07 offline giữ nháp/thử kết nối | Có |
| Tải/thoát/đóng | P08 loading, P09 tải lỗi/retry, P10 bỏ thay đổi, P11 phòng không hoạt động | Có |

Mã P/R được đọc trực tiếp từ ảnh màn hình, không suy tương đương từ TC/KV.
Liên hệ với node trong task chỉ là truy vết theo tên/nội dung; không xác nhận
node ID/revision đã kiểm live bằng MCP trong lần rà PNG.

## Chi tiết có thể bổ sung theo pattern hiện có

Chưa thấy frame riêng cho các tình huống sau trong phạm vi ảnh đã đọc.
Người dùng cho phép thiết kế bổ sung dựa trên mẫu Figma; dùng cùng bố cục,
token, notice, dialog và CTA, ghi sai khác trong FIGMA_PARITY khi triển khai:

- Taxonomy rỗng, có ID/nhãn unknown hoặc chỉ tải được một phần: tái dùng
  notice và retry P08/P09; không bịa lựa chọn hoặc mặc định dữ liệu thiếu.
- Kết quả lưu chưa rõ/ACK unknown, stale version và lỗi refetch sau ACK:
  dùng pattern pending/notice/retry, khóa thao tác cần khóa theo contract;
  không tuyên bố đã lưu hoặc gửi lại intent mới ngoài ý muốn.
- Phân biệt nháp tài khoản và bản chụp riêng trong phòng, phạm vi lưu/consent
  nếu upstream yêu cầu: thêm giải thích/control gọn theo form hiện có,
  không tự mở rộng quyền hoặc lộ khẩu vị người khác.
- Responsive 320/360dp, chữ200%, focus/keyboard/TalkBack và Dark capability
  hiện có: cần xử lý và kiểm trong app; không cần dựng lại toàn bộ thiết kế
  hoặc coi thiếu ảnh Dark là yêu cầu mở Dark redesign.

Các bổ sung này không là lý do bắt người dùng export thêm một bộ màn mới.
Khác biệt lớn về bố cục/semantics hoặc chưa rõ contract phải ghi gap và báo
owner/reviewer trước phần phụ thuộc; không sửa luật sản phẩm theo ảnh.

## Giới hạn còn lại

- PNG không cung cấp đầy đủ auto-layout/variables/tương tác prototype hoặc
  chứng minh file Copy đang khớp revision team. Giữ nguồn tham chiếu và
  kiểm với token/component/HANDOFF, báo khi có mâu thuẫn cụ thể.
- Figma MCP đã bị từ chối truy cập file gốc trong lần lập kế hoạch trước;
  chưa có context live mới. PNG đủ để triển khai theo chỉ dẫn người dùng,
  nhưng không ghi AC đọc context live hoặc toàn bộ visual parity là Pass.
- Bộ thêm mới là PNG màn tổng, chưa có bộ asset rời bổ sung. App đã có các
  icon buổi ăn/ngân sách/leaf từ GM-09; chưa xác nhận đủ mọi icon khẩu vị.
  Kiểm từng asset/callsite khi làm màn, tái dùng đúng mẫu hiện có; nếu thiếu
  asset chính xác thì báo rõ icon cần nhận, không dùng emoji hay screenshot
  cả màn để che thiếu. Không bắt export lại các màn vì vấn đề asset rời.
- Ngân sách có nhãn mỗi người trong ảnh; giá quan sát món vẫn giữ đơn vị
  producer. Khi nối dữ liệu cần mapping contract, không tự quy đổi giá/người.
- Chưa chạy app, sửa source, tự commit/push hoặc tạo approval trong lượt rà.
