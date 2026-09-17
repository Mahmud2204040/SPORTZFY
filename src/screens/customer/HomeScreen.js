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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/Header';
import SearchBar from '../../components/SearchBar';
import SectionTitle from '../../components/SectionTitle';
import TurfCard from '../../components/TurfCard';
import { turfsApi } from '../../api/turfs';

import {
  POPULAR_TURFS,
  NEARBY_TURFS,
  RECOMMENDED_TURFS,
} from '../../data/mockData';
import { useBooking } from '../../context/BookingContext';
import {
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../../constants/theme';

const HORIZONTAL_CARD_WIDTH = 270;

export default function HomeScreen({ navigation }) {
  const { userCity } = useBooking();
  const [shelves, setShelves] = useState([]);
  const [squadsShelf, setSquadsShelf] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchShelves = useCallback(async () => {
    try {
      const res = await turfsApi.getShelves({
        city: userCity || 'Chattogram',
      });

      if (res && Array.isArray(res.shelves)) {
        setShelves(res.shelves);
        setSquadsShelf(res.squadsShelf || null);
      }
    } catch (err) {
      console.log('Error fetching discovery shelves, using local fallback:', err?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userCity]);

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
      <Header />

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
        {/* Search bar — taps directly into Explore */}
        <View style={styles.searchWrapper}>
          <SearchBar
            placeholder="Search turfs in Chattogram..."
            editable={false}
            onPress={() => navigation.navigate('Explore')}
          />
        </View>

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
