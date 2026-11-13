import { Stack } from 'expo-router';

export default function RoomLayout() {
  // Swiping right on the flashcard means "Ăn được": iOS must not read it as the swipe-back gesture.
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="vote" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
    <Stack.Screen name="final-round" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
  </Stack>;
}
