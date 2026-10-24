# Phần việc bổ sung BE/Data — 2026-10-24

Trí chọn **tạo PR yêu cầu bổ sung để người đang phụ trách làm tiếp**, chưa code các phần thiếu.
Các gói dưới đây thuộc task cũ, không tạo task mới, đổi assignee/Deadline hoặc mở lại Done.
Baseline: main033693c, schema0.8.0, dish-session-v3/ADR-019, catalogue1.1.0.
[Audit source và Project](BE_DATA_AUDIT_2026-10-24.md) · [ADR-019](../architecture/decisions/ADR-019-dish-first-room-policy.md).

Mỗi implementation PR phải có scope, version, CHECKS và HANDOFF supplement riêng. Giữ evidence lịch sử.
Đợt này chỉ hợp đồng BE/Data; không sửa màn, mobile client hoặc task UI.

## Luật pool/vòng 2 đã chốt — 2026-10-24

Clarification mới nhất của Trí áp dụng cho supplement v4 và implementation task BE/Data dưới đây; không thay runtime v2/v3 đang chạy. Pool create/ROUND_1 vẫn phải đủ đúng `dishCount` món unique (10–20). Khi hoàn tất vòng1, server kiểm tra winner trước. Nếu đã có winner, chốt `DECIDED`. Nếu chưa có, pool vòng2 là pool ban đầu trừ **hợp tất cả dish NO** trong ballot vòng1 hoàn chỉnh đã ACK. Không tính ballot thiếu/nháp, không thêm món bù.

- 0 survivor: chốt round1 `NO_CONSENSUS/EMPTY_INTERSECTION`; không tạo ROUND_2/WAITING_2, pool vòng2 rỗng hoặc timer vòng2.
- 1–20 survivors: mở vòng2 với đúng survivor set; pool có thể dưới10. Đây không phải lỗi thiếu catalogue/GM-40.
- Vòng2 N=1: bỏ thao tác REMOVE. N>=2: mỗi người được REMOVE tối đa `max(1, floor(0.30*N))`; KEEP toàn bộ hợp lệ. Nếu cả nhóm loại hết thì chốt `NO_CONSENSUS/ALL_REMOVED` ở round2.
- Snapshot terminal no-consensus trả `winner=null`, active candidate pool rỗng và reason/round ổn định. Lịch sử/event chỉ tham chiếu terminal result, không dựng winner giả.
- Phiên đang chạy/legacy giữ contract và policy đã pin; triển khai cần contract/policy version và migration tiến.

Task UI có ghi luật hiển thị vòng2 theo bản cũ. Giữ nguyên task UI trong đợt này theo yêu cầu Trí; đồng bộ sau khi chốt UI, không lấy nội dung UI cũ làm policy cho BE.

## Thứ tự và đầu vào

| Mốc | Người / task hiện hành | Đầu vào trước làm | Điều kiện tích hợp/merge | Song song |
| --- | --- | --- | --- | --- |
| A — Contract | Trang GM07; owner từng API góp ý | Main033693c, audit, quyết định30% | Chốt version, schema, errors và những quyết định privacy cần thiết với Trí | Data inventory, thiết kế upgrade |
| B — Pool/lifecycle | Tâm GM18, Trí GM19 | A phần create/preview/snapshot; bundle GM40 | HTTP từ snapshot, exact count, auth/retry; không quán | C và thiết kế D/E |
| C — Engine/result | Vinh GM15/20, Trí GM17 | A phần policy/waiting/terminal | Parity30%, phiên cũ không đổi, terminal contract | B, phần độc lập D/E |
| D — History | Tâm GM21, Trí GM17 | A history/consent + seam terminal C | Writer C + kiểm ACL/retention/mixed-policy | E và F |
| E — Social/event | Trí GM22 rồi GM23 | A invitation/event, B admission, C terminal | Accept mới trước kiểm inbox đầy đủ; event đúng một lần | D và F |
| F — Data/môi trường | Vinh GM40, Tâm GM06, Trí GM03 | Bundle/manifest/0026 + A projection | Migrations B/C cuối, loader/worker đã kiểm, Auth+REST cùng origin | B–E, không chờ UI |
| G — Regression | Vinh GM32 | A và runners hiện có | Có SHA/schema/dataset thật của B–F; thiếu phần nào ghi Not run | Viết cases từ A, chạy khi producer bàn giao |
| Sau đó — UI/Android | Theo phân công hiện tại | BE/Data bàn giao và UI được Trí chốt | Kiểm thiết bị đúng scope | Không sửa task UI đợt này |

