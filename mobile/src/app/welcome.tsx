import { useCallback } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { rememberPreviewGuest, useRoomPreview } from '../bootstrap/roomPreview';
import { GuestEntryScreen } from '../features/home/screens/GuestEntryScreen';

export default function WelcomeRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const preview = useRoomPreview();
  const isReal = live.mode === 'real';
  const complete = useCallback(() => router.replace('/'), [router]);
  const continueGuest = async (name: string) => {
    if (isReal) return live.ensureSession(name);
    rememberPreviewGuest(name);
    return true;
  };

  if (isReal ? live.status === 'active' && !!live.user : !!preview.guestName || !!preview.active) return <Redirect href="/" />;
  return <GuestEntryScreen onContinue={continueGuest} onComplete={complete} session={isReal ? live : undefined} isMock={!isReal} />;
}
