# GM-13.2 — kiểm đầu vào và độ phủ UI mẫu

Ngày **2026-11-03**, branch `codex/gm-13-figma-update`, base main
`7e24074`. Chỉ kiểm đầu vào/lập kế hoạch; chưa triển khai UI mới.

## Kết luận

**Đủ điều kiện bắt đầu UI mock độc lập.** Start gate live trả
READY_TO_CLAIM, owner Tuấn/reviewer Trí. Main đã nhận GM-10/PR #148;
không cần mang code từ nhánh GM-13 cũ sang hoặc chờ task tích hợp.

**Bộ PNG hiện có đủ tham chiếu các màn chính/biến thể bắt buộc của GM-13.**
Không có thư mục gm-13 riêng; ảnh cần thiết nằm trong gm-09 và gm-10,
đã mở ảnh và phóng to từng vùng, không kết luận từ thumbnail/tên file.
Không cần người dùng export lại cả bộ trước khi bắt đầu.

Chưa thể ghi đủ design context/variables/revision live hoặc assets lẻ:
MCP `create_session` tại file gốc `3Ysh0mOAEkAgA5DgZPSC1j` trả lỗi
“don't have edit access”. Đã kiểm whoami theo hướng dẫn công cụ;
không tạo session/file mới hoặc sửa Figma. Đây là hạn chế truy cập live,
không phải bằng chứng thiếu màn. PNG là fallback đã được người dùng cho
phép trong chuỗi cập nhật UI; không đổi AC để che giới hạn.

## Artifact đã nhận

| Nguồn | Hiện trạng và việc cần giữ |
| --- | --- |
| GM-05 | Tokens xanh/kem, Inter, AppHeader/AppButton/StatusNotice và ResultPodium có trên base; podium hiện chưa bảo đảm toàn bộ visual Figma, phải kiểm cấu hình/consumer |
| GM-07 TypeScript | Barrel contracts và `contracts/voting.ts` còn RoomResult legacy decision-v2, winner-only; chưa có Top3/cohort trong type này |
| GM-07.B và supplement | Có spec, JSON schemas, GM07B_HANDOFF_2026-10-28; score/rank projection đã định nghĩa. Đây không tự cấp mobile adapter hoặc chứng minh DB đang chạy đúng schema |
| ADR-020/UI_SPEC/task GM-13 | Tối đa 3 món, dense rank, winner riêng, cohort bound, legacy ẩn dữ liệu không có, Places chỉ sau winner |
| GM-10 mới | Entry và setup trên main7e24074; Tạo phòng mới phải đi theo flow hiện hành, không giữ đường tạo phòng legacy vì tên route cũ |
| Source GM-13 baseline | ResultScreen/NoConsensusScreen/model, resultPreview/resultFixtures và routes result/no-consensus vẫn dùng winner/offering/anchor legacy; cần chuyển callers/tests cùng UI mới |
| GM-27/30 | Task nhận result thật và Places/map thật; không phải dependency ngược để dựng mock GM-13 |

Locked Expo check trên node_modules hiện có: **Pass**, SDK58.0.19,
manifest/lockfile/installed dependencies khớp ở lượt kiểm offline. Không
cài/nâng package và không coi đây là Android visual/native acceptance.

## PNG đã kiểm trực tiếp

Đường dẫn tính từ `.work/figma-reference/`; raw PNG/crops vẫn local ignored.

| Nguồn | Kích thước | Độ phủ |
| --- | --- | --- |
| `gm-10/03 - Màn hình/11 · Vinh danh/Kết quả/Bản đồ.png` | 15700×2278 | Finalizing, vinh danh, 1/2/3 món, map empty/error, lỗi kết quả, R1/R2 NO_CONSENSUS, xin quyền vị trí |
| `gm-09/02 - Components/09 · Bục kết quả/Bản đồ.png` | 9792×1152 | Podium 1/2/3 món, map/card và Places loading/empty/error/permission |
| `gm-09/02 - Components/GCD/Result Podium · Đồng hạng.png` | 3152×816 | 1–1, 1–1–2, 1–2–2, 1–1–1, nhãn winner riêng |
| `gm-09/02 - Components/GCD/Winner Badge.png` | 200×44 | Nhãn Món được chọn |

Group màn chính đã chia 5 vùng đọc local ở
`.work/gm13-reference-inspection`, tọa độ x=0/3200/6400/9600/12800,
y=0, cao2278. Crops chỉ dùng đọc, không đưa vào code làm screenshot UI.
Hash original và artifact upstream ở [INPUT_MANIFEST](INPUT_MANIFEST.json).

## Frame/state → mẫu đã có

