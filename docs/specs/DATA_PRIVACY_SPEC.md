# Đặc tả quyền riêng tư và dữ liệu — Manabi

Liên kết: FR-17, NFR-04/05/10/12; [AUTH_SYNC](AUTH_SYNC_SPEC.md), [BACKUP](BACKUP_SPEC.md), [AI_QUIZ](AI_QUIZ_SPEC.md), [IMAGE_CONTEXT](IMAGE_CONTEXT_SPEC.md). Retention/delete dưới đây là đề xuất review, không thay điều khoản nhà cung cấp.

## Kiểm kê và tối thiểu hóa

| Dữ liệu | Mặc định | Ra ngoài thiết bị |
| --- | --- | --- |
| Deck/card/JSON fields | Local, user-owned | Chỉ sync khi chọn account/upload |
| SRS/review/game/progress | Local, metadata ngoài fields | Sync theo scope thông báo; không Gemini mặc định |
| Account/session | Provider + secure tokens | Auth khi login; không export/log |
| AI demo | Snapshot tối thiểu/provenance/attempt | Backend→Gemini khi auth/consent/tuổi-vùng/tier phù hợp |
| Ảnh pilot | Source/license/mapping approved | Query tối thiểu khi biên tập; không deck/history |
| Telemetry | Metadata redacted | Upload tắt mặc định; task riêng nếu làm |

Key Gemini chỉ admin/server, không mobile/commit/log/backup. Không raw prompt/output/card text/email/token logs. Error details tối thiểu. Provider logs/retention không được policy local kiểm soát.

## Consent và Gemini

Trước dịch vụ ngoài, thông báo provider/mục đích/fields/cách dùng dữ liệu tier/fallback; lưu consent version/acceptedAt/revokedAt server, không tin client boolean. Revoke chặn call mới/queued chưa chạy; không hứa thu hồi data đã gửi. Free Tier chỉ demo không nhạy cảm khi điều khoản cho phép; private deck/PII chặn mặc định. Tuổi/vùng chưa chốt hoặc không phù hợp thì flag AI tắt, core vẫn chạy. Consent không thay điều khoản. Không camera/mic/upload ảnh riêng/train data người học trong phạm vi này.

## Export/xóa/retention đề xuất

User thấy scope export/full backup/xóa local, nhắc backup trước thao tác không khôi phục. Delete account reauth + preview và job server purge; máy khác nhận tombstone/purge khi sync. Phân biệt logout/archive/delete.

Đề xuất review: logs redacted ≤ 30 ngày; raw model response không ở log, draft record có quyền tới expiry/delete; metadata rejected draft ≤ 30 ngày, không private content; canonical data purge mục tiêu ≤ 7 ngày sau request xác nhận; backup hệ thống theo provider retention ghi cụ thể trước release. Các hạn mức phải xác minh/task cấu hình, không claim đã thực hiện. Personal backup đã xuất ngoài thiết bị không xóa từ server được, UI giải thích.

## Nghiệm thu

Opt-out/revoke không AI call; payload không history/PII; key absent bundle/log/export; A không export/delete B; purge local restart không hiện lại; delete retry idempotent; outbox cũ không khôi phục account data đã xóa; retention provider khác policy là blocker/disclosure update. Privacy URL/Data safety theo build thật.
