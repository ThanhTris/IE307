import { createContext, useCallback, useContext, useEffect, useMemo, useState, useSyncExternalStore, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createAuthenticatedApiClient, createSecureSessionStorage } from '../data/auth';
import { createApiClient } from '../data/api';
import type { SessionIssue, SessionSnapshot, SessionStatus } from '../features/rooms/services/sessionState';
import type { SessionUser } from '../data/api/contracts';
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
  mode: 'real' | 'mock';
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
  mode?: 'real' | 'mock';
  baseUrl?: string;
  publicKey?: string;
}

export function RoomRepositoryProvider({
  children,
  repository: customRepository,
  mode: forcedMode,
  baseUrl: customBaseUrl,
  publicKey: customPublicKey,
}: RoomRepositoryProviderProps) {
  const baseUrl = customBaseUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
  const publicKey = customPublicKey ?? process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
  const isReal = forcedMode === 'real' || (forcedMode !== 'mock' && Boolean(publicKey));

  const repository = useMemo<RoomRepository>(() => {
    if (customRepository) return customRepository;
    if (isReal) {
      if (!publicKey) {
        throw new Error('RoomRepositoryProvider: EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required in real mode');
      }
      const storage = createSecureSessionStorage();
      const { session, client } = createAuthenticatedApiClient({
        baseUrl,
        publicKey,
        storage,
        clearPrivateData: async () => {
          try {
            await SecureStore.deleteItemAsync(PRIVATE_CACHE_KEY);
          } catch {
            // SecureStore may be unavailable in test environments without native modules.
          }
        },
      });
      return new LiveRoomRepository({ client, session, sessionStorage: storage, requestIdGenerator: createDurableRequestId });
    }
    const mockClient = createApiClient('mock', { mode: 'default' });
    return new LiveRoomRepository({ client: mockClient, requestIdGenerator: createDurableRequestId });
  }, [customRepository, isReal, baseUrl, publicKey]);

  const subscribe = useCallback((listener: () => void) => repository.subscribeSession(listener), [repository]);
  const getSnapshot = useCallback((): SessionSnapshot => repository.getSessionSnapshot(), [repository]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [restoredRepository, setRestoredRepository] = useState<RoomRepository>();
  const isInitializing = isReal && restoredRepository !== repository;

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
    const result = await repository.logout();
    return result.ok;
  }, [repository]);

  useEffect(() => {
    let mounted = true;
    if (!isReal) return;
    void repository.restoreSession().catch(() => undefined).finally(() => {
      if (mounted) setRestoredRepository(repository);
    });
    return () => { mounted = false; };
  }, [repository, isReal]);

  const value = useMemo<RoomRepositoryContextValue>(() => ({
    repository,
    status: snapshot.status,
    issue: snapshot.issue,
    user: snapshot.user,
    mode: isReal ? 'real' : 'mock',
    isInitializing,
    restoreSession,
    ensureSession,
    logout,
  }), [repository, snapshot, isReal, isInitializing, restoreSession, ensureSession, logout]);

  return <RoomRepositoryContext.Provider value={value}>{children}</RoomRepositoryContext.Provider>;
}

export function useRoomRepository(): RoomRepositoryContextValue {
  const context = useContext(RoomRepositoryContext);
  if (!context) throw new Error('useRoomRepository must be used within RoomRepositoryProvider');
  return context;
}
