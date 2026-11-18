import { useEffect } from 'react';
import { Stack, useNavigation, usePathname } from 'expo-router';

export default function RoomLayout() {
  const navigation = useNavigation();
  const voting = /^\/room\/(vote|final-round)/.test(usePathname());
  // Swiping right on a flashcard is "Ăn được": while voting, iOS must not read it as the swipe-back of the whole room group.
  useEffect(() => { navigation.setOptions({ gestureEnabled: !voting, fullScreenGestureEnabled: !voting }); }, [navigation, voting]);
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="vote" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
    <Stack.Screen name="final-round" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
  </Stack>;
}
