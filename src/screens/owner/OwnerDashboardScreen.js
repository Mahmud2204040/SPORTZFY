// OwnerDashboardScreen — Turf Owner's home tab.
// Shows a greeting, KPI grid, AI insight, My Turf card, and upcoming bookings.

import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import SectionTitle from '../../components/SectionTitle';
import OwnerStatCard from '../../components/OwnerStatCard';
import OwnerBookingCard from '../../components/OwnerBookingCard';
import TurfInfoCard from '../../components/TurfInfoCard';
import AIInsightCard from '../../components/AIInsightCard';
import Header from '../../components/Header';

import { ownerApi } from '../../api/owner';

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

export default function OwnerDashboardScreen({ navigation }) {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await ownerApi.getStats();
        setStatsData(res || null);
      } catch (err) {
        setStatsData(null);
        setError(err?.message || 'Could not load owner dashboard.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const kpiCards = useMemo(() => {
    const templates = [
      { label: 'Upcoming bookings', icon: 'calendar-outline', tint: '#E8F4EC', iconColor: COLORS.primaryDark },
      { label: 'Upcoming value', icon: 'cash-outline', tint: '#FFF7E6', iconColor: '#A86600' },
      { label: 'Total bookings', icon: 'receipt-outline', tint: '#EEF2FF', iconColor: '#4F46E5' },
      { label: 'Your venues', icon: 'football-outline', tint: '#F1EAF8', iconColor: '#7C3AED' },
    ];

    const upcomingRevenue = statsData?.stats?.upcomingValue || 0;
    const upcomingCount = statsData?.stats?.upcomingBookings || 0;

    return [
      {
        ...templates[0],
        value: String(upcomingCount),
      },
      {
        ...templates[1],
        value: `৳ ${upcomingRevenue.toLocaleString()}`,
      },
      {
        ...templates[2],
        value: String(statsData?.stats?.totalBookings || 0),
      },
      {
        ...templates[3],
        value: String(statsData?.stats?.totalVenues || 0),
      },
    ];
  }, [statsData]);

  const heroTurf = useMemo(() => {
    const t = statsData?.ownedTurfs?.[0];
    if (!t) return null;

    return {
      name: t.name,
      location: `${t.area || ''}, ${t.city || ''}`.trim().replace(/,$/, ''),
      rating: t.rating || 0,
      reviewCount: t.reviewCount || 0,
      pricePerHour: t.basePricePerHour || 0,
      bookedSlots: t.activeBookingsCount || 0,
      totalSlots: null,
      image: t.coverImage || undefined,
    };
  }, [statsData]);

  const aiInsights = useMemo(() => {
    const list = statsData?.aiPricingInsights;
    if (!Array.isArray(list) || list.length === 0) {
      return [];
    }

    return list.map((insight) => ({
      turfId: insight.turfId,
      title: insight.turfName || 'Pricing Insight',
      body: insight.recommendation || '',
      cta: 'View venue',
      icon: 'sparkles-outline',
      demandTag: insight.demandTag || insight.tag || null,
      targetWindow: insight.targetWindow || null,
      currentRate: insight.currentRate || null,
      suggestedRate: insight.suggestedRate || null,
      demandProbability: insight.demandProbability || null,
      dataBasis: insight.dataBasis || null,
    }));
  }, [statsData]);

  const upcomingCards = useMemo(() => {
    const list = statsData?.upcomingBookings;
    if (!Array.isArray(list) || list.length === 0) return [];

    return list.map((b) => {
      const start = b.startTime;
      const end = b.endTime;
      return {
        id: b.id || b.referenceCode || `SPZ-${Date.now()}`,
        customerName: b.user?.name || 'Customer',
        customerInitials: getCustomerInitials(b.user?.name || ''),
        turfName: b.turf?.name || 'Venue',
        date: formatDhakaDate(start),
        time: `${formatDhakaTime(start)} – ${formatDhakaTime(end)}`,
        price: b.totalAmount || 0,
        paymentMethod: `Demo · ${b.paymentMethod || 'Payment'}`,
        status: 'upcoming',
      };
    });
  }, [statsData]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header section="Venue partner" title="Business overview" subtitle={statsData?.owner?.name ? `Welcome back, ${statsData.owner.name}` : 'Your venues and upcoming activity'} />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {error ? <View style={styles.messageCard}><Text style={styles.messageText}>{error}</Text><Pressable accessibilityRole="button" onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable></View> : null}
        {loading ? <View style={styles.messageCard}><Text style={styles.messageText}>Loading your business activity…</Text></View> : null}
        {!loading && !error ? <>
        <SectionTitle title="Upcoming Bookings" />
        <View style={styles.section}>
          {upcomingCards.length === 0 ? <Text style={styles.messageText}>No upcoming bookings.</Text> : upcomingCards.map((booking) => (
            <OwnerBookingCard key={booking.id} booking={booking} />
          ))}
        </View>

        <SectionTitle title="My Turf" />
        <View style={styles.section}>
          {heroTurf ? <TurfInfoCard turf={heroTurf} /> : <Text style={styles.messageText}>No venues linked to your account.</Text>}
        </View>

        {/* KPI grid: 2x2 of stat tiles */}
        <SectionTitle title="Recorded activity · all time and upcoming" />
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
          {aiInsights.length === 0 ? <Text style={styles.messageText}>Not enough booking history for an insight yet.</Text> : aiInsights.map((insight, idx) => (
            <View key={insight.id || idx} style={{ marginBottom: SPACING.sm }}>
              <AIInsightCard insight={insight} onPress={() => navigation.navigate('Turf', { turfId: insight.turfId })} />
              {insight.dataBasis ? <Text style={styles.basisText}>{insight.dataBasis}</Text> : null}
            </View>
          ))}
        </View>

        </> : null}

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
  messageCard: { marginHorizontal: SPACING.lg, marginTop: SPACING.md, padding: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.lg },
  messageText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 20 },
  basisText: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, marginTop: SPACING.xs, paddingHorizontal: SPACING.sm },
  retryText: { color: COLORS.primaryDark, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.sm },
});
