# Component map — Figma target và code baseline

Revision yêu cầu `ui-figma-final/2026-10-25/GM-05.2`. Bảng là **đích GM-05 cần thực hiện**, không chứng nhận các component hiện đã khớp Figma. Code primitives đang ở `mobile/src/shared/ui/components.tsx`, export `index.ts`, theme `mobile/src/shared/theme/tokens.ts`; reuse và mở rộng theo node. [Task map](UI_FIGMA_TASK_MAP.json) và [handoff](UI_FINAL_HANDOFF_2026-10-25.md).

| Node thiết kế | Component Figma | React Native / tình trạng | Props/state cần giữ |
| --- | --- | --- | --- |
| [GCD / Button](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=9-77) (`9:77`) | GCD / Button | AppButton hiện có; đồng bộ role/variants | loading/disabled/pressed và CTA contrast |
| [GCD / Form Field](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=379-1510) (`379:1510`) | GCD / Form Field | FormField hiện có; bổ sung theo Figma | error giữ input và nhãn lỗi |
| [GCD / Header](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=23-661) (`23:661`) | GCD / Header | AppHeader hiện có; sửa cấu trúc theo variant | Home/Back/Room, menu/rời có confirm |
| [GCD / Bottom Navigation](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=23-604) (`23:604`) | GCD / Bottom Navigation | bổ sung component dùng chung | selected/tab label/48dp |
| [GCD / Dish Card](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=10-164) (`10:164`) | GCD / Dish Card | DishCard hiện có; flashcard props | WANT/OK/NO, fallback ảnh/giá, gesture do feature |
| [GCD / Dish Count](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=321-1236) (`321:1236`) | GCD / Dish Count | bổ sung controlled input | min10/max20 và disabled biên |
| [GCD / Preference Choice](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=53-923) (`53:923`) | GCD / Preference Choice | Chip hiện có + choice layout | Anything/selected/unknown, không tự lọc pool |
| [GCD / Lobby Member](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=70-874) (`70:874`) | GCD / Lobby Member | AvatarRow + member row | role/roster, không fake online |
| [GCD / Waiting Summary](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=321-1303) (`321:1303`) | GCD / Waiting Summary | bổ sung component | server deadline và ACK counter |
| [GCD / Process State](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=379-1273) (`379:1273`) | GCD / Process State | StatusNotice/SheetDialog + overlay | sending/unknown/closed/error/finalizing |
| [GCD / Result Podium · Đồng hạng](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=617-1671) (`617:1671`) | GCD / Result Podium · Đồng hạng | bổ sung podium renderer | 1/2/3, dense rank, equal height, winner badge |
| [GCD / Nearby Places State](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=379-1478) (`379:1478`) | GCD / Nearby Places State | bổ sung presenter state | loading/empty/error/permission, provider ở GM-30 |
| [GCD / Notification Item](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=284-1108) (`284:1108`) | GCD / Notification Item | bổ sung notification item | read/unread/kind, không chứa phiếu |
| [GCD / Tutorial Gesture](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=308-1085) (`308:1085`) | GCD / Tutorial Gesture | bổ sung hướng dẫn/coach | thẻ mẫu tách phiên thật; nút thay gesture |
| [GCD / Collection State](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=998-1746) (`998:1746`) | GCD / Collection State | presenter dùng chung | loading/empty/error, title/message/icon/action |
| [GCD / Search Skeleton Row](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=998-1663) (`998:1663`) | GCD / Search Skeleton Row | skeleton danh sách | loading không giả dữ liệu thật |
| [GCD / Request Banner](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=998-1775) (`998:1775`) | GCD / Request Banner | banner request/cache | offline/error, fetchedAt copy và retry tùy chọn |
| [GCD / Insufficient Dishes](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=1012-1702) (`1012:1702`) | GCD / Insufficient Dishes | shortage dialog | Can reduce ≥10 / Below minimum0–9; không giảm dưới10 |

GM-05 bàn giao source/props/event/variant/route preview cụ thể và ảnh so thiết kế. Component chỉ trình bày, callback do feature inject; không import API/domain/network vào component. `RoomCode` hiển thị mã server; QR/link native ở GM-30. ContextSummary mới mô tả thiết lập dish-only, không bắt public anchor/radius cho pool.

Token Light/Inter và logo/icon theo Figma. #46C34F trang trí; action contrast cho chữ cần đọc. Touch48dp/font200/TalkBack, ảnh/giá fallback, tên dài và disabled/error. G01–G05 đã có 12 frame composition; UI dưới10 món và nội dung không khả dụng đã bổ sung. Có thiết kế không chứng minh component code đã đáp ứng. Code Connect chưa được chứng nhận trong bảng này; chỉ thêm mapping khi component code thật đã khớp.
