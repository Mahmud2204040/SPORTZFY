import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/Header';
import MatchCard from '../../components/MatchCard';
import SegmentedControl from '../../components/SegmentedControl';
import { matchesApi } from '../../api/matches';
import { useAuth } from '../../context/AuthContext';

import {
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../../constants/theme';

const VIEW_OPTIONS = [
  { id: 'discover', label: 'Discover' },
  { id: 'my', label: 'My Squads' },
];

const FORMAT_OPTIONS = ['All', '7v7', '5v5', '11v11'];

export default function MatchesScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleUnauthorized = async (err) => {
    if (err?.status === 401) {
      await logout();
    }
  };

  const [view, setView] = useState('discover');
  const [matches, setMatches] = useState([]);
  const [myMatches, setMyMatches] = useState({ hosting: [], joined: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [formatFilter, setFormatFilter] = useState('All');

  const fetchDiscover = useCallback(async () => {
    try {
      const res = await matchesApi.getMatches({
        format: formatFilter !== 'All' ? formatFilter : undefined,
      });

      // matchesApi.getMatches() returns `{ data: matches, count }`
      // but keep this resilient to accidental shape drift.
      const list = Array.isArray(res)
        ? res
        : Array.isArray(res?.items)
          ? res.items
          : [];

      setMatches(list);
    } catch (err) {
      console.log('Error fetching matches:', err?.message);
      setMatches([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [formatFilter]);

  const fetchMyMatches = useCallback(async () => {
    try {
      const res = await matchesApi.getMyMatches();
      // matchesApi.getMyMatches() already returns { hosting, joined }
      setMyMatches(res && typeof res === 'object' ? res : { hosting: [], joined: [] });
    } catch (err) {
      console.log('Error fetching my matches:', err?.message);
      await handleUnauthorized(err);
      setMyMatches({ hosting: [], joined: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    if (view === 'discover') {
      fetchDiscover();
    } else {
      fetchMyMatches();
    }
  }, [view, fetchDiscover, fetchMyMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    if (view === 'discover') {
      fetchDiscover();
    } else {
      fetchMyMatches();
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header />

      <View style={styles.toggleRow}>
        <SegmentedControl options={VIEW_OPTIONS} value={view} onChange={setView} />
      </View>

      {view === 'discover' ? (
        <DiscoverView
          matches={matches}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          formatFilter={formatFilter}
          setFormatFilter={setFormatFilter}
          onMatchPress={(m) => navigation.navigate('MatchDetail', { matchId: m.id })}
        />
      ) : (
        <MySquadsView
          myMatches={myMatches}
          loading={loading}
          refreshing={refreshing}
          onRefresh={onRefresh}
          onMatchPress={(m) => navigation.navigate('MatchDetail', { matchId: m.id })}
          user={user}
        />
      )}

      {/* FAB: Create Match */}
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMatch')}
      >
        <Ionicons name="add" size={28} color={COLORS.textOnPrimary} />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// --- Discover Tab ---
function DiscoverView({ matches, loading, refreshing, onRefresh, formatFilter, setFormatFilter, onMatchPress }) {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Format filter chips */}
      <View style={styles.filterRow}>
        {FORMAT_OPTIONS.map((f) => (
          <TouchableOpacity
            key={f}
            activeOpacity={0.8}
            onPress={() => setFormatFilter(f)}
            style={[styles.filterChip, formatFilter === f && styles.filterChipSelected]}
          >
            <Text style={[styles.filterText, formatFilter === f && styles.filterTextSelected]}>
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading matches...</Text>
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="people-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No open matches</Text>
            <Text style={styles.emptySub}>Check back later or create your own squad!</Text>
          </View>
        ) : (
          matches.map((match) => (
            <MatchCard key={match.id} match={match} onPress={onMatchPress} />
          ))
        )}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

// --- My Squads Tab ---
function MySquadsView({ myMatches, loading, refreshing, onRefresh, onMatchPress, user }) {
  const hosting = myMatches.hosting || [];
  const joined = myMatches.joined || [];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
      }
    >
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <>
          {/* Hosted matches */}
          {hosting.length > 0 && (
            <View style={styles.mySection}>
              <Text style={styles.mySectionTitle}>Matches You're Hosting</Text>
              {hosting.map((match) => (
                <MatchCard key={match.id} match={match} onPress={onMatchPress} />
              ))}
            </View>
          )}

          {/* Joined matches */}
          {joined.length > 0 && (
            <View style={styles.mySection}>
              <Text style={styles.mySectionTitle}>Squads You've Joined</Text>
              {joined.map((item) => (
                <View key={item.requestId} style={styles.joinedCard}>
                  <View style={styles.joinedInfo}>
                    <Text style={styles.joinedTitle} numberOfLines={1}>
                      {item.match?.title || 'Match'}
                    </Text>
                    <Text style={styles.joinedVenue} numberOfLines={1}>
                      {item.match?.turf?.name || ''}
                    </Text>
                    <View style={styles.joinedMeta}>
                      <View style={[styles.joinedStatusBadge, {
                        backgroundColor: item.requestStatus === 'ACCEPTED' ? '#DCFCE7' :
                          item.requestStatus === 'REJECTED' ? '#FEE2E2' : '#FEF3C7',
                      }]}>
                        <Text style={[styles.joinedStatusText, {
                          color: item.requestStatus === 'ACCEPTED' ? '#166534' :
                            item.requestStatus === 'REJECTED' ? '#B91C1C' : '#92400E',
                        }]}>
                          {item.requestStatus}
                        </Text>
                      </View>
                      {item.preferredRole && (
                        <Text style={styles.joinedRole}>Role: {item.preferredRole}</Text>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {hosting.length === 0 && joined.length === 0 && (
            <View style={styles.emptyBox}>
              <Ionicons name="football-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No squads yet</Text>
              <Text style={styles.emptySub}>Join a match or create one to get started!</Text>
            </View>
          )}
        </>
      )}
      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  toggleRow: {
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    marginTop: -SPACING.lg,
  },

  // Format filter
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  filterTextSelected: {
    color: COLORS.textOnPrimary,
  },

  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  loadingBox: {
    padding: SPACING.xxxl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },

  // My squads
  mySection: {
    marginBottom: SPACING.lg,
  },
  mySectionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // Joined card
  joinedCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  joinedInfo: {
    flex: 1,
  },
  joinedTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  joinedVenue: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  joinedMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  joinedStatusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  joinedStatusText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  joinedRole: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 6,
  },
});
