> Lịch sử: các mã task trong tài liệu này thuộc thời điểm soạn/roadmap-v1 (hoặc mã cũ được ghi bên dưới). Lộ trình hiện hành: [roadmap-v2](IMPLEMENTATION_ROADMAP.md); không dùng mã trong tài liệu này để mở gate.

> Lưu ý mã task: nội dung lịch sử bên dưới dùng mã cũ. Task hiện hành đã đánh số theo lộ trình; xem [bảng mã cũ–mới](TASK_RENUMBERING.md). Không suy task hiện tại từ số trong bản lịch sử.

> Đã chuyển thành yêu cầu food-v1 theo chỉ dẫn tiếp của chủ dự án. Nguồn triển khai hiện hành: [FOOD_DATA_SPEC](../specs/FOOD_DATA_SPEC.md), [task summary](TASK_SUMMARY.md), [dependency map](TASK_DEPENDENCIES.md). GM-27 P0, GM-28 review, GM-29 location, GM-30 eligibility, GM-31 weather/mood; phần dưới giữ nội dung plan ban đầu để truy nguồn, các câu “chưa đồng bộ task” là trạng thái trước đợt cập nhật. Review độc lập food-v1 vẫn pending, không coi plan là Approved.

# Kế hoạch yêu cầu data món ăn theo khu vực và thời gian

Ngày 2026-10-07. Trạng thái: Proposed for independent review — soạn theo yêu cầu mới của chủ dự án; chưa triển khai, chưa thu thập dữ liệu quán thực tế. Owner soạn plan: Codex; reviewer đề xuất: Trí. Phân công thực hiện ở dưới vẫn là đề xuất. Đợt tài liệu bổ sung thuộc bộ nền GM-00, không thay quyết định review đã có của baseline cũ.

Nguồn: yêu cầu chủ dự án ngày 2026-10-07; đối chiếu [catalogue spec](../specs/CATALOG_PREFERENCES_SPEC.md), [context spec](../specs/CONTEXT_HISTORY_SPEC.md), [data model](../architecture/DATA_MODEL.md), [workflow](TEAM_WORKFLOW.md) và [DoD](DEFINITION_OF_DONE.md). [ADR-005](../architecture/decisions/ADR-005-food-location-time-data.md) ghi tác động phạm vi và quyền riêng tư. Tài liệu này là plan để review, chưa thay toàn bộ spec/AC/backlog hiện hành.

## 1. Yêu cầu sản phẩm đã ghi nhận

1. Phân biệt nền ẩm thực: Việt, Thái, Hàn, Nhật…; vùng gốc nếu biết: Bắc/Trung/Nam. Món có thể đa nhãn hoặc chưa xác định.
2. Phân biệt nhóm món và đặc tính: cơm/bún/phở/lẩu/nướng; nóng/lạnh; cay/mặn/ngọt/chua… Đặc tính có mức độ, dữ liệu chưa biết và biến thể theo quán.
3. Địa điểm là điều kiện bắt buộc của gợi ý ăn thực tế: có nơi bán trong khu vực ăn đã chọn. Không dùng nguồn gốc món để suy ra nơi bán.
4. Buổi ăn và thời điểm dự định ăn đều tham gia lọc: sáng/trưa/tối/ăn nhẹ khác với lịch quán mở và lịch phục vụ từng món.
5. Thời tiết và tâm trạng là nâng cao để xếp hạng trong tập món khả thi.
6. Giữ luật nhóm: server khóa cùng pool/context cho mọi máy; NO/REMOVE không được thành winner; tối đa hai vòng; kết quả ổn định.

Ví dụ: món có nguồn gốc miền Nam nhưng có quán tại Hà Nội bán vào thời điểm chọn vẫn hợp lệ ở Hà Nội. Món chỉ có dữ liệu quán tại TP.HCM không đủ điều kiện cho một phiên ăn tại Hà Nội. Đóng cửa, ngừng phục vụ món hoặc giờ bán chưa rõ đều không được biến thành xác nhận đang bán.

## 2. Phạm vi và thứ tự ưu tiên đề xuất

