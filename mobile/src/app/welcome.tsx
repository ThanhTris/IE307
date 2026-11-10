import { useCallback } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { GuestEntryScreen } from '../features/home/screens/GuestEntryScreen';

export default function WelcomeRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const complete = useCallback(() => router.replace('/'), [router]);
  if (live.status === 'active' && !!live.user) return <Redirect href="/" />;
  return <GuestEntryScreen onContinue={name => live.ensureSession(name)} onComplete={complete} session={live} />;
}
