import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Header from '../../components/Header';
import OwnerBookingCard from '../../components/OwnerBookingCard';
import { ownerApi } from '../../api/owner';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

const TABS = [{ id: 'upcoming', title: 'Upcoming' }, { id: 'completed', title: 'Completed' }, { id: 'cancelled', title: 'Cancelled' }];
function initials(name) { return String(name || 'Customer').split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase(); }
function dhakaDate(value) { return new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }); }
function dhakaTime(value) { return new Date(value).toLocaleTimeString('en-US', { timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit' }); }
function category(booking) { if (booking.status === 'CANCELLED') return 'cancelled'; if (booking.status === 'COMPLETED' || new Date(booking.endTime) < new Date()) return 'completed'; return 'upcoming'; }

export default function OwnerBookingsScreen() {
  const [tab, setTab] = useState('upcoming');
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [bookingsResult, statsResult] = await Promise.allSettled([ownerApi.getBookings(), ownerApi.getStats()]);
    if (bookingsResult.status === 'fulfilled') { setItems(bookingsResult.value.items); setNextCursor(bookingsResult.value.nextCursor); }
    else { setItems([]); setNextCursor(null); setError(bookingsResult.reason?.message || 'Could not load bookings.'); }
    setStats(statsResult.status === 'fulfilled' ? statsResult.value.stats : null);
    setLoading(false);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try { const page = await ownerApi.getBookings(nextCursor); setItems(current => [...current, ...page.items]); setNextCursor(page.nextCursor); }
    catch (e) { setError(e?.message || 'Could not load more bookings.'); }
    finally { setLoadingMore(false); }
  }

  const visible = useMemo(() => items.filter(item => category(item) === tab).map(item => ({
    id: item.id, customerName: item.user?.name || 'Customer', customerInitials: initials(item.user?.name),
    turfName: item.turf?.name || 'Venue', date: dhakaDate(item.startTime), time: `${dhakaTime(item.startTime)} – ${dhakaTime(item.endTime)}`,
    price: Number(item.totalAmount || 0).toLocaleString('en-BD'), paymentMethod: `Demo · ${item.paymentMethod || 'Payment'}`, status: category(item),
  })), [items, tab]);

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header section="Venue partner" title="Bookings & earnings" subtitle="Reservations recorded for your venues" />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={load} colors={[COLORS.primaryDark]} />}>
      {stats ? <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricLabel}>Recorded bookings</Text><Text style={styles.metricValue}>{stats.totalBookings || 0}</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Demo booking value</Text><Text style={styles.metricValue}>৳ {Number(stats.totalRevenue || 0).toLocaleString('en-BD')}</Text></View>
      </View> : null}
      <Text style={styles.sectionTitle}>Reservations</Text>
      <View style={styles.tabs}>{TABS.map(option => <Pressable key={option.id} accessibilityRole="button" accessibilityState={{ selected: tab === option.id }} onPress={() => setTab(option.id)} style={[styles.tab, tab === option.id && styles.tabSelected]}><Text style={[styles.tabText, tab === option.id && styles.tabTextSelected]}>{option.title}</Text></Pressable>)}</View>
      {loading && items.length === 0 ? <View style={styles.state}><ActivityIndicator color={COLORS.primaryDark}/><Text style={styles.stateText}>Loading bookings…</Text></View> : error && items.length === 0 ? <View style={styles.state}><Text style={styles.stateText}>{error}</Text><Pressable onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : visible.length === 0 ? <View style={styles.state}><Text style={styles.stateText}>No {tab} bookings in the loaded records.</Text></View> : visible.map(booking => <OwnerBookingCard key={booking.id} booking={booking} />)}
      {error && items.length > 0 ? <Text style={styles.error}>{error}</Text> : null}
      {nextCursor ? <Pressable accessibilityRole="button" accessibilityState={{ busy: loadingMore }} disabled={loadingMore} onPress={loadMore} style={styles.more}><Text style={styles.moreText}>{loadingMore ? 'Loading…' : 'Load more bookings'}</Text></Pressable> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  metrics: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.xl }, metric: { flex: 1, minHeight: 104, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, justifyContent: 'space-between' }, metricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs }, metricValue: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.md }, tabs: { flexDirection: 'row', gap: SPACING.xs, marginBottom: SPACING.md }, tab: { flex: 1, minHeight: 44, borderRadius: RADIUS.md, backgroundColor: COLORS.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }, tabSelected: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark }, tabText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold }, tabTextSelected: { color: '#fff' },
  state: { minHeight: 125, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.sm }, stateText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' }, retry: { minHeight: 44, backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, justifyContent: 'center' }, retryText: { color: '#fff', fontWeight: FONT_WEIGHT.semibold }, more: { minHeight: 48, marginTop: SPACING.md, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' }, moreText: { color: COLORS.primaryDark, fontWeight: FONT_WEIGHT.semibold }, error: { color: COLORS.danger, fontSize: FONT_SIZE.sm, marginTop: SPACING.md },
});
