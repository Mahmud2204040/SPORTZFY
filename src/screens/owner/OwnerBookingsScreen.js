// OwnerBookingsScreen — owner's "Bookings & Earnings" tab.
// Shows revenue KPI cards, a 7-day mini bar chart, and a segmented bookings list.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import SegmentedControl from '../../components/SegmentedControl';
import SectionTitle from '../../components/SectionTitle';
import RevenueCard from '../../components/RevenueCard';
import MiniBarChart from '../../components/MiniBarChart';
import OwnerBookingCard from '../../components/OwnerBookingCard';

import { ownerApi } from '../../api/owner';

import {
  BOOKINGS_TABS,
  OWNER_ALL_BOOKINGS,
  OWNER_REVENUE,
  OWNER_WEEKLY_REVENUE,
} from '../../data/ownerMockData';
import { COLORS, SPACING, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function dhakaDayIndex(date) {
  // Return index 0..6 where 0=Mon ... 6=Sun
  const d = new Date(date.getTime() + 6 * 60 * 60 * 1000); // convert to Dhaka time via +6 then use UTC getters
  const jsDay = d.getUTCDay(); // 0=Sun..6=Sat
  if (jsDay === 0) return 6;
  return jsDay - 1;
}

function formatDhakaDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Dhaka',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDhakaTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Dhaka',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getCustomerInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.map((p) => p[0]).join('');
  return (initials || 'U').slice(0, 2).toUpperCase();
}

export default function OwnerBookingsScreen() {
  const [activeTab, setActiveTab] = useState('upcoming');
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ownerApi.getStats();
        setStatsData(res || null);
      } catch (err) {
        console.log('Error fetching owner bookings/stats:', err?.message);
        // keep mock fallback.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const upcomingCards = useMemo(() => {
    const fallback = OWNER_ALL_BOOKINGS.upcoming;
    const list = statsData?.upcomingBookings;
    if (!Array.isArray(list) || list.length === 0) return fallback;

    return list.map((b) => {
      return {
        id: b.id || b.referenceCode || `SPZ-${Date.now()}`,
        customerName: b.user?.name || 'Customer',
        customerInitials: getCustomerInitials(b.user?.name || ''),
        turfName: b.turf?.name || '',
        date: formatDhakaDate(b.startTime),
        time: `${formatDhakaTime(b.startTime)} – ${formatDhakaTime(b.endTime)}`,
        price: b.totalAmount || 0,
        paymentMethod: b.paymentMethod || 'Cash',
        status: 'upcoming',
      };
    });
  }, [statsData]);

  const revenueCards = useMemo(() => {
    const fallback = OWNER_REVENUE;
    if (!statsData?.stats) return fallback;

    const totalRevenue = statsData.stats.totalRevenue || 0;
    const totalBookingsCount = statsData.stats.totalBookings || 0;

    const upcomingRevenue = (statsData.upcomingBookings || []).reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const avgPerBooking = totalBookingsCount > 0 ? totalRevenue / totalBookingsCount : 0;

    return {
      total: {
        ...fallback.total,
        value: `৳ ${Number(totalRevenue).toLocaleString()}`,
      },
      thisWeek: {
        ...fallback.thisWeek,
        value: `৳ ${Number(upcomingRevenue).toLocaleString()}`,
      },
      avgPerBooking: {
        ...fallback.avgPerBooking,
        value: `৳ ${Math.round(avgPerBooking).toLocaleString()}`,
      },
    };
  }, [statsData]);

  const weeklyRevenue = useMemo(() => {
    // If API provides only upcoming bookings, we still can aggregate a 7-day series from those.
    const list = statsData?.upcomingBookings;
    if (!Array.isArray(list) || list.length === 0) return OWNER_WEEKLY_REVENUE;

    // Oldest → newest (Mon..Sun labels)
    const nowDhaka = new Date(Date.now() + 6 * 60 * 60 * 1000);
    const todayDhakaMidnight = new Date(Date.UTC(
      nowDhaka.getUTCFullYear(),
      nowDhaka.getUTCMonth(),
      nowDhaka.getUTCDate(),
      0,
      0,
      0,
      0
    ));

    const windowStart = new Date(todayDhakaMidnight.getTime() - 6 * 24 * 60 * 60 * 1000);

    const acc = new Array(7).fill(0);

    list.forEach((b) => {
      const start = new Date(b.startTime);
      const startDhaka = new Date(start.getTime() + 6 * 60 * 60 * 1000);
      const dayStartDhaka = new Date(Date.UTC(
        startDhaka.getUTCFullYear(),
        startDhaka.getUTCMonth(),
        startDhaka.getUTCDate(),
        0,
        0,
        0,
        0
      ));

      if (dayStartDhaka < windowStart || dayStartDhaka > new Date(todayDhakaMidnight.getTime())) return;

      const idx = dhakaDayIndex(dayStartDhaka);
      acc[idx] += b.totalAmount || 0;
    });

    const any = acc.some((v) => v > 0);
    if (!any) return OWNER_WEEKLY_REVENUE;

    return acc.map((value, i) => ({ day: DAY_LABELS[i], value }));
  }, [statsData]);

  const bookings = useMemo(() => {
    if (activeTab === 'upcoming') return upcomingCards;

    // Backend currently returns only upcoming confirmed bookings in /owner/stats.
    // Keep the existing UI working for other tabs until dedicated endpoints exist.
    const fallbackList = OWNER_ALL_BOOKINGS[activeTab] || [];
    return fallbackList;
  }, [activeTab, upcomingCards]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Bookings & Earnings</Text>
          <Text style={styles.sub}>Track every reservation and your revenue.</Text>
        </View>

        {/* Revenue KPI tiles */}
        <View style={styles.kpiRow}>
          <RevenueCard {...revenueCards.total} />
          <View style={{ width: SPACING.sm }} />
          <RevenueCard {...revenueCards.thisWeek} />
        </View>
        <View style={styles.kpiRow}>
          <RevenueCard {...revenueCards.avgPerBooking} />
        </View>

        {/* 7-day revenue chart */}
        <SectionTitle title="This Week" />
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>Revenue</Text>
            <Text style={styles.chartTotal}>
              ৳ {Number(weeklyRevenue.reduce((sum, d) => sum + (d.value || 0), 0)).toLocaleString()}
            </Text>
          </View>
          <MiniBarChart data={weeklyRevenue} />
        </View>

        {/* Bookings segmented control */}
        <SectionTitle title="All Bookings" />
        <View style={styles.section}>
          <SegmentedControl options={BOOKINGS_TABS} value={activeTab} onChange={setActiveTab} />
        </View>

        {/* Bookings list */}
        <View style={styles.section}>
          {loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Loading...</Text>
            </View>
          ) : bookings.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No {activeTab} bookings yet.</Text>
            </View>
          ) : (
            bookings.map((booking) => (
              <OwnerBookingCard key={booking.id} booking={booking} />
            ))
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.lg,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sub: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
    marginBottom: SPACING.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    marginHorizontal: SPACING.lg,
    padding: SPACING.md,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  chartTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  chartTotal: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  empty: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: SPACING.xxl,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  emptyText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
});
