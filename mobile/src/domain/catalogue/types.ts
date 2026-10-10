import type { FLAVORS, INTENSITIES, MEAL_SLOTS, SOURCE_KINDS, TAXON_TYPES, TEMPERATURES } from './taxonomy';

export type Temperature = typeof TEMPERATURES[number];
export type Intensity = typeof INTENSITIES[number];
export type MealSlot = typeof MEAL_SLOTS[number];
export type FlavorProfile = Record<typeof FLAVORS[number], Intensity>;
export type PublicationStatus = 'draft' | 'verified' | 'published';
export type ServiceMode = 'dine_in';
export type Position = [longitude: number, latitude: number];
export interface Freshness { checkedAt: string; validUntil: string }
export interface Sourced extends Freshness { sourceRef: string }

export interface Taxon {
  id: string; version: string; type: typeof TAXON_TYPES[number]; key: string;
  label: string; description: string; status: 'active' | 'deprecated'; sourceRef: string;
}
export interface Artwork { uri: string; sourceRef: string; license: string }
export interface Dish {
  id: string; version: string; name: string; aliases: string[]; description: string;
  cuisineIds: string[]; originIds: string[]; categoryIds: string[]; mealSlots: MealSlot[];
  ingredientTags: string[] | null; temperature: Temperature | null;
  flavor: FlavorProfile | null; artwork: Artwork | null;
}
export interface Venue extends Sourced {
  id: string; branchName: string; address: string; adminAreaId: string;
  lat: number; lng: number; timezone: string; status: 'active' | 'closed' | 'unknown';
  serviceModes: ServiceMode[];
}
export interface Price {
  min: number; max: number; unit: 'person' | 'portion' | 'group';
  currency: 'VND'; servingSize: number | null; sourceRef: string;
}
export interface Offering extends Freshness {
  id: string; venueId: string; dishId: string; variantId: string; variant: string;
  menuSource: string; scheduleId: string; serviceMode: ServiceMode; status: PublicationStatus;
  price: Price | null; temperature: Temperature | null; flavor: FlavorProfile | null;
}
export interface TimeInterval {
  startTime: string; endTime: string; endDayOffset: 0 | 1; is24Hours: boolean;
}
export interface ScheduleDay {
  dayOfWeek: number; status: 'open' | 'closed' | 'unknown'; intervals: TimeInterval[];
}
export interface Schedule extends Sourced {
  id: string; ownerType: 'venue' | 'offering'; ownerId: string;
  timezone: string; weekly: ScheduleDay[];
}
export interface DateException extends Sourced {
  id: string; scheduleId: string; localDate: string;
  status: 'open' | 'closed' | 'unknown'; intervals: TimeInterval[]; lastOrder: string | null;
}
export interface AvailabilityOverride {
  id: string; offeringId: string; state: 'available' | 'sold_out' | 'paused' | 'unknown';
  sourceRef: string; observedAt: string; expiresAt: string;
}
export interface CoverageArea extends Freshness {
  id: string; name: string; boundary: Position[]; datasetVersion: string; sourceRef: string;
}
export interface PublicAnchor {
  id: string; name: string; lat: number; lng: number; coverageId: string;
}
export interface DataSource extends Freshness {
  id: string; locator: string; usageRights: string; appliesTo: typeof SOURCE_KINDS[number][];
  enteredBy: string; reviewedBy: string | null; status: PublicationStatus;
}
export interface FoodDataset extends Freshness {
  contractVersion: string; datasetVersion: string; kind: 'fixture' | 'survey'; status: PublicationStatus;
  enteredBy: string; reviewedBy: string | null;
  taxonomy: Taxon[]; dishes: Dish[]; venues: Venue[]; offerings: Offering[];
  schedules: Schedule[]; dateExceptions: DateException[]; availabilityOverrides: AvailabilityOverride[];
  coverageAreas: CoverageArea[]; publicAnchors: PublicAnchor[]; sources: DataSource[];
}
export interface ContractIssue { path: string; code: string; message: string }
export interface ValidationResult { valid: boolean; issues: ContractIssue[] }
export interface ValidationOptions { purpose?: 'fixture' | 'publish'; now?: string }
export interface FoodPoolFixture {
  id: string; kind: 'fixture'; datasetVersion: string; contextVersion: string; poolSeed: string;
  context: {
    anchorId: string; coverageId: string; radiusM: number; desiredAt: string;
    mealSlot: MealSlot; serviceMode: ServiceMode; timeHint: 'now' | 'scheduled' | 'late_night';
    budget: { min: number; max: number; unit: 'person'; currency: 'VND' } | null;
  };
  preferenceCategoryIds: string[][];
  expectedPool: { dishId: string; variantId: string; offeringIds: string[] }[];
  expectedReason: string; notes: string;
}
