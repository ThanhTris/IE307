# GM-45 — Lobby, voting và waiting

Phạm vi thay nguồn đồng bộ dữ liệu trên các màn hiện hành. Tham chiếu lobby từ [GM-25](../GM-25/FIGMA_PARITY.md) và voting/waiting từ [GM-26](../GM-26/FIGMA_PARITY.md), theo ADR-026/027/028. Android AVD API 37, 1080 × 2400 px, Expo Go 58.0.5, backend QA có Auth/REST/Realtime/worker.

| Hành vi | Evidence AVD |
| --- | --- |
| Ready từ client khác | Thành viên chuyển Sẵn sàng mà không bấm tải lại. [Lobby](artifacts/lobby-ready-realtime.png) |
| Realtime bị ngắt | Sau khi stop container Realtime QA, host sửa giờ từ Ăn ngay sang 09:17. App hiện giờ mới qua fallback. [Lobby fallback](artifacts/lobby-fallback.png) |
| Realtime kết nối lại | Host start ở client ngoài app. AVD tự mở màn bỏ phiếu R1. [Vòng 1](artifacts/round-one-from-realtime.png) |
| Worker hết chờ R1 | Host ACK và waiting, đồng hồ QA được đẩy qua deadline. App nhận chuyển R2, hiển thị modal và mở danh sách loại. [Chuyển R2](artifacts/worker-round-two.png) · [Vòng 2](artifacts/round-two-live.png) |
| Foreground đọc bù | Đưa app xuống background, host ACK/waiting R2 rồi foreground. App tiếp tục đúng phòng và nhận kết quả sau worker timeout. [Foreground](artifacts/foreground-catchup.png) · [Kết quả](artifacts/worker-result.png) |

Các fixture synthetic dùng catalogue draft QA. UI hiển thị trạng thái không có ảnh cho món chưa có artwork.
