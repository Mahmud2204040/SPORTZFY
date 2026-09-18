import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../api/admin';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

function dhaka(value) {
  return new Date(value).toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function AdminOversightScreen({ navigation, route }) {
  const [section, setSection] = useState(route.params?.section === 'bookings' ? 'bookings' : 'users');
  const [items, setItems] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const result = section === 'users' ? await adminApi.getUsers() : await adminApi.getBookings();
      setItems(result.items); setNextCursor(result.nextCursor);
    } catch (cause) {
      setItems([]); setNextCursor(null); setError(cause?.message || 'Could not load platform records.');
    } finally { setLoading(false); }
  }, [section]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true); setError('');
    try {
      const result = section === 'users' ? await adminApi.getUsers(nextCursor) : await adminApi.getBookings(nextCursor);
      setItems(current => [...current, ...result.items]); setNextCursor(result.nextCursor);
    } catch (cause) { setError(cause?.message || 'Could not load more records.'); }
    finally { setLoadingMore(false); }
  }

  return <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
    <View style={styles.header}><Pressable accessibilityRole="button" accessibilityLabel="Back to review queue" onPress={navigation.goBack} style={styles.back}><Ionicons name="arrow-back" size={24} color={COLORS.textPrimary}/></Pressable><View><Text style={styles.eyebrow}>ADMINISTRATION</Text><Text style={styles.title}>Platform oversight</Text></View></View>
    <View style={styles.tabs}>{[['users', 'Users'], ['bookings', 'Bookings']].map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: section === key }} onPress={() => { setSection(key); setExpandedId(null); }} style={[styles.tab, section === key && styles.selectedTab]}><Text style={[styles.tabText, section === key && styles.selectedText]}>{label}</Text></Pressable>)}</View>
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading && items.length > 0} onRefresh={load} colors={[COLORS.primaryDark]}/>}>
      {loading && items.length === 0 ? <View style={styles.state}><ActivityIndicator color={COLORS.primaryDark}/><Text>Loading {section}…</Text></View> : null}
      {error ? <View style={styles.state}><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Pressable accessibilityRole="button" onPress={load} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
      {!loading && !error && items.length === 0 ? <View style={styles.state}><Text style={styles.muted}>No {section} recorded.</Text></View> : null}
      {!loading && items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityState={{ expanded: expandedId === item.id }} onPress={() => setExpandedId(current => current === item.id ? null : item.id)} style={styles.card}>
        <View style={styles.cardTop}><Text style={styles.cardTitle}>{section === 'users' ? item.name : item.referenceCode}</Text><Text style={styles.badge}>{section === 'users' ? item.role : item.status.replace(/_/g, ' ')}</Text></View>
        <Text style={styles.muted}>{section === 'users' ? item.email : `${item.turf.name} · ${item.user.name}`}</Text>
        {expandedId === item.id ? <View style={styles.detail}>
          {section === 'users' ? <><Text style={styles.muted}>Joined {dhaka(item.createdAt)}</Text><Text style={styles.muted}>{item._count.bookings} bookings · {item._count.turfs} venues</Text></> : <><Text style={styles.muted}>Starts {dhaka(item.startTime)}</Text><Text style={styles.muted}>Ends {dhaka(item.endTime)}</Text><Text style={styles.muted}>Demo booking value ৳{Number(item.totalAmount).toLocaleString('en-BD')}</Text>{item.cancellation?.reason ? <Text style={styles.muted}>Cancellation: {item.cancellation.reason}</Text> : null}</>}
        </View> : null}
      </Pressable>)}
      {nextCursor && !loading ? <Pressable accessibilityRole="button" accessibilityState={{ busy: loadingMore, disabled: loadingMore }} disabled={loadingMore} onPress={loadMore} style={styles.retry}><Text style={styles.retryText}>{loadingMore ? 'Loading…' : 'Load more'}</Text></Pressable> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.lg, backgroundColor: COLORS.card },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 1 },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold },
  tabs: { flexDirection: 'row', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm },
  tab: { flex: 1, minHeight: 48, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  selectedTab: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark },
  tabText: { color: COLORS.textSecondary, fontWeight: FONT_WEIGHT.semibold },
  selectedText: { color: '#fff' },
  content: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxxl },
  card: { minHeight: 76, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.xs },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm },
  cardTitle: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
  badge: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  detail: { borderTopWidth: 1, borderTopColor: COLORS.divider, marginTop: SPACING.sm, paddingTop: SPACING.sm, gap: SPACING.xs },
  muted: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm },
  state: { minHeight: 120, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.sm },
  error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  retry: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryDark },
  retryText: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
});
