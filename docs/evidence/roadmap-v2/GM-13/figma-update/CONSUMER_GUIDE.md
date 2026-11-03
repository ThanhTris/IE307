# GM-13.2 — hướng dẫn task nhận đầu ra

Nhận cùng [FINAL_HANDOFF](FINAL_HANDOFF.md), [FINAL_CHECKS](FINAL_CHECKS.md)
và [source manifest](FINAL_SOURCE_MANIFEST.json), implementation `9373b80`.
Các đường source bên dưới tính từ repo root; named exports hiện có ở
`mobile/src/features/result/index.ts`.

## File cần dùng và phần cần thay khi tích hợp

| File/module | Cách nhận |
| --- | --- |
| `features/result/screens/DishResultFlow.tsx` | Entry composition mới, ưu tiên dùng cho consumer; cấp input/read states/actions, không dùng preview làm adapter |
| `features/result/services/resultPresentation.ts` | ResultInput/ScoredResult/ResultDish/NearbyState và semantic guard; typed input, không thay decoder wire GM-07 |
| `features/result/services/nearbyPresentation.ts` | Public place projection, ResultMapRenderer và tọa độ nullable |
| `features/result/screens/DishResultScreen.tsx` | Winner/podium; dùng qua flow để có validation, read state và vinh danh |
| `features/result/screens/DishNoConsensusScreen.tsx` | EMPTY_INTERSECTION/ALL_REMOVED; route/context vẫn do consumer cấp |
| `features/result/components/NearbyPlacesSection.tsx` | Caption winner, permission/retry, public place selection và external callbacks |
| `shared/ui/result/ResultPodium.tsx` | Variant podium mới; mặc định cards cũ vẫn giữ |
| `bootstrap/DishResultEntry.tsx` | Boundary hiện tại: real auth/capability notice, mock mới, explicit dev legacy; GM-27 thay nhánh real bằng adapter thật |
| `bootstrap/DishResultPreview.tsx`, `dishResultFixtures.ts`, `ResultCasePicker.tsx` | Chỉ mô phỏng QA; không import làm dữ liệu sản phẩm |
| `app/room/result.tsx`, `app/room/no-consensus.tsx` | Route mỏng; giữ room/session context đúng khi consumer nối navigation |

Các bảng path lịch sử trỏ `ResultScreen.tsx`/`NoConsensusScreen.tsx` là
baseline cũ. Hai file còn để regression/versioned consumer qua
development/mock `?legacy=1`; route mặc định và consumer v4 nhận các
named `DishResult*` ở trên. Không xóa legacy trước chuyển hết caller/tests.

## Ma trận bàn giao

| GM nhận | Việc cần làm sau khi nhận | Ca phải tái lập |
| --- | --- | --- |
| GM-27 | Map result persisted từ GM-07/20/26 sang ResultInput; cấp context/auth/capability/read states/roster/callbacks thật; thay real-mode notice | R1/R2 DECIDED, hai NO_CONSENSUS, retry cùng resultId, loading/invalid/expired/outsider, tie winner không phải phần tử đầu, Back/new session |
| GM-30 | Cấp NearbyState và renderMap thật; app gọi Places sau winner, permission/config/key restrictions/quota/attribution và external actions | Có/rỗng/lỗi/offline/quyền bị chặn, GPS off, bad/missing coordinates, Maps failure, đổi result khi request đang chạy, winner giữ nguyên |
| GM-28 | Dùng projection/history đúng version; nối màn chi tiết vào flow theo quyền truy cập, không dựng điểm từ catalogue hiện tại | Legacy unscored, missing artwork/price, deleted/expired/outsider, winner/rank đã lưu vẫn ổn định |
| GM-31 | Cache/outbox/private restore theo authority producer; không dùng state hook của UI làm durable storage | Kill/restart/reconnect, stale result/place response, account isolation và phiên cũ giữ version |
| GM-33 | Tổng hợp Android visual/E2E/API, completion của AC thiết bị còn thiếu | Figma cùng viewport,320/360/412dp, font200%, TalkBack/48dp, Dark/Reduce Motion, in-app map/API thật |
| GM-34 | Nhận build/config/asset provenance/evidence để smoke APK/release | APK install/cold start/result routes, permission/map/external intent thật; Expo/bundle không thay APK |

