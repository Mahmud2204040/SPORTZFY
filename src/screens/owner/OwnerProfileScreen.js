import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { ownerApi } from '../../api/owner';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

function RouteRow({ icon, title, detail, onPress }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.routeRow, pressed && { opacity: 0.7 }]}>
    <View style={styles.routeIcon}><Ionicons name={icon} size={20} color={COLORS.primaryDark} /></View>
    <View style={{ flex: 1 }}><Text style={styles.routeTitle}>{title}</Text><Text style={styles.routeDetail}>{detail}</Text></View>
    <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
  </Pressable>;
}

export default function OwnerProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { const page = await ownerApi.getTurfs(); setVenues(page.items); }
    catch (e) { setVenues([]); setError(e?.message || 'Could not load your venues.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const initials = (user?.name || 'Owner').split(/\s+/).filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase();
  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header section="Venue partner" title="Owner profile" subtitle="Manage your venues and account" />
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.identityCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
        <View style={{ flex: 1 }}><Text style={styles.name}>{user?.name || 'Venue owner'}</Text><Text style={styles.role}>SPORTZFY VENUE PARTNER</Text></View>
      </View>
      <View style={styles.infoCard}>
        <View style={styles.infoRow}><Ionicons name="mail-outline" size={18} color={COLORS.primaryDark}/><Text style={styles.infoText}>{user?.email || 'No email on file'}</Text></View>
        {user?.phone ? <View style={styles.infoRow}><Ionicons name="call-outline" size={18} color={COLORS.primaryDark}/><Text style={styles.infoText}>{user.phone}</Text></View> : null}
      </View>
      <Text style={styles.sectionLabel}>YOUR BUSINESS</Text>
      <View style={styles.businessCard}>
        {loading ? <ActivityIndicator color={COLORS.primaryDark} /> : error ? <Pressable accessibilityRole="button" onPress={load}><Text style={styles.error}>{error} Tap to retry.</Text></Pressable> : <>
          <Text style={styles.venueCount}>{venues.length}</Text><Text style={styles.venueCaption}>{venues.length === 1 ? 'venue under your account' : 'venues under your account'}</Text>
          {venues.length === 0 ? <Text style={styles.empty}>No venues are linked to this account yet.</Text> : venues.slice(0, 3).map(venue => <View key={venue.id} style={styles.venueLine}><Text style={styles.venueName} numberOfLines={1}>{venue.name}</Text><Text style={styles.venueStatus}>{String(venue.status || '').replace(/_/g, ' ')}</Text></View>)}
        </>}
      </View>
      <View style={styles.routes}>
        <RouteRow icon="grid-outline" title="Business overview" detail="Performance and upcoming activity" onPress={() => navigation.navigate('Dashboard')} />
        <RouteRow icon="football-outline" title="Manage venues" detail="Venue details, rates and inventory" onPress={() => navigation.navigate('Turf')} />
        <RouteRow icon="calendar-outline" title="Booking activity" detail="Reservations and earnings" onPress={() => navigation.navigate('Bookings')} />
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Sign out" onPress={logout} style={styles.signOut}><Ionicons name="log-out-outline" size={20} color={COLORS.danger}/><Text style={styles.signOutText}>Sign out</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  identityCard: { backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, padding: SPACING.lg, flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  avatar: { width: 56, height: 56, borderRadius: 18, backgroundColor: '#FFFFFF28', borderWidth: 1, borderColor: '#FFFFFF55', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold }, name: { color: '#fff', fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold }, role: { color: '#D8EDE0', fontSize: FONT_SIZE.xs, letterSpacing: 1, marginTop: 4 },
  infoCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, borderWidth: 1, borderColor: COLORS.border }, infoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md }, infoText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, flex: 1 },
  sectionLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 1, marginTop: SPACING.sm }, businessCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, padding: SPACING.lg }, venueCount: { color: COLORS.primaryDark, fontSize: 28, fontWeight: FONT_WEIGHT.bold }, venueCaption: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginBottom: SPACING.sm }, venueLine: { paddingVertical: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.divider, flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.sm }, venueName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, flex: 1 }, venueStatus: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs }, empty: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm }, error: { color: COLORS.danger, fontSize: FONT_SIZE.sm },
  routes: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }, routeRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, borderBottomWidth: 1, borderBottomColor: COLORS.divider, gap: SPACING.md }, routeIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EAF4ED', alignItems: 'center', justifyContent: 'center' }, routeTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold }, routeDetail: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: 2 }, signOut: { minHeight: 52, borderRadius: RADIUS.lg, backgroundColor: '#FFF2F2', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }, signOutText: { color: COLORS.danger, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
});
