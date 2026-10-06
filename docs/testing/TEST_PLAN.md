# Kế hoạch kiểm thử

Đây là test plan, chưa phải kết quả triển khai.

| ID | Kiểu | Scenario / expected |
| --- | --- | --- |
| T-01 | Android | guest/session restart, tên sai, guest mất session báo rõ |
| T-02 | RPC race | cùng tranh ghế thứ 8; chỉ một join thành công |
| T-03 | Domain | category A nướng/B lẩu vẫn có pool đa dạng, không giao cứng |
| T-04 | Domain + SQL parity | fixtures decision-cases.json; NO không winner; UNSET chặn; tie tập đúng |
| T-05 | RPC | last submit đồng thời/retry timeout; một resultId, winner không đổi |
| T-06 | UI/E2E | full round1; WANT/OK/NO; sửa trước gửi, khóa sau ACK |
| T-07 | UI/domain | round2 keep/remove; hết món → no-consensus; không round3 |
| T-08 | RLS | A/B/host/outsider/anonymous-no-session; đọc phiếu người khác và spoof thất bại |
| T-09 | Network | offline trước/sau submit, reconnect stale version; không fake ACK |
| T-10 | Android | QR permission denied nhập mã; mã expired/full; Maps app thiếu mở browser |
| T-11 | P1 | invite consent, account-link conflict, history không raw votes |
| T-12 | A11y | 320/390/768dp, font200%, TalkBack, dark, reduced motion; nút 48dp |
| T-13 | Multi-client | 2/4/8 clients; host/member rời; cancel-vote race; expiry server |
| T-14 | Data | migration fresh/upgrade, cleanup24h; published catalogue fixture |
| T-15 | Study | >=5 nhóm; thời gian/mức dễ hiểu và phiên không thành công, so sánh baseline |

Pure domain dùng unit runner chốt ở GM-01, SQL integration dùng Supabase local hoặc project test tách dữ liệu. Android E2E ưu tiên Maestro nếu dependency được duyệt. Không tạo test giả cho placeholder thư mục.

Evidence mỗi task ở `docs/evidence/GM-XX/`: lệnh, version, ngày, fixture, output, ảnh; ghi device/emulator/mạng. Screenshot prototype không là screenshot native. Giá trị mục tiêu không ghi thành số đo.
