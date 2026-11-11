import { Redirect, useRouter } from 'expo-router';
import { RequireActiveSession } from '../../features/auth/components/RequireActiveSession';

/** "Tạo phòng" goes straight to the room setup (Figma has no intermediate screen). */
export default function CreateRoomRoute() {
  const router = useRouter();
  return <RequireActiveSession onHome={() => router.replace('/')}>
    <Redirect href="/room/setup" />
  </RequireActiveSession>;
}