Không thêm dependency ngược GM40 vào task số nhỏ. Metadata dependency của baseline giữ nguyên.
**Gate của phần bổ sung là artifact/PR mới ở bảng trên**, không lấy Done của baseline làm bằng chứng supplement đã xong.
HANDOFF phải ghi SHA/version và kiểm nhận đầu vào. Nếu stacked PR, chỉ merge consumer sau khi producer vào target và đã chạy lại kiểm tích hợp.

## GM-07 — Trang: hợp đồng dùng chung

Đầu vào: API0026, dictionary/manifest GM40, quyết định cap30%.

- Viết schema/request/response/error examples có version. Phân biệt decision-v2, dish-v3 hiện hành và policy mới; không đổi nghĩa v3 tại chỗ.
- Snapshot tối thiểu: roomId, state, version, policyVersion, round, **poolVersion**, pool, catalogueVersion/catalogueSha, ownBallot/ownWaiting, submittedCount, deadline/serverTime/result. Không dùng round thay poolVersion.
- Phân biệt ACK lịch sử khi replay với snapshot mới nhất. RequestId ổn định; waiting chỉ sau phiếu đủ đã ACK và vào chờ, không bắt đầu timer từ submit.
- Chốt preview/filter/giá/nullable/unknown và discriminator result/history/event. Budget, flavor, thời gian hẹn, avoidRecent chỉ được bật sau khi có semantics thống nhất; không nhận rồi bỏ qua.
- Top3: đề xuất rank/score/scoreVersion, tập món được công bố, tie-break, 0–3 món và quyền xem ở nhóm ít người. Trí duyệt privacy trước implementation. Không sửa luật winner để khớp hình bục.
- AC: actual HTTP response khớp schema; request kế tiếp lấy hoàn toàn từ response; invalid/unknown version/error fixtures. Lưu contract và HANDOFF supplement. Mobile client/mock/screens làm sau.

## GM-15 / GM-20 — Vinh: cap30%, kết quả và điểm nối

- N là pool vòng2 sau NO của toàn bộ phiếu vòng1 hoàn chỉnh đã nhận, không phải dishCount ban đầu hoặc số món riêng một người giữ lại.
- N là số món sống sót sau khi bỏ hợp các món NO trong ballot vòng1 hoàn chỉnh đã ACK; không phải dishCount ban đầu hoặc số món một người tự giữ. Kiểm winner vòng1 trước. N=0 chốt `EMPTY_INTERSECTION` tại round1. N=1 bỏ thao tác loại; N>=2 cap=max(1,floor(3*N/10)). KEEP toàn bộ hợp lệ; N=2/3 áp dụng mức tối thiểu một lượt loại. Cap lần lượt N=2–6:1; 7–9:2; 10–13:3; 14–16:4; 17–19:5; 20:6.
- Thêm policy version và migration tiến cho phiên mới; pin policy theo phiên. Không sửa0026 hoặc đổi tất cả phiên đang chạy sang30%. SQL/domain cùng fixtures.
- Giữ waiting60s, quorum1, host-only finalize, replay, late request và winner ổn định. PoolVersion được phát trong projection cùng GM19.
- Bàn giao seam terminal cho GM21/23: resultId/policy/status/round/finalizedAt, winner nullable và idempotency. Storage/FK/ACL mới cần GM06/17 review; không để consumer đọc raw ballots.
- Top3/score chỉ thực hiện sau contract A và quyết định privacy/tie; không public candidates/matrix của evaluator.
- AC: ưu tiên winner vòng1 trước khi xử lý pool rỗng; survivors tính từ hợp NO của ballot hoàn chỉnh đã ACK; N=0 lưu terminal round1 EMPTY_INTERSECTION, không round2/timer; N=1..20 mở round2 với đúng survivor list kể cả dưới10; cap+1 bị từ chối, 0 REMOVE hợp lệ, nhóm loại hết thành ALL_REMOVED, món NO không quay lại; thiếu ballot không là OK; snapshot/retry/reconnect, 59/60/61s, host/tick/submit race; v2/v3 không đổi.
- Output: forward SQL, domain version, HTTP suite, CHECKS/HANDOFF supplement có commit và giới hạn.

## GM-18 / GM-19 — Tâm / Trí: catalogue API và phiên

