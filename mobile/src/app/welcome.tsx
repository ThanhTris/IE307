import { useCallback } from 'react';
import { Redirect, useRouter } from 'expo-router';
import { useRoomRepository } from '../bootstrap/RoomRepositoryProvider';
import { GuestEntryScreen } from '../features/home/screens/GuestEntryScreen';

export default function WelcomeRoute() {
  const router = useRouter();
  const live = useRoomRepository();
  const complete = useCallback(() => router.replace('/'), [router]);
  if (live.status === 'active' && !!live.user) return <Redirect href="/" />;
  return <GuestEntryScreen onContinue={async name => {
      if (!live.ensureSessionDetailed) return live.ensureSession(name);
      const result = await live.ensureSessionDetailed(name);
      return result.ok ? true : result.error ?? false;
    }} onComplete={complete} session={live}
    onSignIn={() => router.push({ pathname: '/account/[flow]', params: { flow: 'sign-in' } })}
    onSignUp={() => router.push({ pathname: '/account/[flow]', params: { flow: 'sign-up' } })} />;
}
