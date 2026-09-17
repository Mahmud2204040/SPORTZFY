import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Rating from '../../components/Rating';
import SlotButton from '../../components/SlotButton';
import PrimaryButton from '../../components/PrimaryButton';
import { turfsApi } from '../../api/turfs';
import { useAuth } from '../../context/AuthContext';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import {
  getUpcomingDates,
  formatShortDate,
  formatLongDate,
  formatDateISO,
} from '../../utils/dateUtils';

export default function TurfDetailsScreen({ route, navigation }) {
  const { turfId } = route.params || {};
  const { user } = useAuth();

  const [turf, setTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dates = useMemo(() => getUpcomingDates(7), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Fetch turf details
  const fetchTurf = useCallback(async () => {
    if (!turfId) return;
    try {
      const res = await turfsApi.getTurfById(turfId);
      if (res) setTurf(res);
    } catch (err) {
      console.log('Error fetching turf detail:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [turfId]);

  // Fetch slot availability for the selected date
  const fetchSlots = useCallback(async () => {
    if (!turfId) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const dateStr = formatDateISO(dates[selectedDateIndex]);
      const res = await turfsApi.getAvailability(turfId, dateStr);
      if (res?.slots) {
        setSlots(res.slots);
      } else {
        setSlots([]);
      }
    } catch (err) {
      console.log('Error fetching availability:', err?.message);
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [turfId, selectedDateIndex, dates]);

  useEffect(() => {
    fetchTurf();
  }, [fetchTurf]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const onRefresh = () => {
    setRefreshing(true);
    setSelectedSlot(null);
    fetchTurf();
    fetchSlots();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading turf details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!turf) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>Turf not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedDate = dates[selectedDateIndex];
  const imageUri = turf.coverImage || (turf.images?.[0]?.url) || 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&q=80';
  const locationText = turf.area ? `${turf.area}, ${turf.city || 'Chattogram'}` : (turf.address || 'Chattogram');
  const formatTag = Array.isArray(turf.pitchFormats) ? turf.pitchFormats[0] : (turf.pitchFormats || 'Football');
  const amenities = Array.isArray(turf.amenities) ? turf.amenities : [];

  // Slot summary stats
  const availableCount = slots.filter((s) => s.status === 'AVAILABLE').length;
  const totalSlots = slots.length;

  function handleBookNow() {
    if (!selectedSlot) return;
    if (!user) { navigation.navigate('SignIn', { redirect: 'Booking', turfId, slot: selectedSlot }); return; }
    navigation.navigate('Booking', {
      turfId: turf.id,
      turf,
      date: formatLongDate(selectedDate),
      dateISO: formatDateISO(selectedDate),
      slot: selectedSlot,
    });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Hero image */}
        <Image source={{ uri: imageUri }} style={styles.hero} />

        {/* Top section */}
        <View style={styles.section}>
          <Text style={styles.name}>{turf.name}</Text>

          <View style={styles.metaRow}>
            <Rating rating={turf.rating || 0} reviewCount={turf.totalReviews || turf.reviewCount || 0} />
            <Text style={styles.price}>৳{turf.basePricePerHour}<Text style={styles.priceUnit}>/hr</Text></Text>
          </View>

          <View style={styles.locationRow}>
            <Ionicons name="location-sharp" size={16} color={COLORS.textSecondary} />
            <Text style={styles.locationText}>{locationText}</Text>
          </View>

          <View style={styles.sportTag}>
            <Text style={styles.sportText}>{formatTag}</Text>
          </View>
        </View>

        {/* Facilities */}
        {amenities.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Facilities</Text>
            <View style={styles.facilitiesRow}>
              {amenities.map((f) => (
                <View key={f} style={styles.facilityChip}>
                  <Text style={styles.facilityText}>{f}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Pricing Info Card (live ML details for selected slot) */}
        <View style={styles.pricingInfoCard}>
          {selectedSlot ? (
            <>
              <View style={styles.pricingInfoRow}>
                <Ionicons name="analytics" size={16} color={COLORS.primary} />
                <Text style={styles.pricingInfoText} numberOfLines={1}>
                  {selectedSlot.badgeText || 'AI Price Guide'}
                </Text>
              </View>

              <View style={styles.pricingInfoRow}>
                <Ionicons name="pricetag-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.pricingInfoText} numberOfLines={2}>
                  {selectedSlot.pricingExplanation || `Multiplier: ${selectedSlot.multiplier || 1}x`}
                </Text>
              </View>

              {selectedSlot.basePrice != null && selectedSlot.price != null && (
                <View style={styles.pricingInfoRow}>
                  <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.pricingInfoText}>
                    Base ৳{selectedSlot.basePrice} → Live ৳{selectedSlot.price}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.pricingInfoRow}>
                <Ionicons name="analytics" size={16} color={COLORS.primary} />
                <Text style={styles.pricingInfoText}>Select a slot to see the AI Price Guide for this venue.</Text>
              </View>
            </>
          )}
        </View>

        {/* Date selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dateRow}
          >
            {dates.map((d, idx) => {
              const isSelected = idx === selectedDateIndex;
              return (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  onPress={() => setSelectedDateIndex(idx)}
                  style={[styles.dateChip, isSelected && styles.dateChipSelected]}
                >
                  <Text
                    style={[styles.dateWeekday, isSelected && styles.dateChipTextSelected]}
                  >
                    {idx === 0 ? 'Today' : idx === 1 ? 'Tomorrow' : `Day ${idx + 1}`}
                  </Text>
                  <Text
                    style={[styles.dateNumber, isSelected && styles.dateChipTextSelected]}
                  >
                    {formatShortDate(d)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Available time slots with ML pricing */}
        <View style={styles.section}>
          <View style={styles.slotHeaderRow}>
            <Text style={styles.sectionTitle}>Available Time Slots</Text>
            {!slotsLoading && totalSlots > 0 && (
              <View style={styles.slotCountBadge}>
                <Text style={styles.slotCountText}>
                  {availableCount}/{totalSlots} open
                </Text>
              </View>
            )}
          </View>

          {slotsLoading ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.slotsLoadingText}>Fetching live prices...</Text>
            </View>
          ) : slots.length === 0 ? (
            <View style={styles.slotsEmpty}>
              <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.slotsEmptyText}>No slots available for this date.</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {slots.map((slot) => (
                <SlotButton
                  key={slot.slotId}
                  slot={slot}
                  isSelected={selectedSlot && selectedSlot.slotId === slot.slotId}
                  onPress={setSelectedSlot}
                  style={styles.slotItem}
                />
              ))}
            </View>
          )}
        </View>

        {/* Reviews preview */}
        {turf.reviews && turf.reviews.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Reviews</Text>
            {turf.reviews.slice(0, 3).map((review) => (
              <View key={review.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
                  <Text style={styles.reviewRating}>⭐ {review.rating}</Text>
                </View>
                <Text style={styles.reviewComment} numberOfLines={2}>{review.comment}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomInfo}>
          {selectedSlot && (
            <>
              <Text style={styles.bottomPrice}>৳{selectedSlot.price}</Text>
              <Text style={styles.bottomSlotLabel}>{selectedSlot.timeLabel}</Text>
            </>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            title={
              selectedSlot
                ? 'Book Now'
                : slotsLoading
                ? 'Loading...'
                : 'Select a slot to continue'
            }
            disabled={!selectedSlot || slotsLoading}
            onPress={handleBookNow}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  hero: {
    width: '100%',
    height: 240,
    backgroundColor: COLORS.divider,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    marginTop: SPACING.sm,
  },
  name: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  price: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  priceUnit: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textMuted,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  locationText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginLeft: SPACING.xs,
  },
  sportTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.pill,
  },
  sportText: {
    color: '#166534',
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
  },

  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  // ML Pricing info card
  pricingInfoCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: '#F0F9FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  pricingInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.xs,
    gap: SPACING.sm,
  },
  pricingInfoText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    flex: 1,
  },

  facilitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  facilityChip: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    marginRight: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  facilityText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    fontWeight: FONT_WEIGHT.medium,
  },

  dateRow: {
    paddingVertical: SPACING.xs,
  },
  dateChip: {
    width: 80,
    height: 70,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  dateChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dateWeekday: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
    marginBottom: 4,
  },
  dateNumber: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  dateChipTextSelected: {
    color: COLORS.textOnPrimary,
  },

  // Slots
  slotHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotCountBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  slotCountText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#166534',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotItem: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  slotsLoadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  slotsEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  slotsEmptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  // Reviews
  reviewCard: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  reviewerName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  reviewRating: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  reviewComment: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  bottomInfo: {
    minWidth: 80,
  },
  bottomPrice: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  bottomSlotLabel: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
});
