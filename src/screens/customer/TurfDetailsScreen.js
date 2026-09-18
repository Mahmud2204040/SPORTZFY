import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  AppState,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
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
  const { user, setPendingDestination } = useAuth();

  const [turf, setTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [slotsError, setSlotsError] = useState('');
  const [priceSheet, setPriceSheet] = useState(false);
  const slotRequest = useRef(0);

  const dates = useMemo(() => getUpcomingDates(14), []);
  const [selectedDateIndex, setSelectedDateIndex] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Fetch turf details
  const fetchTurf = useCallback(async () => {
    if (!turfId) return;
    setDetailError('');
    try {
      const res = await turfsApi.getTurfById(turfId);
      if (res) setTurf(res);
    } catch (err) {
      setDetailError(err?.message || 'Could not load venue details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [turfId]);

  // Fetch slot availability for the selected date
  const fetchSlots = useCallback(async () => {
    if (!turfId) return;
    const request = ++slotRequest.current;
    if (slots.length === 0) setSlotsLoading(true);
    setSlotsError('');
    try {
      const dateStr = formatDateISO(dates[selectedDateIndex]);
      const res = await turfsApi.getAvailability(turfId, dateStr);
      if (request !== slotRequest.current) return;
      if (res?.slots) {
        setSlots(res.slots);
        setSelectedSlot(current => current ? res.slots.find(slot => slot.slotId === current.slotId && slot.status === 'AVAILABLE') || null : null);
      } else {
        setSlots([]);
      }
    } catch (err) {
      if (request !== slotRequest.current) return;
      setSlotsError(err?.message || 'Could not load live availability.');
    } finally {
      if (request === slotRequest.current) setSlotsLoading(false);
    }
  }, [turfId, selectedDateIndex, dates]);

  useEffect(() => { setSelectedSlot(null); setSlots([]); }, [selectedDateIndex]);
  useFocusEffect(useCallback(() => { fetchTurf(); }, [fetchTurf]));
  useFocusEffect(useCallback(() => {
    fetchSlots();
    const timer = setInterval(() => { if (AppState.currentState === 'active') fetchSlots(); }, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') fetchSlots(); });
    return () => { clearInterval(timer); subscription.remove(); slotRequest.current += 1; };
  }, [fetchSlots]));

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
          {detailError ? <Text style={styles.errorText}>{detailError}</Text> : null}
          <TouchableOpacity accessibilityRole="button" onPress={fetchTurf}><Text style={styles.errorText}>Retry</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const selectedDate = dates[selectedDateIndex];
  const imageUri = turf.coverImage || (turf.images?.[0]?.url);
  const locationText = [turf.area, turf.city].filter(Boolean).join(', ') || turf.address || 'Location unavailable';
  const formatTag = turf.pitchFormats || 'Format unavailable';
  const amenities = [['Floodlights', turf.hasFloodlights], ['Parking', turf.hasParking], ['Washroom', turf.hasWashroom], ['Changing room', turf.hasChangingRoom], ['Water', turf.hasWater]].filter(([, present]) => present).map(([name]) => name);

  // Slot summary stats
  const availableCount = slots.filter((s) => s.status === 'AVAILABLE').length;
  const totalSlots = slots.length;
  const cheaperSlots = selectedSlot ? slots.filter(slot => slot.status === 'AVAILABLE' && slot.price < selectedSlot.price).sort((a, b) => a.price - b.price || a.startTime.localeCompare(b.startTime)).slice(0, 3) : [];

  function handleBookNow() {
    if (!selectedSlot) return;
    const destination = {
      turfId: turf.id,
      turf,
      date: formatLongDate(selectedDate),
      dateISO: formatDateISO(selectedDate),
      slot: selectedSlot,
    };
    if (!user) { setPendingDestination({ name: 'Booking', params: destination }); navigation.navigate('SignIn'); return; }
    navigation.navigate('Booking', destination);
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
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.hero} /> : <View style={styles.hero} />}

        {/* Top section */}
        <View style={styles.section}>
          <Text style={styles.name}>{turf.name}</Text>

          <View style={styles.metaRow}>
            {Number.isFinite(turf.rating) ? <Rating rating={turf.rating} reviewCount={turf.totalReviews || turf.reviewCount || 0} /> : null}
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

        {turf.images?.length > 0 ? <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue gallery</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
            {turf.images.map((photo, index) => <Image key={photo.id || photo.url} accessibilityLabel={photo.caption || `Venue photo ${index + 1}`} source={{ uri: photo.url }} style={styles.galleryImage}/>)}
          </ScrollView>
        </View> : null}

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

              {selectedSlot.basePrice !== null && selectedSlot.basePrice !== undefined && selectedSlot.price !== null && selectedSlot.price !== undefined && (
                <View style={styles.pricingInfoRow}>
                  <Ionicons name="wallet-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.pricingInfoText}>
                    Base ৳{selectedSlot.basePrice} → Live ৳{selectedSlot.price}
                  </Text>
                </View>
              )}
              <TouchableOpacity accessibilityRole="button" onPress={() => setPriceSheet(true)}><Text style={styles.pricingInfoText}>Why this price? View AI pricing details</Text></TouchableOpacity>
              {cheaperSlots.length ? <View><Text style={styles.pricingInfoText}>Cheaper slots at this venue</Text>{cheaperSlots.map(slot => <TouchableOpacity key={slot.slotId} accessibilityRole="button" onPress={() => setSelectedSlot(slot)}><Text style={styles.pricingInfoText}>{slot.timeLabel} · ৳{slot.price}</Text></TouchableOpacity>)}</View> : null}
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
          ) : slotsError ? <View style={styles.slotsEmpty}><Text accessibilityRole="alert" style={styles.slotsEmptyText}>{slotsError}</Text><TouchableOpacity accessibilityRole="button" onPress={fetchSlots}><Text style={styles.slotsEmptyText}>Retry availability</Text></TouchableOpacity></View> : slots.length === 0 ? (
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
                ? 'Reserve slot'
                : slotsLoading
                ? 'Loading...'
                : 'Select a slot to continue'
            }
            disabled={!selectedSlot || slotsLoading || !!slotsError}
            onPress={handleBookNow}
          />
        </View>
      </View>
      <Modal visible={priceSheet} animationType="slide" onRequestClose={() => setPriceSheet(false)}><SafeAreaView style={styles.safe} edges={['top', 'bottom']}><ScrollView contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.md }}><TouchableOpacity accessibilityRole="button" onPress={() => setPriceSheet(false)}><Text style={styles.sectionTitle}>Close</Text></TouchableOpacity><Text style={styles.sectionTitle}>AI Price Guide</Text>{selectedSlot ? <><Text style={styles.pricingInfoText}>Selected: {selectedSlot.timeLabel}</Text><Text style={styles.pricingInfoText}>Base: ৳{selectedSlot.basePrice}</Text><Text style={styles.pricingInfoText}>Adjustment: ৳{selectedSlot.price - selectedSlot.basePrice}</Text><Text style={styles.pricingInfoText}>Total quote: ৳{selectedSlot.price}</Text><Text style={styles.pricingInfoText}>{selectedSlot.pricingExplanation}</Text><Text style={styles.pricingInfoText}>Model source: {selectedSlot.modelSource || 'Local pricing model'}</Text><Text style={styles.pricingInfoText}>{selectedSlot.sampleData ? 'Not enough booking history; model uses fallback inputs.' : 'Based on recorded booking activity.'}</Text></> : null}</ScrollView></SafeAreaView></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  galleryImage: { width: 220, height: 145, borderRadius: RADIUS.lg, backgroundColor: COLORS.border },
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
