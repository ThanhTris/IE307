# GM-03 — Food-v1 fixtures

Chỉ dữ liệu mô phỏng để kiểm hợp đồng; không là seed hoặc khảo sát thật. Tên TEST, địa chỉ, tọa độ 0/1 độ, giá và lịch đều được soạn tổng hợp. Không là gợi ý quán, không có claim thành phần/dị ứng. Dataset giữ `kind=fixture`, `status=draft`; nguồn `fixture://gm03-authored`, `usageRights=fixture-only`, không có ảnh mạng.

- [Dataset](gm03-dataset.json): 4 món, 2 chi nhánh mô phỏng, 5 offering, 7 schedule, 2 coverage/anchor; null/unknown, giá person/portion/group, nhiều ca, overnight, exception đóng ngày sau và sold_out có hạn.
- [Cases](gm03-cases.json): 12 context/expected pool do người soạn đặt. Category xung đột, seed replay, overnight/[start,end), exception ngày sau, mealSlot, budget null/unknown, origin khác nơi bán, ngoài vùng/radius, sold_out, giờ unknown và đơn vị giá nhóm.
- [Dictionary](../../../docs/data/FOOD_DATA_DICTIONARY.md): types/field mapping, enums và giới hạn.

`validatePoolFixture` chỉ kiểm cấu trúc/refs/unique/<=8. Không lấy expectedPool làm output thuật toán; GM-11 sẽ chứng minh eligibility/ranking bằng selector thật và SQL parity. GM-12 kiểm snapshot/version/ready/start transaction. Case seed-replay chưa chứng minh random/selector deterministic.

Chạy từ `mobile`: `npm.cmd test -- --runTestsByPath tests/catalogueContract.test.ts`. Native/DB/remote không cần cho kiểm hợp đồng này; không có import seed/publish trong lệnh test.
