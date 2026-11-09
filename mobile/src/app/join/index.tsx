import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { isSuspiciousSearchParams } from '../../features/rooms/services/joinLinks';
import { normalizeRoomCode } from '../../features/rooms/services/roomEntry';

export default function JoinIndexRoute() {
  const router = useRouter();
  const rawParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();

  useEffect(() => {
    const isSuspicious = isSuspiciousSearchParams(rawParams as Record<string, unknown>);
    if (isSuspicious) {
      router.replace({
        pathname: '/room/join',
        params: { error: 'SUSPICIOUS_PAYLOAD' },
      });
      return;
    }

    const codeParam = typeof rawParams.code === 'string' ? rawParams.code : Array.isArray(rawParams.code) ? rawParams.code[0] ?? '' : '';
    const cleanCode = normalizeRoomCode(codeParam);

    router.replace({
      pathname: '/room/join',
      params: cleanCode ? { code: cleanCode } : {},
    });
  }, [rawParams, router]);

  return (
    <View testID="join-index-redirect-loading" style={styles.container}>
      <ActivityIndicator size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
