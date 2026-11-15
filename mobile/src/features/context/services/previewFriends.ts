import type { SetupFriend } from './dishSetup';

/**
 * Development-only: start Metro with EXPO_PUBLIC_UI_PREVIEW_FRIENDS=1 to see the friend picker with people in it.
 * Added after any real friends. The sample ids are not real accounts, so do not create a room with them. Never active in a release build.
 */
const sample: SetupFriend[] = ['Linh', 'Nam', 'Trang', 'Minh Anh', 'Hoàng', 'Thu Hà', 'Quốc Bảo', 'Phương', 'Khánh Vy', 'Đức Anh', 'Mai', 'Tuấn Kiệt', 'Ngọc Lan', 'Bảo Châu', 'Gia Hân', 'Hải Đăng', 'Thanh Tâm', 'Việt Hùng', 'Kim Ngân', 'Anh Thư'].map((label, index) => ({ id: `preview-${index}`, label }));

export function withPreviewFriends(real: SetupFriend[]): SetupFriend[] {
  return __DEV__ && process.env.EXPO_PUBLIC_UI_PREVIEW_FRIENDS === '1' ? [...real, ...sample] : real;
}