| Đợt | Dữ liệu/khả năng | Điều kiện bàn giao |
| --- | --- | --- |
| A — thiết yếu theo yêu cầu mới | Taxonomy, món, quán, mapping quán–món, coverage, lịch mở cửa/lịch bán món, khu vực và thời điểm ăn | Chỉ đưa món có bằng chứng nơi bán và lịch phù hợp vào gợi ý thực tế trong vùng dữ liệu đã kiểm |
| B — hoàn thiện chất lượng | Ngoại lệ ngày, thông báo tạm đóng/hết món có hạn hiệu lực, giá theo quán, lịch kiểm lại, giải thích và fallback | Phân biệt xác nhận theo lịch với tồn món thực tế; có xử lý dữ liệu cũ, rỗng và thiếu |
| C — nâng cao | Thời tiết theo khu vực/giờ dự định ăn; tâm trạng tự khai trong phiên | Chỉ tác động xếp hạng, có bỏ qua/tắt, lỗi dịch vụ không chặn core |

Taxonomy mở rộng và lọc địa điểm/thời gian cần được đưa vào phạm vi core mới khi sửa baseline; không tiếp tục coi toàn bộ yêu cầu này chỉ là GM-27 P1 sau release. Việc đổi priority/dependency/lịch của task được review trong bước chuyển plan thành spec; chưa tự đổi các task ở đợt này. Thời tiết/tâm trạng vẫn là nâng cao. Không cần mô hình AI cho bước A/B.

## 3. Data dictionary tối thiểu

### 3.1 Taxonomy dùng chung

Các bộ mã có ID ổn định, nhãn tiếng Việt, mô tả, version, trạng thái published và nguồn/quyết định biên tập. Không dùng text tự do cho khóa lọc.

| Nhóm | Ví dụ | Quy tắc |
| --- | --- | --- |
| cuisine | Vietnamese, Thai, Korean, Japanese | Nhiều nhãn được; không suy ra nơi đang bán |
| origin_region | Bắc, Trung, Nam hoặc unknown | Thông tin nguồn gốc tùy chọn; không thay tọa độ quán |
| dish_category | cơm, bún/mì, lẩu, nướng, canh, món nhẹ | Có thể nhiều nhóm; phân loại nhất quán |
| serving_temperature | hot, warm, cold, ambient, unknown | Nhiệt độ phục vụ, tách khỏi độ cay |
| flavor/intensity | spicy, salty, sweet, sour, bitter, rich; none/low/medium/high/unknown | Đa thuộc tính, mô tả tương đối; không giả độ chính xác dinh dưỡng |
| meal_slot | breakfast, lunch, dinner, snack | Giữ enum hiện hành; late-night là time hint |

Không khẳng định món an toàn dị ứng, ít natri hoặc tốt cho bệnh lý từ nhãn cay/mặn. Không đoán thành phần, độ cay hoặc khẩu vị từ tên món.

### 3.2 Món chuẩn — dishes

| Trường | Yêu cầu |
| --- | --- |
| dish_id, version, name, aliases, description | ID ổn định; chuẩn hóa bí danh, chống trùng; mô tả ngắn |
| cuisine_ids, origin_region_ids, category_ids | Phân loại từ taxonomy; unknown được biểu diễn rõ |
| default_temperature, flavor_profile | Đặc tính mặc định tham khảo; có nguồn và cho phép override theo nơi bán |
| meal_slots, meal_fit_source | Buổi ăn đã biên tập; không suy thời gian bán từ buổi ăn |
| ingredient_tags, verification_status | Chỉ ghi nếu biết; thiếu là unknown, không phải không có thành phần |
| artwork, artwork_source, license | Ảnh có quyền hoặc minh họa/icon; không dùng ảnh thiếu quyền |
| source_ref, checked_at, reviewed_by, status | Truy vết người nhập/người kiểm; draft/verified/published/retired |

Món chuẩn trả lời “món gì”. Biến thể làm thay đổi đáng kể lựa chọn, như mức cay cố định khác hoặc công thức khác, phải có định danh biến thể rõ để card không hứa đặc tính mà quán không đáp ứng.

### 3.3 Quán/chi nhánh — venues

