# Kế hoạch UI — dựng theo mẫu trước, nối API sau

Roadmap-v2, 2026-10-10. [Lộ trình đầy đủ](IMPLEMENTATION_ROADMAP.md) · [UI spec](../specs/UI_SPEC.md) · [mẫu](../../design/prototypes/gi-cung-duoc.html).

| Bước | Task | Đầu vào thật phải có | Đầu ra nghiệm thu |
| --- | --- | --- | --- |
| 1. Cấu trúc | GM-02 — Tuấn | Baseline GM-01 | Expo shell/folder/routes/runner, mở được trên Expo Go |
| 2. Component theo mẫu | GM-05 — Trang | Shell GM-02 + field GM-04 | Tokens/Button/Chip/Card/Form/Avatar/Header/ContextSummary, props/events |
| 3. Màn chi tiết | GM-09/12/14 — Trang; GM-10/11/13 — Tuấn | Components GM-05 + API client/mock GM-07 | UI-01..13/15 với dữ liệu mẫu và interaction; có thể merge riêng |
| 4. Nối dữ liệu thật | GM-24..28 | Các màn tương ứng + API/verified data đã bàn giao | Location/room/preferences/vote/result/social/history thực |
| 5. Native/recovery | GM-29..31 | Luồng/API tích hợp trước đó | Push, QR/link/Maps, SQLite/reconnect |
| 6. QA/release | GM-32..34 | Core đã tích hợp | Regression, Android/pilot, APK |

Các màn GM-09..14 là task UI độc lập, không giữ mở chỉ vì chưa có API thật. Mock adapter có interface/type/version do GM-07 sở hữu, banner dữ liệu mẫu và fixture rõ; API lỗi trong production không tự chuyển sang mock. Tích hợp dùng lại screens; logic server không nằm trong component.

Bố cục/màu/spacing/copy dựa mẫu. Ready/submit chủ động, mã do server, anchor công cộng được xác nhận và ba nút vote theo UI_SPEC. Component map ghi trường hợp HTML khác luật. Chưa đưa hồ sơ dị ứng/Google linking vào core chỉ vì mẫu có nút.

Chỉ kiểm phần liên quan: shell startup ở GM-02, render/interaction ở GM-05/09..14, native trong task dùng capability. Không để gallery/camera/notification/SQLite demo thành điều kiện dựng UI. Accessibility cơ bản nằm ngay trong component và màn; kiểm thiết bị đầy đủ ở GM-33.
