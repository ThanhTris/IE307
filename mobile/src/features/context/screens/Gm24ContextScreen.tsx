import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  ApiClient,
  MealSlot,
  PublicAnchor,
  RoomContext,
  ServiceMode,
} from '../../../data/api/contracts';
import { createAuthenticatedApiClient } from '../../../data/auth';
import { MockApiClient } from '../../../data/api/mock';
import { useShellTheme } from '../../../shared/lib/useShellTheme';
import {
  AppButton,
  Chip,
  ContextSummary,
  StatusNotice,
} from '../../../shared/ui/components';
import {
  MockLocationAdapter,
  createDefaultLocationAdapter,
  LocationService,
  sanitizeContextForServer,
  type LocationAdapter,
  type LocationResolution,
  type TimeResolution,
} from '../services/location';

export type ContextScenario =
  | 'gps_grant_rua'
  | 'gps_grant_dibo'
  | 'gps_deny'
  | 'gps_off'
  | 'gps_outside_hanoi'
  | 'manual_only'
  | 'server_offline'
  | 'server_empty'
  | 'live_native';

export type EnvironmentMode = 'mock' | 'real_api';

let livePrivateGeneration = 0;

export interface ContextScreenProps {
  apiClient?: ApiClient;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: RoomContext) => void;
  onBack?: () => void;
}

const RADIUS_OPTIONS = [500, 1000, 1500, 2000, 3000, 5000];
const MEAL_SLOTS: { label: string; value: MealSlot }[] = [
  { label: 'Bữa sáng', value: 'breakfast' },
  { label: 'Bữa trưa', value: 'lunch' },
  { label: 'Bữa tối', value: 'dinner' },
  { label: 'Ăn vặt', value: 'snack' },
];
const SERVICE_MODES: { label: string; value: ServiceMode }[] = [
  { label: 'Ăn tại quán', value: 'dine_in' },
  { label: 'Mang về', value: 'takeaway' },
  { label: 'Giao hàng', value: 'delivery' },
];