| Trường | Yêu cầu |
| --- | --- |
| venue_id, branch_name, operational_status | Mỗi chi nhánh là một địa điểm riêng; active/temporarily_closed/permanently_closed/unknown |
| address, admin_area_id | Địa chỉ và mã khu vực có version; không hardcode tên tỉnh/thành làm khóa |
| latitude, longitude, coordinate_source/accuracy | Tọa độ của quán; kiểm nhầm tỉnh, điểm ngoài coverage, lat/lng đảo |
| timezone | Múi giờ IANA để chuyển thời điểm UTC sang lịch địa phương |
| service_modes | Đợt đầu ưu tiên dine_in; delivery/takeaway chỉ lọc nếu có dữ liệu được review |
| source_ref, checked_at, valid_until, reviewed_by | Bằng chứng, độ mới và hạn sử dụng dữ liệu |

Tọa độ quán có thể lưu; tọa độ GPS cá nhân được xử lý riêng ở mục 4. Không suy vùng giao hàng từ khoảng cách thẳng; vùng giao hàng là dữ liệu khác nếu bổ sung sau.

### 3.4 Nơi bán món/biến thể — venue_dishes

Đây là liên kết bắt buộc để chứng minh món xuất hiện ở một nơi cụ thể.

| Trường | Yêu cầu |
| --- | --- |
| offering_id, venue_id, dish_id, variant_label | Khóa liên kết và tên trên menu; không gộp dữ liệu mọi chi nhánh |
| temperature/flavor_overrides | Đặc tính thực tế nếu khác món chuẩn; unknown nếu chưa kiểm |
| price_min/max, currency, price_unit, serving_size | Giá theo suất/người/phần nhóm; không so phần nhóm trực tiếp với ngân sách/người |
| service_mode, schedule_id | Lịch phục vụ và hình thức phục vụ của chính món tại quán |
| temporary_availability | available/sold_out/paused/unknown; có observed_at/expires_at/source, không tồn tại vô hạn |
| menu_source_ref, checked_at, valid_until, reviewed_by | Bằng chứng menu, thời điểm và người kiểm |

Quán mở cả ngày không có nghĩa mọi món bán cả ngày. Món có mặt trên menu không có nghĩa còn nguyên liệu ngay lúc người dùng đến. Thiếu giá để null, vẫn có thể đề xuất nếu các điều kiện nơi bán/thời gian đạt; hiển thị “Chưa có giá”.

Nếu pool bỏ phiếu theo dish_id, mỗi món phải kèm tập offering đáp ứng các đặc tính ghi trên card. Không gộp “cay” từ quán A, “lạnh” từ quán B, “rẻ” từ quán C thành một lựa chọn không quán nào có. Nếu không có đặc tính chung đáng tin cậy, card ghi đặc tính thay đổi theo quán hoặc dùng biến thể riêng; không tự tạo hai bản sao cùng món để lấp pool.

### 3.5 Lịch mở cửa và lịch bán món

Lưu lịch quán và lịch offering riêng; thời gian hợp lệ là giao của hai lịch.

- Mỗi interval có day_of_week, local_start_time, local_end_time, end_day_offset (0 hoặc 1), timezone theo quán; hỗ trợ nhiều ca trong một ngày, nghỉ giữa ca, closed và unknown.
- Có bản ghi ngoại lệ theo local_date: nghỉ lễ/nghỉ đột xuất/đổi giờ/món chỉ bán ngày đó. Ngoại lệ ghi rõ thay thế lịch thường, ưu tiên đóng cửa của quán và sold_out/paused còn hiệu lực.
- 22:00–02:00 thuộc ca bắt đầu ngày trước và kết thúc ngày sau; không so hai chuỗi giờ để kết luận 02:00 nhỏ hơn 22:00 là lịch lỗi. 24 giờ dùng flag rõ, không nhập 00:00–00:00 mơ hồ.
- Khoảng thời gian dùng đầu bao gồm/cuối không bao gồm: đúng giờ ngừng nhận món không được coi còn nhận.
- Có last_order_time hoặc last_order_offset_minutes nếu nguồn cung cấp. Không tự đặt ngưỡng rồi quảng cáo là giờ nhận món đã xác minh.
- Lịch có source_ref, checked_at, valid_until, verified_by. Unknown khác closed. Không mặc định unknown là 24/7.
- Thời điểm xét là desired_at do nhóm xác nhận, lưu UTC; hiển thị theo timezone của địa điểm ăn. Nếu chọn ăn ngay, đề xuất desired_at = server_now + arrival_buffer_minutes do nhóm chọn rồi khóa thời điểm này khi xác nhận; nếu chọn giờ cụ thể, dùng đúng giờ đó, không cộng buffer lần nữa. Trước start, nếu desired_at đã qua thì yêu cầu xác nhận lại thời điểm và reset ready. Cần còn nhận món tại desired_at; không hứa còn đủ thời gian ngồi ăn nếu thiếu dữ liệu.

