export type Page<T> = { items: T[]; nextCursor: string | null };
export type SlotStatus = 'AVAILABLE' | 'HELD' | 'BOOKED' | 'BLOCKED' | 'UNAVAILABLE';
export interface PricingMetadata {
  source: 'random-forest' | 'heuristic'; explanationSource: 'template';
  quoteTime: string; window: { startTime: string; endTime: string };
  factors: string[]; sampleData: boolean; explanation: string;
}
export interface Slot {
  slotId: string; startTime: string; endTime: string; timeLabel: string;
  status: SlotStatus; price: number; basePrice: number; multiplier: number;
  badgeText?: string; pricingExplanation?: string; pricingMetadata?: PricingMetadata;
  holdExpiresAt?: string | null; blockedIntervalId?: string;
}
export interface Turf {
  id: string; name: string; slug?: string; city: string; area: string; address: string;
  description: string; coverImage: string; pitchFormats: string; basePricePerHour: number;
  rating: number; reviewCount: number; status?: string; ownerId?: string;
  hasFloodlights: boolean; hasParking: boolean; hasWashroom: boolean; hasChangingRoom: boolean; hasWater: boolean;
  images?: {id?: string; url: string}[];
  reviews?: {id: string; rating: number; comment: string; user?: {name: string}}[];
  availabilitySummary?: { date: string; availableCount: number; startingPrice: number | null; nextStartTime: string | null };
}
export interface Booking {
  id: string; referenceCode: string; turfId: string; holdId?: string;
  startTime: string; endTime: string; totalAmount: number; status: string;
  paymentMethod: string; paymentMode: 'DEMO'; turf: Partial<Turf>;
  user?: {name: string};
}
export interface Hold {
  id: string; turfId: string; startTime: string; endTime: string; price: number;
  expiresAt: string; serverTime: string; status: 'ACTIVE' | 'CONSUMED' | 'EXPIRED' | 'RELEASED';
  paymentMode: 'DEMO'; bookingId?: string | null; turf: Partial<Turf>;
}
export interface JoinRequest {
  id: string; userId: string; status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  preferredRole?: string; user?: { name: string };
}
export interface Match {
  id: string; title: string; description: string; hostUserId: string; matchTime: string;
  area: string; sportFormat: string; totalSpots: number; openSpots: number;
  costPerPlayer: number; requiredRole: string; status: string; turf?: Partial<Turf>;
  hostUser?: {name: string}; joinRequests?: JoinRequest[];
}
export interface AIInsight {
  id: string; turfId: string; turfName: string; targetWindow: string; startTime: string;
  currentRate: number; suggestedRate: number; demandScore: number;
  recommendation: string; historicalBookings: number; dataBasis: string;
  pricingMetadata: PricingMetadata;
}
export interface DiscoveryFilters {
  q?: string; city?: string; area?: string; date?: string; fromHour?: string; toHour?: string;
  format?: string; minPrice?: string; maxPrice?: string; hasFloodlights?: boolean;
  hasParking?: boolean; availableOnly?: boolean; cursor?: string; limit?: number;
}
export interface OwnerStats {
  stats: {totalVenues: number; totalBookings: number; totalRevenue: number; occupancyRate: number | null};
  ownedTurfs: Turf[]; upcomingBookings: Booking[]; aiPricingInsights: AIInsight[];
  dataBasis: string; paymentMode: 'DEMO';
}
export type ScreenProps = { navigation: import('@react-navigation/native').NavigationProp<any>; route: {key?: string; params?: any} };
