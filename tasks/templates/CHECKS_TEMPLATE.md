# Output checks — GM-XX / roadmap-v2

Status: Pending execution (đổi theo kết quả thật, không là review Approved).
Task / owner / reviewer / scope:
Branch / target / tested commit / thời điểm:
Contract version / schema version / dataset version:
Mode: docs / expo-go / api-smoke / data-contract / data-schema / data-import / contract / domain / api / expo-native / expo-api / qa / release / api-extension / expo-api-extension.
Tool/runtime versions / OS / Expo Go hoặc build/device / database local:
Upstream artifact/commit đã nhận; dữ liệu synthetic hay verified:

## Setup và cách chạy lại

Working directory, install/run/import collection command, base URL local, route/navigation/scenario, local setup/cleanup và expected startup output. Không lưu secret hoặc reset/deploy remote. Nêu từng màn/component có cách mở và từng endpoint/field có case nào kiểm.

## Kết quả từng case/AC

| AC/case | Tool + route/request/lệnh | Input/setup (synthetic/đã che secret) | Expected + assertion | Actual + artifact thật | Pass/Fail/Not run | Giới hạn/owner |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | Not run | |

UI: ảnh/video từ app thật, screen/state/action/device/build. API: method/path, status/body đã che secret, fields/error/state/version assertions; race có runner riêng. Data: schema/field coverage, fixture/verified, validation/reject/query/counts/hash/freshness/rollback output. Domain: input/seed/round và actual winner/tier/reason.

## Bao phủ đầu ra

### API trên Android (nếu task có scope device/app)

Đối chiếu [ma trận Android–API](../../docs/testing/MOBILE_API_TEST_MATRIX.md). Tách kết quả server HTTP/SQL, unit/mock và điện thoại Android thật. Ghi API environment/endpoint không secret, app/API commit, model/Android/runtime/build, cách nối máy tính–điện thoại, thao tác → request/status/error → UI/state server/assertion và artifact đã che dữ liệu. Thiếu case device bắt buộc ghi Not run + owner; N/A chỉ ngoài scope, không suy Pass từ curl hoặc bundle.

| Producer API / consumer / case | Device/runtime/build/revision | Thao tác/endpoint | Expected HTTP/UI/state server | Actual/assertion/artifact | Pass/Fail/Not run + owner |
| --- | --- | --- | --- | --- | --- |
| | | | | | Not run |

| Artifact/schema field/endpoint/screen | Case/AC kiểm | Version/commit | Task nhận | Đã chạy lại từ clone sạch? |
| --- | --- | --- | --- | --- |
| | | | | |

## Blocker và giới hạn

Not run/Fail/N/A có lý do, việc cần làm và người phụ trách. N/A chỉ phần ngoài scope; AC bắt buộc chưa chạy/không đạt vẫn chưa hoàn thành. Fake provider/mock không chứng minh real API/delivery/native/verified data.

## Review

Reviewer đối chiếu output và revision thật theo [chuẩn đầu ra](../../docs/project/TASK_OUTPUT_REQUIREMENTS.md), [DoD](../../docs/project/DEFINITION_OF_DONE.md). Không tick Approved hoặc copy kết quả lịch sử sang revision mới; review của Trí dùng REVIEW_TEMPLATE.md và HANDOFF_TEMPLATE.md.
