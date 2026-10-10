# ADR-001 — Expo + Supabase

Status: Accepted — chủ dự án xác nhận reviewer Trí đã duyệt ngày 2026-10-10. Đề xuất ban đầu ngày 2026-10-06.

6 người, 8 tuần, React Native, chi phí gần 0; nhiều máy và phiếu kín đối với cả host. Firebase ở hội thoại là gợi ý, chưa là quyết định triển khai.

Đề xuất Expo Router + TypeScript strict; Supabase guest Auth, PostgreSQL RPC/RLS và Realtime báo version. Khóa phiên bản tương thích tại GM-02; không thêm server HTTP riêng.

| Phương án | Lợi ích | Đánh đổi |
| --- | --- | --- |
| Supabase | Transaction RPC và RLS phù hợp chốt/giữ phiếu kín | Học SQL security; quota/pause |
| Firebase | Expo bắt đầu nhanh, realtime phổ biến | Tổng hợp private votes cần trusted backend; không để host đọc mọi phiếu |
| Node server riêng | Kiểm soát đầy đủ | Tăng deploy/auth/hosting |

Xác nhận: chủ dự án trả lời “duyệt rồi” cho câu hỏi GM-01/ADR-001, rồi đồng ý bộ package nền và cho phép cập nhật hồ sơ GM-01. Xem [evidence](../../evidence/roadmap-v2/GM-01/REVIEW.md). Approval chọn Expo + Supabase và cấu trúc, không chứng minh free tier/quota, anonymous auth/abuse control hoặc RPC security đã được kiểm trên deployment. Những phần đó vẫn phải kiểm tại task triển khai tương ứng; không tạo remote project/paid plan trong GM-03.
