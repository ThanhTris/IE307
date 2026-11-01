import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppButton, Chip, type Palette } from '../../../shared/ui';
import type { ContextScenario, EnvironmentMode } from '../hooks/useDiscoveryContext';

export interface EnvironmentAndScenarioPanelProps {
  envMode: EnvironmentMode;
  setEnvMode: (mode: EnvironmentMode) => void;
  scenario: ContextScenario;
  setScenario: (scenario: ContextScenario) => void;
  realClientStatus: string;
  realApiUrl: string;
  serverError: string | null;
  hasLiveAuth: boolean;
  loading: boolean;
  onCreateLiveGuest: () => void;
  colors?: Palette;
}

export function EnvironmentAndScenarioPanel({
  envMode,
  setEnvMode,
  scenario,
  setScenario,
  realClientStatus,
  realApiUrl,
  serverError,
  hasLiveAuth,
  loading,
  onCreateLiveGuest,
  colors,
}: EnvironmentAndScenarioPanelProps) {
  return (
    <>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors?.surface ?? '#FFFFFF',
            borderColor: colors?.line ?? '#E2E8F0',
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors?.text ?? '#1A202C' }]}
        >
          ⚙️ Môi trường dữ liệu & API
        </Text>
        <View style={styles.chipGrid}>
          <Chip
            label="🧪 Môi trường kịch bản (Mock)"
            selected={envMode === 'mock'}
            onPress={() => setEnvMode('mock')}
            colors={colors}
          />
          <Chip
            label="🌐 Máy chủ thật (Live Supabase API)"
            selected={envMode === 'real_api'}
            onPress={() => {
              setEnvMode('real_api');
              setScenario('live_native');
            }}
            colors={colors}
          />
        </View>
        {envMode === 'real_api' && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={[styles.caption, { color: colors?.text ?? '#1A202C' }]}>
              • Trạng thái kết nối: <Text style={{ fontWeight: '700' }}>{realClientStatus}</Text>
            </Text>
            <Text style={[styles.caption, { color: colors?.muted ?? '#64748B' }]}>
              • Endpoint: {realApiUrl}
            </Text>
            <Text style={[styles.caption, { color: colors?.muted ?? '#64748B' }]}>
              (Chỉ dùng HTTPS; development qua USB dùng adb reverse và URL loopback 127.0.0.1. Expo tunnel chỉ là Metro, không mở backend.)
            </Text>
            {serverError === 'AUTH_REQUIRED' && hasLiveAuth ? (
              <AppButton label="Tạo phiên khách GM-16" onPress={onCreateLiveGuest} disabled={loading} colors={colors} />
            ) : null}
          </View>
        )}
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors?.surface ?? '#FFFFFF',
            borderColor: colors?.line ?? '#E2E8F0',
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.sectionTitle, { color: colors?.text ?? '#1A202C' }]}
        >
          🧪 Kịch bản thử nghiệm
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scenarioList}
        >
          <Chip
            label="Hồ Con Rùa"
            selected={scenario === 'gps_grant_rua'}
            onPress={() => setScenario('gps_grant_rua')}
            colors={colors}
          />
          <Chip
            label="Phố Đi Bộ"
            selected={scenario === 'gps_grant_dibo'}
            onPress={() => setScenario('gps_grant_dibo')}
            colors={colors}
          />
          <Chip
            label="Từ chối GPS"
            selected={scenario === 'gps_deny'}
            onPress={() => setScenario('gps_deny')}
            colors={colors}
          />
          <Chip
            label="Tắt GPS"
            selected={scenario === 'gps_off'}
            onPress={() => setScenario('gps_off')}
            colors={colors}
          />
          <Chip
            label="Ngoài vùng (HN)"
            selected={scenario === 'gps_outside_hanoi'}
            onPress={() => setScenario('gps_outside_hanoi')}
            colors={colors}
          />
          <Chip
            label="Thủ công"
            selected={scenario === 'manual_only'}
            onPress={() => setScenario('manual_only')}
            colors={colors}
          />
          <Chip
            label="Server Offline"
            selected={scenario === 'server_offline'}
            onPress={() => setScenario('server_offline')}
            colors={colors}
          />
          <Chip
            label="Server Rỗng"
            selected={scenario === 'server_empty'}
            onPress={() => setScenario('server_empty')}
            colors={colors}
          />
          <Chip
            label="Thiết bị thực tế"
            selected={scenario === 'live_native'}
            onPress={() => setScenario('live_native')}
            colors={colors}
          />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  caption: { fontSize: 13, lineHeight: 18 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  scenarioList: { gap: 8, paddingVertical: 4 },
});
