# GM-16 auth adapter — GM-16.1

Owner Trí, reviewer Tâm. Không có màn login/room integration tại task này.
Package được chủ dự án chấp thuận: expo-secure-store57.0.4 cho Expo SDK57.

```typescript
import { createAuthenticatedApiClient } from '@/data/auth';

const { session, client } = createAuthenticatedApiClient({
  baseUrl: configuration.supabaseUrl, // HTTPS; loopback HTTP chỉ local development
  publicKey: configuration.supabasePublicKey, // publishable/anon, không service_role
  clearPrivateData: () => privateRepositories.clearAll(),
});

const restored = await session.restoreSession(); // Không tự tạo guest khi restore lỗi
const created = await client.createGuestSession({ displayName: 'Trí' });
// Chỉ tạo khi người dùng chủ động và không có secure session tồn tại.
const result = await client.logout(); // Local cleared dù remote revoke lỗi
```

configuration/privateRepositories do GM-25/31 composition cung cấp, không có
global singleton hoặc cleanup no-op mặc định. Callback clear tất cả private
draft/cache/outbox trước đổi identity. Cleanup lỗi chặn signup/restore đến khi
logout cleanup chạy lại thành công. Public catalogue cache có thể giữ riêng.

SessionStorage secure entry nội bộ gồm access/refresh/expiry/user. `getStatus()`
chỉ trả empty/active/lost/blocked, không credentials. Room RPC dùng token hiện
hành và reject response sau logout/auth loss. initialToken/setAuthToken legacy
không thay quyền trong managed mode. SessionResponse còn token theo GM-07 để giữ
interface, consumer không persist/log response. Refresh token không public DTO.

Verification tự retry bounded transient failures; token refresh/signup chỉ một
attempt. Signup unknown outcome blocked đến logout rõ ràng, không tạo guest
liên tiếp vô hạn. Account linking/recovery/SQLite/native AppState wiring task sau.

Kiểm unit: `cd mobile; npm test -- tests/unit/authSession.test.ts tests/unit/authTransport.test.ts`.
Kiểm HTTP/SQL: `node scripts/gm16_auth_check.mjs --sql --rate-limit` tại repo root,
sau start đúng local project và migrate schema. Runner không in/lưu token.
Xem CHECKS/HANDOFF ở docs/evidence/roadmap-v2/GM-16. Unit mock SecureStore không
thay Android restart/backup/lost-session evidence.
