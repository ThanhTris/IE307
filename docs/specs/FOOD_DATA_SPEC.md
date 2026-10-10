# Food data spec — food-v1

2026-10-07. Yêu cầu hiện hành được soạn theo chỉ dẫn chủ dự án; review kỹ thuật/triển khai chờ [GM-01](../../tasks/done/GM-01.md). Nguồn chi tiết: [plan data](../project/FOOD_DATA_REQUIREMENTS_PLAN.md), [ADR-005](../architecture/decisions/ADR-005-food-location-time-data.md). FR-04/10/15/20/21; T-03/10/14/19/23/25/26. GM-04, GM-06, GM-08, GM-24, GM-18 là đầu vào core, GM-38 nâng cao.

## Data contract bắt buộc

| Entity | Trường bắt buộc/nullable | Quy tắc |
| --- | --- | --- |
| taxonomy | id/version/type/label/description/status/source; origin nullable | cuisine Việt/Thái/Hàn… tách origin Bắc/Trung/Nam; category cơm/lẩu…; temperature hot/warm/cold/ambient/unknown; flavor cay/mặn/ngọt/chua có intensity none/low/medium/high/unknown |
| dishes | id/version/name/aliases/description, cuisineIds/categoryIds/mealSlots; origin/ingredientTags/temperature/flavor nullable; artwork source/license | Đa nhãn, ID ổn định, alias chống trùng; không suy vị hoặc an toàn dị ứng từ tên |
| venues | id/branchName/address/adminAreaId/lat/lng/timezone/status/serviceModes/sourceRef/checkedAt/validUntil | Một chi nhánh một ID, tọa độ quán không phải GPS user; closed/unknown không thành active |
| venue_dishes | offeringId/venueId/dishId/variant/menuSource/scheduleId/serviceMode/checkedAt/validUntil; priceMin/Max/unit/currency/servingSize nullable; profile overrides | Chỉ mapping có nguồn, cùng offering phải đáp ứng đặc tính card; giá phần nhóm không tự quy thành giá/người |
| weekly_schedules | scheduleId/ownerType/ownerId/dayOfWeek/startTime/endTime/endDayOffset/timezone/status/sourceRef/checkedAt/validUntil | Quán và món có lịch riêng; nhiều ca/ngày, 24h flag rõ, closed khác unknown |
| date_exceptions | scheduleId/localDate/status/intervals/sourceRef/checkedAt/validUntil; lastOrder nullable | Ngoại lệ thay lịch thường, ưu tiên đóng cửa; last order nếu có bằng chứng |
| availability_overrides | offeringId/state/source/observedAt/expiresAt | available/sold_out/paused/unknown; hết hạn quay về unknown, không tự xác nhận còn hàng |
| coverage_areas/public_anchors | areaId/boundary/datasetVersion/checkedAt/validUntil; anchorId/name/public lat/lng/coverageId | Coverage là vùng đã khảo sát, không bảo đảm mọi quán; anchor công cộng được user xác nhận |
| data_sources/dataset_versions | sourceRef/locator/usageRights/checkedAt/validUntil/enteredBy/reviewedBy/status/version | draft → verified → published; người nhập khác người kiểm, có report/rollback; fixture không publish như thật |

GM-04 chốt biểu mẫu/IDs/field types/units và fixture mẫu; GM-06 chốt SQL constraints/indices/import transaction. Trường chưa biết để null/unknown đúng contract, không nhập giá/giờ/tọa độ bịa. FK offering → branch/dish/schedule; unique theo branch/dish/variant/serviceMode. Latitude [-90,90], longitude [-180,180], radius theo mét và cấu hình server có giới hạn; giá không âm, min<=max, timezone hợp lệ. Hạn dataset không được che dữ liệu con đã hết hạn. publish/read không cho client đổi verified state.

## Đầu vào context

Room có anchorId công cộng, coverageId, radiusM, desiredAt UTC, venue timezone, mealSlot, timeHint, budget nullable, serviceMode (core dine_in), preferences riêng và avoidRecent. Context/catalogue/dataset/eligibility policy đều có version và seed; shared snapshot không có preference theo user.

GPS foreground chỉ giúp chọn khu vực/anchor trên máy; GM-24 cung cấp capability trước GM-25. User xác nhận điểm ăn; server nhận anchorId/radius, không nhận tọa độ cá nhân. Deny/GPS off/ngoài coverage hỗ trợ manual. Nhóm dùng một điểm ăn chung hiển thị trước ready, không tự chia GPS host hoặc thu GPS mọi thành viên. Khoảng cách là đường chim bay từ anchor đã chọn; muốn khoảng cách GPS/route phải có contract/privacy riêng. Request giới hạn radius/time horizon theo cấu hình được reviewer chốt, không nhận groupKey hoặc arbitrary SQL/filter expression.

