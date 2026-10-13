/** GM-18 consumer supplement: actual GM-07 client + checked discovery metadata. */
import type { ApiClient, PoolDish, PreviewFoodPoolRequest, PreviewFoodPoolResponse, ReadResult } from '../api/contracts';
export type DiscoveryReason = 'OUT_OF_COVERAGE' | 'NO_ELIGIBLE_FOOD' | 'AVAILABILITY_UNKNOWN';
export type OfferingCard = PoolDish & { offeringIds: string[]; availability: 'scheduled' | 'confirmed' };
export type DiscoveryPreview = Omit<PreviewFoodPoolResponse, 'pool'> & {
  pool: OfferingCard[]; reasonCodes: DiscoveryReason[]; poolSeed: string; policyVersion: string;
};
const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
function card(value: PoolDish): OfferingCard | null {
  if (!record(value)) return null;
  if (!Array.isArray(value.offeringIds) || !value.offeringIds.length || !value.offeringIds.every(string)
    || new Set(value.offeringIds).size !== value.offeringIds.length
    || typeof value.availability !== 'string' || !['scheduled', 'confirmed'].includes(value.availability)) return null;
  // Base fields have already passed GM-07 guards; new metadata is checked here.
  const keys = ['roundDishId', 'choiceId', 'dishId', 'name', 'description', 'cuisineIds', 'categoryIds',
    'origin', 'temperature', 'flavor', 'artwork', 'priceMin', 'priceMax', 'currency', 'unit',
    'servingSize', 'price', 'venueId', 'venueName', 'venueAddress', 'distanceM'];
  const base = Object.fromEntries(keys.filter(key => key in value).map(key => [key, value[key]])) as unknown as PoolDish;
  return { ...base, offeringIds: [...value.offeringIds] as string[], availability: value.availability as 'scheduled' | 'confirmed' };
}
const malformed = <T>(): ReadResult<T> => ({ ok: false, error: { messageKey: 'MALFORMED_RESPONSE' } });
export function createDiscoveryApi(client: Pick<ApiClient, 'getDiscoveryContext' | 'previewFoodPool' | 'getResultOfferings'>) {
  return {
    getDiscoveryContext: client.getDiscoveryContext.bind(client),
    async previewFoodPool(request: PreviewFoodPoolRequest): Promise<ReadResult<DiscoveryPreview>> {
      const response = await client.previewFoodPool(request);
      if (!response.ok) return response;
      const value: unknown = response.data;
      if (!record(value) || !string(value.poolSeed) || !string(value.policyVersion)
        || !Array.isArray(value.reasonCodes) || !value.reasonCodes.every(reason =>
          typeof reason === 'string' && ['OUT_OF_COVERAGE', 'NO_ELIGIBLE_FOOD', 'AVAILABILITY_UNKNOWN'].includes(reason))) return malformed();
      const pool = response.data.pool.map(card);
      if (pool.some(row => row === null) || pool.length > 8 || response.data.totalCandidateCount < pool.length || new Set(pool.map(row => row?.choiceId)).size !== pool.length) return malformed();
      if (pool.length > 0 && value.reasonCodes.length !== 0) return malformed();
      if (pool.length === 0 && value.reasonCodes.length === 0) return malformed();
      return { ok: true, data: { pool: pool as OfferingCard[], reasonCodes: [...value.reasonCodes] as DiscoveryReason[],
        poolSeed: value.poolSeed, policyVersion: value.policyVersion, datasetVersion: response.data.datasetVersion,
        eligibilityVersion: response.data.eligibilityVersion, evaluatedAt: response.data.evaluatedAt,
        totalCandidateCount: response.data.totalCandidateCount } };
    },
    async getResultOfferings(roomId: string, resultId: string): Promise<ReadResult<OfferingCard[]>> {
      const response = await client.getResultOfferings(roomId, resultId);
      if (!response.ok) return response;
      const cards = response.data.map(card);
      const first = cards[0];
      if (cards.length > 100 || cards.some(row => row === null || row.dishId !== first?.dishId
        || row.choiceId !== first?.choiceId || row.roundDishId !== first?.roundDishId)) return malformed();
      return { ok: true, data: cards as OfferingCard[] };
    },
  };
}
