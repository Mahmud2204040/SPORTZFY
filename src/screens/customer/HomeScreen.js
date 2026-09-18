import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import SectionTitle from '../../components/SectionTitle';
import TurfCard from '../../components/TurfCard';
import { turfsApi } from '../../api/turfs';

import { useBooking } from '../../context/BookingContext';
import { dhakaDateOffset } from '../../utils/dateUtils';
import {
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../../constants/theme';

const HORIZONTAL_CARD_WIDTH = 270;

export default function HomeScreen({ navigation }) {
  const { userCity, userArea, setUserCity, setUserArea } = useBooking();
  const [shelves, setShelves] = useState([]);
  const [squadsShelf, setSquadsShelf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [priceOpportunity, setPriceOpportunity] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dhakaDateOffset());
  const [locationModal, setLocationModal] = useState(false);
  const [cityDraft, setCityDraft] = useState(userCity);
  const [areaDraft, setAreaDraft] = useState(userArea);

  const fetchShelves = useCallback(async () => {
    try {
      const [shelvesResult, pricesResult] = await Promise.allSettled([
        turfsApi.getShelves({ city: userCity }),
        turfsApi.getTurfs({ city: userCity, area: userArea || undefined, date: selectedDate, availableOnly: true }),
      ]);
      if (shelvesResult.status === 'fulfilled') { setShelves(shelvesResult.value.shelves); setSquadsShelf(shelvesResult.value.squadsShelf || null); }
      else { setShelves([]); setSquadsShelf(null); setError(shelvesResult.reason?.message || 'Could not load nearby venues.'); }
      if (pricesResult.status === 'fulfilled') {
        const ranked = pricesResult.value.items.filter(item => item.selectedDateAvailability?.lowestAvailablePrice !== null && item.selectedDateAvailability?.lowestAvailablePrice !== undefined).sort((a, b) => a.selectedDateAvailability.lowestAvailablePrice - b.selectedDateAvailability.lowestAvailablePrice || a.id.localeCompare(b.id));
        setPriceOpportunity(ranked[0] || null);
      } else setPriceOpportunity(null);
    } catch (err) {
      setError(err?.message || 'Could not load discovery.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userCity, userArea, selectedDate]);

  async function useMyLocation() {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') { Alert.alert('Location not enabled', 'Your manual city and area remain selected.'); return; }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const addresses = await Location.reverseGeocodeAsync(position.coords);
      const place = addresses[0];
      if (place?.city || place?.region) { setUserCity(place.city || place.region); setUserArea(place.district || place.subregion || ''); }
    } catch { Alert.alert('Location unavailable', 'Your manual city and area remain selected.'); }
  }

  useEffect(() => {
    fetchShelves();
  }, [fetchShelves]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchShelves();
  };

  // Horizontal shelf carousel
  function ShelfCarousel({ shelf }) {
    if (!shelf || !shelf.turfs || shelf.turfs.length === 0) return null;

    return (
      <View style={styles.shelfSection}>
        <SectionTitle
          title={shelf.title}
          subtitle={shelf.subtitle}
          onSeeAll={() => navigation.navigate('Explore', { shelfId: shelf.id })}
        />
        <FlatList
          data={shelf.turfs}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hListContent}
          snapToInterval={HORIZONTAL_CARD_WIDTH + SPACING.md}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <View style={{ width: HORIZONTAL_CARD_WIDTH, marginRight: SPACING.md }}>
              <TurfCard
                turf={item}
                onPress={() => navigation.navigate('TurfDetails', { turfId: item.id })}
              />
            </View>
          )}
        />
      </View>
    );
  }

  // Open squad card shelf
  function SquadShelfWidget({ data }) {
    if (!data || !data.matches || data.matches.length === 0) return null;

    return (
      <View style={styles.shelfSection}>
        <SectionTitle
          title={`⚡ ${data.title}`}
          subtitle={data.subtitle}
          onSeeAll={() => navigation.navigate('Matches')}
        />
        <FlatList
          data={data.matches}
          keyExtractor={(item) => String(item.id)}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hListContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.squadCard}
              onPress={() => navigation.navigate('MatchDetail', { matchId: item.id })}
            >
              <View style={styles.squadHeader}>
                <View style={styles.squadFormatBadge}>
                  <Text style={styles.squadFormatText}>{item.sportFormat || '7v7'}</Text>
                </View>
                <View style={styles.squadSpotBadge}>
                  <Ionicons name="people" size={13} color={COLORS.primary} />
                  <Text style={styles.squadSpotText}>{item.openSpots} spots left</Text>
                </View>
              </View>

              <Text style={styles.squadTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.squadVenue} numberOfLines={1}>
                📍 {item.turf?.name || item.area || 'Chattogram'}
              </Text>

              <View style={styles.squadFooter}>
                <Text style={styles.squadHost}>Host: {item.hostName}</Text>
                <Text style={styles.squadCost}>
                  ৳{item.costPerPlayer ? `${item.costPerPlayer}/p` : 'Free'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header section="Discover" title="Find your next game" subtitle={`Venues near ${userCity || 'you'}`} />

      <ScrollView
        style={styles.container}
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
        <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, gap: SPACING.sm }}><TouchableOpacity accessibilityRole="button" onPress={() => { setCityDraft(userCity); setAreaDraft(userArea); setLocationModal(true); }}><Text style={{ color: COLORS.textPrimary, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold }}>{[userArea, userCity].filter(Boolean).join(', ') || 'Choose location'} · Change</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={useMyLocation}><Text style={{ color: COLORS.primaryDark }}>Use my location</Text></TouchableOpacity><View style={{ flexDirection: 'row', gap: SPACING.sm }}>{[0, 1].map(offset => <TouchableOpacity key={offset} accessibilityRole="button" accessibilityState={{ selected: selectedDate === dhakaDateOffset(offset) }} onPress={() => setSelectedDate(dhakaDateOffset(offset))}><Text style={{ color: selectedDate === dhakaDateOffset(offset) ? COLORS.primaryDark : COLORS.textSecondary }}>{offset === 0 ? 'Today' : 'Tomorrow'} · {dhakaDateOffset(offset)}</Text></TouchableOpacity>)}</View></View>
        {/* Search bar — taps directly into Explore */}
        <View style={styles.searchWrapper}>
          <SearchBar
            placeholder={`Search venues in ${userCity || 'your city'}...`}
            editable={false}
            onPress={() => navigation.navigate('Explore')}
          />
        </View>
        {error ? <TouchableOpacity accessibilityRole="button" onPress={fetchShelves} style={{ padding: SPACING.lg }}><Text style={{ color: COLORS.danger }}>{error} Tap to retry.</Text></TouchableOpacity> : null}
        {priceOpportunity ? <TouchableOpacity accessibilityRole="button" onPress={() => navigation.navigate('TurfDetails', { turfId: priceOpportunity.id })} style={{ marginHorizontal: SPACING.lg, padding: SPACING.lg, borderRadius: RADIUS.lg, backgroundColor: '#EAF4ED' }}><Text style={{ color: COLORS.primaryDark, fontWeight: FONT_WEIGHT.bold }}>AI Price Guide · {selectedDate}</Text><Text style={{ color: COLORS.textPrimary }}>{priceOpportunity.name} · from ৳{priceOpportunity.selectedDateAvailability.lowestAvailablePrice}/hr</Text><Text style={{ color: COLORS.textSecondary }}>Available slot quote · tap to see times</Text></TouchableOpacity> : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Fetching live venues...</Text>
          </View>
        ) : shelves.length > 0 ? (
          // Render Live Discovery Shelves from API
          <>
            {shelves.map((shelf) => (
              <ShelfCarousel key={shelf.id} shelf={shelf} />
            ))}
            {squadsShelf && <SquadShelfWidget data={squadsShelf} />}
          </>
        ) : (
          // Honest empty state; seeded content is reserved for explicit demo builds.
          <>
            <View style={styles.loadingBox}>
              <Ionicons name="cloud-offline-outline" size={42} color={COLORS.textMuted} />
              <Text style={styles.loadingText}>No venues are available right now.</Text>
              <TouchableOpacity onPress={fetchShelves} accessibilityRole="button" accessibilityLabel="Retry loading venues"><Text style={{color: COLORS.primary, fontWeight: '700'}}>Retry</Text></TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
      <Modal visible={locationModal} animationType="slide" onRequestClose={() => setLocationModal(false)}><SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }} edges={['top', 'bottom']}><View style={{ padding: SPACING.lg, gap: SPACING.md }}><Text style={{ color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold }}>Choose location</Text><TextInput accessibilityLabel="City" placeholder="City" value={cityDraft} onChangeText={setCityDraft} style={{ minHeight: 48, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md }}/><TextInput accessibilityLabel="Area" placeholder="Area (optional)" value={areaDraft} onChangeText={setAreaDraft} style={{ minHeight: 48, backgroundColor: COLORS.card, borderColor: COLORS.border, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md }}/><TouchableOpacity accessibilityRole="button" onPress={() => { if (!cityDraft.trim()) return; setUserCity(cityDraft.trim()); setUserArea(areaDraft.trim()); setLocationModal(false); }} style={{ minHeight: 48, borderRadius: RADIUS.md, backgroundColor: COLORS.primaryDark, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontWeight: FONT_WEIGHT.bold }}>Save location</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" onPress={() => setLocationModal(false)}><Text style={{ color: COLORS.textSecondary }}>Cancel</Text></TouchableOpacity></View></SafeAreaView></Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: SPACING.xxl,
  },
  searchWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xs,
  },
  shelfSection: {
    marginBottom: SPACING.sm,
  },
  hListContent: {
    paddingHorizontal: SPACING.lg,
  },
  verticalList: {
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
  squadCard: {
    width: 220,
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  squadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  squadFormatBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  squadFormatText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: '#166534',
  },
  squadSpotBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  squadSpotText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  squadTitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.xs,
  },
  squadVenue: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  squadFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  squadHost: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  squadCost: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});
