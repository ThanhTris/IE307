import { useMemo, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MockApiClient, type MockMode } from '../../../data/api';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import { AppHeader, AppButton, StatusNotice } from '../../../shared/ui';

export type DemoDestination = 'lobby' | 'room-status' | 'friends' | 'inbox' | 'history';

const destinations: { id: DemoDestination; label: string }[] = [
  { id: 'lobby', label: 'Phòng chờ' },
  { id: 'room-status', label: 'Trạng thái phòng' },
  { id: 'friends', label: 'Bạn bè' },
  { id: 'inbox', label: 'Hộp thư' },
  { id: 'history', label: 'Lịch sử' },
];

const modes: { id: MockMode; label: string }[] = [
  { id: 'default', label: 'Thành công' },
  { id: 'loading', label: 'Đang tải' },
  { id: 'empty', label: 'Trống' },
  { id: 'error', label: 'Lỗi mạng' },
  { id: 'stale', label: 'Dữ liệu cũ' },
  { id: 'expired', label: 'Hết hạn' },
];

export function useMockDemoApi(injectedClient?: MockApiClient) {
  const [mode, setMode] = useState<MockMode>('default');
  const [revision, setRevision] = useState(0);
  const api = useMemo(() => injectedClient ?? new MockApiClient({ mode: 'default', delayMs: 0 }), [injectedClient]);
  const changeMode = (nextMode: MockMode) => {
    api.setMode(nextMode);
    setMode(nextMode);
  };
  return { api, mode, setMode: changeMode, revision, reload: () => setRevision(value => value + 1) };
}

export function DemoModePicker({ mode, onChange, disabled = false }: { mode: MockMode; onChange: (mode: MockMode) => void; disabled?: boolean }) {
  const { colors } = useShellTheme();
  return (
    <View style={styles.modeBlock}>
      <Text style={[styles.modeLabel, { color: colors.muted }]}>TRẠNG THÁI MOCK</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modeRow}>
        {modes.map(option => (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityLabel={`Trạng thái ${option.label}`}
            accessibilityState={{ selected: mode === option.id }}
            onPress={() => onChange(option.id)}
            disabled={disabled}
            style={[styles.modeChip, { backgroundColor: mode === option.id ? colors.warm : colors.surface, borderColor: mode === option.id ? colors.primary : colors.line }]}
          >
            <Text style={[styles.modeText, { color: mode === option.id ? colors.primary : colors.text }]}>{option.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export function DemoFrame({
  title,
  subtitle,
  active,
  onNavigate,
  onHome,
  mode,
  onModeChange,
  controlsDisabled = false,
  children,
}: {
  title: string;
  subtitle: string;
  active: DemoDestination;
  onNavigate: (destination: DemoDestination) => void;
  onHome: () => void;
  mode: MockMode;
  onModeChange: (mode: MockMode) => void;
  controlsDisabled?: boolean;
  children: ReactNode;
}) {
  const { colors } = useShellTheme();
  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]}>
      <AppHeader title="Bản xem mock" onPressBrand={controlsDisabled ? undefined : onHome} colors={colors} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleGroup}>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        <StatusNotice
          title="MOCK · dữ liệu tổng hợp"
          message="Các thao tác ở đây chỉ dùng API mock; không gửi lời mời, phiếu, push hoặc dữ liệu cá nhân lên server."
          tone="info"
          colors={colors}
        />
        <DemoModePicker mode={mode} onChange={onModeChange} disabled={controlsDisabled} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.navRow}>
          {destinations.map(destination => (
            <Pressable
              key={destination.id}
              accessibilityRole="button"
              accessibilityLabel={`Mở ${destination.label}`}
              accessibilityState={{ selected: active === destination.id }}
              onPress={() => onNavigate(destination.id)}
              disabled={controlsDisabled}
              style={[styles.navItem, { backgroundColor: active === destination.id ? colors.primary : colors.surface, borderColor: colors.line }]}
            >
              <Text style={[styles.navText, { color: active === destination.id ? colors.onPrimary : colors.text }]}>{destination.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.screenContent}>{children}</View>
        <AppButton label="Về màn hình chính" variant="quiet" onPress={onHome} disabled={controlsDisabled} colors={colors} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function useDemoColors() {
  return useShellTheme().colors;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  titleGroup: { gap: 4 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '800' },
  subtitle: { fontSize: 14, lineHeight: 20 },
  modeBlock: { gap: 8 },
  modeLabel: { fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.5 },
  modeRow: { gap: 8 },
  modeChip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 1, justifyContent: 'center' },
  modeText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  navRow: { gap: 8 },
  navItem: { minHeight: 48, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, justifyContent: 'center' },
  navText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  screenContent: { gap: 14 },
});
