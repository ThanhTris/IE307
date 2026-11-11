import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import { router, type Href } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createAuthenticatedApiClient, createSecureSessionStorage } from '../data/auth';
import type { SessionIssue, SessionSnapshot, SessionStatus } from '../features/rooms/services/sessionState';
import type { SessionUser } from '../data/api/contracts';
import { clearPrivateHistoryCache } from '../features/history/services/historyRepository';
import { clearVoteSession } from '../features/voting/services/voteSessionState';
import { createNativePushService } from '../features/inbox/services/nativePush';
import { clearPushRegistrationSecrets, getActivePushDriver, getPushDeviceId } from '../features/inbox/services/expoPushDriver';
import {
  LiveRoomRepository,
  createDurableRequestId,
  type RoomRepository,
} from '../features/rooms/services/roomRepository';

export interface RoomRepositoryContextValue {
  repository: RoomRepository;
  status: SessionStatus;
  issue: SessionIssue;
  user: SessionUser | null;
  /** Always 'real': the app has no mock mode. Kept so callers can assert the live path. */
  mode: 'real';
  isInitializing: boolean;
  restoreSession: () => Promise<boolean>;
  /** Called only from an explicit user action; never creates after a restore/network failure. */
  ensureSession: (displayName: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
}

const RoomRepositoryContext = createContext<RoomRepositoryContextValue | null>(null);

const PRIVATE_CACHE_KEY = 'gcd.room.private_cache.v1';

export interface RoomRepositoryProviderProps extends PropsWithChildren {
  repository?: RoomRepository;
  baseUrl?: string;
  publicKey?: string;
}

/** The app always talks to the backend. Without configuration it shows a setup error instead of fake data. */
export function RoomRepositoryProvider(props: RoomRepositoryProviderProps) {
  const publicKey = props.publicKey ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  if (!props.repository && !publicKey) return <MissingBackendConfig />;
  return <ConfiguredRoomRepositoryProvider {...props} publicKey={publicKey} />;
}

function MissingBackendConfig() {
  return (
    <View style={missingStyles.root}>
      <Text accessibilityRole="header" style={missingStyles.title}>Chưa cấu hình máy chủ</Text>
      <Text style={missingStyles.body}>Thiếu EXPO_PUBLIC_SUPABASE_URL hoặc EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong mobile/.env.local. Xem mobile/README.md để dựng backend local.</Text>
    </View>
  );
}

const missingStyles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#FFFDF5' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: '#1F2A1F' },
  body: { fontSize: 15, lineHeight: 22, color: '#1F2A1F' },
});

