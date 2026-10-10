# GM-04 — Tiếp nhận draft dữ liệu legacy GM-03 sau rebase

2026-10-10 • Owner Vinh • Reviewer đề xuất Tâm • Review Pending.

## Scope / version / nguồn

Branch `codex/gm-03-taxonomy-data-contract`, PR #62, base main.
Main được fetch tại `4f154af714411e81351e7761ceca281b1436fa68`.
Nhánh trước rebase: `42a821c28144c0667839d485edf2b9462d463937`.
5 commit data được replay lên main; merge cũ không tạo merge thừa. Evidence/data
trong commit merge cũ được bảo toàn riêng, không viết lại nội dung lịch sử.

Roadmap-v1 GM-03 nhận scope ở roadmap-v2 GM-04 và GM-07. Đây là tiếp nhận draft,
không hoàn thành AC mới hoặc tự duyệt. Task GM-03 hiện tại thuộc BE structure của
Trí và được giữ nguyên main. Issue fields hiện hành #65; issue #40 cũ không còn
truy cập. Không dùng Closes cho task chưa nghiệm thu.

## Artifact đã có

- [Dictionary](../../../../data-preparation/docs/DATA_DICTIONARY.md),
  [taxonomy](../../../../data-preparation/docs/TAXONOMY.md),
  [templates CSV/JSON](../../../../data-preparation/templates/README.md).
- [Catalogue editorial](../../../../data-preparation/docs/EDITORIAL_CATALOGUE.md):
  39 món; source mapping 219 tên (216 mapped/2 review/1 excluded); 247 menu price
  observations, artwork=null. Catalogue dataset 0.2.0, food contract 1.0.0 draft.
- [Food fixtures](../../../../tests/fixtures/food-data-v1/README.md),
  [review package cũ](../../GM-03/REVIEW_PACKAGE.md) và audit chỉ đọc.
- [Sync v1](../../roadmap-v1/GM-03/MAIN_SYNC.md) giữ nguyên;
  [task trước v2](../../roadmap-v1/GM-03/TASK_BEFORE_V2.json) chỉ là snapshot.

## Kiểm / expected / giới hạn

Sau rebase: bundled Python 3.12.14 chạy 239 regression tests, OK;
repository validator và `task_readiness.py --check-docs` Pass; audit dữ liệu
9/9 nhóm Pass, validStructure=true/readyForPublish=false; `git diff --check` Pass.
Audit dùng clock lịch sử, không xác nhận freshness hôm nay. Snapshot/config/
code/data fixtures và evidence cũ đối chiếu byte với branch trước rebase.
Không gọi lại GPT/crawl/API dữ liệu, không sửa checksum snapshot hoặc fixtures.

Đầu ra v2 dự kiến `docs/data/FOOD_DATA_DICTIONARY.md`, seed template food-v1 và
contract-cases chưa được chuyển thành artifact chuẩn của GM-04. Field entity
room/member/phiếu/result/history/friend/inbox theo AC mới cần GM-04/GM-07 review
và bổ sung riêng; không tự copy placeholder để mở gate. Schema GM-06, client
GM-07, verified import GM-08 và quyền ảnh/nội dung chưa được nghiệm thu bằng patch
này. Mục tiêu 60–80 món chưa đạt, chỉ có 39 món đã chốt.

## Downstream và review

GM-05/06/07/08/15 nhận artifact theo contract/path đã được reviewer duyệt. Engine
legacy GM-06 sẽ rebase từ nhánh này và thuộc GM-15 v2; code của nhánh con không có
trong PR dữ liệu. GM-01 baseline còn Pending; giữ task backlog/proposed, không
Approved/Done, không auto merge. Trước tích hợp chạy gate theo ref đích thực tế.
