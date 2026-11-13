export interface PublicAnchor {
  id: string;
  coverageId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export interface CoverageArea {
  id: string;
  name: string;
  adminAreaId: string;
}

export interface DiscoveryContextResponse {
  anchors: PublicAnchor[];
  coverageAreas: CoverageArea[];
  serverTime: string;
}

export interface DishArtwork {
  url: string;
  usageRights: 'unknown' | 'granted' | 'licensed' | 'public_domain' | 'denied';
  license: string | null;
  attribution: string | null;
}

export interface FlavorItem {
  present: boolean | null;
  intensity: 'none' | 'low' | 'medium' | 'high' | 'unknown';
}

export interface FlavorProfile {
  spicy: FlavorItem;
  salty: FlavorItem;
  sweet: FlavorItem;
  sour: FlavorItem;
}

export type ServiceMode = 'dine_in' | 'takeaway' | 'delivery';
export type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type TimeHint = 'late_night';

export type CurrencyCode = 'VND' | 'USD' | 'THB' | 'KRW' | 'JPY' | 'CNY' | 'EUR' | 'other';
export type PriceUnit = 'portion' | 'item' | 'person' | 'group' | 'kg' | 'menu_item_unspecified';

export interface DishPrice {
  priceMin: number | null;
  priceMax: number | null;
  currency: CurrencyCode | null;
  unit: PriceUnit | null;
  servingSize: string | null;
  sourceRef?: string | null;
  pricingStrategy?: string | null;
}

export interface PoolDish {
  roundDishId: string;
  choiceId: string;
  dishId: string;
  name: string;
  description?: string | null;
  cuisineIds: string[];
  categoryIds: string[];
  origin?: 'north' | 'central' | 'south' | 'west' | 'unknown' | 'not_applicable' | null;
  temperature?: 'hot' | 'warm' | 'cold' | 'ambient' | 'unknown' | null;
  flavor?: FlavorProfile | null;
  artwork?: DishArtwork | null;
  priceMin?: number | null;
  priceMax?: number | null;
  currency?: CurrencyCode | null;
  unit?: PriceUnit | null;
  servingSize?: string | null;
  price?: DishPrice | null;
  venueId?: string;
  venueName?: string;
  venueAddress?: string;
  distanceM?: number;
}

export interface PreviewFoodPoolRequest {
  anchorId: string;
  radiusM: number;
  desiredAt: string;
  serviceMode: ServiceMode;
  mealSlot: MealSlot;
  timeHint?: TimeHint;
  cuisineIds?: string[];
  categoryIds?: string[];
  budget?: number | null;
}

export interface PreviewFoodPoolResponse {
  pool: PoolDish[];
  datasetVersion: string;
  eligibilityVersion: string;
  evaluatedAt: string;
  totalCandidateCount: number;
}