- GM18 nhận projection GM40 và contract A: preview/discovery có available/requested, taxonomy nếu cần; không GPS/quán. Giữ exact10–20 unique **chỉ cho pool khởi tạo**; shortage thì báo, không nới lọc. Pool vòng2 lấy từ ballot, có thể dưới10 hoặc rỗng; tuyệt đối không replenish.
- GM19 sửa thiếu poolVersion qua migration tiến. Kiểm create → snapshot → start → submit → waiting/vòng2 chỉ dùng field response. Không tạo round2/timer khi survivor pool=0; terminal no-consensus snapshot dùng active pool rỗng; pool round2 khác 0 có thể <10.
- Không làm lại max20/bỏ ready đã có. Nếu A chốt update context/preferences trước start: kiểm quyền/version, recompute có chủ ý; không reset ready hoặc đổi pool đã khóa.
- Bàn giao helper admission theo policy cho GM22. Direct join và lời mời dùng cùng capacity/auth/state/lock; không nới writer_guard toàn cục.
- Budget/giá/thời gian/flavor/recent chưa đủ contract/data: ghi Pending hoặc lỗi unsupported đúng contract; không dùng giá menu khác đơn vị làm giá/người.
- AC: create count9/10..20/21/fraction/null, shortage/unknown; pool2 0/1/2..9/10..20, không món bù; pool2=0 terminal EMPTY_INTERSECTION không mở round2; poolVersion stale/current, join20/21/start/invite race, legacy vẫn đúng. Bàn giao request suite và output schema.

## GM-21 — Tâm: history và consent

Đầu vào: A history contract, C terminal, GM17 ACL, migrations0021/0024.

- Result reference theo policy; lưu/đọc DECIDED và NO_CONSENSUS khi consent cho phép. Không tạo winner/offering giả cho phiên không đồng thuận.
- Projection thể hiện trạng thái lưu/lý do không lưu, participants theo quyền và retention. Chốt với Trí trường tên/identity được giữ, không public danh tính hoặc phiếu.
- Settings/room consent/snapshot phản ánh đồng ý thật; không hardcode false hoặc tự bật true. Sửa các đường update_history_consent/delete_history trên nhiều policy, không refresh pool legacy cho v3.
- Migration tiến bảo toàn FK/ID/history cũ. Revoke/delete/TTL phải gỡ quyền; retry không dựng lại history đã xóa.
- AC: personal/group opt-in/out, một người không đồng ý, revoke/finalize race, delete/retry/outsider/cleanup/expired, DECIDED và no-consensus với round/reason đúng, winner=null, dữ liệu trước và sau migration.
- Output: schema/projection/API, SQL/HTTP cases, CHECKS/HANDOFF mới; không nhận việc sửa màn history.

## GM-22 / GM-23 — Trí: lời mời, inbox và event

- GM22: accept theo policy, max20 cho phiên mới; kiểm recipient/pair/expiry/start, rejoin/idempotency/race. Không ready, không refresh pool legacy hoặc tạo quán giả. Terminal DECIDED/NO_CONSENSUS không cho admission/rejoin làm đổi roster.
- GM23: terminal dish-only có canonical result/event reference. Ghi event/inbox cùng transaction terminal hoặc transactional outbox được review; đúng một lần cho mỗi result/recipient. NO_CONSENSUS dùng reason EMPTY_INTERSECTION/ALL_REMOVED, winner=null và round/resultId ổn định.
- Phân biệt friend invitation, room invitation, result decided và no-consensus. Payload chỉ IDs/status/version cần fetch lại qua server, không phiếu/seed/token. Không gọi push provider trong transaction.
- AC: lời mời tại8/9/20/21 người, duplicate/outsider/full/start/unfriend race; host/tick/reconcile đều sinh đúng một event; inbox read/unread/pagination/expiry; không credential vẫn có inbox; dead token/logout/retry không rò dữ liệu.
- Output: forward SQL, suites GM22/23, contract event, legacy regression và HANDOFF. Native push Android kiểm ở task sau.

## GM-03 / GM-06 / GM-17 — Trí / Tâm: môi trường và quyền

