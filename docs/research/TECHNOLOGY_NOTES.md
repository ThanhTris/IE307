# Nguồn công nghệ

Kiểm 2026-10-06; nghiên cứu hỗ trợ ADR, chưa phải bằng chứng app chạy.

- [Expo Router](https://docs.expo.dev/router/basics/navigation-layouts/): routes dưới src/app, feature code bên ngoài.
- [Supabase anonymous auth](https://supabase.com/docs/guides/auth/auth-anonymous): guest vẫn có auth identity; cần abuse control/cleanup.
- [Database functions](https://supabase.com/docs/guides/database/functions): RPC transaction, review search_path/quyền.
- [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security): test nhiều auth user, không chỉ admin dashboard.
- [Pricing](https://supabase.com/pricing): free tier giới hạn/pause, kiểm lại bootstrap/demo; không tự bật trả phí.
- [Maps URLs](https://developers.google.com/maps/documentation/urls/get-started): không API key; không trả danh sách quán vào app.
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/): QR cần permission và nhập mã fallback.
- [ML Kit](https://developers.google.com/ml-kit/vision/text-recognition/v2/android): OCR P2, native integration, người dùng kiểm sửa.

Không cài latest thiếu lockfile khi code. GM-01 ghi phiên bản/license/kích thước dependency được reviewer duyệt. AI/OCR không là dependency MVP.
