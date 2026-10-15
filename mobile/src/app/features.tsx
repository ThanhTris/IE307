import { useRouter } from 'expo-router';
import { FeaturePreviewHubScreen } from '../features/home/screens/FeaturePreviewHubScreen';
import { pathForDemoDestination } from '../features/shared/navigation';

export default function FeaturePreviewRoute() {
  const router = useRouter();
  return <FeaturePreviewHubScreen onBack={() => router.canGoBack() ? router.back() : router.replace('/foundation')} onOpen={destination => router.push(pathForDemoDestination(destination))} />;
}
