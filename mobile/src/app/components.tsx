import { useRouter } from 'expo-router';
import { ComponentPreviewScreen } from '../features/home/screens/ComponentPreviewScreen';

export default function ComponentsRoute() {
  const router = useRouter();
  return <ComponentPreviewScreen onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />;
}
