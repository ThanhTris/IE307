import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

export default function Layout() {
  const dark = useColorScheme() === 'dark';
  return <>
    <StatusBar style={dark ? 'light' : 'dark'} />
    <Stack screenOptions={{
      headerStyle: { backgroundColor: dark ? '#151920' : '#ffffff' },
      headerTintColor: dark ? '#f5f7fa' : '#18202b',
      contentStyle: { backgroundColor: dark ? '#151920' : '#f3f5f7' },
    }}>
      <Stack.Screen name="index" options={{ title: 'Gì Cũng Được · GM-02' }} />
      <Stack.Screen name="join" options={{ title: 'Kiểm tra link/mã' }} />
    </Stack>
  </>;
}