Ví dụ fixture: quán mở 06:00–23:00 nhưng cơm chỉ bán 10:30–14:00 → 22:00 không đề xuất cơm đó. Một quán khác có món phục vụ 22:00–02:00, thứ Hai → thứ Ba 00:30 vẫn thuộc ca thứ Hai nếu không có ngoại lệ đóng cửa. Các giờ này là mô phỏng để kiểm, không là thông tin quán thật.

### 3.6 Vùng dữ liệu — coverage_areas

Có coverage_id, ranh giới/khu vực phục vụ dữ liệu, public_anchor_ids, dataset_version, ngày khảo sát, độ đầy đủ và hạn kiểm. Coverage trả lời “nhóm đã khảo sát đâu”, không phải cam kết biết mọi quán ở đó.

Không có candidate trong coverage khác với nằm ngoài coverage. Ngoài coverage trả “Chưa có dữ liệu đã kiểm cho khu vực này”; không fallback âm thầm sang quán tỉnh khác. Ranh giới hành chính hỗ trợ tìm kiếm, khoảng cách tới điểm ăn mới quyết định bán kính; không loại một quán gần chỉ vì qua ranh giới quận.

## 4. Data bối cảnh phiên và quyền riêng tư

| Dữ liệu | Nguồn và cách dùng |
| --- | --- |
| Khu vực/điểm ăn chung | GPS foreground giúp đề xuất khu vực trên máy; người dùng xác nhận khu vực hoặc điểm công cộng. Cho chọn thủ công khi deny/GPS lỗi |
| search_anchor_id, radius_m, coverage_id | Đề xuất dùng điểm công cộng có tọa độ trong dataset; tính đường chim bay từ điểm ăn đã xác nhận, ghi rõ không phải khoảng cách đường đi/GPS cá nhân |
| desired_at_utc, timezone, meal_slot | Nhóm xác nhận thời gian định ăn và buổi; không dùng giờ riêng của từng máy để tạo pool khác nhau |
| preference cuisine/category/flavor/temperature | Tự khai; sở thích mềm, bỏ qua được; preference cá nhân không public theo user |
| budget, service_mode, arrival_buffer_minutes | Nullable hoặc giá trị rõ; dine_in mặc định đề xuất cho đợt đầu; không tự đoán yêu cầu giao hàng |
| dataset_version, context_version, policy_version, seed, evaluated_at | Khóa bối cảnh/pool, tái hiện được vì sao món được chọn |

Đề xuất privacy: GPS chính xác chỉ dùng tạm trên thiết bị để gợi khu vực/điểm công cộng; request tới server mang anchor_id đã xác nhận và bán kính, không mang GPS cá nhân. Reverse geocoding bên ngoài chỉ dùng sau review provider và thông báo phù hợp. Cần thử độ chính xác/độ tiện dụng; chọn điểm công cộng làm khoảng cách khác khoảng cách từ vị trí đứng, UI phải ghi rõ.

Phòng nhóm dùng một điểm ăn chung được hiển thị cho mọi người và xác nhận trong bước ready; host có thể đề xuất nhưng không tự công khai GPS của mình/người khác. Nếu thành viên ở Bắc và Nam, không gộp các quán gần từng người thành pool cho một bữa chung; nhóm chọn cùng khu vực, đổi phiên hoặc nhận thông báo chưa có bối cảnh ăn chung. Context thay đổi reset ready và server tính lại pool trước start.

