# Rà soát BE/Data và task — 2026-10-24

Baseline: `033693c74d8380244b0ee78325b394b033330b93` (main sau PR129).
Đối chiếu trực tiếp source, Project #2 (40 card), ba PR mở #123/#126/#127 và lịch sử “Data & UI”.
Ngày báo cáo UTC+7. Đây là audit và yêu cầu bàn giao; không phải nghiệm thu tính năng mới.

Trí chọn **tạo PR hồ sơ yêu cầu bổ sung để người phụ trách làm tiếp**, chưa code các phần thiếu trong đợt này.
Không sửa code/task UI, trạng thái Done, assignee, deadline hoặc evidence đã nghiệm thu.
Không có task mới: các khoảng thiếu bên dưới đã thuộc task hiện hữu. Không có task chưa làm nào hoàn toàn vô dụng để xóa; bỏ các yêu cầu legacy khỏi scope luồng mới, giữ lịch sử.
[Phần việc chi tiết, AC và thứ tự](BE_DATA_FOLLOWUPS_2026-10-24.md).

## Quyết định hiện hành và baseline thực thi

- Chọn món độc lập quán/GPS; host chọn chính xác 10–20 món, tối đa 20 người, không ready.
- **30% vòng 2**: Trí xác nhận lại trong cuộc hội thoại này. N là số món còn sau NO vòng 1. Với N>=2, cap=max(1,floor(0.30*N)); N=1 không có bước loại, N=0 không mở vòng 2. N=2/3 có ngoại lệ một lượt dù lớn hơn30%. Đây là trần được phép, không bắt buộc REMOVE; KEEP toàn bộ hợp lệ. Runtime main vẫn dùng min(3,floor((N-1)/2)); cần version mới, không sửa nghĩa phiên cũ.
- **60s từ transition vào chờ hợp lệ sau ACK đủ phiếu**, không từ submit/ACK đơn thuần. Bảng “sau ACK” thiếu điều kiện này; giữ hai command submit/waiting. Mỗi vòng có mốc riêng.
- Quorum >=1 phiếu hoàn chỉnh; thiếu phiếu không được tính OK. Terminal ổn định; quán/Places không ảnh hưởng winner.
- Top3/điểm là yêu cầu cần contract và privacy decision: chưa có phép công khai phiếu thô, chưa tự chọn công thức hoặc quy tắc nhóm ít người. Giao GM07/20/17 viết đề xuất để Trí duyệt trước implementation.
- Bộ39 món là dữ liệu thật draft để kiểm test/demo. Không đòi quota lớn hoặc đủ20 mọi bữa để mở lại nghiệm thu data; tăng độ phủ sau khi chốt bộ lọc và tích hợp.

## Đối chiếu BE

| Hạng mục | Main thực sự có | Thiếu / hành động | Task |
| --- | --- | --- | --- |
| Contract | dish_session, wire dish-session-v3/ADR-019, policy dish-decision-v3, schema0.8.0 | Đóng gói contract JSON/schema/errors cho consumer; runtime snapshot thiếu poolVersion dù submit bắt buộc | GM07 + GM19/20 |
| Pool | create nhận integer10–20, mealSlot + cuisine/category, đủ số unique hoặc INSUFFICIENT_DISHES | Chưa có preview/discovery dish-only; không có input budget/flavor/time/avoidRecent hay update thiết lập sau create. Chốt policy trường nào thật sự cần, không nhận rồi bỏ qua | GM18/19, contract GM07 |
| Lobby | max20; host start >=2, không ready; join trực tiếp | Không làm lại phần đã có; sửa lời mời dùng policy mới, giữ join/start race | GM19/22 |
| Vòng2 | NO vòng1 không trở lại; cap cũ, N0/1 đặc biệt | Thực hiện cap30% theo version mới, parity SQL/domain, giữ v2/v3 | GM15/20 |
| ACK/retry | complete ballot; ownBallot; requestId replay; payload reuse bị từ chối | Snapshot poolVersion; test lấy input hoàn toàn từ response; historical ACK phải đọc snapshot hiện hành | GM07/19/20 |
| Timeout/Chốt ngay | waiting đặt deadline một lần; server tick; quorum1; host-only | Kiểm deployment worker trên môi trường app và preflight version sau patch mới; không đổi mốc thành ACK | GM03/06/20 |
| Reconnect | snapshot reconcile timeout; người lỡ R1 được vào R2 đang mở; terminal ổn định | Bổ sung contract version/poolVersion; FE routing/cache làm sau | GM07/19/20 |
| Top3/điểm | Kết quả winner/tier/reason/round/time; không public score/tie set | Hợp đồng aggregate được duyệt, định nghĩa ties/rank/quorum/privacy. Không suy điểm từ fixture UI | GM07/17/20 |
| History | Legacy history/consent/recent đã có | v3 finish lưu private result, không gọi legacy history writer. Consent snapshot v3 luôn false; writer cũ bỏ winner-null. Cần history kết quả và no-consensus đúng policy/consent | GM21 + GM17/20 |
| Friends/invite | Bạn bè/invite legacy có expiry/recipient/retry | accept_room_invite vẫn chặn>=8, insert member qua writer_guard v3 và refresh pool legacy. Chưa nối admission20 vào lời mời | GM22 + GM19 |
| Inbox/push | Sender và ACL thiết bị có; nhận event từ public.events | v3 finish không tạo event/inbox; resultId private chưa thỏa tham chiếu public.results của event cũ | GM23 + GM20/22 |
| Places | Chưa có backend Places adapter trong main | Thuộc bàn giao kết quả/Maps GM27/30; chưa tạo task trùng hoặc sửa task UI. Chỉ lập thiết kế BE khi chốt nhu cầu proxy/provider; giữ lỗi tìm quán độc lập | Giữ chờ UI chốt |
| Auth/RLS | Guest/session/ACL/retention hiện hữu; private v3 bị revoke và force RLS | Không xây lại auth/schema; mở rộng regression quyền khi thêm projection/history/event; không bỏ guard để nối social | GM16 giữ; GM17 bổ sung |

