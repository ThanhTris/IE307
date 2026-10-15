import { useRouter } from 'expo-router';
import { Gm24ContextScreen } from '../../features/context/screens/Gm24ContextScreen';

export default function Gm24ContextRoute() {
  const router = useRouter();

  return (
    <Gm24ContextScreen
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      onSaveContext={() => {
        if (router.canGoBack()) router.back();
        else router.replace('/');
      }}
    />
  );
}