| Yêu cầu | Tham chiếu local | Kết luận |
| --- | --- | --- |
| Đang chốt/lỗi tải kết quả | Màn Kết quả — Đang chốt/Lỗi tải kết quả | Có |
| Vinh danh có nút/hành động bỏ qua | Màn Vinh danh và biến thể 1/2 món | Có |
| Top3 và 1/2 món | Màn Top3/Còn1/Còn2, component podium | Có, cần sửa lỗi đồng hạng nêu dưới |
| Đồng hạng đầu/cuối/tất cả | Component Đồng hạng | Có |
| EMPTY_INTERSECTION, R1 kết thúc không mở R2 | Màn Chưa đồng thuận và N=0 | Có |
| ALL_REMOVED, kể cả N=1 loại món cuối | Màn Kết thúc vòng2 | Có |
| Places/map có dữ liệu/loading/empty/error | Màn map và component Nearby Places State | Có |
| Cần bật vị trí | Màn xin quyền + component location | Có |
| Back/Home/Tạo phòng mới, Maps/TikTok/YouTube | CTA trên màn kết quả | Có, hành động mock/integration phân biệt rõ |

Các node gốc từ task map: `330:3075`, `379:1401`, `617:1671`,
`617:1428`, `379:1478`, `622:8962`. Đây là mapping đã bàn giao, không
ghi đã xác minh live lại trong lượt này. Router/QA cuối ảnh không được
dùng làm màn sản phẩm; footer cố định chỉ tham khảo khi xử lý safe area.

## Sai khác và phần cần bổ sung khi thực hiện

1. **Mẫu Còn2 có hai món cùng4 điểm nhưng ghi hạng1 và2.** Task/ADR
   ưu tiên hơn mẫu: fixture và UI đúng phải cùng hạng1, cùng chiều cao,
   winner vẫn có nhãn riêng. Client không tự tính lại rank response thật.
2. **Nhãn winner có vùng bị card Cùng ăn che trong một số mẫu.** Khi
   bố trí phải giữ nhãn đọc được và không đè component, kể cả font200%.
3. **Thiếu ảnh/giá và legacy unscored:** chưa thấy frame riêng trong bộ
   đã kiểm. Bổ sung fallback theo token/pattern hiện có; không bịa ảnh,
   giá0, điểm hoặc cohort. Giá chỉ hiện khi đủ điều kiện từ projection.
4. **Quyền từ chối lâu dài/dịch vụ vị trí tắt/offline/mất capability:**
   mẫu xin quyền và empty/error đã có; các biến thể này cần thêm UI state
   theo pattern đó, không cần export lại các màn chính.
5. **Assets lẻ chưa đầy đủ:** có logo/icon/font và bowl tham chiếu từ
   GM-09; chưa có bộ riêng result/map/laurel/ảnh món trong assets app.
   Bước triển khai phải chuẩn bị asset nhỏ/provenance/geometry hoặc dùng
   fallback được phép cho dữ liệu nullable. Có đủ ảnh mẫu không đồng
   nghĩa mọi asset đã sẵn sàng để import hoặc có quyền dùng production.
6. **Nền dữ liệu mới:** không thêm score/Top3 vào RoomResult legacy bằng
   cast; nhận projection versioned qua UI boundary. Fixture mock có ACK
   cohort rõ; baseline B thiếu cohort không được tự điền từ memberCount.
   Adapter và kiểm SQL/device thật thuộc task tích hợp nhận tiếp.

Không phát sinh yêu cầu bổ sung màn Figma bắt buộc trước khi bắt đầu mock.
Nếu cần asset giống tuyệt đối hoặc xác minh revision mới thì cần asset
gốc/context truy cập được; hiện không yêu cầu người dùng export lại.

## Trạng thái kiểm

Nhánh mới, live start gate, source/artifact inventory, PNG visual audit và
locked Expo compatibility đã kiểm. UI mới, mobile regression/export,
Android/Expo Go, accessibility và API/Places integration: **Not run trong
lượt lập kế hoạch**. Không kế thừa device Pass của GM-13.1/SDK57.

Kế hoạch và commit dự kiến: [PLAN](PLAN.md). Chưa commit/push hoặc đổi
approval/status/assignee/deadline trên Project.

Kiểm hồ sơ: repository validator, task indexes và diff Pass. Python
regression 657 tests/113.035s: 650 Pass, 6 skipped, 1 Error quyền symlink
Windows (WinError1314 ở setup test_stage_refuses_symlink_output), không
assertion failure. Đây là lỗi môi trường đã ghi ở GM-10, không sửa test
hoặc đổi quyền OS trong lượt chuẩn bị. Kết quả máy đọc trong manifest;
không suy kiểm hồ sơ thành UI/native/API Pass.
