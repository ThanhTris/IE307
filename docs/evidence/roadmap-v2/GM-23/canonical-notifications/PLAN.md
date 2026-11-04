# GM-23.2 — canonical notification integration

Ngày 2026-11-04; base `7c22db8`; owner/reviewer Trí / ThanhTris.
Start gate live: READY_TO_CLAIM. GM-20 và GM-22 Done; không đổi Project metadata.

1. Nhận writer/outbox GM-20.4/0035, history GM-21.3/0036 và admission GM-22.2/0037.
2. Thêm migration 0038/schema 0.15.0, không sửa migration đã merge. Materialize
   canonical event/inbox trong transaction terminal; reference registry không cấp ACL.
3. Giữ sender lease/generation/retry/receipt, dùng payload projection chung.
4. QA owned Auth+REST từ toàn bộ migrations, SQL ACL, actual producer HTTP,
   local fake-provider HTTP và Bruno desktop. Không reset hoặc migrate app DB.
5. Giữ evidence baseline riêng; remote push Android chuyển GM-29, inbox GM-28,
   authorized notification refetch GM-30. Trí review, không tự Done/merge/push.
