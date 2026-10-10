# GM-06 — Patch/test plan

2026-10-10 • Owner Vinh • Reviewer đề xuất Trung • Review Pending.

Chủ dự án đã yêu cầu triển khai kế hoạch GM-06 độc lập trên branch mới, kế thừa
GM-03. Parent: `42a821c28144c0667839d485edf2b9462d463937`, branch
`codex/gm-06-decision-engine`. Policy `decision-v2`; contract engine draft `1.0.0`.
Nguồn: DECISION_SPEC, API_CONTRACT và DATA_MODEL tại parent commit này.

## Gate và giới hạn

Readiness trước code: BLOCKED, GM-03 còn backlog/chưa Approved. Đây là bản draft
độc lập theo yêu cầu owner, không phải start gate hoặc merge gate được mở.
Assignment vẫn proposed vì chưa có xác nhận của reviewer; không đổi trạng thái
task/dependency hoặc đánh dấu AC được reviewer chấp thuận. GM-01 review food-v1,
GM-03 review dữ liệu và GM-02 bootstrap còn phải đối chiếu trước tích hợp.

## Patch

- `mobile/src/domain/decision/index.ts`: types, runtime validation, vòng 1/2,
  điểm, tier và tập ứng viên ổn định; không I/O, RNG, clock hoặc SDK.
- `tests/fixtures/decision-v2/cases.json`: input/expected mô phỏng tường minh,
  giữ nguyên hai fixture lịch sử; README ghi contract dùng chung TS/SQL.
- `mobile/tests/decision.test.mjs`: node:test chạy engine TS bằng Node 24 có sẵn;
  không thêm package/lockfile/config/runner cạnh tranh GM-02.
- README domain/tests/mobile, task GM-06 và evidence: contract, cách chạy, kết quả
  thật và phần chưa kiểm. Không sửa catalogue, cache GPT, dữ liệu food fixtures.

## Contract đã chốt với owner

Engine nhận roster/pool đã khóa, round 1 hoặc 2, policyVersion và matrices phiếu.
Không suy roster/pool từ phiếu. Thiếu/UNSET chờ; sai kiểu/giá trị/reference bị từ
chối. Chỉ trả tập ứng viên; backend chọn đều một lần và persist. Output nội bộ
không là public room snapshot và DECISION_READY không là RoomState DECIDED.
Chi tiết interface/error/nullability tại README domain; reviewer vẫn Pending.

## Tests / AC

T-04/07/22: fixtures vòng 1/2; NO/REMOVE veto; UNSET/thiếu member/dish; một món
vẫn xác nhận; không thêm món/vòng 3; điểm/tie; n chẵn/lẻ/all-OK; sai ID/reference/
value; input frozen; gọi lại/đảo thứ tự ổn định. Kiểm exhaustively phiếu hợp lệ
trên roster nhỏ và ngưỡng tier tới 8 thành viên, expected tính bằng công thức
độc lập, không sinh bằng engine.

Chạy tests Node, Python regression, repository validator, task index và diff.
Không coi Node type stripping là TypeScript strict typecheck. Typecheck/lint qua
GM-02, SQL parity, native build và backend transaction/idempotency/terminal
immutability chưa chạy; không đóng DEC-03/04/07 bằng tests thuần.

## Rollout / rollback

Chỉ working tree trên branch riêng; chưa commit/push/PR hoặc tích hợp runtime.
Bỏ riêng patch GM-06 để rollback, không thay parent hay snapshot GM-03. Trước
merge cập nhật target và chạy gate theo workflow, kiểm upstream review/commit,
tích hợp runner và reviewer duyệt revision thực tế.
