import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
import SearchBar from '../../components/SearchBar';
import TurfCard from '../../components/TurfCard';
import FilterModal from '../../components/FilterModal';
import { turfsApi } from '../../api/turfs';

import {
  getAllLocations,
  getAllSports,
  PRICE_RANGE,
} from '../../data/mockData';
import {
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../../constants/theme';

const DEFAULT_FILTERS = {
  location: 'All',
  date: 'Any',
  sport: 'All',
  minPrice: PRICE_RANGE.min,
  maxPrice: PRICE_RANGE.max,
  minRating: 'Any',
  availability: 'Any',
};

export default function ExploreScreen({ navigation, route }) {
  const initialQuery = route?.params?.query || '';

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const [apiTurfs, setApiTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchTurfs = useCallback(async () => {
    setError('');
    try {
      const params = {};

      if (query.trim()) params.q = query.trim();
      if (filters.location !== 'All') params.city = filters.location;
      if (filters.sport !== 'All' && /^(5v5|6v6|7v7|Cricket Box)$/i.test(filters.sport)) params.format = filters.sport;

      const res = await turfsApi.getTurfs(params);

      if (res && Array.isArray(res.items)) {
        setApiTurfs(res.items);
      }
    } catch (err) {
      setError(err?.message || 'Could not load turfs.');
      setApiTurfs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, filters]);

  useEffect(() => {
    const timer = setTimeout(fetchTurfs, 300);
    return () => clearTimeout(timer);
  }, [fetchTurfs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTurfs();
  };

  function parseRating(value) {
    if (!value || value === 'Any') return 0;
    return parseFloat(value) || 0;
  }

  // Apply client-side filters on top of API results
  const results = useMemo(() => {
    const minRating = parseRating(filters.minRating);
    const source = apiTurfs;

    return source.filter((t) => {
      // Price filter
      const price = t.basePricePerHour ?? t.pricePerHour ?? 0;
      if (price < filters.minPrice || price > filters.maxPrice) {
        return false;
      }

      // Rating filter
      if (t.rating < minRating) {
        return false;
      }

      // Availability filter (mock for fallback data)
      if (filters.availability === 'Available today' && t.availableSlots) {
        const hasOpen = t.availableSlots.some((s) => s.status === 'available');
        if (!hasOpen) return false;
      }

      return true;
    });
  }, [apiTurfs, filters]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.location !== 'All') count++;
    if (filters.sport !== 'All') count++;
    if (filters.minRating !== 'Any') count++;
    if (filters.availability !== 'Any') count++;
    if (filters.minPrice !== PRICE_RANGE.min || filters.maxPrice !== PRICE_RANGE.max) count++;
    if (filters.date !== 'Any') count++;
    return count;
  }, [filters]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header />

      {/* Search + filter row */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={fetchTurfs}
            placeholder="Search turfs..."
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          activeOpacity={0.8}
          onPress={() => setShowFilters(true)}
        >
          <Ionicons name="options-outline" size={20} color={COLORS.textOnPrimary} />
          {activeFilterCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Result count */}
      <View style={styles.summaryRow}>
        <Text style={styles.summary}>
          {loading ? 'Searching...' : `${results.length} ${results.length === 1 ? 'turf' : 'turfs'} found`}
        </Text>
      </View>

      {/* Results */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Finding turfs...</Text>
          </View>
        ) : error ? (
          <View style={styles.empty}>
            <Ionicons name="cloud-offline-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Could not load turfs</Text>
            <Text style={styles.emptySubtitle}>{error}</Text>
            <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}><Text style={styles.retryText}>Retry</Text></TouchableOpacity>
          </View>
        ) : results.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No turfs found</Text>
            <Text style={styles.emptySubtitle}>
              Try changing your filters or search keywords.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {results.map((turf) => (
              <TurfCard
                key={turf.id}
                turf={turf}
                onPress={() =>
                  navigation.navigate('TurfDetails', { turfId: turf.id })
                }
              />
            ))}
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next);
          setShowFilters(false);
        }}
        onReset={(cleared) => setFilters(cleared)}
        locations={getAllLocations()}
        sports={getAllSports()}
        priceRange={PRICE_RANGE}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    marginTop: -SPACING.lg,
  },
  filterBtn: {
    marginLeft: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: COLORS.textOnPrimary,
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  summaryRow: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.background,
  },
  summary: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },
  scroll: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  list: {
    paddingHorizontal: SPACING.lg,
  },
  loadingBox: {
    padding: SPACING.xxxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxxl,
  },
  emptyTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  retryBtn: { marginTop: SPACING.md, backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm, borderRadius: RADIUS.md },
  retryText: { color: COLORS.textOnPrimary, fontWeight: FONT_WEIGHT.semibold },
});