export function Gm24ContextScreen({
  apiClient,
  initialScenario = 'gps_grant_rua',
  initialEnvironmentMode = 'mock',
  onSaveContext,
  onBack,
}: ContextScreenProps) {
  const { colors } = useShellTheme();
  const [envMode, setEnvMode] = useState<EnvironmentMode>(initialEnvironmentMode);
  const [scenario, setScenario] = useState<ContextScenario>(initialScenario);
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Real API endpoint & guest session state (for live verification without secrets)
  const [realApiUrl] = useState<string>(
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL)
      ? process.env.EXPO_PUBLIC_SUPABASE_URL
      : 'http://10.0.2.2:54321'
  );
  const [realClientStatus, setRealClientStatus] = useState<string>('Sẵn sàng');
  const [loadGeneration, setLoadGeneration] = useState(0);

  // Discovery data from server
  const [serverTime, setServerTime] = useState<string>('2026-10-15T11:30:00.000Z');
  const [anchors, setAnchors] = useState<PublicAnchor[]>([]);

  // Location resolution
  const [locationState, setLocationState] = useState<LocationResolution>({
    mode: 'gps',
    permission: 'undetermined',
    coords: null,
    selectedAnchor: null,
    distanceM: null,
    isOutsideCoverage: false,
    sortedAnchors: [],
    errorMessage: null,
  });

  // Context selection states
  const [radiusM, setRadiusM] = useState<number>(1500);
  const [mealSlot, setMealSlot] = useState<MealSlot>('lunch');
  const [serviceMode, setServiceMode] = useState<ServiceMode>('dine_in');
  const [timeMode, setTimeMode] = useState<'now' | 'scheduled'>('now');
  const [timeState, setTimeState] = useState<TimeResolution>({
    mode: 'now',
    serverTime: '2026-10-15T11:30:00.000Z',
    bufferMinutes: 15,
    desiredAt: '2026-10-15T12:00:00.000Z',
    isPast: false,
    requiresConfirmation: false,
    confirmedPast: false,
    isTooFarFuture: false,
  });

  // Real client instance (points to real Supabase endpoint)
  const liveAuth = useMemo(() => {
    const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
    if (!publicKey) return null;
    try {
      return createAuthenticatedApiClient({
        baseUrl: realApiUrl,
        publicKey,
        clearPrivateData: async () => { livePrivateGeneration += 1; },
        timeoutMs: 15000,
      });
    } catch {
      return null;
    }
  }, [realApiUrl]);
  const realClient = liveAuth?.client;

  // Active client: real or mock depending on envMode or explicit injection
  const client = useMemo(() => {
    if (apiClient) return apiClient;
    if (envMode === 'real_api') return realClient;
    return new MockApiClient();
  }, [apiClient, envMode, realClient]);

  // Location service setup based on current scenario
  const service = useMemo(() => {
    let adapter: LocationAdapter;
    if (scenario === 'live_native') {
      adapter = createDefaultLocationAdapter();
    } else {
      const mock = new MockLocationAdapter();
      switch (scenario) {
        case 'gps_grant_rua':
          mock.setPermissionStatus('granted');
          mock.setCoordinates({ latitude: 10.7828, longitude: 106.6958 }); // Hồ Con Rùa
          break;
        case 'gps_grant_dibo':
          mock.setPermissionStatus('granted');
          mock.setCoordinates({ latitude: 10.7743, longitude: 106.7034 }); // Phố Đi Bộ
          break;
        case 'gps_deny':
          mock.setPermissionStatus('denied');
          break;
        case 'gps_off':
          mock.setPermissionStatus('granted');
          mock.setSimulateFailure(true);
          break;
        case 'gps_outside_hanoi':
          mock.setPermissionStatus('granted');
          mock.setCoordinates({ latitude: 21.0285, longitude: 105.8542 }); // Hà Nội (~1140km)
          break;
        case 'manual_only':
          mock.setPermissionStatus('undetermined');
          break;
        default:
          mock.setPermissionStatus('granted');
      }
      adapter = mock;
    }
    return new LocationService({ adapter });
  }, [scenario]);

  // Load discovery data on mount, scenario change, or environment switch
  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setServerError(null);
      setAnchors([]);
      setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
      try {
        if (scenario === 'server_offline') {
          throw new Error('NETWORK_TIMEOUT');
        }

        // When using real API mode without an active auth token, obtain a guest session first (GM-16)
        if (envMode === 'real_api' && !apiClient && !liveAuth) {
          setRealClientStatus('Thiếu URL hoặc publishable key GM-16');
          setServerError('AUTH_REQUIRED');
          return;
        }
        if (envMode === 'real_api' && !apiClient && liveAuth) {
          const restored = await liveAuth.session.restoreSession();
          if (!restored.ok) {
            setRealClientStatus('Chưa có phiên GM-16 · tạo phiên bằng nút bên dưới');
            setServerError('AUTH_REQUIRED');
            return;
          }
          setRealClientStatus(`Đã khôi phục phiên GM-16: ${restored.data.id.slice(0, 8)}`);
        }

        if (!client) { setServerError('AUTH_REQUIRED'); return; }

        const startTime = Date.now();
        const response = await client.getDiscoveryContext();
        if (!active) return;

        if (!response.ok) {
          setServerError(response.error.messageKey);
          setAnchors([]);
          setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
          if (envMode === 'real_api') {
            setRealClientStatus(`Lỗi RPC: ${response.error.messageKey}`);
          }
          return;
        }

        // Clear stale error banner upon successful data load
        setServerError(null);

        const loadedTime = response.data.serverTime || new Date().toISOString();
        setServerTime(loadedTime);

        if (envMode === 'real_api') {
          const latency = Date.now() - startTime;
          setRealClientStatus(`200 OK (${latency}ms) · Server: ${loadedTime}`);
        }

        const loadedAnchors =
          scenario === 'server_empty' ? [] : response.data.anchors ?? [];
        setAnchors(loadedAnchors);

        // Preserve scheduled mode if already selected; only reset to Eat Now if in now mode
        setTimeState((prev) => {
          if (prev.mode === 'scheduled') {
            return service.resolveScheduledTime(prev.desiredAt, loadedTime, prev.confirmedPast);
          }
          return service.resolveEatNow(loadedTime, 15);
        });

        if (scenario === 'manual_only' || loadedAnchors.length === 0) {
          const manual = service.resolveManual(
            loadedAnchors[0]?.id ?? '',
            loadedAnchors
          );
          setLocationState(manual);
        } else {
          const res = await service.resolveWithGps(loadedAnchors);
          if (active) setLocationState(res);
        }
      } catch (err: unknown) {
        if (!active) return;
        const msg = (err as { message?: string })?.message ?? 'Lỗi kết nối máy chủ';
        setServerError(msg);
        setAnchors([]);
        setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
        if (envMode === 'real_api') {
          setRealClientStatus(`Lỗi mạng: ${msg}`);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [client, envMode, scenario, service, liveAuth, loadGeneration]);

  const createLiveGuest = async () => {
    if (!liveAuth) return;
    setLoading(true);
    const result = await liveAuth.session.createGuestSession({ displayName: 'Khách GM-24', requestId: `gm24-${Date.now()}` });
    if (result.ok) {
      setRealClientStatus(`Đã tạo phiên GM-16: ${result.data.user.id.slice(0, 8)}`);
      setLoadGeneration(v => v + 1);
    } else {
      setServerError(result.error.messageKey);
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!client) { setServerError('AUTH_REQUIRED'); return; }
    setLoading(true);
    setServerError(null);
    try {
      const response = await client.getDiscoveryContext();
      if (!response.ok) {
        setServerError(response.error.messageKey);
        setAnchors([]);
        setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
        return;
      }
      setServerError(null);
      const loadedTime = response.data.serverTime || new Date().toISOString();
      setServerTime(loadedTime);
      const loadedAnchors = response.data.anchors ?? [];
      setAnchors(loadedAnchors);

      // Preserve scheduled mode if already active
      setTimeState((prev) => {
        if (prev.mode === 'scheduled') {
          return service.resolveScheduledTime(prev.desiredAt, loadedTime, prev.confirmedPast);
        }
        return service.resolveEatNow(loadedTime, 15);
      });

      const res = await service.resolveWithGps(loadedAnchors);
      setLocationState(res);
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Lỗi kết nối máy chủ';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Handlers
  const handleSelectAnchor = (anchorId: string) => {
    if (loading || serverError || !anchors.some(anchor => anchor.id === anchorId)) return;
    const res = service.resolveManual(anchorId, anchors, locationState.coords);
    setLocationState(res);
  };

  const handleRefreshGps = async () => {
    setLoading(true);
    try {
      const res = await service.resolveWithGps(anchors);
      setLocationState(res);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTimeMode = (mode: 'now' | 'scheduled') => {
    setTimeMode(mode);
    if (mode === 'now') {
      const nowRes = service.resolveEatNow(serverTime, 15);
      setTimeState(nowRes);
    } else {
      // Scheduled mode: use current desiredAt directly without extra buffer
      const schedRes = service.resolveScheduledTime(
        timeState.desiredAt,
        serverTime,
        timeState.confirmedPast
      );
      setTimeState(schedRes);
    }
  };

  const handleSetScheduledOffsetHours = (hours: number) => {
    const serverTimestamp = Date.parse(serverTime);
    const target = new Date(serverTimestamp + hours * 60 * 60 * 1000).toISOString();
    const schedRes = service.resolveScheduledTime(target, serverTime, false);
    setTimeState(schedRes);
  };

  const handleConfirmPastTime = () => {
    const schedRes = service.resolveScheduledTime(
      timeState.desiredAt,
      serverTime,
      true
    );
    setTimeState(schedRes);
  };

  const handleAdjustToValidNow = () => {
    const adjusted = service.adjustToValidServerTime(serverTime, 15);
    setTimeState(adjusted);
  };

  // Sanitized context payload for room / server
  const sanitizedContext: RoomContext | null = useMemo(() => {
    if (!locationState.selectedAnchor) return null;
    try {
      return sanitizeContextForServer({
        anchorId: locationState.selectedAnchor.id,
        anchorName: locationState.selectedAnchor.name,
        radiusM,
        desiredAt: timeState.desiredAt,
        serviceMode,
        mealSlot,
        avoidRecent: false,
      });
    } catch {
      return null;
    }
  }, [locationState.selectedAnchor, radiusM, timeState.desiredAt, serviceMode, mealSlot]);

  // Guard for saving context: strictly disallow past time, pending confirmation, or out-of-bounds horizon
  const canSaveContext = Boolean(
    !loading &&
    !serverError &&
    locationState.selectedAnchor &&
    anchors.some(anchor => anchor.id === locationState.selectedAnchor?.id) &&
    sanitizedContext &&
    !timeState.requiresConfirmation &&
    !timeState.isPast &&
    !timeState.isTooFarFuture
  );

  const handleSaveContext = () => {
    if (!canSaveContext || !sanitizedContext) return;
    onSaveContext?.(sanitizedContext);
  };

  return (
    <SafeAreaView
      style={[styles.root, { backgroundColor: colors?.background ?? '#F8F6F2' }]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: colors?.text ?? '#1A202C' }]}
          >
            Bối cảnh & Vị trí phòng
          </Text>
          {onBack && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Quay lại"
              onPress={onBack}
              style={styles.backBtn}
            >
              <Text style={{ color: colors?.primary ?? '#FF5A36', fontWeight: '700' }}>
                Quay lại
              </Text>
            </Pressable>
          )}
        </View>
        <Text style={[styles.caption, { color: colors?.muted ?? '#64748B' }]}>
          GM-24 · Foreground GPS gợi điểm công cộng · Không gửi GPS thô lên server
        </Text>

        {/* Environment Mode: Mock Scenarios vs Live Real API */}
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
                (Android Emulator: 10.0.2.2:54321 · Thiết bị thật qua WiFi: IP máy chủ LAN hoặc adb reverse tcp:54321 tcp:54321)
              </Text>
              {serverError === 'AUTH_REQUIRED' && liveAuth ? <AppButton label="Tạo phiên khách GM-16" onPress={() => { void createLiveGuest(); }} disabled={loading} colors={colors} /> : null}
            </View>
          )}
        </View>

        {/* Scenario Selector (for Testing & Verification on Android / Expo Go) */}
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

        {/* Server & Network Status Alert */}
        {serverError && (
          <StatusNotice
            title="Lỗi tải dữ liệu khu vực"
            message={`Không thể kết nối máy chủ: ${serverError}. Bạn có thể thử lại hoặc tiếp tục chọn thủ công.`}
            tone="error"
            actionLabel="Thử lại kết nối"
            onAction={handleRetry}
            colors={colors}
          />
        )}

        {/* Location & Permission Status Notice */}
        {locationState.errorMessage && (
          <StatusNotice
            title={
              locationState.permission === 'denied'
                ? 'Quyền vị trí bị từ chối'
                : locationState.isOutsideCoverage
                ? 'Vị trí ngoài vùng hỗ trợ'
                : 'Thông báo định vị'
            }
            message={locationState.errorMessage}
            tone={locationState.isOutsideCoverage ? 'warning' : 'info'}
            colors={colors}
          />
        )}

        {/* Section: Public Anchor Selection */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors?.surface ?? '#FFFFFF',
              borderColor: colors?.line ?? '#E2E8F0',
            },
          ]}
        >
          <View style={styles.cardHeader}>
            <Text
              accessibilityRole="header"
              style={[styles.sectionTitle, { color: colors?.text ?? '#1A202C' }]}
            >
              📍 Điểm hẹn công cộng
            </Text>
            <AppButton
              label={loading ? 'Đang định vị…' : 'Định vị lại'}
              variant="quiet"
              disabled={loading}
              onPress={handleRefreshGps}
              colors={colors}
            />
          </View>

          {locationState.selectedAnchor ? (
            <View
              style={[
                styles.anchorBanner,
                {
                  backgroundColor: colors?.warm ?? '#FFF5ED',
                  borderColor: colors?.primary ?? '#FF5A36',
                },
              ]}
            >
              <Text
                style={[styles.anchorName, { color: colors?.primary ?? '#FF5A36' }]}
              >
                {locationState.selectedAnchor.name}
              </Text>
              <Text style={[styles.anchorAddress, { color: colors?.muted ?? '#64748B' }]}>
                {locationState.selectedAnchor.address}
              </Text>
              <View style={styles.badgeRow}>
                <View
                  style={[
                    styles.tagBadge,
                    { backgroundColor: colors?.surface ?? '#FFFFFF' },
                  ]}
                >
                  <Text style={{ fontSize: 12, fontWeight: '700' }}>
                    {locationState.mode === 'gps' && locationState.distanceM !== null
                      ? `🎯 Cách bạn ~${locationState.distanceM} m`
                      : '✍️ Chọn thủ công'}
                  </Text>
                </View>
                {locationState.isOutsideCoverage && (
                  <View
                    style={[
                      styles.tagBadge,
                      { backgroundColor: colors?.danger ?? '#EF4444' },
                    ]}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#FFFFFF' }}>
                      Ngoài vùng phủ sóng
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <Text style={{ color: colors?.muted ?? '#64748B' }}>
              Chưa có điểm hẹn công cộng nào được chọn.
            </Text>
          )}

          {/* List of available public anchors for manual override */}
          <Text
            style={[
              styles.fieldLabel,
              { color: colors?.muted ?? '#64748B', marginTop: 12 },
            ]}
          >
            Danh sách điểm hẹn sẵn có ({anchors.length}):
          </Text>
          <View style={styles.chipGrid}>
            {anchors.map((anchor) => (
              <Chip
                key={anchor.id}
                label={anchor.name}
                selected={locationState.selectedAnchor?.id === anchor.id}
                onPress={() => handleSelectAnchor(anchor.id)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Section: Radius Selection */}
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
            📏 Bán kính tìm quán
          </Text>
          <View style={styles.chipGrid}>
            {RADIUS_OPTIONS.map((val) => (
              <Chip
                key={val}
                label={val < 1000 ? `${val} m` : `${val / 1000} km`}
                selected={radiusM === val}
                onPress={() => setRadiusM(val)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Section: Time & Server Buffer Resolution */}
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
            ⏰ Thời gian ăn
          </Text>

          <View style={styles.tabRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn Ăn ngay"
              onPress={() => handleToggleTimeMode('now')}
              style={[
                styles.tabButton,
                timeMode === 'now' && {
                  backgroundColor: colors?.primary ?? '#FF5A36',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: timeMode === 'now' ? '#FFFFFF' : colors?.text ?? '#1A202C' },
                ]}
              >
                ⚡ Ăn ngay (Buffer 15p)
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Chọn Đặt giờ"
              onPress={() => handleToggleTimeMode('scheduled')}
              style={[
                styles.tabButton,
                timeMode === 'scheduled' && {
                  backgroundColor: colors?.primary ?? '#FF5A36',
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color:
                      timeMode === 'scheduled'
                        ? '#FFFFFF'
                        : colors?.text ?? '#1A202C',
                  },
                ]}
              >
                🕒 Đặt giờ trước
              </Text>
            </Pressable>
          </View>

          <View style={styles.timeInfoBox}>
            <Text style={[styles.bodySmall, { color: colors?.muted ?? '#64748B' }]}>
              Giờ máy chủ: {new Date(serverTime).toLocaleTimeString('vi-VN')}
            </Text>
            <Text
              style={[
                styles.timeHighlight,
                { color: colors?.primary ?? '#FF5A36' },
              ]}
            >
              Mục tiêu ăn:{' '}
              {new Date(timeState.desiredAt).toLocaleTimeString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
              })}{' '}
              ({new Date(timeState.desiredAt).toLocaleDateString('vi-VN')})
            </Text>
            {timeMode === 'now' && (
              <Text style={[styles.caption, { color: colors?.green ?? '#10B981' }]}>
                      ✓ Đã cộng 15 phút chuẩn bị một lần duy nhất từ giờ máy chủ.
              </Text>
            )}
          </View>

          {/* Scheduled mode controls */}
          {timeMode === 'scheduled' && (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Text style={[styles.caption, { color: colors?.muted ?? '#64748B' }]}>
                Chọn mốc giờ tương đối:
              </Text>
              <View style={styles.chipGrid}>
                <Chip
                  label="+1 giờ"
                  onPress={() => handleSetScheduledOffsetHours(1)}
                  colors={colors}
                />
                <Chip
                  label="+3 giờ"
                  onPress={() => handleSetScheduledOffsetHours(3)}
                  colors={colors}
                />
                <Chip
                  label="+6 giờ"
                  onPress={() => handleSetScheduledOffsetHours(6)}
                  colors={colors}
                />
                <Chip
                  label="Quá khứ (-1 giờ)"
                  onPress={() => handleSetScheduledOffsetHours(-1)}
                  colors={colors}
                />
              </View>

              {timeState.isPast && (
                <View
                  style={[
                    styles.warningBox,
                    { backgroundColor: colors?.soft ?? '#F1EFE9' },
                  ]}
                >
                  <Text style={{ color: colors?.danger ?? '#EF4444', fontWeight: '700' }}>
                    ⚠️ Giờ đã chọn nằm trong quá khứ so với giờ máy chủ!
                  </Text>
                  <Text style={[styles.caption, { color: colors?.muted ?? '#64748B' }]}>
                    Máy chủ từ chối tạo phòng nếu giờ ăn đã qua (DESIRED_TIME_PASSED). Vui lòng điều chỉnh về giờ hợp lệ.
                  </Text>
                  <View style={{ gap: 8, marginTop: 4 }}>
                    <AppButton
                      label="Điều chỉnh thành giờ hợp lệ (+15 phút từ giờ máy chủ)"
                      variant="primary"
                      onPress={handleAdjustToValidNow}
                      colors={colors}
                    />
                    {timeState.requiresConfirmation && (
                      <AppButton
                        label="Xác nhận giờ này"
                        variant="danger"
                        onPress={handleConfirmPastTime}
                        colors={colors}
                      />
                    )}
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Section: Meal Slot & Service Mode */}
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
            🍽️ Buổi ăn & Hình thức
          </Text>
          <Text style={[styles.fieldLabel, { color: colors?.muted ?? '#64748B' }]}>
            Buổi ăn:
          </Text>
          <View style={styles.chipGrid}>
            {MEAL_SLOTS.map((slot) => (
              <Chip
                key={slot.value}
                label={slot.label}
                selected={mealSlot === slot.value}
                onPress={() => setMealSlot(slot.value)}
                colors={colors}
              />
            ))}
          </View>

          <Text
            style={[
              styles.fieldLabel,
              { color: colors?.muted ?? '#64748B', marginTop: 12 },
            ]}
          >
            Hình thức:
          </Text>
          <View style={styles.chipGrid}>
            {SERVICE_MODES.map((mode) => (
              <Chip
                key={mode.value}
                label={mode.label}
                selected={serviceMode === mode.value}
                onPress={() => setServiceMode(mode.value)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {/* Summary Card */}
        {sanitizedContext && (
          <ContextSummary
            anchorName={sanitizedContext.anchorName ?? 'Điểm công cộng'}
            mealLabel={
              MEAL_SLOTS.find((m) => m.value === sanitizedContext.mealSlot)?.label ??
              sanitizedContext.mealSlot
            }
            desiredAtLabel={new Date(sanitizedContext.desiredAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
            radiusLabel={`${sanitizedContext.radiusM / 1000} km`}
            serviceModeLabel={
              SERVICE_MODES.find((s) => s.value === sanitizedContext.serviceMode)?.label
            }
            colors={colors}
          />
        )}

        {/* Privacy Audit Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors?.surface ?? '#FFFFFF',
              borderColor: colors?.green ?? '#10B981',
              borderWidth: 1.5,
            },
          ]}
        >
          <Text
            accessibilityRole="header"
            style={[styles.sectionTitle, { color: colors?.green ?? '#10B981' }]}
          >
            🛡️ BẢO MẬT & QUYỀN RIÊNG TƯ (AUDIT)
          </Text>
          <Text style={[styles.bodySmall, { color: colors?.text ?? '#1A202C' }]}>
            • Vị trí GPS thiết bị:{' '}
            <Text style={{ fontWeight: '700' }}>
              {locationState.coords
                ? `Được giữ cục bộ (${locationState.coords.latitude.toFixed(4)}, ${locationState.coords.longitude.toFixed(4)})`
                : 'Không lưu'}
            </Text>
          </Text>
          <Text style={[styles.bodySmall, { color: colors?.text ?? '#1A202C' }]}>
            • Payload gửi server:{' '}
            <Text style={{ fontWeight: '700', color: colors?.primary ?? '#FF5A36' }}>
              {sanitizedContext
                ? JSON.stringify({
                    anchorId: sanitizedContext.anchorId,
                    radiusM: sanitizedContext.radiusM,
                    desiredAt: sanitizedContext.desiredAt,
                    mealSlot: sanitizedContext.mealSlot,
                    serviceMode: sanitizedContext.serviceMode,
                  })
                : 'N/A'}
            </Text>
          </Text>
          <Text style={[styles.caption, { color: colors?.green ?? '#10B981', marginTop: 4 }]}>
            ✓ Bảo đảm quyền riêng tư: Payload gửi máy chủ chỉ chứa anchorId, không chứa tọa độ GPS thô (0 tọa độ GPS thô trong request payload và client log).
          </Text>
        </View>

        {/* Save / Apply Context Button */}
        {onSaveContext && sanitizedContext && (
          <View style={{ gap: 6, marginTop: 4 }}>
            <AppButton
              label="Xác nhận bối cảnh phòng"
              variant="primary"
              disabled={!canSaveContext}
              onPress={handleSaveContext}
              colors={colors}
            />
            {!canSaveContext && (
              <Text style={[styles.caption, { color: colors?.danger ?? '#EF4444', textAlign: 'center' }]}>
                {!locationState.selectedAnchor
                  ? 'Vui lòng chọn một điểm hẹn công cộng.'
                  : timeState.isPast
                  ? 'Không thể lưu: thời gian ăn đang ở quá khứ (DESIRED_TIME_PASSED).'
                  : timeState.isTooFarFuture
                  ? 'Không thể lưu: thời gian ăn vượt quá 7 ngày.'
                  : timeState.requiresConfirmation
                  ? 'Vui lòng xác nhận hoặc điều chỉnh thời gian ăn.'
                  : 'Vui lòng hoàn tất cấu hình bối cảnh hợp lệ.'}
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: {
    padding: 20,
    gap: 16,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 24, fontWeight: '800', lineHeight: 30 },
  backBtn: { padding: 8 },
  caption: { fontSize: 13, lineHeight: 18 },
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 16, fontWeight: '700' },
  fieldLabel: { fontSize: 13, fontWeight: '600' },
  scenarioList: { gap: 8, paddingVertical: 4 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  anchorBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  anchorName: { fontSize: 17, fontWeight: '700' },
  anchorAddress: { fontSize: 13 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabRow: {
    flexDirection: 'row',
    borderRadius: 10,
    backgroundColor: '#F1EFE9',
    padding: 4,
    gap: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: { fontSize: 13, fontWeight: '700' },
  timeInfoBox: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F8F6F2',
    gap: 4,
  },
  bodySmall: { fontSize: 13, lineHeight: 18 },
  timeHighlight: { fontSize: 16, fontWeight: '700' },
  warningBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#EF4444',
    gap: 8,
    marginTop: 8,
  },
});
