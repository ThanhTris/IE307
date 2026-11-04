import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ApiClient,
  MealSlot,
  PoolDish,
  RoomContext,
  ServiceMode,
} from '../../../data/api/contracts';
import { ApiClientImpl } from '../../../data/api/client';
import { FetchTransport } from '../../../data/api/client/transport';
import {
  currentServerTime,
  localTime,
  parseLocalTime,
  previewDishPoolLive,
  previewDishPoolMock,
  setupError,
  type GM24Scenario,
} from '../services/roomSetup';

export type ContextScenario = GM24Scenario;
export type EnvironmentMode = 'mock' | 'real_api';

export interface UseDiscoveryContextParams {
  apiClient?: ApiClient;
  initialScenario?: ContextScenario;
  initialEnvironmentMode?: EnvironmentMode;
  onSaveContext?: (context: Partial<RoomContext> & { dishCount?: number }) => void;
  serverTimeIso?: string;
}

export function useDiscoveryContext({
  apiClient,
  initialScenario = 'exact_20_lunch',
  initialEnvironmentMode = 'mock',
  onSaveContext,
  serverTimeIso = '2026-10-15T11:30:00.000Z',
}: UseDiscoveryContextParams = {}) {
  const [envMode, setEnvMode] = useState<EnvironmentMode>(initialEnvironmentMode);
  const [scenario, setScenario] = useState<ContextScenario>(initialScenario);

  // Setup form parameters (dish-only)
  const [mealSlot, setMealSlotState] = useState<MealSlot>('lunch');
  const [dishCount, setDishCountState] = useState<number>(scenario === 'shortage_15_lunch' ? 20 : 15);
  const [timeMode, setTimeModeState] = useState<'now' | 'scheduled'>('now');
  const [desiredAt, setDesiredAtState] = useState<string | null>(null);
  const [budget, setBudgetState] = useState<'under50' | '50to100' | '100to200' | null>(null);
  const [avoidRecent, setAvoidRecentState] = useState<boolean>(true);
  const [inviteeIds, setInviteeIdsState] = useState<string[]>([]);

  // Server clock simulation (UTC+7)
  const [serverLoadedAt] = useState<number>(() => Date.now());
  const serverTime = serverTimeIso;
  const currentNow = currentServerTime(serverTime, serverLoadedAt);

  // Real API state
  const realApiUrl =
    typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_SUPABASE_URL
      ? process.env.EXPO_PUBLIC_SUPABASE_URL
      : '';
  const [realClientStatus, setRealClientStatus] = useState<string>('Sẵn sàng');
  const [liveAuthToken, setLiveAuthToken] = useState<string | null>(null);

  // Generation counter to detect and invalidate stale in-flight preview requests
  const generationRef = useRef(1);

  // Preview state
  const [preview, setPreview] = useState<PoolDish[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [shortage, setShortage] = useState<{ available: number; requested: number } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [receipt, setReceipt] = useState<string | null>(null);

  // Clear preview and increment generation on user edits
  const clearPreviewState = useCallback(() => {
    generationRef.current += 1;
    setPreview(null);
    setPreviewError(null);
    setShortage(null);
    setConfirmed(false);
    setReceipt(null);
  }, []);

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

  // Handle switching scenario or environment mode
  useEffect(() => {
    generationRef.current += 1;
    setPreview(null);
    setPreviewError(null);
    setShortage(null);
    setConfirmed(false);
    setReceipt(null);

    if (scenario === 'desired_time_passed') {
      setTimeModeState('scheduled');
      setDesiredAtState(new Date(currentNow - 60 * 60 * 1000).toISOString());
    } else if (scenario === 'shortage_15_lunch') {
      setMealSlotState('lunch');
      setDishCountState(20);
    } else if (scenario === 'shortage_7_dinner') {
      setMealSlotState('dinner');
      setDishCountState(10);
    }
  }, [scenario, envMode]);

  // Trigger preview fetch
  const loadPreview = useCallback(async () => {
    const activeGen = generationRef.current;
    setPreviewLoading(true);
    setPreviewError(null);
    setShortage(null);

    // Validate scheduled time before sending
    if (timeMode === 'scheduled' && desiredAt && Date.parse(desiredAt) <= currentNow) {
      setPreviewLoading(false);
      setPreviewError(setupError('DESIRED_TIME_PASSED'));
      return;
    }

    try {
      if (envMode === 'mock') {
        const result = await previewDishPoolMock(scenario, {
          mealSlot,
          dishCount,
          desiredAt,
          timeMode,
          serverTimeMs: currentNow,
        });

        // Drop response if a new generation started while waiting
        if (generationRef.current !== activeGen) return;

        if (result.ok) {
          setPreview(result.dishes);
        } else if (result.code === 'SHORTAGE') {
          setShortage({ available: result.available, requested: result.requested });
          setPreviewError(
            result.available >= 10
              ? `Chỉ có ${result.available} món phù hợp (đang chọn ${result.requested} món).`
              : `Chỉ có ${result.available} món phù hợp. Cần tối thiểu 10 món để bắt đầu.`
          );
        } else {
          setPreviewError(result.message);
        }
      } else {
        // Real Supabase API call
        if (!realApiUrl) {
          setPreviewError('Thiếu URL máy chủ Supabase. Hãy kiểm tra biến môi trường.');
          setPreviewLoading(false);
          return;
        }

        const client =
          apiClient ??
          new ApiClientImpl({
            baseUrl: realApiUrl,
            transport: new FetchTransport(realApiUrl),
            initialToken: liveAuthToken,
          });

        const transport = (client as any)?.transport;
        if (!transport) {
          setPreviewError('Không tìm thấy transport API của client.');
          setPreviewLoading(false);
          return;
        }

        const result = await previewDishPoolLive(transport, {
          mealSlot,
          dishCount,
          token: liveAuthToken ?? undefined,
        });

        if (generationRef.current !== activeGen) return;

        if (result.ok) {
          setPreview(result.dishes);
        } else if (result.code === 'SHORTAGE') {
          setShortage({ available: result.available, requested: result.requested });
          setPreviewError(
            result.available >= 10
              ? `Chỉ có ${result.available} món phù hợp (đang chọn ${result.requested} món).`
              : `Chỉ có ${result.available} món phù hợp. Cần tối thiểu 10 món để tạo phòng.`
          );
        } else {
          setPreviewError(result.message);
        }
      }
    } catch {
      if (generationRef.current === activeGen) {
        setPreviewError('Lỗi kết nối khi tải danh sách món xem trước.');
      }
    } finally {
      if (generationRef.current === activeGen) {
        setPreviewLoading(false);
      }
    }
  }, [envMode, scenario, mealSlot, dishCount, desiredAt, timeMode, currentNow, realApiUrl, apiClient, liveAuthToken]);

  // Shortage action: confirm reduction to available count (when available >= 10)
  const confirmReduction = useCallback(() => {
    if (shortage && shortage.available >= 10) {
      const newCount = shortage.available;
      setDishCountState(newCount);
      setShortage(null);
      setPreviewError(null);
      generationRef.current += 1;

      // Re-fetch preview immediately with reduced count
      const activeGen = generationRef.current;
      setPreviewLoading(true);
      void previewDishPoolMock('exact_20_lunch', {
        mealSlot,
        dishCount: newCount,
        desiredAt,
        timeMode,
        serverTimeMs: currentNow,
      }).then(res => {
        if (generationRef.current === activeGen && res.ok) {
          setPreview(res.dishes);
          setPreviewLoading(false);
        }
      });
    }
  }, [shortage, mealSlot, desiredAt, timeMode, currentNow]);

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
    setEnvMode,
    scenario,
    setScenario,
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
    generation: generationRef.current,
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