Ăn ngay: dùng server now + buffer người dùng chọn để đề xuất desiredAt; xác nhận một lần. Đặt giờ cụ thể: dùng đúng giờ, không cộng buffer lần nữa. Trước start, desiredAt đã qua yêu cầu xác nhận lại/reset ready. Ngày/giờ thiết bị chỉ để hiển thị, không là authority. Nếu thiếu bối cảnh hợp lệ, cho sửa lobby; không tạo pool rỗng để bỏ phiếu.

## Eligibility trước khi xếp hạng

1. Trong coverage còn hiệu lực; quán active và offering published/verified còn hạn, tọa độ trong radius tới anchor. Origin cuisine không làm bộ lọc địa lý. Không loại quán chỉ vì khác quận nếu trong radius và dataset coverage.
2. desiredAt đổi sang timezone của quán, thuộc giao lịch quán/lịch offering, ngoại lệ ngày và giới hạn nhận món nếu có. Khoảng [start,end), endDayOffset=1 cho ca qua đêm. Ngoại lệ đóng cửa ở ngày thực tế đang xét cũng chặn phần ca kéo sang ngày đó; không để ca hôm trước lách ngày nghỉ. Nhiều ca và nghỉ giữa ca được xét riêng.
3. sold_out/paused còn hiệu lực bị loại. Giờ/menu stale hoặc unknown vào trạng thái Cần xác nhận, không vào pool khả thi. Tồn kho unknown nhưng lịch verified vẫn được mô tả là “dự kiến phục vụ theo lịch”; không được quảng cáo live stock. Offering có báo hết hàng đã hết hạn vẫn cần phân biệt lịch với xác nhận tồn món.
4. Món có mealSlot phù hợp bữa đã chọn. Buổi là biên tập theo dữ liệu, không giả mọi món có breakfast; nhóm được đổi buổi trong lobby với reset ready. 22:00 không tự loại tất cả món: quán/món phục vụ 22:00–02:00 vẫn có thể đạt.
5. Gom theo dish/variant, không trùng; đặc tính/giá trên card phải được ít nhất một offering hợp lệ đáp ứng đồng thời. Không ghép nhiệt độ quán A với vị/giá quán B thành món không thực tế. Không đủ dữ liệu đặc tính chung thì ghi tùy quán/unknown hoặc phân định variant rõ.
6. Cuisine/category/flavor/temperature/budget/distance/recent history xếp hạng mềm trong tập hợp lệ, không là veto thay phiếu. GM-18 có rule order/version deterministic và fixture; không hứa weights tối ưu. <=8 món, ít hơn dùng số thực; rỗng trả lý do, không tự nới vùng/giờ hoặc lấy quán unknown.

Món gốc Nam bán tại Hà Nội được gợi ý ở Hà Nội nếu đạt các điều kiện; món chỉ có offering tại TP.HCM không vào pool ăn ở Hà Nội. Schedule verified là bằng chứng lịch dự kiến, không bảo đảm khách đến còn món/chỗ ngồi; không thêm booking/capacity claim.

## Contract output và khóa phiên

GM-18 trả eligible dishes/variants + offering refs, effective profile/price source/unit, reasonCodes, evaluatedAt, datasetVersion, eligibilityVersion và poolSeed; không trả GPS/private preferences. GM-19 tích hợp vào preview/room/start; GM-15 chỉ score/veto/tier trên pool được khóa, không phụ thuộc UI hoặc thời tiết.

GM-19 revalidate trước start trong transaction cùng lock room; dataset publish/version thay đổi phải dùng snapshot nhất quán, không đọc trộn phiên bản. Pool/context/version đã được nhóm ready khác kết quả mới → trả CONTEXT_CHANGED, cập nhật snapshot/reset ready rồi yêu cầu nhóm xác nhận lại. Retry cùng requestId giữ semantics idempotency; sửa request body/version phải dùng requestId mới sau phản hồi từ chối rõ.

Sau start snapshot pool/roster/context/offerings/lịch/evaluatedAt/policy bất biến. Lịch quán đổi giữa phiên không thay phiếu/resultId. GM-27 refetch offering cho đúng winner/context: còn nơi khác hợp lệ thì hiển thị, không còn thì báo và cho tạo phiên mới. Result cũ vẫn là quyết định đã chốt; không reroll hoặc phục hồi NO. Outbox GM-31 cache version/evaluatedAt, không biến cache thành xác nhận đang bán.

## Freshness, quyền và vận hành

