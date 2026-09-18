export type PricingFacts = {
  basePrice: number;
  quotedPrice: number;
  hourDhaka: number;
  recentConfirmedBookings: number;
  sampleData: boolean;
};

export interface PricingExplanationProvider {
  explain(facts: PricingFacts): string;
}

// This interface can later be backed by an external text provider. The
// provider receives server-selected facts and cannot change a quote.
export const templatePricingExplanation: PricingExplanationProvider = {
  explain(facts) {
    const adjustment = facts.quotedPrice - facts.basePrice;
    const direction = adjustment > 0 ? `an adjustment of +৳${adjustment}` : adjustment < 0 ? `a discount of ৳${Math.abs(adjustment)}` : "no adjustment";
    const basis = facts.sampleData ? "There is not enough booking history, so the local model uses fallback demand inputs." : `The local model uses ${facts.recentConfirmedBookings} confirmed bookings from the last 28 days.`;
    return `Base ৳${facts.basePrice}, ${direction}, total ৳${facts.quotedPrice}. Slot hour: ${facts.hourDhaka}:00 Asia/Dhaka. ${basis}`;
  },
};
