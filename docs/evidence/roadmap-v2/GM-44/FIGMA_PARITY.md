# GM-44 — Home, Join, Continue

Giữ các màn đã có và thay nguồn dữ liệu của thẻ quay lại. Đối chiếu phạm vi Home và Join theo [handoff GM-25](../GM-25/FIGMA_PARITY.md). Thẻ khóa Vòng 2 theo [ADR-027](../../../architecture/decisions/ADR-027-room-rejoin-round-one.md).

Ảnh từ AVD Android API 37, viewport 1080 × 2400 px, Expo Go 58.0.5. Dữ liệu là phòng và người dùng QA synthetic.

| Điểm vào và tham chiếu | Thao tác và kết quả AVD |
| --- | --- |
| Home `330:3067` | Mở lại Home sau khi tài khoản được thêm vào phòng ngoài app. Mã và nút quay lại hiện từ server. [Home](artifacts/home-found.png) |
| Join `330:3069` | Vào màn nhập mã từ Home. Thẻ đúng mã dù chưa nhập gì trong form. [Join](artifacts/join-found.png) |
| Continue `330:3067` | Mở Continue với phòng Lobby. Màn hiển thị mã, host và nút quay lại. Bấm thẻ Home mở đúng Lobby. [Continue](artifacts/continue-found.png) · [Lobby](artifacts/resume-lobby.png) |
| Quay lại R1 | Bắt đầu từ backend QA và tải lại Continue. App báo Vòng 1, bấm quay lại mở màn bỏ phiếu. [Continue R1](artifacts/continue-round-one.png) · [Bỏ phiếu](artifacts/resumed-round-one.png) |
| R2 khóa | Hoàn tất R1 bằng fixture QA. Cold start app, Home hiện thông báo R2 và không có nút vào lại phòng. Continue báo phòng đã sang vòng 2. [Home R2](artifacts/locked-round-two.png) |