Chỉ lưu anchor công cộng/context cần cho phòng tới khi cleanup theo TTL đã review; không giữ điểm ăn trong personal/group history mặc định. Không background location, không log GPS, không cache/queue tọa độ. Nếu cần khoảng cách chính xác từ GPS hoặc điểm hẹn tự nhập tọa độ, phải có ADR/consent/API/retention bổ sung trước triển khai; đợt đầu chỉ cam kết khoảng cách tới điểm công cộng đã chọn.

## 5. Luồng lọc và xếp hạng

1. Kiểm coverage, điểm ăn, bán kính và thời điểm/buổi đã xác nhận.
2. Tìm offering published/verified còn hiệu lực, quán hoạt động trong bán kính. Haversine theo mét, công khai đường chim bay; các con số bán kính là cấu hình người dùng, không giả route km.
3. Áp dụng giờ quán ∩ giờ món ∩ ngoại lệ ngày ∩ hạn nhận món tại desired_at đã xác nhận (buffer ăn ngay đã tính một lần ở bước tạo thời điểm). Sold_out/paused còn hiệu lực bị loại. Dữ liệu stale/unknown không vào tập được mô tả là phù hợp giờ bán; có thể nằm trong danh sách riêng “Cần xác nhận” và chỉ liên hệ/xem thêm.
4. Lọc buổi: mặc định chỉ món có meal_slot phù hợp đã biên tập. Lẩu không được gắn breakfast mặc định nếu không có dữ liệu/biên tập hỗ trợ. Nếu muốn ăn khác buổi, nhóm chủ động đổi buổi/bộ lọc trong lobby, thấy tác động trước khi ready.
5. Gom offering hợp lệ thành món/biến thể phù hợp card, chống trùng. Ưu tiên mềm cuisine, đặc tính tự khai, độ gần, ngân sách có dữ liệu, đa dạng category và giảm lặp có consent. Khoảng cách xếp hạng của món dựa trên offering hợp lệ, không lấy quán đã đóng cửa.
6. Chọn tối đa 8 món theo seed/version; ít hơn thì dùng số có sẵn. Không có món → đề nghị đổi giờ/khu vực/bán kính/buổi với xác nhận; không tự nới địa lý, không lấy món unknown lấp đủ số.
7. Khi start, server kiểm lại eligibility theo dataset mới nhất và desired_at trước khi khóa; nếu pool/context đổi thì reset ready, cho nhóm xem/xác nhận lại. Lưu snapshot offering/lịch/version/evaluated_at để giải thích. Sau start không thay pool/phiếu ngầm.
8. Vote/finalize vẫn theo decision-v2. Thời tiết/tâm trạng hoặc quán đóng sau đó không được tự sửa result. Khi xem kết quả, refetch offering: nếu dữ liệu thay đổi thì thông báo, tìm quán khác cho cùng món theo đúng context; nếu không còn, nhóm chủ động tạo phiên mới. Kết quả cũ vẫn là lịch sử lựa chọn, không cam kết tồn món tại quán.

Đợt đầu dùng rule rõ và deterministic; chưa đặt công thức/trọng số tối ưu khi chưa pilot. Công khai lý do như “Có nơi bán trong khu vực ăn đã chọn; lịch phục vụ phù hợp 19:00; hợp sở thích món Thái”. Không công khai mood/preference cá nhân hoặc số phiếu để giải thích.

## 6. Thời tiết và tâm trạng — nâng cao

| Nhóm | Data cần có | Quy tắc |
| --- | --- | --- |
| weather_context | khu vực/anchor công cộng, observed_at hoặc forecast_for, fetched_at, expires_at, temperature_c, feels_like_c nếu có, precipitation/rain_probability nếu có, condition_code, provider/source | Đúng khu vực và giờ ăn; phân biệt quan trắc hiện tại với dự báo. Không dùng mưa hiện tại để kết luận thời tiết bữa tối ngày khác |
| mood_context | user tự chọn hungry/light/comfort/refreshing/adventurous hoặc nhãn dễ hiểu đã thử; created_at/expires_at, consent, skipped | Tùy chọn theo phiên, để null khi bỏ qua; không suy trạng thái sức khỏe tinh thần từ phiếu/GPS/history |
| recommendation_rules | rule_id/version, điều kiện, thuộc tính món ưu tiên, mức ưu tiên, explanation, reviewed_by | Biên tập và thử với user; nóng/lạnh/mưa không thành luật tuyệt đối |

