# GM-13.2 — kế hoạch cập nhật UI kết quả theo Figma

**Tiến độ:** đã triển khai bước1–6; kết quả cuối và giới hạn ở [HANDOFF](HANDOFF.md)/[CHECKS](CHECKS.md). Bước7 kiểm thiết bị chờ thực hiện. Nội dung kế hoạch ban đầu bên dưới giữ mốc chuẩn bị để truy vết.

Ngày lập: **2026-11-03**, múi giờ Asia/Bangkok. Owner Tuấn, reviewer Trí
(`ThanhTris`). Task [GM-13](../../../../../tasks/backlog/GM-13.md), issue #74,
revision `ui-figma-final/2026-10-25/GM-13.2`.

Nhánh mới `codex/gm-13-figma-update` được tạo trực tiếp từ `origin/main`
`7e24074ac473c54d31c5c336df09d5a3a0e682c5`, đã gồm GM-10/PR #148.
Không lấy nhánh GM-13 cũ làm base; không xóa hoặc sửa nhánh đó.

Start gate live `2026-11-02T18:01:06.207596+00:00` (03/11 theo UTC+7):
**READY_TO_CLAIM**, owner Tuấn/reviewer Trí. Dependency GM-05 và GM-07
được checker xác minh từ Project, không dùng local/cache làm fallback.
Đây là gate chuẩn bị, không phải nghiệm thu GM-13 hoặc quyền merge.

## Đầu vào và phạm vi

Đọc [audit đầu vào và thiết kế](INPUT_AUDIT.md) và
[manifest](INPUT_MANIFEST.json) trước triển khai. Bộ PNG GM-09/10 đủ
tham chiếu các màn chính và biến thể podium; không cần export lại cả bộ.
MCP file gốc chưa truy cập được, nên chưa xác minh revision/variables live.

- Dựng UI mock winner, podium, vinh danh, finalizing/lỗi, NO_CONSENSUS
  và Places/map states theo token xanh/kem, Inter và components hiện có.
- Winner/rank/score/order dùng projection đầu vào; không tính ballot trên
  client, reroll kết quả, bịa Top3 hoặc backfill legacy.
- Map trong app mock có khung/marker/card và nhãn mô phỏng. Google Places,
  map thật, key/restrictions/attribution/permission native do GM-30 nhận;
  GM-27 nối result thật. Link Maps chỉ là hành động hỗ trợ, không thay
  map trong app hoặc được ghi thành integration Pass.
- Không thay package/lockfile, SQL/API/engine hoặc quyền riêng tư. Dùng
  callback/port nhận capability đúng version khi producer đã bàn giao.
- Mỗi bước code là một commit có kiểm tra tương ứng. **Tại thời điểm lập kế hoạch chưa
  thực hiện các bước code; tiến độ hiện hành ở HANDOFF/STEP1–STEP6.**

## Bước 1 — Chuẩn hóa input UI và fixture

Tách presentation input khỏi `RoomResult` legacy đang chỉ có winner.
Đối chiếu schema/handoff GM-07.B và supplement; định nghĩa boundary cho
result, read state, own/authorized roster, Places/map state và callbacks.
Không sửa wire DTO GM-07 để ép khớp UI hoặc tự tạo API.
Room ID phục vụ routing nhận riêng từ session/context; không tự thêm
roomId/sessionId vào terminal result DTO v4 vốn không có các trường đó.

Tạo fixture synthetic cố định: 1/2/3 món; đồng hạng đầu/cuối/tất cả;
winner thuộc Top3; thiếu ảnh/giá; legacy unscored; kết quả không hợp lệ;
NO_CONSENSUS hai lý do và các state bản đồ. Fixture scored có cohort ACK
R1 rõ để kiểm `score <= 2 * round1BallotCount`.

Phân biệt baseline B chưa bắt buộc cohort với supplement có cohort; không
suy số ACK từ roster hoặc điền số 0 khi thiếu. Không xem baseline B là
legacy unscored chỉ vì thiếu cohort.

**Kiểm:** fixture hợp lệ/không hợp lệ, dense rank, winner deep-match,
nullable, NO_CONSENSUS winner null/Top3 rỗng, legacy không bịa điểm.

**Commit dự kiến:** `refactor(gm13): define result presentation inputs and fixtures`

## Bước 2 — Podium và màn kết quả 1/2/3 món

Đánh giá/tái dùng `shared/ui/result/ResultPodium.tsx`; mở rộng có kiểm
consumer nếu cần. Dựng ảnh/fallback, tên món, điểm, bục theo hạng và nhãn
**Món được chọn**. Giữ thứ tự projection, cùng hạng cùng chiều cao;
không tự xếp hạng lại dữ liệu thật để sửa một response sai.

Chuẩn bị assets nhỏ có provenance và kiểm geometry; không dùng whole PNG
làm màn app. Giữ bố cục trên màn hẹp/chữ lớn, không che nhãn winner dưới
card Cùng ăn. Chỉ dùng roster đã được phép xem, không lộ lựa chọn cá nhân.

**Kiểm:** 1/2/3 món, tie 1–1, 1–1–2, 1–2–2, 1–1–1, text dài,
thiếu ảnh/giá; regression shared components nếu thay props/styles.