- GM03: runbook/runner QA tích hợp có GoTrue và REST cùng origin, URL/public-key placeholders và worker. RPC-only suite không chứng minh app đăng nhập được.
- GM06: kế hoạch upgrade, ledger/function definitions, backup và reconcile khi có draft objects; owner xác nhận DB đích. Không reset DB hay sửa migration đã merge.
- Worker verifier phải kiểm version/functions cuối sau forward patch, không pin0026 vĩnh viễn hoặc tắt kiểm hash.
- GM17: ACL của projection/history/event mới và retention theo dependency. No-consensus chỉ lộ result/reason được phép cho đúng member/consent, winner=null, active pool rỗng; giữ kín ballots/seed, không đưa service_role vào client.
- AC: setup sạch → ledger/hashes → import → Auth session → RPC; worker down thì fail phù hợp; restart/deadline không cần client; cleanup chỉ QA sở hữu; restore activation không đổi snapshot. Có mixed-policy consent/invite/cleanup.
- Hồ sơ này không tự deploy DB ứng dụng.

## GM-40 — Vinh: dữ liệu và projection bàn giao

PR129 đã merge; Project vẫn Review. Baseline39 món nghiệm thu theo test/demo, không thêm quota làm blocker.

- Đối chiếu field A/B cần: taxonomy IDs/labels, meal/flavor/temperature unknown, price/currency/unit/source/date, artwork rights/null. Projection phải có version/hash/readback; runtime thiếu giá khác với bundle thiếu giá. Chỉ pool khởi tạo 10–20 tạo quota catalogue; GM-40 không cung cấp món bù hoặc quota riêng để round2 đủ10. Survivors dưới10 hoặc bằng0 là kết quả ballot/policy, không phải thiếu Data.
- Mở rộng dữ liệu sau khi chốt bộ lọc cần đạt; báo độ phủ, không đoán tag hoặc biến null thành0. Giữ UUID, release immutable, atomic activation/restore.
- Importer QA chặn app DB là guard đúng. Phối hợp GM03/06 cho môi trường tích hợp được chỉ định; giữ backup/preflight/testData=true. Không bỏ marker hoặc publish production.
- AC: nullable/unknown, alias/trùng, giá khác unit, ảnh fallback, version conflict/readback/restore và snapshot cũ ổn định.
- Data không phụ trách luật phòng/timeout/event/Places.

## GM-32 — Vinh: QA nhiều phiên bản

- Giữ cases legacy v2, baseline v3 và bổ sung policy30%; không thay fixture cũ để che hồi quy. Case mới: winner round1 được ưu tiên, tính survivor theo hợp NO, pool rỗng kết thúc terminal ở round1, pool2 dưới10 không bù món, loại hết kết thúc terminal ở round2.
- Bắt thiếu poolVersion bằng HTTP roundtrip không hardcode, ghi expected/actual/error/state.
- Cross-module: invite → join20 → start → submit → waiting → timeout/finalize → history/inbox → reconnect. Kiểm consent/quyền, event đúng một lần, winner ổn định và mọi client đã đóng.
- Dataset39 món thật draft và synthetic coverage tách rõ; không quán/GPS, shortage, giá/ảnh/unknown đúng semantics.
- Phần API chạy độc lập với UI. Gate GM31/outbox/Android giữ cho nghiệm thu tích hợp sau, không hạ AC hoặc ghi Android Pass.
- CHECKS/HANDOFF chỉ rõ failure owner và artifact mới A–F; không chỉ dựa Done baseline.

## Task P1/P2 và Places

- GM35 — Tuấn: account/recovery vẫn cần; sau core nhận history version mới. Chưa sửa task UI/account.
- GM36 — Tâm / PR123: OCR tạo draft/source/price/confidence. Profile dish-only không bắt offering/quán/coverage/lịch; adapter legacy kiểm riêng. Không auto-append catalogue/activate hoặc gọi provider chưa duyệt. Giữ P2 và gate core.
- GM37 — Tuấn: nhận taxonomy hiện hành, unknown, output draft để người dùng xác nhận; không raw votes/GPS/seed/winner. Giữ P2.
- GM38 — Tâm: weather/mood tùy chọn và chỉ soft rank trước khóa pool nếu được duyệt. Bỏ reset ready và yêu cầu anchor/coverage bắt buộc cho dish-only. Chốt nguồn thời tiết/consent/TTL/provider trước code; không bỏ NO/REMOVE. Giữ P2, UI chưa sửa.
- Places đã thuộc phần kết quả/Maps GM27/30. Chờ UI chốt; chỉ cân nhắc task mới nếu sau đó có scope server proxy độc lập chưa thuộc task nào.

## Hoàn tất hồ sơ và giới hạn

PR tài liệu có thể được review riêng; merge hồ sơ không hoàn tất các yêu cầu runtime bên trên.
Chỉ sau khi implementation PR đạt AC, Trí mới nghiệm thu phần bổ sung.
