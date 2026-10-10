# GM-04 — bổ sung PR #62 theo review Trí

Owner Vinh; reviewer Trí theo comment PR #62 ngày 2026-10-10. Review Pending.
Input: main `0cf1dc0b247c717abce1bdd23fec8dba791835cc`, GM-01
`food-v1/roadmap-v2/GM-01.1`, hồ sơ Approved tại
[REVIEW](../GM-01/REVIEW.md). Gate trước code: READY_TO_CLAIM; owner yêu cầu
thực hiện patch, không coi đó là approval output. Scope theo
[GM-04](../../../../tasks/backlog/GM-04.md) và
[comment](https://github.com/ThanhTris/IE307/pull/62#issuecomment-6096995245).

## Patch

- Dictionary/field coverage, food/core JSON Schema và template có dữ liệu mô phỏng
  đủ liên kết. Contract đề xuất `food-v1/roadmap-v2/GM-04.1` cho GM-06/07 review.
- Tái dùng food interchange 1.0.0 qua adapter sang food fields 1.1.0: thêm binding
  lịch quán và lastOrder/day offset tường minh. Core fields 1.0.0 là contract mới.
  Không sửa bytes/version/checksum snapshots 1.0.0/dataset 0.2.0 lịch sử.
- Config field là nguồn schema/dictionary; validator cấu trúc và quan hệ chạy
  stdlib, không cài dependency. Runner chỉ hỗ trợ và kiểm tất cả keyword được
  dùng trong các schema này; không tuyên bố là thư viện JSON Schema tổng quát.
- Core gồm profiles/room/member/preferences/pool/submission/vote/result/history/
  consent/friend/invitations/inbox/device/event/delivery/idempotency; private
  ballots, tokens, tied IDs không thành public snapshot. Weather/mood reserved P2.
- Fixture JSON rõ fixtureOnly và nguồn example.invalid; expected được biên tập
  độc lập, runner không sinh expected từ kết quả validator.

## Test

Schema/template hợp lệ; thiếu/extra field, null/unknown, enum/type (bool khác số),
UUID/FK/unique, giá/đơn vị, timezone/overnight/lastOrder/ngoại lệ, freshness nguồn
con và fixture chặn publish. Core kiểm locked roster/pool, round/vote/submission,
result/history consent, pair/invite/inbox/event, expiry/idempotency/privacy.
Mỗi ca có expected và actual/error path cố định; chạy lại cùng checksum.
Regression, audit legacy, repository validator, indexes, start/merge gate và diff.

Không triển khai eligibility/ranking, SQL/import/RLS/RPC/native/push; không gọi
GPT/crawl, cài package hoặc tăng số món. Tests contract không nghiệm thu những
phần đó. Giữ task chưa Approved/Done và không dùng Closes #65.