**Commit dự kiến:** `feat(gm13): build result podium and winner presentation`

## Bước 3 — Vinh danh món thắng và chuyển động

Dựng overlay vinh danh cho kết quả đã xác nhận, hỗ trợ 1/2/3 món. Có
hành động đóng/bỏ qua rõ ràng, không chặn đọc kết quả hoặc lặp lại khi
refetch cùng result. Tách nền fade khỏi panel/motion và hỗ trợ Reduce Motion.

Chỉ hiển thị nội dung đã có trong projection; không có timer tự chốt,
đổi winner hoặc chọn lại món trên máy.

**Kiểm:** mở/đóng, bấm nhanh, Back, unmount và refetch giữ cùng kết quả;
kiểm native motion trong bước 7, không suy từ unit test.

**Commit dự kiến:** `feat(gm13): add winner celebration and accessible dismissal`

## Bước 4 — Chưa đồng thuận, đang chốt và lỗi kết quả

Dựng riêng finalizing/loading, lỗi đọc có retry, unknown/invalid và hai
kết thúc hợp lệ: `EMPTY_INTERSECTION` ở R1, `ALL_REMOVED` ở R2.
NO_CONSENSUS không có winner/score/podium/Places; lỗi đọc không được
chuyển thành kết luận chưa đồng thuận. Không vòng ba, không mang phiếu cũ,
không giữ câu chữ ready legacy trong màn mới.

**Kiểm:** reason/round đúng, không lộ người NO, retry không đổi result,
Tạo phòng mới/Home/Back không về sửa phiếu phiên đã kết thúc.

**Commit dự kiến:** `feat(gm13): cover finalizing and no-consensus states`

## Bước 5 — Khung Places/map và hành động sau winner

Dựng UI mock có khung bản đồ trong app, marker/card, đang tải, rỗng,
lỗi/retry, cần quyền, từ chối và không có capability. Map/Places lỗi giữ
nguyên winner/score. Tách callbacks request location, retry, mở Maps và
các nút tìm nội dung TikTok/YouTube theo mẫu; mock không gửi request thật.

Không bịa quán/khoảng cách/nguồn hoặc xin GPS trước khi có winner. Để
điểm inject map/capability cho GM-30; không thêm native dependency để
vượt phạm vi. Giá chỉ khi projection đủ điều kiện, không quy đổi giá/người.

**Kiểm:** chỉ sau DECIDED, đầy đủ state transitions, loading khác empty,
external action lỗi/disabled, callback đúng winner, không reroll result.

**Commit dự kiến:** `feat(gm13): add nearby places and map presentation states`

## Bước 6 — Routes, compatibility, regression và handoff

Chuyển entry sản phẩm mock `/room/result` và `/room/no-consensus` sang UI
mới; kiểm caller từ Foundation và flow hiện có. Công cụ QA nằm development,
lọc case theo màn, mặc định gọn. Real mode thiếu adapter phải có guard;
API lỗi không âm thầm fallback mock.

Tạo phòng mới đi qua entry/form GM-09/10 hiện hành bằng callback phù hợp,
không tự tạo phòng hoặc nối synthetic ID sang client thật. Chỉ bỏ source
legacy khi đã chuyển hết route/import/tests và không còn consumer; giữ
regression API/engine/version cũ và evidence lịch sử.

Cập nhật CHECKS/HANDOFF/FIGMA_PARITY + manifest source và mapping task
nhận GM-27/30. Chạy TypeScript, source lint, architecture, full mobile,
locked Expo check, Android export và kiểm repo/Python phù hợp; ghi riêng
lỗi môi trường có sẵn, không đổi runner/timeout/assertions để làm xanh.

**Commit dự kiến:** `refactor(gm13): connect result routes and prepare integration handoff`

## Bước 7 — Expo Go, sửa lỗi và chuẩn bị review

Sau bước 6, kiểm trên thiết bị: vinh danh/đóng; 1/2/3 món và tất cả tie;
hai NO_CONSENSUS; finalizing/lỗi/retry; map grant/deny/empty/error;
Tạo phòng mới/Home/Back; 412dp cùng reference, thêm 320/360dp, font200%,
TalkBack, Dark capability, Reduce Motion và safe area.

Ghi device/build/commit, expected/actual và ảnh sau sửa nếu có. Fix theo
nhóm lỗi và commit riêng, cập nhật hash/checks sau source cuối. Những ca
chưa chạy giữ Not run; xác nhận chung không tự thành Pass từng ca.

**Commit dự kiến:** `fix(gm13): address Expo feedback and finalize handoff`

Trước PR/merge: cập nhật main, chạy merge gate, kiểm upstream artifact,
test cần thiết sau tích hợp; Trí review/nghiệm thu. Không tự đổi Done.

## Lệnh khi bắt đầu code

```powershell
git branch --show-current
python scripts/task_readiness.py --task GM-13 --base-ref origin/main
npm --prefix mobile ci --no-audit --no-fund
npm --prefix mobile run check:expo
npm --prefix mobile start -- --clear
```

Không chạy `npm ci` hoặc full mobile chỉ để lập kế hoạch. Lượt chuẩn bị đã
kiểm locked Expo offline trên node_modules hiện có; bước code phải nhận
đúng lockfile và chạy kiểm tra theo baseline.
