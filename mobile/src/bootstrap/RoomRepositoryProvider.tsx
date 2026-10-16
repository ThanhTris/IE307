import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import * as SecureStore from 'expo-secure-store';
import { createAuthenticatedApiClient } from '../data/auth';
import { createApiClient } from '../data/api';
import type { SessionStatus } from '../data/auth/session';
import type { SessionUser } from '../data/api/contracts';
import {
  LiveRoomRepository,
  createDurableRequestId,
  type RoomRepository,
} from '../features/rooms/services/roomRepository';

export interface RoomRepositoryContextValue {
  repository: RoomRepository;
  status: SessionStatus;
  user: SessionUser | null;
  mode: 'real' | 'mock';
  restoreSession: () => Promise<boolean>;
  ensureSession: (fallbackDisplayName?: string) => Promise<boolean>;
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
    if (isReal && publicKey) {
      const { session, client } = createAuthenticatedApiClient({
        baseUrl,
        publicKey,
        clearPrivateData: async () => {
          try {
            await SecureStore.deleteItemAsync(PRIVATE_CACHE_KEY);
          } catch {
            // SecureStore may fail in test environments without native modules
          }
        },
      });
      return new LiveRoomRepository({ client, session, requestIdGenerator: createDurableRequestId });
    }
    const mockClient = createApiClient('mock', { mode: 'default' });
    return new LiveRoomRepository({ client: mockClient, requestIdGenerator: createDurableRequestId });
  }, [customRepository, isReal, baseUrl, publicKey]);

  const [status, setStatus] = useState<SessionStatus>(repository.getSessionStatus());
  const [user, setUser] = useState<SessionUser | null>(repository.getCurrentUser());

  const restoreSession = useCallback(async (): Promise<boolean> => {
    try {
      const result = await repository.restoreSession();
      if (result.ok) {
        setUser(result.data);
        setStatus('active');
        return true;
      }
      setUser(null);
      setStatus('lost');
      return false;
    } catch {
      setUser(null);
      setStatus('lost');
      return false;
    }
  }, [repository]);

  const ensureSession = useCallback(async (fallbackDisplayName = 'Khách'): Promise<boolean> => {
    const restored = await restoreSession();
    if (restored) return true;
    const result = await repository.createGuestSession(fallbackDisplayName);
    if (result.ok) {
      setUser(result.data.user);
      setStatus('active');
      return true;
    }
    return false;
  }, [repository, restoreSession]);

  useEffect(() => {
    let active = true;
    const init = async () => {
      try {
        const result = await repository.restoreSession();
        if (!active) return;
        if (result.ok) {
          setUser(result.data);
          setStatus('active');
        } else if (isReal) {
          const created = await repository.createGuestSession('Khách');
          if (!active) return;
          if (created.ok) {
            setUser(created.data.user);
            setStatus('active');
          } else {
            setUser(null);
            setStatus('lost');
          }
        }
      } catch {
        if (!active) return;
        setUser(null);
        setStatus('lost');
      }
    };
    void init();
    return () => { active = false; };
  }, [repository, isReal]);

  const value = useMemo<RoomRepositoryContextValue>(() => ({
    repository,
    status,
    user,
    mode: isReal ? 'real' : 'mock',
    restoreSession,
    ensureSession,
  }), [repository, status, user, isReal, restoreSession, ensureSession]);

  return (
    <RoomRepositoryContext.Provider value={value}>
      {children}
    </RoomRepositoryContext.Provider>
  );
}

export function useRoomRepository(): RoomRepositoryContextValue {
  const context = useContext(RoomRepositoryContext);
  if (!context) {
    throw new Error('useRoomRepository must be used within RoomRepositoryProvider');
  }
  return context;
}