Ví dụ đề xuất để pilot: trời nóng tăng ưu tiên món mát; trời mưa tăng ưu tiên món nóng hoặc quán gần; muốn thử mới tăng đa dạng cuisine. Mọi rule chỉ áp dụng sau lọc nơi bán/giờ/buổi; không ghi đè NO hay tự đưa món hết bán vào pool. Mood chỉ gửi khi user bật dùng cho gợi ý, không gửi sang AI mặc định; không hiện ai chọn mood nào. Mặc định mood hết hiệu lực khi terminal/expiry, xóa private dữ liệu theo TTL đã review. Weather cache theo khu vực công cộng, có TTL cấu hình/provider được review; mất API hoặc stale thì bỏ tín hiệu weather, giữ core hoạt động.

Chưa chọn nhà cung cấp thời tiết, key, package hoặc dịch vụ có phí. Chọn sau khi kiểm coverage, giấy phép, attribution, quota, chi phí, độ mới, lỗi và privacy; đợt plan không gọi API ngoài.

## 7. Thu thập, kiểm và duy trì dữ liệu

Đề xuất pilot một vùng quanh trường/điểm nhóm có thể kiểm trực tiếp. Không cam kết phủ Bắc–Nam ngay từ bộ seed đầu. Dùng taxonomy chung; chỉ publish món có offering thật đã kiểm cho từng vùng.

Mục tiêu pilot để review: 20–30 chi nhánh, 15–20 món chuẩn gắn nhiều offering thật; catalogue 60–80 món vẫn có thể làm vốn biên tập, nhưng món chưa có nơi bán phù hợp không vào gợi ý thực tế. Các lượng này là mục tiêu thu thập, chưa phải dữ liệu có sẵn. Pilot cần cả ca sáng/trưa/tối/khuya, giờ món khác giờ quán, nghỉ ngày và không có món để kiểm ranh giới; không ép người nhập bịa để đủ số.

1. Chốt taxonomy, vùng khảo sát, public anchors, biểu mẫu và quy tắc fresh/stale.
2. Thu thập nguồn có quyền dùng: menu/lịch từ quán cung cấp hoặc nguồn được phép; kiểm tại quán/liên hệ khi được phép. Lưu source_ref, ngày và người kiểm. Không tự crawl/nhập hàng loạt từ dịch vụ bản đồ chưa kiểm điều khoản.
3. Nhập CSV/JSON mẫu thống nhất; dữ liệu demo tách dataset mô phỏng, không nhập vào published thực tế.
4. Kiểm máy: required/FK/unique, timezone, khoảng giờ qua đêm, price unit, lat/lng, coverage, hạn hiệu lực, mapping, duplicate và giấy phép ảnh.
5. Người khác đối chiếu nguồn trước publish; ghi audit/version, cho rollback bản dataset. Không tự duyệt dữ liệu mình nhập.
6. Đề xuất thời hạn ban đầu để reviewer chốt: menu/giờ bán tối đa 7 ngày, địa chỉ/tọa độ tối đa 30 ngày; kiểm lại tất cả offering dùng trong buổi demo trước pilot. Đây là ngưỡng vận hành thử, không bảo đảm quán không đổi trong thời hạn.
7. Sold_out/tạm ngừng phải có expires_at từ nguồn hoặc chính sách được review; hết hạn trở unknown, không tự nâng thành “đã xác nhận còn món”. Phản ánh của user vào hàng chờ xác minh, không tự sửa published ngay.
8. Theo dõi số offering verified còn hạn, tỷ lệ unknown/stale/ngoài coverage, candidate rỗng theo giờ, chi phí cập nhật và độ khớp khảo sát. Không báo accuracy nếu chưa có mẫu đo thật.

