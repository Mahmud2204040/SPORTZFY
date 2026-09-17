// OwnerDashboardScreen — Turf Owner's home tab.
// Shows a greeting, KPI grid, AI insight, My Turf card, and upcoming bookings.

import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ImageBackground } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SectionTitle from '../../components/SectionTitle';
import OwnerStatCard from '../../components/OwnerStatCard';
import OwnerBookingCard from '../../components/OwnerBookingCard';
import TurfInfoCard from '../../components/TurfInfoCard';
import AIInsightCard from '../../components/AIInsightCard';

import { ownerApi } from '../../api/owner';

import {
  OWNER_PROFILE,
  OWNER_STATS,
  OWNER_TURF_CARD,
  OWNER_AI_INSIGHT,
  OWNER_UPCOMING_BOOKINGS,
} from '../../data/ownerMockData';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

function getCustomerInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  const initials = parts.map((p) => p[0]).join('');
  return (initials || 'U').slice(0, 2).toUpperCase();
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

export default function OwnerDashboardScreen() {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await ownerApi.getStats();
        setStatsData(res || null);
      } catch (err) {
        console.log('Error fetching owner stats:', err?.message);
        // Keep mock fallback.
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const kpiCards = useMemo(() => {
    const fallback = OWNER_STATS;
    if (!statsData?.stats) return fallback;

    const upcoming = statsData?.upcomingBookings || [];
    const upcomingRevenue = upcoming.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const upcomingCount = upcoming.length;

    return [
      {
        ...fallback[0],
        value: String(upcomingCount),
      },
      {
        ...fallback[1],
        value: `৳ ${upcomingRevenue.toLocaleString()}`,
      },
      {
        ...fallback[2],
        value: String(statsData.stats.totalBookings || 0),
      },
      {
        ...fallback[3],
        value: String(statsData.stats.totalVenues || 0),
      },
    ];
  }, [statsData]);

  const heroTurf = useMemo(() => {
    const fallback = OWNER_TURF_CARD;
    const t = statsData?.ownedTurfs?.[0];
    if (!t) return fallback;

    const totalSlotsEstimate = (t.activeBookingsCount || 0) + (t.blockedIntervalsCount || 0);

    return {
      name: t.name,
      location: `${t.area || ''}, ${t.city || ''}`.trim().replace(/,$/, ''),
      rating: t.rating || 0,
      reviewCount: 0,
      pricePerHour: t.basePricePerHour || 0,
      bookedSlots: t.activeBookingsCount || 0,
      totalSlots: Math.max(1, totalSlotsEstimate),
      image: t.coverImage || fallback.image,
    };
  }, [statsData]);

  const aiInsights = useMemo(() => {
    const list = statsData?.aiPricingInsights;
    if (!Array.isArray(list) || list.length === 0) {
      return [OWNER_AI_INSIGHT];
    }

    return list.map((insight) => ({
      title: insight.turfName || 'Pricing Insight',
      body: insight.recommendation || '',
      cta: 'Apply Suggestion',
      icon: 'sparkles-outline',
      demandTag: insight.demandTag || insight.tag || null,
      targetWindow: insight.targetWindow || null,
      currentRate: insight.currentRate || null,
      suggestedRate: insight.suggestedRate || null,
      demandProbability: insight.demandProbability || null,
    }));
  }, [statsData]);

  const upcomingCards = useMemo(() => {
    const fallback = OWNER_UPCOMING_BOOKINGS;
    const list = statsData?.upcomingBookings;
    if (!Array.isArray(list) || list.length === 0) return fallback;

    return list.map((b) => {
      const start = b.startTime;
      const end = b.endTime;
      return {
        id: b.id || b.referenceCode || `SPZ-${Date.now()}`,
        customerName: b.user?.name || 'Customer',
        customerInitials: getCustomerInitials(b.user?.name || ''),
        turfName: b.turf?.name || heroTurf.name,
        date: formatDhakaDate(start),
        time: `${formatDhakaTime(start)} – ${formatDhakaTime(end)}`,
        price: b.totalAmount || 0,
        paymentMethod: b.paymentMethod || 'Cash',
        status: 'upcoming',
      };
    });
  }, [heroTurf.name, statsData]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Green header: avatar + greeting + bell */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{OWNER_PROFILE.initials}</Text>
            </View>
            <View>
              <Text style={styles.welcome}>Welcome back,</Text>
              <Text style={styles.name}>{statsData?.owner?.name || OWNER_PROFILE.name}</Text>
            </View>
          </View>
          <View style={styles.bell}>
            <Ionicons name="notifications-outline" size={20} color={COLORS.textOnPrimary} />
          </View>
        </View>

        {/* KPI grid: 2x2 of stat tiles */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            <OwnerStatCard {...kpiCards[0]} />
            <View style={{ width: SPACING.sm }} />
            <OwnerStatCard {...kpiCards[1]} />
          </View>
          <View style={styles.kpiRow}>
            <OwnerStatCard {...kpiCards[2]} />
            <View style={{ width: SPACING.sm }} />
            <OwnerStatCard {...kpiCards[3]} />
          </View>
        </View>

        {/* AI pricing insights */}
        <SectionTitle title="AI Pricing Recommendations" />
        <View style={styles.section}>
          {aiInsights.map((insight, idx) => (
            <View key={insight.id || idx} style={{ marginBottom: SPACING.sm }}>
              <AIInsightCard insight={insight} onPress={() => {}} />
            </View>
          ))}
        </View>

        {/* My Turf */}
        <SectionTitle title="My Turf" />
        <View style={styles.section}>
          <TurfInfoCard turf={heroTurf} />
        </View>

        {/* Upcoming Bookings */}
        <SectionTitle title={loading ? 'Upcoming Bookings' : 'Upcoming Bookings'} />
        <View style={styles.section}>
          {upcomingCards.map((booking) => (
            <OwnerBookingCard key={booking.id} booking={booking} />
          ))}
        </View>

        {/* Bottom padding so the last card clears the tab bar */}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomLeftRadius: RADIUS.lg,
    borderBottomRightRadius: RADIUS.lg,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    color: COLORS.textOnPrimary,
    fontWeight: FONT_WEIGHT.bold,
    fontSize: FONT_SIZE.md,
  },
  welcome: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textOnPrimary,
    opacity: 0.8,
  },
  name: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textOnPrimary,
  },
  bell: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiGrid: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  kpiRow: {
    flexDirection: 'row',
    marginBottom: SPACING.sm,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
});
