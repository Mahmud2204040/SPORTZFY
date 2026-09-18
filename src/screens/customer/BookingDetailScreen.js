import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { bookingsApi } from '../../api/bookings';
import { useBooking } from '../../context/BookingContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

const dhakaDateTime = value => new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function BookingDetailScreen({ route }) {
  const id = route.params?.bookingId;
  const { fetchBookings } = useBooking();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setBooking(await bookingsApi.getBooking(id)); }
    catch (err) { setError(err?.message || 'Could not load booking details.'); }
    finally { setLoading(false); }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function cancel() {
    if (!booking || busy) return;
    if (reason.trim().length < 3) { setError('Enter a reason for cancellation.'); return; }
    Alert.alert('Cancel booking?', 'This slot will become available again. Demo payment: no money was charged.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: async () => {
        setBusy(true); setError('');
        try { setBooking(await bookingsApi.cancelBooking(id, reason.trim())); await fetchBookings(); }
        catch (err) { setError(err?.message || 'Cancellation failed. Refresh and try again.'); await load(); }
        finally { setBusy(false); }
      } },
    ]);
  }

  const canCancel = booking?.status === 'CONFIRMED' && new Date(booking.startTime) > new Date();
  return <SafeAreaView style={styles.safe} edges={['bottom']}><ScrollView contentContainerStyle={styles.content}>
    {loading ? <ActivityIndicator color={COLORS.primaryDark} /> : error && !booking ? <View><Text style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={load} style={styles.button}><Text style={styles.buttonText}>Retry</Text></Pressable></View> : booking ? <>
      {booking.turf?.coverImage ? <Image source={{ uri: booking.turf.coverImage }} style={styles.cover} /> : null}
      <Text style={styles.title}>{booking.turf?.name || 'Venue'}</Text>
      <Text style={styles.sub}>{[booking.turf?.area, booking.turf?.city].filter(Boolean).join(', ')}</Text>
      <View style={styles.card}><Text style={styles.label}>Booking status</Text><Text style={styles.value}>{booking.status}</Text><Text style={styles.label}>Reference (long press to copy)</Text><Text selectable style={styles.reference}>{booking.referenceCode}</Text><Text style={styles.label}>Start · Asia/Dhaka</Text><Text style={styles.value}>{dhakaDateTime(booking.startTime)}</Text><Text style={styles.label}>End · Asia/Dhaka</Text><Text style={styles.value}>{dhakaDateTime(booking.endTime)}</Text><Text style={styles.label}>Demo booking value</Text><Text style={styles.value}>৳{booking.totalAmount}</Text><Text style={styles.sub}>Demo payment — no money charged.</Text></View>
      {booking.cancellation ? <View style={styles.card}><Text style={styles.label}>Cancellation reason</Text><Text style={styles.value}>{booking.cancellation.reason}</Text></View> : null}
      {canCancel ? <View style={styles.card}><Text style={styles.label}>Cancel before the booking starts</Text><TextInput accessibilityLabel="Cancellation reason" placeholder="Reason for cancellation" value={reason} onChangeText={setReason} multiline style={styles.input}/><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={cancel} style={styles.cancelButton}><Text style={styles.buttonText}>{busy ? 'Cancelling…' : 'Cancel booking'}</Text></Pressable></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    </> : null}
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md }, cover: { width: '100%', height: 190, borderRadius: RADIUS.lg }, title: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold }, sub: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm }, card: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.sm, borderWidth: 1, borderColor: COLORS.border }, label: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm }, value: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold }, reference: { color: COLORS.primaryDark, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold }, input: { minHeight: 72, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, padding: SPACING.md, textAlignVertical: 'top', color: COLORS.textPrimary }, button: { minHeight: 48, backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center', marginTop: SPACING.md }, cancelButton: { minHeight: 48, backgroundColor: COLORS.danger, borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center' }, buttonText: { color: '#fff', fontWeight: FONT_WEIGHT.bold }, error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
});