Giờ bán được kiểm là căn cứ gợi ý theo lịch, chưa là tồn kho live. Copy phù hợp: “Theo lịch đã kiểm ngày …, dự kiến phục vụ lúc …; nên xác nhận với quán”. Chỉ ghi “đã xác nhận còn món” khi có quan sát đủ mới, nguồn và hiệu lực rõ; không hứa chắc món/quán còn phục vụ khi đến.

## 8. Phân công và dependency đề xuất

| Gói công việc | Task chịu tác động | Owner / reviewer đề xuất | Đầu ra |
| --- | --- | --- | --- |
| Taxonomy + khảo sát + dataset | GM-03; phần dữ liệu GM-27 cần chuyển sớm | Vinh / Tâm | Data dictionary, nguồn, dataset verified, quality report |
| Schema + lịch + ngoại lệ + coverage | GM-04; điều chỉnh schema venue khỏi P1 | Tâm / Trí | Migration/constraints/index/upgrade test; schema offerings/schedules |
| Privacy/RLS/TTL | GM-06 | Trí / Tâm | Chỉ context công cộng được share; hạn dữ liệu và quyền quản trị publish |
| Lọc eligibility/pool server | GM-08 + GM-11; phối hợp Vinh về pure rules | Tâm / Trí cho GM-08; Vinh / Trung cho GM-11 | Cùng seed/context cho cùng pool, fixture SQL/TS; không chuyển tính khả thi sang client |
| Foreground location/điểm ăn | GM-20 cần phần context chạy trước pool | Tuấn / Trang | GPS gợi khu vực, manual fallback, khoảng cách tới anchor được giải thích |
| Context/preference/card/result | GM-07/10/13/14 | Trang / Trung cho GM-07; Trang / Vinh cho GM-10; Trang / Tuấn cho GM-13; Tuấn / Vinh cho GM-14 | Bộ lọc, đổi context/reset ready, nơi bán/giờ/unknown có copy đúng |
| Contract/finalize/snapshot | GM-12 + GM-16 | Trí / Tâm | result ổn định, cache không giả live, availability/version snapshot |
| Regression/pilot | GM-19/21 | Vinh / Tâm; Vinh / Trang | Case địa lý/giờ/privacy/native, đối chiếu nơi bán thật |
| Weather/mood | Chưa có task triển khai riêng | Trung / Trí đề xuất; Vinh hỗ trợ rule/data | Đặc tả consent/provider/TTL/ranking và task/AC trước code |

Đây là bản đồ tác động, không tự giao thêm việc hoặc xác nhận thành viên nhận task. Một task chính/người, đánh giá lại tải và lịch 8 tuần khi review. Không giữ dependency GM-27 → GM-22 cho chức năng lọc thiết yếu; phải tách core địa điểm/lịch bán khỏi pilot mở rộng. Tương tự không để phần context của GM-20 vẫn chờ GM-14 trong khi GM-14 cần pool đã lọc: tách capability location/context sớm khỏi tích hợp QR/review muộn để tránh vòng dependency. Backlog hiện hành chưa được viết lại trong đợt plan.

## 9. Acceptance criteria và test plan đề xuất

