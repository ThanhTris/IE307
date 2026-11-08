import {
  CreateGuestSessionRequest,
  SessionResponse,
  SessionUser,
  DiscoveryContextResponse,
  PreviewFoodPoolRequest,
  PreviewFoodPoolResponse,
  ReadResult,
  WriteResult,
} from '../contracts';
import {
  isSessionResponse,
  isSessionUser,
  isVoidPayload,
  isDiscoveryContext,
  isPreviewFoodPool,
} from '../responseGuards';
import type { SessionApi } from '../../auth/types';
import type { ApiTransport } from './transport';
import type { RpcCallerContext } from './helpers';

export interface AuthClientContext extends RpcCallerContext {
  authSession?: SessionApi;
  transport: ApiTransport;
  setAuthToken(token: string | null): void;
}

export async function createGuestSessionMethod(
  ctx: AuthClientContext,
  req: CreateGuestSessionRequest
): Promise<WriteResult<SessionResponse>> {
  if (ctx.authSession) return ctx.authSession.createGuestSession(req);
  const requestId = req.requestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('create_guest_session', {
      requestId,
      display_name: req.displayName,
    });
    const norm = ctx.normalizeWriteResponse<SessionResponse>(raw, requestId, isSessionResponse);
    if (!norm.ok) return norm;
    if (norm.data?.token) {
      ctx.setAuthToken(norm.data.token);
    }
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function restoreSessionMethod(
  ctx: AuthClientContext,
  token: string
): Promise<ReadResult<SessionUser>> {
  if (ctx.authSession) return ctx.authSession.restoreSession(token);
  try {
    const raw = await ctx.transport.invoke<unknown>('restore_session', {}, { token });
    const norm = ctx.normalizeReadResponse<SessionUser>(raw, isSessionUser);
    if (!norm.ok) return norm;
    ctx.setAuthToken(token);
    return { ok: true, data: norm.data };
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function logoutMethod(
  ctx: AuthClientContext,
  customRequestId?: string
): Promise<WriteResult<void>> {
  if (ctx.authSession) return ctx.authSession.logout(customRequestId);
  const requestId = customRequestId ?? ctx.generateRequestId();
  try {
    const raw = await ctx.callRpc<unknown>('logout', { requestId });
    const norm = ctx.normalizeWriteResponse<void>(raw, requestId, isVoidPayload);
    if (!norm.ok) return norm;
    ctx.setAuthToken(null);
    return norm;
  } catch (err) {
    return { ok: false, requestId, error: ctx.mapError(err) };
  }
}

export async function getDiscoveryContextMethod(
  ctx: RpcCallerContext,
  areaId?: string,
  anchorId?: string
): Promise<ReadResult<DiscoveryContextResponse>> {
  try {
    const raw = await ctx.callRpc<unknown>('get_discovery_context', {
      area_id: areaId ?? null,
      anchor_id: anchorId ?? null,
    });
    return ctx.normalizeReadResponse<DiscoveryContextResponse>(raw, isDiscoveryContext);
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}

export async function previewFoodPoolMethod(
  ctx: RpcCallerContext,
  req: PreviewFoodPoolRequest
): Promise<ReadResult<PreviewFoodPoolResponse>> {
  try {
    const raw = await ctx.callRpc<unknown>('preview_food_pool', {
      anchor_id: req.anchorId,
      radius_m: req.radiusM,
      desired_at: req.desiredAt,
      service_mode: req.serviceMode,
      meal_slot: req.mealSlot,
      time_hint: req.timeHint ?? null,
      cuisine_ids: req.cuisineIds ?? null,
      category_ids: req.categoryIds ?? null,
      budget: req.budget ?? null,
    });
    return ctx.normalizeReadResponse<PreviewFoodPoolResponse>(raw, isPreviewFoodPool);
  } catch (err) {
    return { ok: false, error: ctx.mapError(err) };
  }
}
