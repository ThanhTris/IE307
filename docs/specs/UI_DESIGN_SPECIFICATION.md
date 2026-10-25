# Thiết kế và triển khai UI — Figma final

Ngày 2026-10-25, Figma đã chốt và Trí giao cập nhật task UI. [Final handoff](../design/UI_FINAL_HANDOFF_2026-10-25.md), [UI spec](UI_SPEC.md) và [task map](../design/UI_FIGMA_IMPLEMENTATION_2026-10-25.md) là nguồn hiện hành. Các token/màn cam, ready, chọn anchor bắt buộc và gesture swipe phải WANT trong bản tài liệu trước thuộc baseline lịch sử, không áp dụng phần làm lại.

## Hệ thiết kế

Lấy `GCD / Brand primitives`, `GCD / UI colors` mode Light và `GCD / Component metrics` trực tiếp từ Figma. Inter: Body14/22 Regular; Label14/20 Semi Bold; Caption12/18 Medium; Title20/28 Bold; các kiểu hero/countdown/podium lấy đúng text style từng node. Không tự chuẩn hóa về một font size khác thiết kế.

Xanh trang trí #46C34F, nền cream #FFFCF3, text ink #043B22 là các giá trị đọc tại lượt rà; component/variable Figma là nguồn khi code. CTA dùng `color/action/primary-contrast` và trạng thái pressed tương ứng, không đặt chữ trắng trên xanh trang trí. Disabled/selected/error phải kiểm tương phản và có nhãn ngoài màu. Dark redesign hoãn.

Logo/icon/artwork lấy asset gốc đúng vị trí và kích thước; ảnh món từ API giữ dynamic/nullable, có fallback đã thiết kế. Không lấy screenshot cả màn làm code/asset. Không để temporary Figma URLs trong runtime.

## Kiến trúc và phân chia

Routes mỏng trong `mobile/src/app`; feature giữ screen/use case; component không gọi API hoặc tự xử lý luật bầu chọn. Server là nguồn trạng thái/kết quả. GM-02 font/route → GM-05 component → GM-09..14 màn/mock → GM-24..31 integration → GM-33/34 kiểm/release. GM-39 hỗ trợ thiết kế, GM-35 P1 làm sau.

GM-09 sở hữu Home/guest/tutorial/entry; GM-10 setup/khẩu vị; GM-11 lobby; GM-12 flashcard/ACK/waiting/R2; GM-13 podium/no-consensus/Places mock; GM-14 social/history/inbox/cài đặt mock. Không dựng hai form setup hoặc hai version màn khi đổi adapter. [Component map](../design/COMPONENT_MAP.md) ghi mapping hiện có và đích cần bổ sung.

## Đồng bộ dữ liệu và kiểm UI

Giữ luật/version theo UI_SPEC và producer contract đã duyệt. Client B không được đọc response v3 như B hoặc tự sinh score/rank/KEEP. Preview join chỉ có member count trước xác nhận. Lịch sử cũ thiếu score/top thì ẩn. Places/map sau winner và lỗi riêng không thay kết quả.

G01–G03 giao GM-14 bổ sung Figma, GM-28/31 nối thật; G04/G05 thuộc GM-35/P1. Dùng pattern chung khi phù hợp nhưng phải có node/variant thể hiện state trên màn. [Map JSON](../design/UI_FIGMA_TASK_MAP.json) có fileKey, nodeId, URL, task, owner và gap Pending.

Bàn giao ảnh Figma/app cùng frame/state/data/viewport 412dp, thêm320/360dp/font200/TalkBack/Back/keyboard. Sai khác phải sửa hoặc Trí duyệt rõ. CHECKS/HANDOFF/FIGMA_PARITY ghi revision/lệnh/route/scenario/evidence thật. Không lấy HTML, fixture, API200 hoặc mở app được làm bằng chứng đủ visual/native/API.
