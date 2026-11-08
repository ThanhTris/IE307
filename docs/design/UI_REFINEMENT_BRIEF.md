# Brief dự án cho AI — GM-39, cải thiện HTML trước

> **Tham chiếu lịch sử HTML:** từ final handoff UI ngày 2026-10-25, yêu cầu hiện hành nằm ở [Figma final](UI_FINAL_HANDOFF_2026-10-25.md) và [kế hoạch task UI](UI_FIGMA_IMPLEMENTATION_2026-10-25.md). Không dùng brief cũ để làm lại ready, pool phụ thuộc vị trí hoặc yêu cầu GM-39 sửa HTML trước app.


> Cập nhật hướng đích 2026-10-22: [ADR-019 — quyết định của Trí và phần còn chờ chốt](../architecture/decisions/ADR-019-dish-first-room-policy.md) ưu tiên khi lập kế hoạch luồng mới: phòng 20 người, host chọn chính xác 10–20 món, bỏ ready, timeout 60 giây từ người đầu tiên hoàn tất lượt và vào phòng chờ kết quả mỗi vòng và host Chốt ngay; chọn món độc lập vị trí/quán. Nội dung legacy bên dưới mô tả baseline, chưa phải contract triển khai luật mới. Đã chốt cap min(3, floor((N-1)/2)), N=1 bỏ loại; tính phiếu hoàn chỉnh đã nhận với tối thiểu 1 người, phiếu thiếu không là OK; host chỉ bấm bắt đầu. Chi tiết còn mở xem ADR; không đổi nghĩa phiên cũ hoặc tự ghi test Pass.

