import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { LoadingState } from '../../../shared/ui';
import { isSuspiciousSearchParams } from '../services/joinLinks';
import { normalizeRoomCode } from '../services/roomEntry';

/**
 * Invite links (`/join?code=…` and `/join/CODE`) land here, get validated, then hand off to `/room/join`.
 * Suspicious payloads are dropped and the join screen shows a manual-entry warning instead.
 */
export function JoinLinkRedirect({ testID }: { testID: string }) {
  const router = useRouter();
  const rawParams = useLocalSearchParams<Record<string, string | string[] | undefined>>();

  useEffect(() => {
    if (isSuspiciousSearchParams(rawParams as Record<string, unknown>)) {
      router.replace({ pathname: '/room/join', params: { error: 'SUSPICIOUS_PAYLOAD' } });
      return;
    }
    const codeParam = typeof rawParams.code === 'string' ? rawParams.code : Array.isArray(rawParams.code) ? rawParams.code[0] ?? '' : '';
    const cleanCode = normalizeRoomCode(codeParam);
    router.replace({ pathname: '/room/join', params: cleanCode ? { code: cleanCode } : {} });
  }, [rawParams, router]);

  return (
    <View testID={testID} style={styles.container}>
      <LoadingState label="Đang mở phòng" rows={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
});
