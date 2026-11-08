import { useCallback, useRef, useState } from 'react';
import type {
  ApiClient,
  MealSlot,
  PoolDish,
  RoomContext,
} from '../../../data/api/contracts';
import type { ApiTransport } from '../../../data/api/client/transport';
import type { SessionApi } from '../../../data/auth/types';
import { FetchTransport } from '../../../data/api/client/transport';
import {
  currentServerTime,
  localTime,
  previewDishPoolLive,
  previewDishPoolMock,
  setupError,
  type GM24Scenario,
} from '../services/roomSetup';

export type ContextScenario = GM24Scenario;
export type EnvironmentMode = 'mock' | 'real_api';

export interface UseDiscoveryContextParams {
  apiClient?: ApiClient;
  transport?: ApiTransport;
  sessionManager?: SessionApi;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: Partial<RoomContext> & { dishCount?: number }) => void;
  serverTimeIso?: string;
  realTimeNow?: () => number;
}

export function useDiscoveryContext({
  apiClient,
  transport,
  sessionManager,
  initialScenario = 'exact_20_lunch',
  initialEnvironmentMode = 'mock',
  onSaveContext,
  serverTimeIso,
  realTimeNow,
}: UseDiscoveryContextParams = {}) {
  const [envMode, setEnvMode] = useState<EnvironmentMode>(initialEnvironmentMode);
  const [scenario, setScenario] = useState<ContextScenario>(initialScenario);

  // Time handling:
  // - Mock mode uses deterministic fixture time (serverTimeIso or 2026-10-15T11:30:00.000Z).
  // - Real mode uses dynamic wall clock initialized via useState without calling impure Date.now() during render.
  const [baseEpoch] = useState<number>(() => (realTimeNow ? realTimeNow() : Date.now()));

  const mockServerTime = serverTimeIso ?? '2026-10-15T11:30:00.000Z';
  const realServerTime = serverTimeIso ?? new Date(baseEpoch).toISOString();
  const serverTime = envMode === 'mock' ? mockServerTime : realServerTime;

  const currentNow =
    envMode === 'mock'
      ? currentServerTime(mockServerTime, baseEpoch, baseEpoch)
      : baseEpoch;

  // Setup form parameters (dish-only)
  const [mealSlot, setMealSlotState] = useState<MealSlot>(() =>
    initialScenario === 'shortage_7_dinner' ? 'dinner' : 'lunch'
  );
  const [dishCount, setDishCountState] = useState<number>(() =>
    initialScenario === 'shortage_15_lunch' ? 20 : initialScenario === 'shortage_7_dinner' ? 10 : 15
  );
  const [timeMode, setTimeModeState] = useState<'now' | 'scheduled'>(() =>
    initialScenario === 'desired_time_passed' ? 'scheduled' : 'now'
  );
  const [desiredAt, setDesiredAtState] = useState<string | null>(() =>
    initialScenario === 'desired_time_passed'
      ? new Date(currentNow - 60 * 60 * 1000).toISOString()
      : null
  );
  const [budget, setBudgetState] = useState<'under50' | '50to100' | '100to200' | null>(null);
  const [avoidRecent, setAvoidRecentState] = useState<boolean>(true);
  const [inviteeIds, setInviteeIdsState] = useState<string[]>([]);

  // Keep direct property access so Expo can inline the public environment values.
  const realApiUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
  const realApiKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    || '';

  const [realClientStatus, setRealClientStatus] = useState<string>('Sẵn sàng');
  const [liveAuthToken, setLiveAuthToken] = useState<string | null>(null);

  // Generation counter to track request ownership and discard stale responses
  const generationRef = useRef(1);
  const [generationState, setGenerationState] = useState(1);

  // Preview state
  const [preview, setPreview] = useState<PoolDish[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [shortage, setShortage] = useState<{ available: number; requested: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  // Bump generation helper
  const bumpGeneration = useCallback(() => {
    generationRef.current += 1;
    setGenerationState(generationRef.current);
    return generationRef.current;
  }, []);

  // Clear preview and reset loading state when user edits form parameters
  const clearPreviewState = useCallback(() => {
    bumpGeneration();
    setPreview(null);
    setPreviewError(null);
    setShortage(null);
    setConfirmed(false);
    setReceipt(null);
    setPreviewLoading(false); // Stop pending loading so button isn't stuck disabled
  }, [bumpGeneration]);

  // Form field setters
  const setMealSlot = useCallback((value: MealSlot) => {
    setMealSlotState(value);
    clearPreviewState();
  }, [clearPreviewState]);

  const setDishCount = useCallback((value: number) => {
    const clamped = Math.max(10, Math.min(20, Math.floor(value)));
    setDishCountState(clamped);
    clearPreviewState();
  }, [clearPreviewState]);

  const setTimeMode = useCallback((mode: 'now' | 'scheduled') => {
    setTimeModeState(mode);
    if (mode === 'now') {
      setDesiredAtState(null);
    } else {
      const nextTime = new Date(currentNow + 15 * 60 * 1000).toISOString();
      setDesiredAtState(nextTime);
    }
    clearPreviewState();
  }, [clearPreviewState, currentNow]);

  const setDesiredAt = useCallback((iso: string | null) => {
    setDesiredAtState(iso);
    clearPreviewState();
  }, [clearPreviewState]);

  const setBudget = useCallback((b: 'under50' | '50to100' | '100to200' | null) => {
    setBudgetState(b);
    clearPreviewState();
  }, [clearPreviewState]);

  const setAvoidRecent = useCallback((v: boolean) => {
    setAvoidRecentState(v);
    clearPreviewState();
  }, [clearPreviewState]);

  const setInviteeIds = useCallback((ids: string[]) => {
    setInviteeIdsState(ids);
    clearPreviewState();
  }, [clearPreviewState]);

  // Adjust past scheduled time to valid future time (+15 mins)
  const adjustToValidTime = useCallback(() => {
    const validFuture = new Date(currentNow + 15 * 60 * 1000).toISOString();
    setDesiredAtState(validFuture);
    clearPreviewState();
  }, [clearPreviewState, currentNow]);

  // Check if scheduled time has passed
  const isDesiredTimePassed =
    timeMode === 'scheduled' &&
    desiredAt !== null &&
    Number.isFinite(Date.parse(desiredAt)) &&
    Date.parse(desiredAt) <= currentNow;

  // Setters for scenario and environment mode (pure callback without synchronous setState inside useEffect)
  const changeScenario = useCallback(
    (newScenario: ContextScenario) => {
      setScenario(newScenario);
      clearPreviewState();

      if (newScenario === 'desired_time_passed') {
        setTimeModeState('scheduled');
        setDesiredAtState(new Date(currentNow - 60 * 60 * 1000).toISOString());
      } else if (newScenario === 'shortage_15_lunch') {
        setMealSlotState('lunch');
        setDishCountState(20);
      } else if (newScenario === 'shortage_7_dinner') {
        setMealSlotState('dinner');
        setDishCountState(10);
      }
    },
    [clearPreviewState, currentNow]
  );

  const changeEnvMode = useCallback(
    (newEnv: EnvironmentMode) => {
      setEnvMode(newEnv);
      clearPreviewState();
    },
    [clearPreviewState]
  );

  // Unified preview loader: used by both loadPreview and confirmReduction
  const executePreviewLoad = useCallback(
    async (targetCount: number) => {
      const activeGen = bumpGeneration();
      setPreviewLoading(true);
      setPreviewError(null);
      setShortage(null);

      // Validate scheduled time before sending
      if (timeMode === 'scheduled' && desiredAt && Date.parse(desiredAt) <= currentNow) {
        if (generationRef.current === activeGen) {
          setPreviewLoading(false);
          setPreviewError(setupError('DESIRED_TIME_PASSED'));
        }
        return;
      }

      try {
        if (envMode === 'mock') {
          const result = await previewDishPoolMock(scenario, {
            mealSlot,
            dishCount: targetCount,
            desiredAt,
            timeMode,
            serverTimeMs: currentNow,
          });

          // Drop response if a new generation started while waiting
          if (generationRef.current !== activeGen) return;

          if (result.ok) {
            setPreview(result.dishes);
            setPreviewError(null);
            setShortage(null);
          } else if (result.code === 'SHORTAGE') {
            setShortage({ available: result.available, requested: result.requested });
            setPreview(null);
            setPreviewError(
              result.available >= 10
                ? `Chỉ có ${result.available} món phù hợp (đang chọn ${result.requested} món).`
                : `Chỉ có ${result.available} món phù hợp. Cần tối thiểu 10 món để bắt đầu.`
            );
          } else {
            setPreview(null);
            setPreviewError(result.message);
          }
        } else {
          // Real Supabase API call
          if (!realApiUrl && !transport && !apiClient) {
            if (generationRef.current === activeGen) {
              setPreviewError('Thiếu URL máy chủ Supabase. Hãy kiểm tra biến môi trường.');
              setPreviewLoading(false);
            }
            return;
          }

          const activeTransport: ApiTransport =
            transport ??
            (apiClient && typeof (apiClient as any).getTransport === 'function'
              ? (apiClient as any).getTransport()
              : (apiClient as any)?.transport ??
                new FetchTransport(realApiUrl, undefined, realApiKey));

          let token: string | undefined = liveAuthToken ?? undefined;
          if (sessionManager) {
            try {
              const tokenRes = await sessionManager.getAccessToken();
              if (tokenRes.ok && tokenRes.data) {
                token = tokenRes.data;
              }
            } catch {
              // Token lookup failed
            }
          } else if (apiClient && typeof (apiClient as any).getAuthToken === 'function') {
            const clientToken = (apiClient as any).getAuthToken();
            if (clientToken) token = clientToken;
          }

          const result = await previewDishPoolLive(activeTransport, {
            mealSlot,
            dishCount: targetCount,
            token,
          });

          if (generationRef.current !== activeGen) return;

          if (result.ok) {
            setPreview(result.dishes);
            setPreviewError(null);
            setShortage(null);
          } else if (result.code === 'SHORTAGE') {
            setShortage({ available: result.available, requested: result.requested });
            setPreview(null);
            setPreviewError(
              result.available >= 10
                ? `Chỉ có ${result.available} món phù hợp (đang chọn ${result.requested} món).`
                : `Chỉ có ${result.available} món phù hợp. Cần tối thiểu 10 món để tạo phòng.`
            );
          } else {
            setPreview(null);
            setPreviewError(result.message);
          }
        }
      } catch {
        if (generationRef.current === activeGen) {
          setPreview(null);
          setPreviewError('Lỗi kết nối khi tải danh sách món xem trước.');
        }
      } finally {
        if (generationRef.current === activeGen) {
          setPreviewLoading(false);
        }
      }
    },
    [
      bumpGeneration,
      timeMode,
      desiredAt,
      currentNow,
      envMode,
      scenario,
      mealSlot,
      realApiUrl,
      transport,
      apiClient,
      realApiKey,
      liveAuthToken,
      sessionManager,
    ]
  );

  const loadPreview = useCallback(async () => {
    await executePreviewLoad(dishCount);
  }, [executePreviewLoad, dishCount]);

  // Shortage action: confirm reduction to available count (when available >= 10)
  // Re-fetches through the active environment without fabricating mock data
  const confirmReduction = useCallback(() => {
    if (shortage && shortage.available >= 10) {
      const newCount = shortage.available;
      setDishCountState(newCount);
      setShortage(null);
      setPreviewError(null);
      void executePreviewLoad(newCount);
    }
  }, [shortage, executePreviewLoad]);

  const dismissShortage = useCallback(() => {
    setShortage(null);
  }, []);

  // Save / finalize draft
  const saveDraft = useCallback(() => {
    if (isDesiredTimePassed) return;
    if (dishCount < 10 || dishCount > 20) return;
    setReceipt(
      `Bản nháp đã xác nhận: ${mealSlot === 'breakfast' ? 'Ăn sáng' : mealSlot === 'lunch' ? 'Ăn trưa' : mealSlot === 'dinner' ? 'Ăn tối' : 'Ăn vặt'} · ${dishCount} món · ${timeMode === 'now' ? 'Ăn ngay' : localTime(desiredAt || '')}. Chưa lưu vào phòng.`
    );
    onSaveContext?.({
      mealSlot,
      desiredAt: timeMode === 'now' ? undefined : (desiredAt ?? undefined),
      dishCount,
      budget: budget ? (budget === 'under50' ? 50000 : budget === '50to100' ? 100000 : 200000) : null,
    });
  }, [isDesiredTimePassed, dishCount, mealSlot, timeMode, desiredAt, budget, onSaveContext]);

  return {
    envMode,
    setEnvMode: changeEnvMode,
    scenario,
    setScenario: changeScenario,
    realApiUrl,
    realClientStatus,
    setRealClientStatus,
    liveAuthToken,
    setLiveAuthToken,

    // Dish-only form draft
    mealSlot,
    setMealSlot,
    dishCount,
    setDishCount,
    timeMode,
    setTimeMode,
    desiredAt,
    setDesiredAt,
    budget,
    setBudget,
    avoidRecent,
    setAvoidRecent,
    inviteeIds,
    setInviteeIds,

    // Server time & validation
    serverTime,
    currentNow,
    isDesiredTimePassed,
    adjustToValidTime,

    // Preview
    preview,
    previewLoading,
    previewError,
    loadPreview,
    generation: generationState,
    shortage,
    confirmReduction,
    dismissShortage,

    // Finalize
    confirmed,
    setConfirmed,
    receipt,
    saveDraft,
  };
}
