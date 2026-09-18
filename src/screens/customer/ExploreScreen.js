import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
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
import { dhakaDateOffset, nextDhakaFriday } from '../../utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBooking } from '../../context/BookingContext';

import {
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../../constants/theme';

const PRICE_RANGE = { min: 0, max: null };
const FILTERS_STORAGE_KEY = 'sportzfy.explore-filters.v2';

const DEFAULT_FILTERS = {
  location: 'All',
  date: 'Any',
  format: 'All',
  area: '',
  startHour: '',
  endHour: '',
  amenities: [],
  minPrice: PRICE_RANGE.min,
  maxPrice: PRICE_RANGE.max,
  minRating: 'Any',
  availability: 'Any',
};

export default function ExploreScreen({ navigation, route }) {
  const { userCity, userArea } = useBooking();
  const initialQuery = route?.params?.query || '';

  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, location: userCity || 'All', area: userArea || '' });
  const [filtersReady, setFiltersReady] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const [apiTurfs, setApiTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    AsyncStorage.getItem(FILTERS_STORAGE_KEY).then(value => { if (value) setFilters({ ...DEFAULT_FILTERS, ...JSON.parse(value) }); }).catch(() => {}).finally(() => setFiltersReady(true));
  }, []);
  useEffect(() => { if (filtersReady) AsyncStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters)).catch(() => {}); }, [filters, filtersReady]);

  const fetchTurfs = useCallback(async (cursor = null) => {
    const currentRequest = cursor ? requestId.current : ++requestId.current;
    if (cursor) setLoadingMore(true);
    setError('');
    try {
      const params = {};

      if (query.trim()) params.q = query.trim();
      if (filters.location !== 'All') params.city = filters.location;
      if (filters.area.trim()) params.area = filters.area.trim();
      if (filters.format !== 'All') params.format = filters.format;
      if (filters.startHour !== '') params.startHour = filters.startHour;
      if (filters.endHour !== '') params.endHour = filters.endHour;
      const amenityMap = { 'Floodlights': 'hasFloodlights', 'Parking': 'hasParking', 'Washroom': 'hasWashroom', 'Changing room': 'hasChangingRoom', 'Water': 'hasWater' };
      if (filters.amenities.length) params.amenities = filters.amenities.map(item => amenityMap[item]).filter(Boolean).join(',');
      if (filters.date === 'Today') params.date = dhakaDateOffset();
      else if (filters.date === 'Tomorrow') params.date = dhakaDateOffset(1);
      else if (filters.date === 'This Weekend') params.date = nextDhakaFriday();
      if (filters.availability !== 'Any') { params.availableOnly = true; params.date ||= dhakaDateOffset(); }
      if (filters.startHour !== '' || filters.endHour !== '') params.date ||= dhakaDateOffset();
      if (filters.minPrice !== PRICE_RANGE.min) params.minPrice = filters.minPrice;
      if (filters.maxPrice !== PRICE_RANGE.max && filters.maxPrice !== '') params.maxPrice = filters.maxPrice;
      if (filters.minRating !== 'Any') params.minRating = parseFloat(filters.minRating);
      if (cursor) params.cursor = cursor;

      const res = await turfsApi.getTurfs(params);
      if (currentRequest !== requestId.current) return;
      setApiTurfs(current => cursor ? [...current, ...res.items] : res.items);
      setNextCursor(res.nextCursor);
    } catch (err) {
      if (currentRequest !== requestId.current) return;
      setError(err?.message || 'Could not load turfs.');
      if (!cursor) setApiTurfs([]);
    } finally {
      if (currentRequest === requestId.current) { setLoading(false); setRefreshing(false); setLoadingMore(false); }
    }
  }, [query, filters]);

  useEffect(() => {
    if (!filtersReady) return;
    const timer = setTimeout(() => { setLoading(true); fetchTurfs(); }, 300);
    return () => { clearTimeout(timer); requestId.current += 1; };
  }, [fetchTurfs, filtersReady]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTurfs();
  };

  const results = apiTurfs;

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.location !== 'All') count++;
    if (filters.format !== 'All') count++;
    if (filters.area) count++;
    if (filters.startHour || filters.endHour) count++;
    if (filters.amenities.length) count++;
    if (filters.minRating !== 'Any') count++;
    if (filters.availability !== 'Any') count++;
    if (filters.minPrice !== PRICE_RANGE.min || filters.maxPrice !== PRICE_RANGE.max) count++;
    if (filters.date !== 'Any') count++;
    return count;
  }, [filters]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header section="Explore" title="Browse venues" subtitle="Find a pitch that fits your game" />

      {/* Search + filter row */}
      <View style={styles.searchRow}>
        <View style={{ flex: 1 }}>
          <SearchBar
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => fetchTurfs()}
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.sm, backgroundColor: COLORS.background }}>
        {filters.location !== 'All' ? <TouchableOpacity accessibilityRole="button" onPress={() => setFilters(current => ({ ...current, location: 'All' }))}><Text style={styles.summary}>City: {filters.location} ×</Text></TouchableOpacity> : null}
        {filters.area ? <TouchableOpacity accessibilityRole="button" onPress={() => setFilters(current => ({ ...current, area: '' }))}><Text style={styles.summary}>Area: {filters.area} ×</Text></TouchableOpacity> : null}
        {filters.date !== 'Any' ? <TouchableOpacity accessibilityRole="button" onPress={() => setFilters(current => ({ ...current, date: 'Any' }))}><Text style={styles.summary}>{filters.date} ×</Text></TouchableOpacity> : null}
        {filters.format !== 'All' ? <TouchableOpacity accessibilityRole="button" onPress={() => setFilters(current => ({ ...current, format: 'All' }))}><Text style={styles.summary}>{filters.format} ×</Text></TouchableOpacity> : null}
        {filters.availability !== 'Any' ? <TouchableOpacity accessibilityRole="button" onPress={() => setFilters(current => ({ ...current, availability: 'Any' }))}><Text style={styles.summary}>Available only ×</Text></TouchableOpacity> : null}
      </ScrollView>

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
            <Text style={styles.emptyTitle}>{nextCursor ? 'No matches in this batch' : 'No turfs found'}</Text>
            <Text style={styles.emptySubtitle}>
              {nextCursor ? 'Continue searching the remaining venues.' : 'Try changing your filters or search keywords.'}
            </Text>
            {nextCursor ? <TouchableOpacity accessibilityRole="button" disabled={loadingMore} onPress={() => fetchTurfs(nextCursor)} style={styles.retryBtn}><Text style={styles.retryText}>{loadingMore ? 'Searching…' : 'Search more venues'}</Text></TouchableOpacity> : null}
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
            {nextCursor ? <TouchableOpacity accessibilityRole="button" disabled={loadingMore} onPress={() => fetchTurfs(nextCursor)} style={styles.retryBtn}><Text style={styles.retryText}>{loadingMore ? 'Loading…' : 'Load more venues'}</Text></TouchableOpacity> : null}
          </View>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={(next) => {
          setFilters(next.date === 'Any' && (next.startHour !== '' || next.endHour !== '') ? { ...next, date: 'Today' } : next);
          setShowFilters(false);
        }}
        onReset={(cleared) => setFilters(cleared)}
        formats={['5v5', '6v6', '7v7', '11v11']}
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