| ID | Tình huống | Kết quả cần chứng minh |
| --- | --- | --- |
| FOOD-01 | Ăn ở Bắc, chỉ có offering tại Nam; món gốc Nam có offering ở Bắc | Loại trường hợp thứ nhất, cho trường hợp thứ hai nếu các điều kiện khác đạt |
| FOOD-02 | Quán qua ranh giới quận nhưng trong radius; quán cùng tỉnh ngoài radius | Dùng khoảng cách tới anchor, không thay bằng tên tỉnh/quận; kiểm boundary mét |
| FOOD-03 | GPS deny/lỗi/ngoài coverage; thành viên ở nhiều vùng | Manual chọn khu vực; ngoài coverage báo thiếu dữ liệu; một room chỉ một context chung |
| FOOD-04 | Sáng/lẩu, đổi meal_slot trong lobby | Không có nhãn breakfast thì mặc định loại; đổi buổi có xác nhận/reset ready |
| FOOD-05 | Quán mở nhưng món ngừng bán; có nghỉ giữa ca | Không lọt qua chỉ nhờ lịch quán; đúng biên đóng/mở và last order |
| FOOD-06 | 22:00–02:00; 23:59/00:00; ngày nghỉ/ngoại lệ; timezone; ăn ngay/đặt giờ | Thuộc ca/ngày đúng, đóng cửa ưu tiên, không tự lấy đồng hồ client; buffer tính một lần, giờ đã qua cần xác nhận lại |
| FOOD-07 | Menu/giờ unknown hoặc stale; sold_out còn/hết hiệu lực | Không coi là đã xác nhận đang bán; tách Cần xác nhận, không tự lấp pool |
| FOOD-08 | Price null/phần nhóm; đặc tính khác giữa hai quán | Giá không tự thành rẻ; card chỉ hứa đặc tính có offering hợp lệ thực sự |
| FOOD-09 | Dataset/context đổi, start/retry/reconnect nhiều máy | Server tính lại trước khóa/reset ready; sau khóa pool/resultId ổn định |
| FOOD-10 | Một offering đóng sau start, winner không còn nơi bán phù hợp | Thông báo/refetch, chỉ thay nơi bán cùng món nếu hợp lệ; không reroll result |
| FOOD-11 | Mưa/nóng/mood xung đột với NO hoặc lịch đóng | Không phá điều kiện khả thi/NO/two rounds; thiếu weather/mood core vẫn dùng được |
| FOOD-12 | Phân quyền/log/cache/history/push | Không lộ raw GPS, mood/preference/vote cá nhân; chỉ share context đã xác nhận |
| FOOD-13 | Seed/dataset thực tế và fixture | Tách mô phỏng khỏi published, nguồn/giấy phép/reviewer kiểm được; dataset rollback đúng |
| FOOD-14 | Không/ít món ở khu vực hoặc giờ đã chọn | Không có phiếu rỗng hoặc quán xa bịa; cho đổi context rõ, <=8 món không trùng |

Pure eligibility tests dùng fixture có ngày/timezone/schedule cụ thể, SQL và TypeScript cùng kỳ vọng. Integration kiểm auth/version/start transaction/privacy; native kiểm location permission/nhập thủ công, hiển thị context và đổi ready trên nhiều máy. Pilot đối chiếu menu/lịch thật và ghi ngày, nguồn, thiết bị; chưa có kết quả thực thi trong đợt plan.

## 10. Trình tự chuyển thành triển khai

1. Review plan/ADR: vùng pilot, schema, anchor/radius, privacy, policy giờ/unknown, khối lượng và người nhận.
2. Cập nhật đồng bộ PRD/FR → catalogue/context/privacy/API/data/UI/test spec → task/AC/dependency/tiến độ. Tách core địa điểm/giờ khỏi GM-27 sau release; chỉ mở task sau dependency review. Không tạo vòng dependency với location/result.
3. Hoàn thành taxonomy/biểu mẫu/fixture và tập khảo sát nhỏ; review dữ liệu trước migration/adapter/filter phụ thuộc.
4. Implement migration → quyền/contract → query eligibility/pool → context UI/native → snapshot/recovery → regression/pilot, theo patch nhỏ đã chốt trong task.
5. Đo chất lượng thực tế rồi mới thêm weather/mood; rule có version, có thể tắt. Chỉ nhận yêu cầu phủ thêm khu vực khi có người/cơ chế giữ dữ liệu mới.

Patch của đợt plan: thêm tài liệu này, ADR-005 và liên kết ở START_HERE. Kiểm tài liệu bằng `python scripts/validate_repository.py`, `git diff --check`; chưa có SQL migration, dependency, API hoặc native build. Review độc lập và quyết định Accepted/Done chưa được thực hiện.

Evidence soạn plan ngày 2026-10-07: validator trả exit 0 và báo documents/links/JSON/tasks/dependencies/traceability OK; `git diff --check` không báo lỗi. Các phép kiểm chỉ chứng minh cấu trúc tài liệu, không chứng minh dataset/SQL/native hoặc review đã đạt. Prototype có thay đổi tồn tại trước đợt plan và không được sửa trong đợt này.