## Phát hiện có vị trí source

1. **P1 — snapshot thiếu poolVersion, đã xác nhận qua HTTP thật.** `supabase/migrations/0026_dish_session_policy.sql:183` (view) không phát trường này; dòng294 bắt round + poolVersion chính xác. Probe ngày24/10 quan sát 6 response thành công ở LOBBY/ROUND_1 đều thiếu trường này. `scripts/dish_policy_sql_check.py:258` và `scripts/gm40_catalogue_check.py:205` hardcode1/2 nên 108 assertions baseline vẫn Pass. Cần migration tiến sửa projection + contract test nhận snapshot rồi submit/waiting, không đoán round=poolVersion.
2. **P1 — lời mời chưa hỗ trợ phiên dish-only.** `0022_social.sql:299` giới hạn8; dòng301/303 ghi members rồi refresh_lobby_pool legacy. `0026_dish_session_policy.sql:97` writer_guard từ chối writer không đúng policy. Đây là phân tích source, chưa chạy cross-policy invite trong lượt này; không ghi toàn bộ invite hiện có đều hỏng.
3. **P1 — history và consent chưa nối v3.** `0026...:161` ghi result private; dòng302 khóa consent=false. `0024_history_integration.sql` write_history đọc public.results và return khi winner_round_dish_id null. `update_history_consent` cập nhật membership lobby/refresh legacy nên cần regression mixed-policy, kể cả khả năng lỗi guard làm rollback cả thay đổi consent.
4. **P1 — event kết quả chưa nối v3.** So `0023_finalize.sql:173–176` ghi history/event với `0026...:161–168` chỉ lưu result/state. `0025_notifications.sql:151` sender tạo deliveries từ public.events; không tự nhìn private result. Không sửa sender hay bỏ FK khi chưa có contract result/event mới.
5. **P2 — worker verifier pin nguồn0026.** `scripts/dish_policy_worker.py:22` kiểm body hash một migration cố định. Khi thêm migration sửa policy/view cần update preflight theo version triển khai cuối, vẫn từ chối drift và giữ fixed search_path/privilege.
6. **Khoảng thiếu sản phẩm, không lỗi39 món:** `supabase/seed/import_dish_catalogue.py:47` chỉ đưa dishId/name/description/artwork/mealSlots/cuisineIds/categoryIds vào runtime. Chưa có giá/nguồn/flavor/taxonomy labels cho consumer. Cần projection được chốt, không giả DB chứa toàn bundle.
7. Tài liệu mở đầu còn39 task và mô tả location-first; HANDOFF/CHECKS PR131 còn ghi PR129 chưa xong. Giữ evidence lịch sử, bổ sung link trạng thái mới ở tài liệu active.

## Đối chiếu Data

| Hạng mục | Bằng chứng / giới hạn | Xử lý |
| --- | --- | --- |
| Catalogue độc lập | Bundle không có venues/offerings/schedules, importer dùng storage0026 | Đã có; không mở lại GM04/06/08 |
| ID/version/hash | 39 UUID ổn định, 18 GM08 là tập con; release dish-catalogue-v1:1.1.0; bundle SHA256 `776b1e4998d0b170b51a7c39a4ead74461bdfd721f167dafddf7f072bf117a2f` | Nhận manifest/hash nguyên bản, kiểm lại bytes bằng importer |
| Taxonomy | Controlled codes + semantic validator; mealSlots30/39; cuisine5/39; flavor0/39 | Unknown không match-all; mở rộng nhãn cần evidence/version trong GM40, không bịa để đủcount |
| Giá | 247quan sát có currency/unit/source/date; không price/person hoặc average chung | Runtime chưa project giá; GM07/18 chốt display/filter semantics với GM40 |
| Ảnh | 0/39 có ảnh đủ căn cứ; nullable đúng contract | Giữ fallback; không lấy ảnh web rồi tự cấp quyền |
| Độ phủ | Sáng14/trưa23/tối7/snack1; overlap; cuisine/category giảm tiếp | Báo available/requested; không hạcount. Không coi test dataset nhỏ là blocker kỹ thuật |
| Nạp dữ liệu | validate/stage/import/readback/restore vào DB QA có marker | CLI cố ý chặn appDB; cần mốc môi trường tích hợp có origin Auth+REST, worker/data bền qua phiên test. Không bỏ ownership guard |
| Bàn giao | Dictionary/schema/template/quality/source/hash đã có | GM40 chỉ tiếp dữ liệu/metadata/projection phối hợp; không nhận luật phòng/timeout/Places |

