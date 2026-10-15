import { useRouter } from 'expo-router';
import { ContextScreen } from '../../features/context';

export default function Gm24ContextRoute() {
  const router = useRouter();

  return (
    <ContextScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onSaveContext={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
