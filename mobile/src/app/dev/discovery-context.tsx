import { useRouter } from 'expo-router';
import { DiscoveryContextScreen } from '../../features/context/screens/DiscoveryContextScreen';

export default function DiscoveryContextRoute() {
  const router = useRouter();

  return (
    <DiscoveryContextScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onSaveContext={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