Hash chuẩn: đọc `supabase/seed/catalogue/manifest.json` và kiểm bytes bằng importer; báo cáo không là manifest thay thế.

## Project và task chưa hoàn thành

Project snapshot: **25 Done, 4 Review, 1 In Progress, 10 Todo**. GM00/#37 đại diện gate GM01.
Done baseline giữ nguyên; PR follow-up không mở lại nghiệm thu cũ.

| Task | Trạng thái / assignee live | Quyết định đợt này |
| --- | --- | --- |
| GM01–25 | Done; GM01 alias GM00 | Reuse; bổ sung phần BE cần thiết theo bảng gói việc, không sửa UI |
| GM26,27 | Todo / Trang | UI: giữ nguyên |
| GM28,29 | Review / Trung; PR126/127 mở | UI/native: giữ nguyên; bàn giao BE sau |
| GM30 | Todo / Trang | UI/Maps: giữ nguyên; chưa tách Places task mới |
| GM31 | Todo / Trung | Cache/reconnect integration: giữ nguyên |
| GM32 | Todo / Vinh | Bổ sung regression hai policy, snapshot-driven requests, social/history/event; SQL/API làm ngay, mobile phase giữ gate cũ |
| GM33 | Todo / Vinh | Android QA: giữ nguyên, chờ UI |
| GM34 | Todo / Trí | Release: giữ; bổ sung prerequisite môi trường/BE ở hồ sơ bàn giao, chưa nghiệm thu release |
| GM35 | Todo / Tuấn | P1account còn hữu ích; giữ sau core, chưa đổi UI/task |
| GM36 | Review / Tâm; PR123 mở | Giữ OCRdraftP2; bỏ bắt quán/offering/coverage/lịch cho target dish-only. Menu là nguồn; không tựpublish |
| GM37 | Todo / Tuấn | Giữ P2AIpreferences; nhận taxonomy hiện hành, không tự quyết địnhwinner hoặc lấy phiếu làm input |
| GM38 | Todo / Tâm | Giữ P2weather/mood; bỏ yêu cầu resetready và bắt anchor/coverage cho dish-only. Chốt input thời tiết tùy chọn trước làm; UI giữ nguyên |
| GM39 | In Progress / Trang | Thiết kế UI: không đụng |
| GM40 | Review / Vinh; PR129 đã merge | Không đồng nhất merge=Done; cập nhật handoff và mốc bổ sung data, không ép quota hoặc tạo Data task thứ hai |

**Không xóa issue/task nào.** Các công việc legacy còn cần hồi quy/phiên cũ; P1/P2 chưa bị chủ dự án hủy.
Thay thế những điều kiện không còn áp dụng cho luồng mới, không xóa schema/bundle/approval lịch sử.

## Kiểm và giới hạn

- Repository validator và task indexes: Pass trên baseline.
- Catalogue offline builder:5artifact, stale=[].
- Node domain:179/179 Pass, theo luật runtime hiện hành (chưa kiểm luật30% mới).
- Python regression: 591 tests OK, skipped=6, 212.028s trên Windows/Python3.14. Lượt sandbox trước đó bị PermissionError thư mục temp; lượt ngoài sandbox không còn lỗi này.
- SQL/HTTP runtime: 108 assertions baseline Pass; probe response mới phát hiện thiếu poolVersion (Fail). Chỉ owned disposable DB, không migrate DB app.
- Catalogue QA chạy lại: **47/47 ca Pass**, schema0.8.0 và catalogue1.1.0. Kiểm import/readback/reimport, activation/restore, SQL/JWT HTTP với món thật, hai vòng và tham chiếu legacy. Báo cáo xác nhận ownedResourcesCleaned=true, applicationDatabaseChanged=false. Suites vẫn hardcode poolVersion nên kết quả này không phủ nhận lỗi contract ở trên. Lượt trước bị ngắt không tính là evidence Pass.
- FE/Expo/Android, provider Places/remote push, host deployment: không chạy trong scope này.
- Đọc source và chạy suites không chứng minh mọi nhánh đều không có lỗi; các nhánh cross-policy còn thiếu ca kiểm được giao rõ trong phần việc.

Raw report/backup/probe ở `review-results/be-data-audit-20261024/`, local-only, không đưa vào Git.