function ConfiguredRoomRepositoryProvider({
  children,
  repository: customRepository,
  baseUrl: customBaseUrl,
  publicKey = '',
}: RoomRepositoryProviderProps) {
  const baseUrl = customBaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';

  const repository = useMemo<RoomRepository>(() => {
    if (customRepository) return customRepository;
    {
      const storage = createSecureSessionStorage();
      const { session, client } = createAuthenticatedApiClient({
        baseUrl,
        publicKey,
        storage,
        clearPrivateData: async () => {
          clearPrivateHistoryCache();
          try {
            await SecureStore.deleteItemAsync(PRIVATE_CACHE_KEY);
          } catch {
            // SecureStore may be unavailable in test environments without native modules.
          }
        },
      });
      return new LiveRoomRepository({ client, session, sessionStorage: storage, requestIdGenerator: createDurableRequestId });
    }
  }, [customRepository, baseUrl, publicKey]);

  const subscribe = useCallback((listener: () => void) => repository.subscribeSession(listener), [repository]);
  const getSnapshot = useCallback((): SessionSnapshot => repository.getSessionSnapshot(), [repository]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [restoredRepository, setRestoredRepository] = useState<RoomRepository>();
  const isInitializing = restoredRepository !== repository;

  const restoreSession = useCallback(async (): Promise<boolean> => {
    const result = await repository.restoreSession();
    return result.ok;
  }, [repository]);

  const ensureSession = useCallback(async (displayName: string): Promise<boolean> => {
    let current = repository.getSessionSnapshot();
    if (current.status === 'active' && current.user) return true;
    if (current.status === 'blocked' || current.status === 'lost') return false;

    if (current.issue !== 'no-session') {
      const restored = await repository.restoreSession();
      if (restored.ok) return true;
      current = repository.getSessionSnapshot();
      if (current.issue !== 'no-session') return false;
    }

    const created = await repository.createGuestSession(displayName);
    return created.ok;
  }, [repository]);

  const logout = useCallback(async (): Promise<boolean> => {
    const identityId = repository.getSessionSnapshot().user?.id;
    let pushCleanupComplete = false;
    try {
      const deviceId = await getPushDeviceId();
      if (deviceId) {
        const push = createNativePushService({
          driver: getActivePushDriver(),
          client: repository.getApiClient(),
          identityId: repository.getCurrentUser()?.id,
          refreshInbox: async () => undefined,
        });
        // Queue unregister behind token refresh when possible; network failure must not block local logout.
        const result = await push.unregister(deviceId).catch(() => undefined);
        pushCleanupComplete = result?.ok === true;
      } else pushCleanupComplete = true;
    } catch {
      // Local session cleanup must work when secure storage or the network is unavailable.
    }
    const result = await repository.logout();
    if (result.ok && identityId) clearVoteSession(identityId);
    // Keep the device handle/token when remote unregister did not ACK, so a
    // later login/logout can retry cleanup for this same installation.
    if (result.ok && pushCleanupComplete) await clearPushRegistrationSecrets().catch(() => undefined);
    return result.ok;
  }, [repository]);

  useEffect(() => {
    let mounted = true;
    void repository.restoreSession().catch(() => undefined).finally(() => {
      if (mounted) setRestoredRepository(repository);
    });
    return () => { mounted = false; };
  }, [repository]);

  useEffect(() => {
    if (snapshot.status !== 'active' || !snapshot.user?.id) return;
    let mounted = true;
    const userId = snapshot.user.id;
    const inFlight = new Set<string>();
    const isSameUser = () => mounted && repository.getSessionStatus() === 'active'
      && repository.getCurrentUser()?.id === userId;
    const routeInbox = (eventId: string, notificationStatus?: 'retry' | 'unavailable') => {
      const params = new URLSearchParams();
      if (eventId) params.set('openEventId', eventId);
      if (notificationStatus) params.set('notificationStatus', notificationStatus);
      router.replace(`/inbox${params.size ? `?${params.toString()}` : ''}` as Href);
    };
    const service = createNativePushService({
      driver: getActivePushDriver(),
      client: repository.getApiClient(),
      identityId: userId,
      isIdentityCurrent: isSameUser,
      refreshInbox: async eventId => {
        if (!isSameUser() || inFlight.has(eventId)) return false;
        inFlight.add(eventId);
        try {
          const sessionGeneration = repository.getSessionApi()?.getGeneration();
          const isCurrent = () => isSameUser()
            && (sessionGeneration === undefined || repository.getSessionApi()?.getGeneration() === sessionGeneration);
          if (!isCurrent()) return false;
          // Keep the event ID on the route; InboxScreen resolves it from the
          // server and can retry this exact lookup after a temporary failure.
          routeInbox(eventId);
          return true;
        } catch {
          if (isSameUser()) routeInbox(eventId, 'retry');
          return false;
        } finally {
          inFlight.delete(eventId);
        }
      },
    });
    const unsubscribe = service.subscribe();
    return () => { mounted = false; unsubscribe(); };
  }, [repository, snapshot.status, snapshot.user?.id]);

  const value = useMemo<RoomRepositoryContextValue>(() => ({
    repository,
    status: snapshot.status,
    issue: snapshot.issue,
    user: snapshot.user,
    mode: 'real',
    isInitializing,
    restoreSession,
    ensureSession,
    logout,
  }), [repository, snapshot, isInitializing, restoreSession, ensureSession, logout]);

  return <RoomRepositoryContext.Provider value={value}>{children}</RoomRepositoryContext.Provider>;
}

export function useRoomRepository(): RoomRepositoryContextValue {
  const context = useContext(RoomRepositoryContext);
  if (!context) throw new Error('useRoomRepository must be used within RoomRepositoryProvider');
  return context;
}
