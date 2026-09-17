import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/Header';
import SegmentedControl from '../../components/SegmentedControl';
import BookingCard from '../../components/BookingCard';

import { useBooking } from '../../context/BookingContext';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

// Inner status tabs (Upcoming / Completed / Cancelled).
const STATUS_OPTIONS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
  { id: 'cancelled', label: 'Cancelled' },
];

export default function BookingsScreen() {
  const { bookings, fetchBookings } = useBooking();
  const { user } = useAuth();

  // Fetch real bookings from API on mount
  useEffect(() => { if (user) fetchBookings && fetchBookings(); }, [fetchBookings, user]);

  const [statusTab, setStatusTab] = useState('upcoming');

  // Filter bookings by status tab.
  const filteredBookings = useMemo(
    () => bookings.filter((b) => b.status === statusTab),
    [bookings, statusTab]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header section="Your activity" title="Bookings" subtitle="Your upcoming and past reservations" />

      {!user ? <View style={styles.empty}><Ionicons name="lock-closed-outline" size={36} color={COLORS.textMuted}/><Text style={styles.emptyTitle}>Sign in to view bookings</Text></View> : <BookingsView
        statusTab={statusTab}
        setStatusTab={setStatusTab}
        bookings={filteredBookings}
      />}
    </SafeAreaView>
  );
}

// --- Sub-view: Bookings list ------------------------------------------------
function BookingsView({ statusTab, setStatusTab, bookings }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.innerToggleRow}>
        <SegmentedControl
          options={STATUS_OPTIONS}
          value={statusTab}
          onChange={setStatusTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {bookings.length === 0 ? (
          <EmptyState statusTab={statusTab} />
        ) : (
          bookings.map((booking) => (
            <BookingCard key={booking.id} booking={booking} />
          ))
        )}
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </View>
  );
}

function EmptyState({ statusTab }) {
  const labels = {
    upcoming: 'You have no upcoming bookings.',
    completed: 'No completed bookings yet.',
    cancelled: 'No cancelled bookings.',
  };

  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="calendar-outline" size={36} color={COLORS.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Nothing here yet</Text>
      <Text style={styles.emptySub}>{labels[statusTab]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },

  // Inner tabs (Upcoming / Completed / Cancelled).
  innerToggleRow: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },

  listContent: {
    paddingHorizontal: SPACING.lg,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
});
