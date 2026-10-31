import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

export interface UseDiscoveryContextParams {
  apiClient?: ApiClient;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: RoomContext) => void;
}

export function useDiscoveryContext({
  apiClient,
  initialScenario = 'gps_grant_rua',
  initialEnvironmentMode = 'mock',
  onSaveContext,
}: UseDiscoveryContextParams) {
  const [envMode, setEnvMode] = useState<EnvironmentMode>(initialEnvironmentMode);
  const [scenario, setScenario] = useState<ContextScenario>(initialScenario);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

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

  const [serverTime, setServerTime] = useState<string>('2026-10-15T11:30:00.000Z');
  const [serverLoadedAt, setServerLoadedAt] = useState<number>(() => Date.now());
  const [anchors, setAnchors] = useState<PublicAnchor[]>([]);
  const [preview, setPreview] = useState<PreviewFoodPoolResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [previewContextKey, setPreviewContextKey] = useState<string | null>(null);

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

  const client = useMemo(() => {
    if (apiClient) return apiClient;
    if (envMode === 'real_api') return realClient;
    return new MockApiClient();
  }, [apiClient, envMode, realClient]);
  const discoveryClient = useMemo(() => {
    if (!client) return null;
    return envMode === 'real_api' ? createDiscoveryApi(client) : client;
  }, [client, envMode]);

  const service = useMemo(() => {
    let adapter: LocationAdapter;
    if (scenario === 'live_native') {
      adapter = createDefaultLocationAdapter();
    } else {
      const mock = new MockLocationAdapter();
      switch (scenario) {
        case 'gps_grant_rua':
          mock.setPermissionStatus('granted');
          mock.setCoordinates({ latitude: 10.7828, longitude: 106.6958 });
          break;
        case 'gps_grant_dibo':
          mock.setPermissionStatus('granted');
          mock.setCoordinates({ latitude: 10.7743, longitude: 106.7034 });
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
          mock.setCoordinates({ latitude: 21.0285, longitude: 105.8542 });
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

  const invalidateDraft = () => {
    previewGeneration.current += 1;
    setPreviewLoading(false);
    setPreview(null);
    setPreviewError(null);
    setPreviewContextKey(null);
    setConfirmed(false);
  };

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

  return {
    envMode,
    setEnvMode,
    scenario,
    setScenario,
    loading,
    serverError,
    realApiUrl,
    realClientStatus,
    liveAuth,
    serverTime,
    serverLoadedAt,
    anchors,
    preview,
    previewLoading,
    previewError,
    confirmed,
    locationState,
    radiusM,
    setRadiusM,
    budget,
    setBudget,
    avoidRecent,
    setAvoidRecent,
    mealSlot,
    setMealSlot,
    serviceMode,
    setServiceMode,
    timeMode,
    setTimeMode,
    timeState,
    setTimeState,
    dateText,
    setDateText,
    timeText,
    setTimeText,
    service,
    sanitizedContext,
    liveDesiredAtPast,
    draftInputError,
    canSaveContext,
    createLiveGuest,
    handleRetry,
    invalidateDraft,
    handleSelectAnchor,
    handleRefreshGps,
    handleToggleTimeMode,
    handleSetScheduledOffsetHours,
    handleConfirmPastTime,
    handleAdjustToValidNow,
    handleSaveContext,
    handlePreview,
    handleConfirmDraft,
    nextMealTime,
  };
}