GM-08 thu dữ liệu pilot thật có quyền dùng: mục tiêu 20–30 chi nhánh, 15–20 món trong vùng đã chốt; không ép bịa để đủ số. Catalogue biên tập 60–80 món chưa có offering vẫn không được vào pool thực tế. Source cho từng nhóm thông tin (ảnh/menu/giờ/giá/tọa độ); nhập → kiểm máy → người khác review → publish version → lịch kiểm lại. CSV/JSON import phải trả lỗi trường/dòng, không publish một phần không rõ trạng thái.

Đề xuất ngưỡng review tại GM-01: menu/giờ 7 ngày; địa chỉ/tọa độ 30 ngày; kiểm lại offering dùng demo trước buổi pilot. Đây là policy cần chốt, không bảo đảm thực tế không đổi. sold_out override có expiresAt; phản ánh user vào hàng chờ xác minh. Có dataset quality report và rollback/version snapshot không làm đổi phiên đã start.

GPS không server/database/log/queue/history; anchor công cộng chỉ trong context phòng cần thiết tới cleanup (đề xuất 24h sau terminal như room), không đưa vào history mặc định. Preference/mood riêng theo auth, không gửi notification hoặc AI mặc định. Shared snapshot chỉ có bối cảnh đã xác nhận; privileged publisher/RPC kiểm quyền, không service key client.

## Weather/mood P2 — GM-38

Weather có provider/source, khu vực công cộng, observation hoặc forecastFor đúng desiredAt, fetchedAt/expiresAt, nhiệt độ/cảm giác nhiệt nếu biết, mưa/xác suất mưa/condition. Review provider/license/quota/privacy trước dùng; stale/timeout thì bỏ tín hiệu, không chặn core.

Mood là nhãn user tự chọn (ví dụ muốn ăn nhẹ, món quen, thử mới, thanh mát), optional/consent theo phiên, createdAt/expiresAt; không suy trạng thái sức khỏe từ phiếu/GPS. Chỉ rank tập eligibility, không override NO/REMOVE hoặc thức ăn hết bán. Context đổi trước start reset ready; sau start khóa, không reorder bộ vote. Private mood xóa theo TTL terminal đã review, không lưu history mặc định. Rule có ID/version/explanation, pilot mới đánh giá hiệu quả.

## Acceptance criteria và ownership

| AC | Nội dung | Tasks | Tests |
| --- | --- | --- | --- |
| FOOD-01 | Phân biệt origin và địa điểm có offering thật | GM-04, GM-08, GM-18 | T-23/25 |
| FOOD-02 | Radius mét/anchor/ranh giới/coverage | GM-08, GM-24, GM-18 | T-10/23 |
| FOOD-03 | GPS deny/manual/nhóm nhiều vùng dùng một context | GM-25, GM-24 | T-10/19 |
| FOOD-04 | Buổi ăn đúng/đổi buổi reset ready | GM-19, GM-25, GM-18 | T-19/25 |
| FOOD-05 | Giờ món khác giờ quán, nhiều ca, last order | GM-06, GM-08, GM-18 | T-14/25 |
| FOOD-06 | Overnight/ngoại lệ/ngày/timezone/buffer một lần | GM-24, GM-18, GM-19 | T-19/25 |
| FOOD-07 | Unknown/stale/sold_out không giả đang bán | GM-08, GM-18 | T-23/25 |
| FOOD-08 | Card/variant/giá không ghép dữ liệu sai giữa quán | GM-04, GM-26, GM-18 | T-03/25 |
| FOOD-09 | Version/revalidate/start/reset/snapshot nhất quán | GM-19, GM-20, GM-31 | T-02/05/16/25 |
| FOOD-10 | Availability sau start không reroll result | GM-20, GM-27 | T-05/25 |
| FOOD-11 | Weather/mood không override feasibility/veto | GM-38 | T-26 |
| FOOD-12 | GPS/preference/mood không leak | GM-17, GM-24, GM-38 | T-08/10/26 |
| FOOD-13 | Source/license/freshness/publish/rollback, fixture riêng | GM-04, GM-06, GM-08 | T-14/23 |
| FOOD-14 | Pool ít/rỗng, không nhân bản hoặc fallback sai vùng | GM-19, GM-25, GM-18 | T-03/19/25 |

Core GM-32, GM-33 kiểm FOOD-01..10/12..14 theo phạm vi P0; FOOD-11 và phần mood FOOD-12 do GM-38 sau release, không chặn P0. Pure TS/SQL dùng chung fixture; test thật cần runner GM-02 và SQL setup GM-06. GM-08 là dataset, GM-24 là capability location, GM-18 là eligibility, GM-19 là room integration: dependency rõ để không tạo vòng với result/release.
