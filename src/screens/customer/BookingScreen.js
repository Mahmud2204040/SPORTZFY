import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '../../components/PrimaryButton';
import PaymentMethodSelector from '../../components/PaymentMethodSelector';
import SuccessModal from '../../components/SuccessModal';
import { holdsApi } from '../../api/holds';
import { bookingsApi } from '../../api/bookings';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';
import { formatCountdown } from '../../utils/dateUtils';

export default function BookingScreen({ route, navigation }) {
  const { turfId, turf, date, slot } = route.params || {};

  // Hold state
  const [holdId, setHoldId] = useState(null);
  const [holdPrice, setHoldPrice] = useState(null);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [holdLoading, setHoldLoading] = useState(true);
  const [holdError, setHoldError] = useState('');

  // Payment state
  const [method, setMethod] = useState('bKash');
  const [processing, setProcessing] = useState(false);

  // Countdown
  const [remaining, setRemaining] = useState(0);
  const timerRef = useRef(null);
  const serverOffset = useRef(0);
  const [checkoutState, setCheckoutState] = useState('reserving');

  // Success modal
  const [success, setSuccess] = useState(false);
  const [bookingRef, setBookingRef] = useState(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState(null);
  const [quoteChanged, setQuoteChanged] = useState(false);
  const [quoteAccepted, setQuoteAccepted] = useState(false);

  // Acquire hold on mount
  const acquireHold = useCallback(async () => {
    if (!turfId || !slot) return;
    setHoldLoading(true);
    setCheckoutState('reserving');
    setHoldError('');
    try {
      const res = await holdsApi.createHold({
        turfId,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
      if (res) {
        setHoldId(res.id);
        serverOffset.current = res.serverTime ? new Date(res.serverTime).getTime() - Date.now() : 0;
        setHoldPrice(res.price);
        setHoldExpiresAt(new Date(res.expiresAt).getTime());
        setQuoteChanged(Number.isFinite(slot.price) && Number(slot.price) !== Number(res.price));
        setQuoteAccepted(false);
        setCheckoutState('reserved');
      }
    } catch (err) {
      console.log('Hold error:', err);
      const msg = err?.message || 'Could not reserve the slot. It may be taken.';
      setHoldError(msg);
      setCheckoutState('error');
      Alert.alert('Slot Unavailable', msg, [
        { text: 'Go Back', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setHoldLoading(false);
    }
  }, [turfId, slot, navigation]);

  useEffect(() => {
    acquireHold();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [acquireHold]);

  // Countdown timer tick
  useEffect(() => {
    if (!holdExpiresAt || success) return;

    function tick() {
      const diff = holdExpiresAt - (Date.now() + serverOffset.current);
      setRemaining(diff);
      if (diff <= 0) {
        setCheckoutState('expired');
        clearInterval(timerRef.current);
        Alert.alert(
          'Hold Expired',
          'Your 5-minute hold has expired. Please go back and select the slot again.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    }

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [holdExpiresAt, navigation, success]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && holdExpiresAt && !success) {
        const diff = holdExpiresAt - (Date.now() + serverOffset.current);
        setRemaining(diff);
        if (diff <= 0) setCheckoutState('expired');
      }
    });
    return () => subscription.remove();
  }, [holdExpiresAt, success]);

  // Guard for missing params
  if (!turf || !date || !slot) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Missing booking information.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = turf.coverImage || (turf.images?.[0]?.url);
  const locationText = [turf.area, turf.city].filter(Boolean).join(', ') || turf.address || 'Location unavailable';
  const timeLabel = slot.timeLabel || `${slot.startTime} – ${slot.endTime}`;
  const price = holdPrice ?? slot.price ?? turf.basePricePerHour ?? 0;
  const isUrgent = remaining > 0 && remaining < 60000; // < 1 min
  const progress = holdExpiresAt ? Math.max(0, remaining / 300000) : 0; // 300s = 5 min

  async function handleConfirm() {
    if (!holdId) return;
    if (processing || checkoutState === 'expired' || checkoutState === 'confirmed') return;
    if (quoteChanged && !quoteAccepted) {
      Alert.alert('Price changed', `The latest slot quote is ৳${holdPrice}, compared with ৳${slot.price} shown earlier.`, [
        { text: 'Go back', style: 'cancel' },
        { text: 'Accept new quote', onPress: () => setQuoteAccepted(true) },
      ]);
      return;
    }
    setProcessing(true);
    setCheckoutState('confirming');
    try {
      const res = await bookingsApi.confirmBooking({
        holdId,
        paymentMethod: method,
      });
      if (res) {
        setBookingRef(res.referenceCode);
        setConfirmedBookingId(res.id);
        setSuccess(true);
        setCheckoutState('confirmed');
      }
    } catch (err) {
      console.log('Booking error:', err);
      try {
        const state = await holdsApi.getHold(holdId);
        if (state.status === 'CONSUMED' && state.booking?.id) {
          const confirmed = await bookingsApi.getBooking(state.booking.id);
          setBookingRef(confirmed.referenceCode);
          setConfirmedBookingId(confirmed.id);
          setSuccess(true);
          setCheckoutState('confirmed');
          return;
        }
      } catch { /* Keep the user on checkout for a safe manual retry. */ }
      setCheckoutState('error');
      Alert.alert('Confirmation unclear', err?.message || 'Could not confirm this demo booking. Check the hold and retry.');
    } finally {
      setProcessing(false);
    }
  }

  function handleViewBookings() {
    setSuccess(false);
    navigation.navigate('BookingDetail', { bookingId: confirmedBookingId });
  }

  function handleDone() {
    setSuccess(false);
    navigation.navigate('MainTabs', { screen: 'Home' });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 5-Minute Countdown Timer */}
        <View style={[styles.timerCard, isUrgent && styles.timerCardUrgent]}>
          <View style={styles.timerRow}>
            <Ionicons
              name="time-outline"
              size={22}
              color={isUrgent ? '#DC2626' : COLORS.primary}
            />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={[styles.timerTitle, isUrgent && { color: '#DC2626' }]}>
                {holdLoading ? 'Acquiring hold...' : isUrgent ? '⚠️ Expiring soon!' : 'Slot Reserved'}
              </Text>
              <Text style={styles.timerSub}>
                {holdLoading
                  ? 'Locking your slot...'
                  : `${formatCountdown(remaining)} remaining to complete payment`}
              </Text>
            </View>
            <Text style={[styles.timerCountdown, isUrgent && { color: '#DC2626' }]}>
              {holdLoading ? '--:--' : formatCountdown(remaining)}
            </Text>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: isUrgent ? '#DC2626' : COLORS.primary,
                },
              ]}
            />
          </View>
        </View>

        {/* Booking summary card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Booking Summary</Text>

          <View style={styles.turfRow}>
            {imageUri ? <Image source={{ uri: imageUri }} style={styles.thumb} /> : <View style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.turfName} numberOfLines={1}>{turf.name}</Text>
              <Text style={styles.turfLocation} numberOfLines={1}>📍 {locationText}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <Row icon="calendar-outline" label="Date" value={date} />
          <Row icon="time-outline" label="Time" value={timeLabel} />
          <Row icon="hourglass-outline" label="Duration" value="1 hour" />
          {slot.multiplier && slot.multiplier !== 1 && (
            <Row
              icon="analytics-outline"
              label="ML Multiplier"
              value={`${slot.multiplier}x ${slot.badgeText ? `(${slot.badgeText})` : ''}`}
            />
          )}
        </View>

        {/* Price breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Price Details</Text>
          {quoteChanged ? <Text accessibilityRole="alert" style={styles.demoLabel}>The held quote changed from ৳{slot.price} to ৳{holdPrice}. Confirm the new quote before booking.</Text> : null}
          <Row icon="pricetag-outline" label="Slot Price" value={`৳${price}`} />
          {slot.basePrice && slot.basePrice !== price && (
            <Row icon="information-circle-outline" label="Base Price" value={`৳${slot.basePrice}`} />
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>৳{price}</Text>
          </View>
        </View>

        {/* Payment methods */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment Method</Text>
          <Text style={styles.demoLabel}>Demo payment — no money charged</Text>
          <PaymentMethodSelector selected={method} onSelect={setMethod} />
        </View>

        {holdError ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
            <Text style={styles.errorCardText}>{holdError}</Text>
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceWrap}>
          <Text style={styles.bottomTotal}>৳{price}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            title={
              holdLoading
                ? 'Reserving...'
                : processing
                ? 'Processing...'
                : `Confirm demo booking · ৳${price}`
            }
            loading={holdLoading || processing}
            disabled={!!holdError || holdLoading || processing || remaining <= 0 || checkoutState === 'confirmed'}
            onPress={handleConfirm}
          />
        </View>
      </View>

      <SuccessModal
        visible={success}
        bookingId={bookingRef}
        turfName={turf.name}
        date={date}
        time={timeLabel}
        price={price}
        onViewBooking={handleViewBookings}
        onDone={handleDone}
      />
    </SafeAreaView>
  );
}

function Row({ icon, label, value }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.lg,
  },

  // Timer
  timerCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  timerCardUrgent: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timerTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  timerSub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  timerCountdown: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginTop: SPACING.sm,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },

  // Cards
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  demoLabel: { color: '#166534', fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm },

  turfRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    marginRight: SPACING.md,
    backgroundColor: COLORS.divider,
  },
  turfName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  turfLocation: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  rowValue: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semibold,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SPACING.xs,
  },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.sm,
  },
  totalLabel: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: SPACING.sm,
  },
  errorCardText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    color: '#B91C1C',
  },

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
  bottomPriceWrap: {
    minWidth: 70,
  },
  bottomTotal: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
  },
});