Yêu cầu chủ dự án ngày 2026-10-12. Đây là context/plan cho Trang và công cụ AI, **không phải bản thiết kế đã duyệt hay evidence app**. [Task GM-39](../../tasks/backlog/GM-39.md) / [Issue #107](https://github.com/ThanhTris/IE307/issues/107): ưu tiên sau UI cơ bản, sửa HTML trước, chưa sửa app.

## Đọc và đối chiếu

1. [AGENTS](../../AGENTS.md), task/chỉ dẫn Trí mới nhất, HANDOFF GM-05/09..14: phạm vi và revision thực tế.
2. [Yêu cầu sản phẩm](../product/PRODUCT_REQUIREMENTS.md), [tổng quan](../product/SYSTEM_OVERVIEW.md): vấn đề/luồng. Một số mô tả trạng thái/8 tuần/reviewer trong tài liệu nền là lịch sử; không dùng thay phân công/Deadline/approval hiện hành trên Project.
3. [UI spec](../specs/UI_SPEC.md), [room](../specs/ROOM_SPEC.md), [decision](../specs/DECISION_SPEC.md), [food](../specs/FOOD_DATA_SPEC.md), [design spec](../specs/UI_DESIGN_SPECIFICATION.md): ràng buộc hành vi/visual.
4. [HTML hiện có](../../design/prototypes/gi-cung-duoc.html) và app cơ bản: tham khảo hiện trạng, không là bằng chứng mọi chức năng đã có hay đúng spec.

## Sản phẩm và đối tượng

Gì Cũng Được giúp cặp đôi/bạn bè/đồng nghiệp 2–8 người quyết định ăn gì, giảm thời gian bàn bạc mà không áp món có người không ăn. Android-first, giao diện tiếng Việt, React Native/Expo + TypeScript với Supabase. Không phải ứng dụng đặt món, giao hàng, thanh toán, đặt bàn hoặc chat. Mục tiêu chính là chọn món chung và xem nơi bán phù hợp, không làm trang quảng cáo/landing thay các màn chức năng.

## Luồng bắt buộc giữ

Home → Tạo/Vào phòng → xác nhận điểm ăn công cộng/bán kính/buổi/giờ/ngân sách → sở thích → lobby/ready → vòng 1 WANT/OK/NO + Gửi riêng → nếu cần vòng 2 Giữ/Loại + xác nhận → kết quả/Chưa đồng thuận → nơi bán/Maps. Friends, Inbox và History hỗ trợ mời/chấp nhận/xem bữa, không tự tham gia hoặc sẵn sàng.

- Host/member có hành động khác nhau; context đổi thì reset ready. Có permission denied/manual fallback. GPS không tự chia sẻ vị trí cá nhân.
- WANT = Muốn ăn, OK = Ăn được, NO = Không ăn. Thiếu phiếu UNSET không phải OK. Chọn/double-tap/undo chỉ sửa nháp; có nút Gửi. Chờ gửi khác server đã nhận.
- NO và Loại là veto, không thể thắng dù nhiều người muốn. Tối đa hai vòng; server chốt một lần, retry/reconnect không đổi kết quả. HTML chỉ trình diễn scenario tổng hợp, không thực thi backend hoặc chọn winner thật.
- Perfect/Consensus/Compromise/No Consensus hiển thị trung tính; không lộ phiếu người khác, không chỉ ra ai từ chối. Không thêm vòng ba, reroll, hay tự mang phiếu sang phòng mới.

## Dữ liệu và cách trình bày

- Cuisine Việt/Thái… là nguồn gốc món, không là khu vực có bán. Category (lẩu/nướng/bún…) khác nhiệt độ nóng/lạnh và vị cay/mặn.
- Điều kiện khu vực dựa public anchor/coverage/radius, nơi bán quán–món và thời điểm/buổi/lịch có nguồn. Không đề xuất món ở vùng khác hoặc coi quán mở là mọi món đều bán. Không hardcode “đêm không có món” nếu lịch thực tế hợp lệ; không ưu tiên món không phù hợp buổi khi đã có metadata.
- Trường giá/ảnh/lịch món optional/unknown không được tự điền giả: hiển thị Chưa có giá/Chưa rõ giờ/ảnh fallback theo contract, thông báo hạn chế. Nguồn/ngày kiểm/lịch dự kiến không là tồn kho thời gian thực. Dataset mock phải rõ nhãn, không dùng raw GPS/phiếu/token/user thật.
- Không tuyên bố an toàn dị ứng từ tên món. Các khối allergy/account/OCR/AI/weather/mood trong mẫu cũ không tự thành scope MVP. Chỉ thể hiện optional/P1/P2 riêng khi Trí yêu cầu; thiếu chúng không chặn HTML core.

## Hướng cải thiện

Audit cụ thể trước khi chọn style: hierarchy rõ, CTA chính dễ thấy, typography tiếng Việt dễ đọc, spacing/radius/icon/card nhất quán, ảnh vừa đủ; giao diện thân thiện hướng món ăn nhưng gọn, thao tác một tay. Tham khảo phong cách cam ấm hiện có, có thể đề xuất palette mới kèm lý do/tương phản để Trí chọn, không tự tuyên bố đã chốt.

Phải có loading/empty/error/disabled/stale/unknown, light/dark, nút thay gesture, focus/tab/zoom 200% và reduced motion. Kiểm browser ở 320/360/412px và màn rộng, vùng bấm >=48 CSS px; CSS px/zoom không chứng minh dp/font scaling/TalkBack Android đã đạt. Không thay dữ liệu/luật chỉ để ảnh nhìn đẹp.

## Phạm vi file và bước áp dụng

- Sửa `design/prototypes/gi-cung-duoc.html` hiện có, CSS/JS mock cùng bản mẫu; giữ controls chuyển màn/scenario/reset để review. Không tạo bản HTML thứ hai rồi bỏ bản chính.
- Đọc `mobile/` để hiểu component/màn nhưng không sửa nó. Không sửa `supabase/`, dependency, package/lockfile, provider/API hoặc auth.
- Trình Trí audit + hướng visual và 2–3 màn đại diện → hoàn thiện HTML theo hướng đã duyệt → kiểm browser/ảnh trước–sau → Trí duyệt revision cuối. Áp dụng vào app là phạm vi được giao sau, không tự làm trong GM-39.
- Bàn giao `docs/design/UI_REFINEMENT.md` (report/mapping), CHECKS/HANDOFF GM-39 và ảnh/video thật. Browser evidence là prototype, không báo Expo/API/native Pass từ HTML.

## Prompt khởi đầu cho AI của Trang

> Đọc brief này, task GM-39 và spec được dẫn trước khi đề xuất. Tôi cần cải thiện prototype HTML Gì Cũng Được, không sửa app React Native. Hãy tóm tắt đúng sản phẩm/luồng/privacy/data constraints, audit điểm yếu hiện trạng, đề xuất hướng visual và 2–3 màn đại diện để Trí chọn. Chỉ sau khi hướng được chốt mới chỉnh HTML/CSS/mock JS của bản mẫu hiện có. Giữ toàn bộ luồng core, states và nhãn mô phỏng; không thêm chức năng/backend/provider/asset chưa được phép. Ghi file dự kiến thay đổi, cách kiểm browser, giới hạn và bảng trước–sau; không coi đề xuất của AI là approval của Trí.
