# Rà main, task và source theo Figma — 2026-10-28

## Kết luận và phạm vi

Baseline: main `1bf28d8a9b2e0030c5137fa64c2d0d76fd130a16`, local/remote khớp khi bắt đầu. Đọc 40 card Project, các task roadmap-v2, PR đã merge, source mobile/BE/Data và handoff Figma. Trí yêu cầu dùng **Needs Update**, chỉ **Done** mới mở dependency. Đây là rà soát và cập nhật phần việc; không phải nghiệm thu visual, Android hoặc deploy production.

- Cả **20 task UI** có node đầu vào trong task local và Issue; trường `Figma UI` trên Project đã có. **66 node khác nhau** được kiểm qua Figma MCP ngày28/10 đều tồn tại. G01–G05 đã có frame; không giao vẽ lại bộ thiết kế.
- Main **chưa thay toàn bộ UI** theo Figma. PR #137 có Inter/SDK58, token xanh và Home một phần; PR #109/117/120/121/122/128/119/124 vẫn là baseline có phần UI/consumer cũ. PR đã merge không đồng nghĩa supplement Figma đã nghiệm thu.
- **Source cũ chưa xóa hết**, nhiều file còn được route/import/test dùng. Việc thay/xóa được giao ngay trong từng task UI: thay màn → chuyển route/import/fixture/test → kiểm → bỏ code UI cũ không còn consumer. Không xóa migration, engine/API v2/v3 đã pin hoặc evidence/regression legacy.
- Runtime BE v4 đã có ở0027–0031; `dish_v4_private` là authority đang dùng. PR #136 thêm `gm06_canonical` độc lập/schema0.10.0; GM-20/21 còn phần nối writer/reader. Không lấy số schema mới làm bằng chứng API đã chuyển storage.
- Phát hiện thêm lỗi GM-19 trên main; chuyển Done → Needs Update. Các task nền còn Done không tự mở lại vì UI chưa dựng xong.

## Thiết kế kiểm trực tiếp

Nguồn: [scope đã chốt](../design/UI_SCOPE_CONFIRMED_2026-10-25.md), [final handoff](../design/UI_FINAL_HANDOFF_2026-10-25.md), [task map](../design/UI_FIGMA_TASK_MAP.json).

