import { Redirect, useRouter } from 'expo-router';
import { HomePreviewScreen } from '../../features/home/screens/HomePreviewScreen';

export default function HomePreviewRoute() {
  const router = useRouter();
  if (!__DEV__) return <Redirect href="/" />;
  return <HomePreviewScreen onCreate={() => router.push('/room/create')} onJoin={() => router.push('/room/join')}
    onResume={() => router.push('/continue-session')} onFriends={() => router.push('/friends')}
    onHistory={() => router.push('/history')} onInbox={() => router.push('/inbox')}
    onOpenFoundation={() => router.push('/dev/foundation')} onOpenRoomSetup={() => router.push('/room/context')}
    onOpenDiscoveryContext={() => router.push('/dev/discovery-context')} />;
}
