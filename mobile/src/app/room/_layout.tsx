import { useEffect } from 'react';
import { Stack, useGlobalSearchParams, useNavigation, usePathname } from 'expo-router';
import { useRoomRepository } from '../../bootstrap/RoomRepositoryProvider';
import { saveLastRoom } from '../../features/rooms/services/lastRoomStore';

export default function RoomLayout() {
  const { roomId } = useGlobalSearchParams<{ roomId?: string }>();
  const userId = useRoomRepository().user?.id;
  const navigation = useNavigation();
  const voting = /^\/room\/(vote|final-round)/.test(usePathname());
  // Remember the room this account is in, so it can come back after a dropped connection (ADR-027).
  useEffect(() => { if (userId && typeof roomId === 'string' && roomId) void saveLastRoom(userId, roomId); }, [userId, roomId]);
  // Swiping right on a flashcard is "Ăn được": while voting, iOS must not read it as the swipe-back of the whole room group.
  useEffect(() => { navigation.setOptions({ gestureEnabled: !voting, fullScreenGestureEnabled: !voting }); }, [navigation, voting]);
  return <Stack screenOptions={{ headerShown: false }}>
    <Stack.Screen name="vote" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
    <Stack.Screen name="final-round" options={{ gestureEnabled: false, fullScreenGestureEnabled: false }} />
  </Stack>;
}
