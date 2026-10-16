import { useRouter } from 'expo-router';
import { Gm25FlowCheckScreen } from '../../features/rooms/screens/Gm25FlowCheckScreen';

export default function Gm25InternalRoute() {
  const router = useRouter();
  return (
    <Gm25FlowCheckScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onNavigateTo={(pathname, params) => router.push({ pathname, params } as any)}
    />
  );
}