Đây là hướng dẫn output, không thêm dependency hoặc đổi nhiệm vụ producer.
Trước claim/merge từng GM vẫn chạy checker của chính task và nhận Project Done.

## Input và hành động

- `ResultInput`: `scored-v4` hoặc `legacy-unscored-v1`. Wire tham chiếu
  `dish-session-v4/roadmap-v2/GM-07.B` và `.../GM-07.B-supplement`;
  policy `dish-decision-v4/ADR-019-30PCT-MIN1`. Kiểm schema/definitions và
  version thật ở producer, không xem type UI là wire contract mới.
- `ScoredResult`: resultId, status/round/reason/finalizedAt, winner,
  topDishes score/rank/isWinner, scoreVersion/rankingVersion và cohort.
  Supplement cần `round1BallotCount`; baseline thiếu không suy từ roster.
  Một winner rank1, deep-match locked projection; max3 món/dense rank.
- `ResultDish`: dishId/roundDishId/name, description/artwork/priceReference
  nullable. Không fabricated URI/giá0/giá theo người. Giá dùng locked
  reference có currency/unit/source/time hợp lệ, không fallback observation cũ.
- `readState`: ready/loading/finalizing/error/unknown. Unknown/invalid
  không suy ra NO_CONSENSUS; adapter tải lại cùng phiên, không finalize/reroll.
- `members`: chỉ label/ID của roster được phép xem; không phiếu thô/seed.
  Room/session ID giữ trong context riêng của consumer, không thêm vào DTO.
- `onHome`, `onNewSession`, `onRetryResult`: consumer quản lý navigation,
  tạo phiên mới và network. New session không mang ballot/receipt cũ.
- `nearby`: resultId/winnerDishId phải khớp result hiện tại. State/places
  chỉ public fields; thiếu tọa độ/khoảng cách là null, không biến thành0.
  Dữ liệu cached chỉ hiển thị khi có flag/nhãn phù hợp.
- `renderMap`: nhận resultId/winnerDishId/places/selectedPlaceId/onSelect.
  Chọn một quán trong renderer không đổi món thắng hoặc rank trên bục.
- `onRequestLocation`, `onOpenSettings`, `onRetryPlaces`: optional
  capabilities; không cấp thì disabled. Không xin GPS trước winner.
- `onExternalAction(kind,target)`: maps/tiktok/youtube; target gồm
  resultId/dishId/dishName và public place nếu có; trả `{ok}`/Promise.
  UI khóa thao tác pending, bỏ feedback trễ của result trước.

Viền chỉ theo isWinner. Bục theo rank; đồng hạng không tạo quyền chọn lại
winner trên client. “Tìm quán cho: …” luôn ghi tên winner đã persist.
`artworkSources` và map minh họa chỉ bootstrap mock cấp. Mock clip1.08
loại viền PNG baked; remote artwork mặc định scale1, không biến ảnh mẫu
thành catalogue production hoặc tuyên bố license đã được reviewer duyệt.

## Kiểm khi nhận và rollback

```powershell
npm --prefix mobile run typecheck
npm --prefix mobile test -- --runTestsByPath tests/integration/resultRoutes.test.tsx tests/component/dishResultEntry.test.tsx tests/component/dishResultPodium.test.tsx tests/component/nearbyResult.test.tsx tests/component/dishResultRecovery.test.tsx tests/component/winnerCelebration.test.tsx
```

Chạy từ repo root, rồi smoke Expo theo FINAL_HANDOFF và test API/native
của chính GM nhận. Giữ semantic validation sau wire decoder; reject
payload sai, không đổi thành fixture hoặc tự sort/repair response.

Giữ v2/v3, legacy regression và named exports khi thay adapter. Nếu cần
rollback integration, revert patch của consumer và giữ guard capability;
không bật mock trong real mode hoặc reset DB. GM-13 không có migration,
dependency/native package mới nên không cần rollback schema hay lockfile.
