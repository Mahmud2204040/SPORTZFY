import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SectionTitle from '../../components/SectionTitle';
import PrimaryButton from '../../components/PrimaryButton';
import { adminApi } from '../../api/admin';

import { useAuth } from '../../context/AuthContext';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

const STATUS_OPTIONS = ['All', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'];

function StatusPill({ status }) {
  const map = {
    PENDING_REVIEW: { bg: '#FEF3C7', text: '#92400E', icon: 'time-outline' },
    APPROVED: { bg: '#DCFCE7', text: '#166534', icon: 'checkmark-circle-outline' },
    REJECTED: { bg: '#FEE2E2', text: '#B91C1C', icon: 'close-circle-outline' },
  };

  const row = map[status] || { bg: COLORS.background, text: COLORS.textMuted, icon: 'alert-circle-outline' };

  return (
    <View style={[styles.statusPill, { backgroundColor: row.bg }]}>
      <Ionicons name={row.icon} size={12} color={row.text} />
      <Text style={[styles.statusText, { color: row.text }]}>{status}</Text>
    </View>
  );
}

function StatCard({ label, value, icon, tint, iconColor }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: tint }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatMoneyBDT(n) {
  const num = Number(n || 0);
  if (!Number.isFinite(num)) return '৳ 0';
  return `৳ ${num.toLocaleString()}`;
}

export default function AdminDashboardScreen() {
  const { logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [turfs, setTurfs] = useState([]);
  const [filterStatus, setFilterStatus] = useState('All');
  const [busyTurfs, setBusyTurfs] = useState({});

  const fetchAdmin = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, turfsRes] = await Promise.all([adminApi.getStats(), adminApi.getTurfs()]);
      if (statsRes?.data) setStats(statsRes.data.stats || statsRes.data);
      if (turfsRes?.items) setTurfs(turfsRes.items);
    } catch (err) {
      console.log('Admin load error:', err?.message);
      Alert.alert('Admin', err?.message || 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmin();
  }, [fetchAdmin]);

  const filteredTurfs = useMemo(() => {
    if (filterStatus === 'All') return turfs;
    return (turfs || []).filter((t) => t.status === filterStatus);
  }, [filterStatus, turfs]);

  const statCards = useMemo(() => {
    const s = stats || {};
    return [
      {
        label: 'Total GMV',
        value: formatMoneyBDT(s.totalGMV),
        icon: 'trending-up',
        tint: '#E8F4EC',
        iconColor: '#1B8A3A',
      },
      {
        label: 'Platform Take',
        value: formatMoneyBDT(s.platformCommission),
        icon: 'cash-outline',
        tint: '#FFF7E6',
        iconColor: '#F59E0B',
      },
      {
        label: 'Bookings',
        value: String(s.totalBookings || 0),
        icon: 'receipt-outline',
        tint: '#EEF2FF',
        iconColor: '#4F46E5',
      },
      {
        label: 'Pending Turfs',
        value: String(s.pendingTurfs || 0),
        icon: 'time-outline',
        tint: '#FEF3C7',
        iconColor: '#92400E',
      },
    ];
  }, [stats]);

  async function handleReview(turfId, nextStatus) {
    setBusyTurfs((prev) => ({ ...prev, [turfId]: true }));
    try {
      await adminApi.reviewTurf(turfId, nextStatus);
      await fetchAdmin();
    } catch (err) {
      console.log('Admin review error:', err?.message);
      Alert.alert('Update failed', err?.message || 'Could not update turf status.');
    } finally {
      setBusyTurfs((prev) => ({ ...prev, [turfId]: false }));
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View style={styles.headerRowLeft}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.textOnPrimary} />
              <Text style={styles.headerTitle}>Admin Governance</Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.logoutBtn}
              onPress={logout}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="log-out-outline" size={18} color={COLORS.textOnPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.headerSub}>Platform KPIs & venue approval queue</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading admin data...</Text>
          </View>
        ) : (
          <>
            {/* KPI cards */}
            <View style={styles.kpiGrid}>
              <View style={styles.kpiRow}>
                <StatCard {...statCards[0]} />
                <View style={{ width: SPACING.sm }} />
                <StatCard {...statCards[1]} />
              </View>
              <View style={styles.kpiRow}>
                <StatCard {...statCards[2]} />
                <View style={{ width: SPACING.sm }} />
                <StatCard {...statCards[3]} />
              </View>
            </View>

            {/* Filter */}
            <SectionTitle title="Turf Moderation" subtitle="Approve or reject new venue partners" />

            <View style={styles.filterRow}>
              {STATUS_OPTIONS.map((st) => (
                <TouchableOpacity
                  key={st}
                  activeOpacity={0.85}
                  onPress={() => setFilterStatus(st)}
                  style={[
                    styles.filterChip,
                    filterStatus === st && styles.filterChipSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      filterStatus === st && styles.filterChipTextSelected,
                    ]}
                  >
                    {st === 'All' ? 'All' : st.replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* List */}
            {filteredTurfs.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="build-outline" size={44} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No turfs</Text>
                <Text style={styles.emptySub}>Nothing to review for this status.</Text>
              </View>
            ) : (
              <View>
                {filteredTurfs.map((t) => {
                  const isBusy = !!busyTurfs[t.id];
                  const ownerName = t.owner?.name || t.ownerName || '';
                  const locationText = t.area ? `${t.area}, ${t.city || ''}`.trim().replace(/,$/, '') : (t.city || '');

                  return (
                    <View key={t.id} style={styles.turfRowCard}>
                      <View style={styles.turfRowTop}>
                        <View style={styles.turfRowLeft}>
                          <Text style={styles.turfName} numberOfLines={1}>{t.name}</Text>
                          <Text style={styles.turfMeta} numberOfLines={1}>{locationText}</Text>
                          <Text style={styles.turfMeta} numberOfLines={1}>
                            Base: ৳{t.basePricePerHour}/hr {ownerName ? `• ${ownerName}` : ''}
                          </Text>
                        </View>
                        <StatusPill status={t.status} />
                      </View>

                      <View style={styles.turfActionsRow}>
                        <View style={{ flex: 1 }}>
                          <PrimaryButton
                            title={isBusy ? 'Working...' : 'Approve'}
                            disabled={isBusy}
                            loading={isBusy}
                            onPress={() => handleReview(t.id, 'APPROVED')}
                          />
                        </View>

                        <View style={{ width: SPACING.sm }} />

                        <TouchableOpacity
                          activeOpacity={0.85}
                          disabled={isBusy}
                          onPress={() => handleReview(t.id, 'REJECTED')}
                          style={[styles.rejectBtn, isBusy && { opacity: 0.6 }]}
                        >
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
                <View style={{ height: SPACING.xxl }} />
              </View>
            )}
          </>
        )}
      </ScrollView>
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
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  header: {
    padding: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  logoutBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
    borderRadius: RADIUS.lg,
  },
  headerTitle: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
  },
  headerSub: {
    color: COLORS.textOnPrimary,
    opacity: 0.9,
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },

  loadingBox: {
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: COLORS.textMuted,
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
  },

  kpiGrid: {
    marginBottom: SPACING.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    minHeight: 120,
    justifyContent: 'space-between',
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterChipText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  filterChipTextSelected: {
    color: COLORS.textOnPrimary,
  },

  emptyBox: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  emptySub: {
    marginTop: SPACING.xs,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
  },

  turfRowCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  turfRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  turfRowLeft: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  turfName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  turfMeta: {
    marginTop: 4,
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },

  statusPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    marginLeft: SPACING.xs,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  turfActionsRow: {
    flexDirection: 'row',
    marginTop: SPACING.md,
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    color: COLORS.danger,
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
