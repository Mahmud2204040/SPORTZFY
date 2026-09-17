import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { adminApi } from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

const FILTERS = [
  { key: 'PENDING_REVIEW', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
  { key: 'All', label: 'All' },
];

function statusLabel(status) { return String(status || 'UNKNOWN').replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase()); }
function formatDate(value) { return value ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }
function money(value) { return `৳ ${Number(value || 0).toLocaleString('en-BD')}`; }

function DetailLine({ label, value }) {
  return <View style={styles.detailLine}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value || '—'}</Text></View>;
}

export default function AdminDashboardScreen() {
  const { logout } = useAuth();
  const [stats, setStats] = useState(null);
  const [turfs, setTurfs] = useState([]);
  const [filter, setFilter] = useState('PENDING_REVIEW');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [statsError, setStatsError] = useState('');
  const [notice, setNotice] = useState('');
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setLoadError(''); setStatsError('');
    const [turfsResult, statsResult] = await Promise.allSettled([adminApi.getTurfs(), adminApi.getStats()]);
    if (turfsResult.status === 'fulfilled') setTurfs(turfsResult.value.items);
    else { setTurfs([]); setLoadError(turfsResult.reason?.message || 'Could not load the review queue.'); }
    if (statsResult.status === 'fulfilled') setStats(statsResult.value.stats);
    else { setStats(null); setStatsError(statsResult.reason?.message || 'Could not load platform metrics.'); }
    setLoading(false); setRefreshing(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => filter === 'All' ? turfs : turfs.filter(t => t.status === filter), [turfs, filter]);
  const pendingCount = turfs.filter(t => t.status === 'PENDING_REVIEW').length;

  async function openDetail(id) {
    setDetail({ id }); setDetailLoading(true); setDetailError(''); setNotice('');
    try { setDetail(await adminApi.getTurf(id)); }
    catch (error) { setDetailError(error?.message || 'Could not load submission details.'); }
    finally { setDetailLoading(false); }
  }

  function confirmReview(nextStatus) {
    if (!detail?.id || busy) return;
    Alert.alert(
      nextStatus === 'APPROVED' ? 'Approve venue?' : 'Reject venue?',
      `${detail.name} will be ${nextStatus === 'APPROVED' ? 'visible to players after approval' : 'marked as rejected'}.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: nextStatus === 'APPROVED' ? 'Approve' : 'Reject', style: nextStatus === 'REJECTED' ? 'destructive' : 'default', onPress: () => review(nextStatus) }]
    );
  }

  async function review(nextStatus) {
    if (!detail?.id || busy) return;
    setBusy(true); setDetailError('');
    try {
      const reviewed = await adminApi.reviewTurf(detail.id, nextStatus);
      setDetail(null);
      setNotice(`${reviewed.name} ${nextStatus === 'APPROVED' ? 'approved' : 'rejected'} successfully.`);
      await load(true);
    } catch (error) {
      setDetailError(error?.message || 'Could not save the review decision.');
      if (error?.status === 409) await load(true);
    } finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header section="Administration" title="Review queue" subtitle={loading ? 'Checking submissions' : loadError ? 'Queue unavailable' : `${pendingCount} venue${pendingCount === 1 ? '' : 's'} awaiting a decision`} actionIcon="log-out-outline" actionLabel="Sign out" onAction={logout} />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[COLORS.primaryDark]} />}>
      {notice ? <View style={styles.successBanner} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle" size={20} color={COLORS.primaryDark}/><Text style={styles.successText}>{notice}</Text></View> : null}
      <View style={styles.queueHeading}><View><Text style={styles.eyebrow}>VENUE MODERATION</Text><Text style={styles.heading}>Submissions</Text></View><View style={styles.countBadge}><Text style={styles.countText}>{pendingCount} pending</Text></View></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map(item => <Pressable key={item.key} accessibilityRole="button" accessibilityState={{ selected: filter === item.key }} onPress={() => setFilter(item.key)} style={[styles.filter, filter === item.key && styles.filterSelected]}><Text style={[styles.filterText, filter === item.key && styles.filterTextSelected]}>{item.label}</Text></Pressable>)}
      </ScrollView>
      {loading ? <View style={styles.state}><ActivityIndicator color={COLORS.primaryDark}/><Text style={styles.stateText}>Loading submissions…</Text></View> : loadError ? <View style={styles.state}><Ionicons name="cloud-offline-outline" size={32} color={COLORS.textMuted}/><Text style={styles.stateText}>{loadError}</Text><Pressable accessibilityRole="button" onPress={() => load()} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : filtered.length === 0 ? <View style={styles.state}><Ionicons name="checkmark-done-circle-outline" size={38} color={COLORS.primaryDark}/><Text style={styles.stateTitle}>No {filter === 'All' ? '' : FILTERS.find(f => f.key === filter)?.label.toLowerCase()} submissions</Text><Text style={styles.stateText}>Pull down to check for new submissions.</Text></View> : filtered.map(turf => <Pressable key={turf.id} accessibilityRole="button" accessibilityLabel={`Review ${turf.name}, ${statusLabel(turf.status)}`} onPress={() => openDetail(turf.id)} style={({ pressed }) => [styles.venueCard, pressed && { opacity: 0.8 }]}>
        <View style={styles.venueTop}><View style={styles.venueIcon}><Ionicons name="football-outline" size={22} color={COLORS.primaryDark}/></View><View style={{ flex: 1 }}><Text style={styles.venueName} numberOfLines={2}>{turf.name}</Text><Text style={styles.venueLocation} numberOfLines={1}>{[turf.area, turf.city].filter(Boolean).join(', ')}</Text></View><Ionicons name="chevron-forward" size={20} color={COLORS.textMuted}/></View>
        <View style={styles.venueBottom}><Text style={styles.ownerText}>Owner: {turf.owner?.name || 'Unknown'}</Text><View style={[styles.statusBadge, turf.status === 'PENDING_REVIEW' ? styles.statusPending : turf.status === 'APPROVED' ? styles.statusApproved : styles.statusRejected]}><Text style={styles.statusText}>{statusLabel(turf.status)}</Text></View></View>
      </Pressable>)}
      <View style={styles.metricsHeading}><Text style={styles.eyebrow}>PLATFORM</Text><Text style={styles.heading}>At a glance</Text></View>
      {statsError ? <Pressable accessibilityRole="button" onPress={() => load()} style={styles.metricError}><Text style={styles.stateText}>{statsError} Tap to retry.</Text></Pressable> : stats ? <View style={styles.metricsGrid}>
        <Metric label="Confirmed bookings" value={String(stats.totalBookings ?? 0)} icon="receipt-outline" />
        <Metric label="Approved venues" value={String(stats.approvedTurfs ?? 0)} icon="checkmark-circle-outline" />
        <Metric label="Demo booking value" value={money(stats.totalGMV)} icon="wallet-outline" />
        <Metric label="Estimated 5% fee" value={money(stats.platformCommission)} icon="trending-up-outline" />
      </View> : null}
    </ScrollView>

    <Modal visible={!!detail} animationType="slide" onRequestClose={() => !busy && setDetail(null)}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.modalHeader}><View><Text style={styles.eyebrow}>VENUE SUBMISSION</Text><Text style={styles.modalTitle}>Review details</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close review details" disabled={busy} onPress={() => setDetail(null)} style={styles.closeButton}><Ionicons name="close" size={24} color={COLORS.textPrimary}/></Pressable></View>
        <ScrollView contentContainerStyle={styles.modalContent}>
          {detailLoading ? <View style={styles.state}><ActivityIndicator color={COLORS.primaryDark}/><Text style={styles.stateText}>Loading venue details…</Text></View> : detailError && !detail?.name ? <View style={styles.state}><Text style={styles.errorText}>{detailError}</Text><Pressable onPress={() => openDetail(detail.id)} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : detail?.name ? <>
            {detail.coverImage ? <Image source={{ uri: detail.coverImage }} style={styles.cover} /> : null}
            <Text style={styles.detailName}>{detail.name}</Text>
            <Text style={styles.detailAddress}>{[detail.address, detail.area, detail.city].filter(Boolean).join(' · ')}</Text>
            <View style={styles.detailCard}><DetailLine label="Status" value={statusLabel(detail.status)} /><DetailLine label="Submitted" value={formatDate(detail.createdAt)} /><DetailLine label="Owner" value={detail.owner?.name} /><DetailLine label="Email" value={detail.owner?.email} /><DetailLine label="Phone" value={detail.owner?.phone} /><DetailLine label="Pitch formats" value={detail.pitchFormats} /><DetailLine label="Base price" value={`${money(detail.basePricePerHour)} per hour`} /><DetailLine label="Bookings" value={String(detail.bookings?.length ?? 0)} /></View>
            {detail.description ? <View style={styles.detailCard}><Text style={styles.descriptionTitle}>Description</Text><Text style={styles.description}>{detail.description}</Text></View> : null}
            <View style={styles.detailCard}><Text style={styles.descriptionTitle}>Facilities</Text><Text style={styles.description}>{[['Floodlights', detail.hasFloodlights], ['Parking', detail.hasParking], ['Washroom', detail.hasWashroom], ['Changing room', detail.hasChangingRoom], ['Water', detail.hasWater]].filter(([, present]) => present).map(([name]) => name).join(' · ') || 'None listed'}</Text></View>
            {detailError ? <Text accessibilityRole="alert" style={styles.errorText}>{detailError}</Text> : null}
          </> : null}
        </ScrollView>
        {detail?.name && detail.status === 'PENDING_REVIEW' ? <View style={styles.modalFooter}><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={() => confirmReview('REJECTED')} style={styles.rejectButton}><Text style={styles.rejectText}>Reject</Text></Pressable><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={() => confirmReview('APPROVED')} style={styles.approveButton}>{busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.approveText}>Approve venue</Text>}</Pressable></View> : null}
      </SafeAreaView>
    </Modal>
  </SafeAreaView>;
}

function Metric({ label, value, icon }) { return <View style={styles.metric}><Ionicons name={icon} size={22} color={COLORS.primaryDark}/><Text style={styles.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  successBanner: { backgroundColor: '#E7F5EA', borderRadius: RADIUS.lg, padding: SPACING.md, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.lg }, successText: { flex: 1, color: COLORS.primaryDark, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold },
  queueHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: SPACING.md }, eyebrow: { fontSize: FONT_SIZE.xs, letterSpacing: 1.2, color: COLORS.primaryDark, fontWeight: FONT_WEIGHT.bold }, heading: { fontSize: FONT_SIZE.xxl, color: COLORS.textPrimary, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.xs }, countBadge: { backgroundColor: '#EAF4ED', borderRadius: RADIUS.pill, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm }, countText: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  filters: { gap: SPACING.sm, paddingBottom: SPACING.md }, filter: { minHeight: 44, minWidth: 74, paddingHorizontal: SPACING.md, borderRadius: RADIUS.pill, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' }, filterSelected: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark }, filterText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold }, filterTextSelected: { color: '#fff' },
  state: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.xxl, minHeight: 155, alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }, stateTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold }, stateText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, textAlign: 'center' }, retry: { minHeight: 44, minWidth: 90, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.lg, marginTop: SPACING.sm }, retryText: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  venueCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.sm }, venueTop: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md }, venueIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#EAF4ED', alignItems: 'center', justifyContent: 'center' }, venueName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold }, venueLocation: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, marginTop: 3 }, venueBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: SPACING.sm, marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.divider }, ownerText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, flex: 1 }, statusBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 5, borderRadius: RADIUS.pill }, statusPending: { backgroundColor: '#FFF2D7' }, statusApproved: { backgroundColor: '#E7F5EA' }, statusRejected: { backgroundColor: '#FDEBEC' }, statusText: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold },
  metricsHeading: { marginTop: SPACING.xxl, marginBottom: SPACING.md }, metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: SPACING.sm }, metric: { width: '48%', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.md, minHeight: 112, justifyContent: 'space-between' }, metricValue: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm }, metricLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs }, metricError: { padding: SPACING.lg, backgroundColor: COLORS.card, borderRadius: RADIUS.lg },
  modalHeader: { backgroundColor: COLORS.card, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, modalTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, marginTop: 3 }, closeButton: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center' }, modalContent: { padding: SPACING.lg, paddingBottom: SPACING.xxl, gap: SPACING.md }, cover: { width: '100%', height: 190, borderRadius: RADIUS.lg, backgroundColor: COLORS.border }, detailName: { fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary }, detailAddress: { fontSize: FONT_SIZE.sm, color: COLORS.textSecondary }, detailCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg }, detailLine: { flexDirection: 'row', justifyContent: 'space-between', gap: SPACING.md, paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.divider }, detailLabel: { width: '38%', color: COLORS.textMuted, fontSize: FONT_SIZE.sm }, detailValue: { flex: 1, color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold, textAlign: 'right' }, descriptionTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, marginBottom: SPACING.sm }, description: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 21 }, errorText: { color: COLORS.danger, fontSize: FONT_SIZE.sm, textAlign: 'center' }, modalFooter: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.lg, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border }, rejectButton: { minHeight: 50, flex: 1, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.danger, alignItems: 'center', justifyContent: 'center' }, rejectText: { color: COLORS.danger, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold }, approveButton: { minHeight: 50, flex: 2, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' }, approveText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});
