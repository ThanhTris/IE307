import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  PreviewFoodPoolResponse,
  RoomContext,
  ServiceMode,
} from '../../../data/api/contracts';
import { createAuthenticatedApiClient } from '../../../data/auth';
import { MockApiClient } from '../../../data/api/mock';
import { createDiscoveryApi } from '../../../data/discovery';
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
import { currentServerTime, localTime, nextMealTime, parseBudget, parseLocalTime } from '../services/roomSetup';
import { ContextDraftFields } from '../components/ContextDraftFields';

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

export interface ContextScreenProps {
  apiClient?: ApiClient;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: RoomContext) => void;
  onBack?: () => void;
}

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
  // Keep the shared form read-only until the first discovery response has
  // established the server clock and anchor selection.
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  // Real API endpoint & guest session state (for live verification without secrets)
  const [realApiUrl] = useState<string>(
    (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL)
      ? process.env.EXPO_PUBLIC_SUPABASE_URL
      : ''
  );
  const [realClientStatus, setRealClientStatus] = useState<string>('Sẵn sàng');
  const [loadGeneration, setLoadGeneration] = useState(0);
  const [privateDataEpoch, setPrivateDataEpoch] = useState(0);
  const requestGeneration = useRef(0);
  const previewGeneration = useRef(0);
  const locationGeneration = useRef(0);

  // Discovery data from server
  const [serverTime, setServerTime] = useState<string>('2026-10-15T11:30:00.000Z');
  const [serverLoadedAt, setServerLoadedAt] = useState<number>(() => Date.now());
  const [anchors, setAnchors] = useState<PublicAnchor[]>([]);
  const [preview, setPreview] = useState<PreviewFoodPoolResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [previewContextKey, setPreviewContextKey] = useState<string | null>(null);

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
  const clearLivePrivateData = useCallback(async () => {
    setPrivateDataEpoch(value => value + 1);
    setAnchors([]);
    setPreview(null);
    setPreviewLoading(false);
    setPreviewError(null);
    setPreviewContextKey(null);
    setConfirmed(false);
    setLocationState({
      mode: 'manual',
      permission: 'undetermined',
      coords: null,
      selectedAnchor: null,
      distanceM: null,
      isOutsideCoverage: false,
      sortedAnchors: [],
      errorMessage: null,
    });
  }, []);

  useEffect(() => {
    previewGeneration.current += 1;
    locationGeneration.current += 1;
  }, [privateDataEpoch]);

  useEffect(() => () => {
    requestGeneration.current += 1;
    previewGeneration.current += 1;
    locationGeneration.current += 1;
  }, []);

  const liveEndpointConfig = useMemo(() => {
    const publicKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
    if (!realApiUrl) return { error: 'CONFIG_MISSING_URL', publicKey };
    if (!publicKey) return { error: 'CONFIG_MISSING_PUBLISHABLE_KEY', publicKey };
    try {
      const url = new URL(realApiUrl);
      const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
      const allowedTransport = url.protocol === 'https:' || (url.protocol === 'http:' && loopback);
      const originOnly = !url.username && !url.password && !url.search && !url.hash && url.pathname === '/';
      if (!allowedTransport || !originOnly) return { error: 'CONFIG_ENDPOINT_UNSAFE', publicKey };
    } catch {
      return { error: 'CONFIG_ENDPOINT_INVALID', publicKey };
    }
    return { error: null, publicKey };
  }, [realApiUrl]);

  // Context selection states
  const [radiusM, setRadiusM] = useState<number>(1500);
  const [budget, setBudget] = useState<string>('');
  const [avoidRecent, setAvoidRecent] = useState(false);
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
  const initialDate = localTime(timeState.desiredAt).slice(0, 10);
  const initialTime = localTime(timeState.desiredAt).slice(11);
  const [dateText, setDateText] = useState(initialDate);
  const [timeText, setTimeText] = useState(initialTime);

  // Real client instance (points to real Supabase endpoint)
  const liveAuth = useMemo(() => {
    if (liveEndpointConfig.error) return null;
    try {
      return createAuthenticatedApiClient({
        baseUrl: realApiUrl,
        publicKey: liveEndpointConfig.publicKey,
        clearPrivateData: clearLivePrivateData,
        timeoutMs: 15000,
      });
    } catch {
      return null;
    }
  }, [clearLivePrivateData, liveEndpointConfig, realApiUrl]);
  const realClient = liveAuth?.client;

  // Active client: real or mock depending on envMode or explicit injection
  const client = useMemo(() => {
    if (apiClient) return apiClient;
    if (envMode === 'real_api') return realClient;
    return new MockApiClient();
  }, [apiClient, envMode, realClient]);
  const discoveryClient = useMemo(() => {
    if (!client) return null;
    return envMode === 'real_api' ? createDiscoveryApi(client) : client;
  }, [client, envMode]);

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
    const generation = ++requestGeneration.current;
    locationGeneration.current += 1;
    const run = async () => {
      setLoading(true);
      setServerError(null);
      setAnchors([]);
      previewGeneration.current += 1;
      setPreview(null);
      setPreviewLoading(false);
      setPreviewError(null);
      setPreviewContextKey(null);
      setConfirmed(false);
      setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
      try {
        if (scenario === 'server_offline') {
          throw new Error('NETWORK_TIMEOUT');
        }

        // When using real API mode without an active auth token, obtain a guest session first (GM-16)
        if (envMode === 'real_api' && !apiClient && liveEndpointConfig.error) {
          setRealClientStatus(`Lỗi cấu hình: ${liveEndpointConfig.error}`);
          setServerError(liveEndpointConfig.error);
          return;
        }
        if (envMode === 'real_api' && !apiClient && liveAuth) {
          const restored = await liveAuth.session.restoreSession();
          if (!active || generation !== requestGeneration.current) return;
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
        if (!active || generation !== requestGeneration.current) return;

        if (!response.ok) {
          setServerError(response.error.messageKey);
          setAnchors([]);
          setPreview(null);
          setPreviewError(response.error.messageKey);
          setConfirmed(false);
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
        setServerLoadedAt(Date.now());

        if (envMode === 'real_api') {
          const latency = Date.now() - startTime;
          setRealClientStatus(`200 OK (${latency}ms) · Server: ${loadedTime}`);
        }

        const loadedAnchors =
          scenario === 'server_empty' ? [] : response.data.anchors ?? [];
        setAnchors(loadedAnchors);

        // Preserve scheduled mode if already selected; only reset to Eat Now if in now mode
        setTimeState((prev) => {
          let next: TimeResolution;
          if (prev.mode === 'scheduled') {
            next = service.resolveScheduledTime(prev.desiredAt, loadedTime, prev.confirmedPast);
          } else {
            next = service.resolveEatNow(loadedTime, 15);
          }
          setDateText(localTime(next.desiredAt).slice(0, 10));
          setTimeText(localTime(next.desiredAt).slice(11));
          return next;
        });

        if (scenario === 'manual_only' || loadedAnchors.length === 0) {
          const manual = service.resolveManual(
            loadedAnchors[0]?.id ?? '',
            loadedAnchors
          );
          setLocationState(manual);
        } else if (scenario !== 'live_native') {
          const res = await service.resolveWithGps(loadedAnchors);
          if (active && generation === requestGeneration.current) setLocationState(res);
        }
      } catch (err: unknown) {
        if (!active || generation !== requestGeneration.current) return;
        const msg = (err as { message?: string })?.message ?? 'Lỗi kết nối máy chủ';
        setServerError(msg);
        setAnchors([]);
        setPreview(null);
        setPreviewError(msg);
        setConfirmed(false);
        setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
        if (envMode === 'real_api') {
          setRealClientStatus(`Lỗi mạng: ${msg}`);
        }
      } finally {
        if (active && generation === requestGeneration.current) setLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, [apiClient, client, envMode, scenario, service, liveAuth, liveEndpointConfig.error, loadGeneration]);

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
    const generation = ++requestGeneration.current;
    previewGeneration.current += 1;
    locationGeneration.current += 1;
    setLoading(true);
    setServerError(null);
    setPreviewLoading(false);
    setPreview(null);
    setPreviewContextKey(null);
    setPreviewError(null);
    setConfirmed(false);
    void clearLivePrivateData();
    try {
      const response = await client.getDiscoveryContext();
      if (generation !== requestGeneration.current) return;
      if (!response.ok) {
        setServerError(response.error.messageKey);
        setAnchors([]);
        setPreview(null);
        setPreviewError(response.error.messageKey);
        setConfirmed(false);
        setLocationState({ mode: 'manual', permission: 'undetermined', coords: null, selectedAnchor: null, distanceM: null, isOutsideCoverage: false, sortedAnchors: [], errorMessage: null });
        return;
      }
      setServerError(null);
      const loadedTime = response.data.serverTime || new Date().toISOString();
      setServerTime(loadedTime);
      setServerLoadedAt(Date.now());
      const loadedAnchors = response.data.anchors ?? [];
      setAnchors(loadedAnchors);

      // Preserve scheduled mode if already active
      setTimeState((prev) => {
        const next = service.resolveScheduledTime(prev.desiredAt, loadedTime, prev.confirmedPast);
        setDateText(localTime(next.desiredAt).slice(0, 10));
        setTimeText(localTime(next.desiredAt).slice(11));
        return { ...next, mode: prev.mode };
      });

      if (scenario !== 'live_native') {
        const locationRequest = ++locationGeneration.current;
        const res = await service.resolveWithGps(loadedAnchors);
        if (generation === requestGeneration.current && locationRequest === locationGeneration.current) setLocationState(res);
      }
    } catch (err: unknown) {
      if (generation !== requestGeneration.current) return;
      const msg = (err as { message?: string })?.message ?? 'Lỗi kết nối máy chủ';
      setServerError(msg);
    } finally {
      if (generation === requestGeneration.current) setLoading(false);
    }
  };

  // A draft edit cancels every in-flight preview and invalidates its result.
  const invalidateDraft = () => {
    previewGeneration.current += 1;
    setPreviewLoading(false);
    setPreview(null);
    setPreviewError(null);
    setPreviewContextKey(null);
    setConfirmed(false);
  };

  // Handlers
  const handleSelectAnchor = (anchorId: string) => {
    if (loading || serverError || !anchors.some(anchor => anchor.id === anchorId)) return;
    locationGeneration.current += 1;
    const res = service.resolveManual(anchorId, anchors, locationState.coords);
    setLocationState(res);
    invalidateDraft();
  };

  const handleRefreshGps = async () => {
    if (!anchors.length) return;
    const generation = ++locationGeneration.current;
    setLoading(true);
    try {
      const res = await service.resolveWithGps(anchors);
      if (generation === locationGeneration.current) {
        setLocationState(res);
        invalidateDraft();
      }
    } finally {
      if (generation === locationGeneration.current) setLoading(false);
    }
  };

  const handleToggleTimeMode = (mode: 'now' | 'scheduled') => {
    setTimeMode(mode);
    if (mode === 'now') {
      const nowRes = service.resolveEatNow(new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), 15);
      setTimeState(nowRes);
      setDateText(localTime(nowRes.desiredAt).slice(0, 10));
      setTimeText(localTime(nowRes.desiredAt).slice(11));
    } else {
      // Scheduled mode: use current desiredAt directly without extra buffer
      const schedRes = service.resolveScheduledTime(
        timeState.desiredAt,
        new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(),
        timeState.confirmedPast
      );
      setTimeState(schedRes);
      setDateText(localTime(schedRes.desiredAt).slice(0, 10));
      setTimeText(localTime(schedRes.desiredAt).slice(11));
    }
  };

  const handleSetScheduledOffsetHours = (hours: number) => {
    const serverTimestamp = currentServerTime(serverTime, serverLoadedAt);
    const target = new Date(serverTimestamp + hours * 60 * 60 * 1000).toISOString();
    const schedRes = service.resolveScheduledTime(target, new Date(serverTimestamp).toISOString(), false);
    setTimeState(schedRes);
    setDateText(localTime(target).slice(0, 10));
    setTimeText(localTime(target).slice(11));
    invalidateDraft();
  };

  const handleConfirmPastTime = () => {
    const schedRes = service.resolveScheduledTime(
      timeState.desiredAt,
      new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(),
      true
    );
    setTimeState(schedRes);
    setDateText(localTime(schedRes.desiredAt).slice(0, 10));
    setTimeText(localTime(schedRes.desiredAt).slice(11));
    invalidateDraft();
  };

  const handleAdjustToValidNow = () => {
    const adjusted = service.adjustToValidServerTime(new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), 15);
    setTimeState(adjusted);
    setDateText(localTime(adjusted.desiredAt).slice(0, 10));
    setTimeText(localTime(adjusted.desiredAt).slice(11));
    invalidateDraft();
  };

  const parsedDesiredAt = parseLocalTime(`${dateText} ${timeText}`);
  const parsedBudget = parseBudget(budget);

  // Sanitized context payload for room / server
  const sanitizedContext: RoomContext | null = useMemo(() => {
    if (!locationState.selectedAnchor || !parsedDesiredAt || parsedBudget === undefined) return null;
    try {
      return sanitizeContextForServer({
        anchorId: locationState.selectedAnchor.id,
        anchorName: locationState.selectedAnchor.name,
        radiusM,
        desiredAt: parsedDesiredAt,
        serviceMode,
        mealSlot,
        budget: parsedBudget,
        avoidRecent,
      });
    } catch {
      return null;
    }
  }, [locationState.selectedAnchor, radiusM, parsedDesiredAt, serviceMode, mealSlot, parsedBudget, avoidRecent]);

  const desiredAtMs = Date.parse(parsedDesiredAt ?? '');
  const liveDesiredAtPast = !Number.isFinite(desiredAtMs) || desiredAtMs <= currentServerTime(serverTime, serverLoadedAt);
  const draftInputError = !parsedDesiredAt
    ? 'Ngày ăn và giờ ăn phải đúng định dạng YYYY-MM-DD và HH:mm (UTC+7).'
    : parsedBudget === undefined
      ? 'Ngân sách là số nguyên VNĐ/người từ 0 hoặc để trống.'
      : null;

  // Guard for saving context: strictly disallow past time, pending confirmation, or out-of-bounds horizon
  const canSaveContext = Boolean(
    !loading &&
    !serverError &&
    locationState.selectedAnchor &&
    anchors.some(anchor => anchor.id === locationState.selectedAnchor?.id) &&
    sanitizedContext &&
    !timeState.requiresConfirmation &&
    !timeState.isPast &&
    !liveDesiredAtPast &&
    !timeState.isTooFarFuture &&
    Date.parse(parsedDesiredAt ?? '') > currentServerTime(serverTime, serverLoadedAt) &&
    !draftInputError
  );

  const handleSaveContext = () => {
    const liveServerTime = new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString();
    const freshTime = service.resolveScheduledTime(parsedDesiredAt ?? timeState.desiredAt, liveServerTime, timeState.confirmedPast);
    if (freshTime.isPast || freshTime.isTooFarFuture) {
      setTimeMode('scheduled');
      setTimeState(freshTime);
      setPreview(null);
      setPreviewError('DESIRED_TIME_PASSED');
      setConfirmed(false);
      return;
    }
    const currentKey = sanitizedContext ? JSON.stringify(sanitizedContext) : null;
    if (!canSaveContext || !sanitizedContext || !confirmed || !preview?.pool.length || previewContextKey !== currentKey) return;
    onSaveContext?.(sanitizedContext);
  };

  const handlePreview = async () => {
    const generation = ++previewGeneration.current;
    const liveServerTime = new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString();
    const freshTime = service.resolveScheduledTime(parsedDesiredAt ?? timeState.desiredAt, liveServerTime, false);
    const contextKey = sanitizedContext ? JSON.stringify(sanitizedContext) : null;
    if (!sanitizedContext || !contextKey || !discoveryClient || freshTime.isPast || freshTime.isTooFarFuture || serverError || draftInputError) {
      setTimeState(freshTime);
      setTimeMode('scheduled');
      setPreview(null);
      setPreviewContextKey(null);
      setConfirmed(false);
      return;
    }
    setPreviewLoading(true);
    setPreview(null);
    setPreviewContextKey(null);
    setPreviewError(null);
    setConfirmed(false);
    try {
      const response = await discoveryClient.previewFoodPool({
        anchorId: sanitizedContext.anchorId,
        radiusM: sanitizedContext.radiusM,
        desiredAt: sanitizedContext.desiredAt,
        serviceMode: sanitizedContext.serviceMode,
        mealSlot: sanitizedContext.mealSlot,
        budget: sanitizedContext.budget,
        timeHint: sanitizedContext.timeHint,
      });
      if (generation !== previewGeneration.current) return;
      const responseServerTime = new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString();
      const responseTime = service.resolveScheduledTime(sanitizedContext.desiredAt, responseServerTime, false);
      if (responseTime.isPast || responseTime.isTooFarFuture) {
        setTimeState(responseTime);
        setTimeMode('scheduled');
        setPreview(null);
        setPreviewContextKey(null);
        setPreviewError('DESIRED_TIME_PASSED');
        setConfirmed(false);
        return;
      }
      if (!response.ok) {
        setPreview(null);
        setPreviewContextKey(null);
        setPreviewError(response.error.messageKey);
        return;
      }
      setPreview(response.data);
      setPreviewContextKey(contextKey);
    } catch {
      if (generation !== previewGeneration.current) return;
      setPreview(null);
      setPreviewContextKey(null);
      setPreviewError('NETWORK_ERROR');
    } finally {
      if (generation === previewGeneration.current) setPreviewLoading(false);
    }
  };

  const handleConfirmDraft = () => {
    const liveServerTime = new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString();
    const freshTime = service.resolveScheduledTime(parsedDesiredAt ?? timeState.desiredAt, liveServerTime, false);
    const currentKey = sanitizedContext ? JSON.stringify(sanitizedContext) : null;
    if (!preview?.pool.length || previewContextKey !== currentKey) {
      setConfirmed(false);
      return;
    }
    if (freshTime.isPast || freshTime.isTooFarFuture) {
      setTimeMode('scheduled');
      setTimeState(freshTime);
      setPreview(null);
      setPreviewContextKey(null);
      setPreviewError('DESIRED_TIME_PASSED');
      setConfirmed(false);
      return;
    }
    setConfirmed(value => !value);
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
                (Chỉ dùng HTTPS; development qua USB dùng adb reverse và URL loopback 127.0.0.1. Expo tunnel chỉ là Metro, không mở backend.)
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
                disabled={loading}
                onPress={() => handleSelectAnchor(anchor.id)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        <ContextDraftFields
          draft={{ radiusM, mealSlot, serviceMode, budget: parseBudget(budget) ?? null, avoidRecent }}
          budgetText={budget}
          date={dateText}
          time={timeText}
          timeState={timeState}
          disabled={loading}
          timeMode={timeMode}
          serverNow={() => currentServerTime(serverTime, serverLoadedAt)}
          eatNowLabel="⚡ Ăn ngay (Buffer 15p)"
          onRadiusChange={value => { setRadiusM(value); invalidateDraft(); }}
          onDateChange={value => {
            setDateText(value);
            setTimeMode('scheduled');
            const next = parseLocalTime(`${value} ${timeText}`);
            if (next) setTimeState(service.resolveScheduledTime(next, new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), false));
            invalidateDraft();
          }}
          onTimeChange={value => {
            setTimeText(value);
            setTimeMode('scheduled');
            const next = parseLocalTime(`${dateText} ${value}`);
            if (next) setTimeState(service.resolveScheduledTime(next, new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), false));
            invalidateDraft();
          }}
          onEatNow={() => { handleToggleTimeMode('now'); invalidateDraft(); }}
          onTimeModeChange={mode => { handleToggleTimeMode(mode); invalidateDraft(); }}
          onMealSlotChange={value => { setMealSlot(value); const next = nextMealTime(value, currentServerTime(serverTime, serverLoadedAt)); if (next) { setTimeState(service.resolveScheduledTime(next, new Date(currentServerTime(serverTime, serverLoadedAt)).toISOString(), false)); setDateText(localTime(next).slice(0, 10)); setTimeText(localTime(next).slice(11)); } invalidateDraft(); }}
          onServiceModeChange={value => { setServiceMode(value); invalidateDraft(); }}
          onBudgetChange={value => { setBudget(value); invalidateDraft(); }}
          onAvoidRecentChange={value => { setAvoidRecent(value); invalidateDraft(); }}
          onScheduledOffset={handleSetScheduledOffsetHours}
          onAdjustToValid={handleAdjustToValidNow}
          onConfirmPast={handleConfirmPastTime}
        />

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

        {locationState.selectedAnchor && (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityLabel="Tôi xác nhận điểm công cộng, buổi và giờ ăn"
              accessibilityState={{ checked: confirmed, disabled: loading || !!serverError || !preview?.pool.length }}
              disabled={loading || !!serverError || !preview?.pool.length}
              onPress={handleConfirmDraft}
              style={[styles.confirmation, { backgroundColor: confirmed ? colors?.surface : colors?.soft, borderColor: confirmed ? colors?.green : colors?.primary }]}
            >
              <Text style={{ color: colors?.text }}>{confirmed ? '✓ ' : ''}Tôi xác nhận điểm công cộng, buổi và giờ ăn</Text>
            </Pressable>
            <AppButton label="Xem món mẫu theo bối cảnh" loading={previewLoading} disabled={loading || !!serverError || !canSaveContext} onPress={() => { void handlePreview(); }} colors={colors} />
            {draftInputError ? <StatusNotice title="Cần sửa bối cảnh" message={draftInputError} tone="error" colors={colors} /> : null}
            {previewError ? <StatusNotice title="Chưa thể xem bản nháp" message={previewError} tone="error" colors={colors} /> : null}
            {preview ? <View style={[styles.card, { backgroundColor: colors?.surface, borderColor: colors?.line }]}>
              <Text style={[styles.sectionTitle, { color: colors?.text }]}>Bản nháp món theo bối cảnh</Text>
              {preview.pool.length ? preview.pool.slice(0, 8).map(dish => <Text key={dish.roundDishId} style={[styles.bodySmall, { color: colors?.text }]}>{dish.name}</Text>) : <Text style={[styles.caption, { color: colors?.muted }]}>Chưa có món phù hợp cho bối cảnh này.</Text>}
              {confirmed ? <StatusNotice title="Bản nháp đã xác nhận" message="Bản nháp đã xác nhận, chưa lưu vào phòng." colors={colors} /> : null}
            </View> : null}
          </View>
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
                : timeState.isPast || liveDesiredAtPast
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
  confirmation: { padding: 14, borderRadius: 12, borderWidth: 1.5 },
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
