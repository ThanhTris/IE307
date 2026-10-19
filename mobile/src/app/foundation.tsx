import { useRouter } from 'expo-router';
import { FoundationScreen } from '../features/home/screens/FoundationScreen';

export default function FoundationRoute() {
  const router = useRouter();
  return (
    <FoundationScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onOpenComponents={() => router.push('/components')}
      onOpenFeaturePreview={() => router.push('/features')}
      onOpenGm25={() => router.push('/internal/gm25')}
      onOpenResultPreview={() => router.push('/gm13/result')}
    />
  );
}