| Node | Nội dung đọc trực tiếp | Điều kiện cho code |
|---|---|---|
| [43:106](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=43-106) | Buổi/giờ,10–20 món, ngân sách, ưu tiên gần đây | UI setup dish-only; ranking nâng cao không chặn core; giá giữ đúng đơn vị |
| [68:429](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=68-429) | Host/member, sửa thiết lập, khẩu vị, Bắt đầu | Không nút ready, host-only settings/start |
| [638:9369](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=638-9369) | Còn1 món, loại tối đa1, gửi lựa chọn | R2 thật khi N=1, cho REMOVE/no-REMOVE |
| [298:2309](https://www.figma.com/design/3Ysh0mOAEkAgA5DgZPSC1j?node-id=298-2309) | Đăng nhập/đăng ký/khách | Core guest theo GM-09/25, auth account/recovery giữ P1/GM-35 |

Đây là kiểm tồn tại node/nội dung và đối chiếu source. Không chạy app hay so pixel trong lượt này; task implementation vẫn phải dùng design context, asset/screenshot và visual evidence riêng. `beforeStatus/afterStatus` trong map là snapshot kế hoạch ngày25/10, không phải status live.

## Source cũ còn được dùng và task thay thế

| Phần | Source trên main | Task chịu trách nhiệm | Chưa khớp |
|---|---|---|---|
| Nền/fonts | `mobile/src/bootstrap/AppFontProvider.tsx`, `_layout.tsx`, assets/fonts | GM-02 | Giữ nền đã nhận; không dựng lại provider/router |
| Components/Home | `shared/ui/components.tsx`, `shared/theme/tokens.ts`, `Gm25HomeScreen.tsx` | GM-05/09 | Mới partial Figma; chưa visual toàn bộ states |
| Context/preferences | `ContextScreen.tsx`, `ContextDraftFields.tsx`, `PreferencesScreen.tsx` | GM-10 | Còn anchor/coverage/radius, ready text; thay setup dish-only |
| Lobby | `LobbyScreen.tsx`, `Gm25LiveLobbyScreen.tsx` | GM-11/25 | Còn nút ready, all-ready gate và suy presence từ ready |
| Vote/R2 | `VoteScreen.tsx`, `FinalRoundScreen.tsx` | GM-12/26 | UI danh sách/batch cũ; REMOVE-all chưa theo cap, chờ/ACK cần producer v4 |
| Result | `ResultScreen.tsx`, `ResultOfferingCard.tsx`, `NoConsensusScreen.tsx` | GM-13/27/30 | Winner-only/offerings legacy; chưa podium/Places-map theo handoff |
| Social/history | `FriendsScreen.tsx`, `InboxScreen.tsx`, `HistoryScreen.tsx` | GM-14/28 | Mock/summary legacy, cần G01–G03 và persisted Top3 |
| Preview pool | `Gm24ContextScreen.tsx`, roomSetup/useRoomSetup | GM-24 | Luồng location/coverage cũ cần thay dish-only |
| API consumer | `mobile/src/data/api/client.ts`, contracts/guards/mock và roomRepository | GM-25/26/27/28 nhận GM-07 | Client còn legacy RPC/setReady; không tự động dùng v4 vì DB đã có |
| QA/demo | `foundation`, `components`, `features`, `internal/gm16`, `internal/gm25` | Task sở hữu + GM-33/34 | Giữ dev/regression; không biến router QA thành màn sản phẩm |

Path rút gọn trong bảng thuộc `mobile/src/features/` nếu là tên screen. Danh sách path chi tiết và AC thay/xóa đã bổ sung trong20taskUI. Dịch vụ vị trí có thể tái dùng cho Places/GM-30; không xóa package/location một cách tự động. Dark redesign vẫn hoãn.

## GM-19: ba ca chưa đạt trên main

Đã chạy trên PostgreSQL mới, network Docker nội bộ/không publish cổng, apply toàn bộ migrations đến0032, catalogue/user tổng hợp. Gọi RPC bằng role authenticated/caller riêng; không đọc credential hay dữ liệu ứng dụng.

| Ca | Expected | Actual | Kết quả |
|---|---|---|---|
| Member thường sửa settings host | NOT_HOST, không đổi dữ liệu | Accepted, dishCount10→11 | Fail/P1 |
| Host gửi settings y hệt, requestId mới | Pool/roundDishIds/poolVersion giữ nguyên | PoolVersion2→3, món và roundDishIds đổi | Fail/P2 |
| Host chỉ sửa desiredAt | Chỉ giờ/room version đổi; pool giữ nguyên | PoolVersion3→4, món và roundDishIds đổi | Fail/P2 |

Nguyên nhân: [0027 dispatch](../../supabase/migrations/0027_dish_session_v4.sql) guard host chỉ gồm start/cancel/finalize; nhánh updateSettings luôn tạo pool với seed gắn room version và tăng poolVersion. Viết migration tiến, không sửa0027 đã merge. GM-19 bổ sung guard/no-op/input pool; GM-32 nhận regression. GM-17 nhận kiểm quyền khi review nhưng không tự mở thêm task bảo mật trùng lỗi.

Evidence local: `review-results/main-ui-audit-20261028/gm19-findings.json`, script `review-results/audit-ui-main-20261028.py`. Bộ compatibility HTTP có sẵn vẫn đạt27/27, legacy SQL parity140vectors; nó chưa phủ các ca GM-19 bổ sung. Cleanup xác nhận chỉ network/container/tmpfs QA vừa tạo đã được dọn. Không tuyên bố đã sửa lỗi runtime trong lượt này.

## Quyết định task/Project

| Task | Kết quả rà / phần làm tiếp | Status sau rà |
|---|---|---|
| GM-00/01 | Baseline lịch sử/roadmap, cardGM00 aliasGM01 | Done |
| GM-02 | PR137 fonts/SDK/nền route, không nhận toàn bộ visual | Done |
| GM-03 | PR137 QA runner, owner đã nhận phạm vi và giới hạn; binding limitation vẫn ghi trong handoff | Done |
| GM-04 | Field legacy đã nhận; catalogue mới thuộcGM40 | Done |
| GM-05 | Component Figma/variants/visual còn thiếu | Needs Update |
| GM-06 | PR136 storage độc lập đã nhận; integration thuộcGM20/21 | Done |
| GM-07 | B schema/examples/semantic checker còn phần chưa khép | Needs Update |
| GM-08 | Baseline import đã nhận; không mở lại theo UI | Done |
| GM-09/10/11/12/13/14 | Dựng lại phần UI nêu ở bảng source theo Figma | Needs Update |
| GM-15 | Domain policy/parity supplement | Needs Update |
| GM-16 | Auth/session nền, account/recovery P1 thuộcGM35 | Done |
| GM-17 | ACL/consent baseline và v4 hiện hành; review tích hợp storage cùng producer | Done |
| GM-18 | Catalogue/projection/preview supplement | Needs Update |
| GM-19 | Host settings guard + stable pool đã tái hiện lỗi | **Done → Needs Update** |
| GM-20/21 | Authority/adapter/writer-reader integration sauPR136 | Needs Update |
| GM-22/23 | Invite/inbox canonical reference/version/ACL supplement | Needs Update |
| GM-24/25 | Đổi consumer legacy sang dish-only/v4 và Figma | Needs Update |
| GM-26/27 | Ballot/result integration, nhận producer đúng version | Todo |
| GM-28/29 | PR126/127 đang Review, bổ sung đúng UI/API/native scope | Review |
| GM-30/31 | Native Places/links; cache/outbox/reconnect | Todo |
| GM-32 | Regression v4/storage và ca GM19 mới | Needs Update |
| GM-33/34 | QA Android visual/API rồi release | Todo |
| GM-35 | P1 account/profile/recovery | Todo |
| GM-36/37/38 | P2 giữ scope và trạng thái live, chưa đổi trong lượt này | Needs Update (đã có) |
| GM-39 | Handoff Figma đã có, hỗ trợ consistency/kiểm thiết kế | In Progress |
| GM-40 | Catalogue projection/nullable/coverage theo supplement | Needs Update |

Chỉ GM-19 chuyển cột trong lượt rà này; các task UI chưa đạt đã ở Needs Update/Review/Todo phù hợp. Không chuyển task chưa làm sang Needs Update. Owner, priority và deadline giữ nguyên. Đây là snapshot ngày28/10; gate luôn đọc Project live.

## Thứ tự thực hiện

1. GM-07 đóng artifact B/checker; GM-05 hoàn thiện component Figma trên nềnGM02. GM-40 bàn giao projection/dữ liệu theo phạm vi riêng.
2. BE/Data producer xử lý phần supplement đang mở; GM-19 sửa quyền/settings, GM-20 chốt mapping/authority và writer, GM-21 nhận writer để nối history. Chỉ dùng producer Done/đúng artifact, không tự đoán schema từ màn mẫu.
3. GM-09..14 dựng các màn/states theo component đã bàn giao; nhận input theo start gate và phạm vi task. GM-24/25 rồi GM-26/27, social/push/native/cache theo producer đã sẵn sàng.
4. Mỗi PR UI thay source/route/test trong phạm vi của mình và ghi phần đã bỏ; không xóa toàn bộ mobile trước khi có bản thay. GM-33 kiểm UI–API và visual, GM-34 release.

Không thêm dependency ngược số task. Artifact supplement nhận từ nhánh đích/PR được review, status Done không tự thay bằng chứng phù hợp version. Chỉ Done mở dependency theo xác nhận Trí ngày28/10; AGENTS cũ cho Needs Update đã được đồng bộ lại với checker/ADR-011.

## Giới hạn kiểm và bàn giao

Kết quả kiểm cuối ngày 28/10:

- Đã cập nhật và đọc lại xác nhận 33 Issue bodies; đối chiếu đủ 40 card Project. Chỉ Status của GM-19 đổi từ Done sang Needs Update; assignee và các trường PR review/Figma UI/Follow-up giữ nguyên. Không thực hiện mutation deadline.
- Bộ Python chạy 611 tests: thành công, 6 skipped. Validator repository và task indexes đạt.
- Kiểm schema B độc lập của GM-07 vẫn Fail: fixture NO_CONSENSUS có `scoreVersion=want2-ok1-round1-v1` nhưng schema yêu cầu null. Kết quả Python chung không thay thế lỗi riêng này; GM-07 tiếp tục Needs Update.
- HTTP compatibility hiện có đạt 27/27; ba ca GM-19 bổ sung Fail như bảng trên. Chưa sửa runtime và chưa chạy kiểm giao diện trên Android.
- Evidence đồng bộ local: `review-results/main-ui-audit-20261028/sync-verification.json`; log Python và schema B nằm cùng thư mục. Các file này không đưa lên Git.

Trong lượt này: audit source/task/PR, đọc node Figma, chạy QA regression chọn lọc và validator tài liệu. Không chạy visual app/Expo Go/Android, không sửa FE/SQL runtime, không deploy/migrate DB ứng dụng. Báo cáo/task/AGENTS sửa local chờ yêu cầu push; Issue bodies/Project được cập nhật theo yêu cầu rà giao việc. Source cũ còn dùng được ghi rõ, không tuyên bố đã xóa hoặc UI đã làm mới.
