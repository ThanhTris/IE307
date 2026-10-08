# ADR-001 — Expo + Supabase

Status: Proposed, chưa được reviewer chấp thuận. Ngày 2026-10-06.

6 người, 8 tuần, React Native, chi phí gần 0; nhiều máy và phiếu kín đối với cả host. Firebase ở hội thoại là gợi ý, chưa là quyết định triển khai.

Đề xuất Expo Router + TypeScript strict; Supabase guest Auth, PostgreSQL RPC/RLS và Realtime báo version. Khóa phiên bản tương thích tại GM-02; không thêm server HTTP riêng.

| Phương án | Lợi ích | Đánh đổi |
| --- | --- | --- |
| Supabase | Transaction RPC và RLS phù hợp chốt/giữ phiếu kín | Học SQL security; quota/pause |
| Firebase | Expo bắt đầu nhanh, realtime phổ biến | Tổng hợp private votes cần trusted backend; không để host đọc mọi phiếu |
| Node server riêng | Kiểm soát đầy đủ | Tăng deploy/auth/hosting |

Gate: reviewer kiểm free tier, anonymous auth/abuse control, RPC security; chấp thuận hoặc sửa ADR. Đợt này chưa tạo database/deployment.
