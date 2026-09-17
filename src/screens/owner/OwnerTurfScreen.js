// OwnerTurfScreen — owner's turf management tab.
// Lets the owner view their turf header, edit turf details/pricing,
// and toggle slot lock/unlock by writing blocked intervals to the API.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import SectionTitle from '../../components/SectionTitle';
import OwnerSlotTile from '../../components/OwnerSlotTile';
import EditTurfModal from '../../components/EditTurfModal';
import EditPriceModal from '../../components/EditPriceModal';

import { ownerApi } from '../../api/owner';

import {
  OWNER_TURF_CARD,
  OWNER_TURF_FORM,
  OWNER_SLOTS,
  PRICING_TIERS,
} from '../../data/ownerMockData';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

const DEFAULT_BLOCK_REASON = 'Walk-in / maintenance reservation';

function getDhakaDateParts(baseDate = new Date()) {
  // Dhaka time = UTC + 6
  const dhaka = new Date(baseDate.getTime() + 6 * 60 * 60 * 1000);
  return {
    year: dhaka.getUTCFullYear(),
    monthIndex: dhaka.getUTCMonth(),
    day: dhaka.getUTCDate(),
  };
}

function parseHHMM(hhmm) {
  const [hRaw, mRaw] = String(hhmm).split(':');
  return {
    h: parseInt(hRaw, 10),
    m: parseInt(mRaw || '0', 10),
  };
}

function toDhakaSlotISO({ dhakaParts, startHHMM, endHHMM }) {
  const { year, monthIndex, day } = dhakaParts;

  const start = parseHHMM(startHHMM);
  const end = parseHHMM(endHHMM);

  // Convert Dhaka local hours to UTC by subtracting 6.
  // If the slot ends at 00:00 and start is in the evening, it crosses midnight.
  const endDayOffset = end.h < start.h || (end.h === start.h && end.m <= start.m) ? 1 : 0;

  const startUtc = new Date(Date.UTC(year, monthIndex, day, start.h - 6, start.m, 0, 0));
  const endUtc = new Date(Date.UTC(year, monthIndex, day + endDayOffset, end.h - 6, end.m, 0, 0));

  return {
    startTime: startUtc.toISOString(),
    endTime: endUtc.toISOString(),
  };
}

export default function OwnerTurfScreen() {
  const [form, setForm] = useState(OWNER_TURF_FORM);
  const [tiers, setTiers] = useState(PRICING_TIERS);
  const [showEditTurf, setShowEditTurf] = useState(false);
  const [showEditPrice, setShowEditPrice] = useState(false);

  const [ownerTurfs, setOwnerTurfs] = useState([]);
  const [selectedTurf, setSelectedTurf] = useState(null);
  const [blockedIntervals, setBlockedIntervals] = useState([]);

  const [loadingTurfs, setLoadingTurfs] = useState(true);
  const [loadingBlocked, setLoadingBlocked] = useState(false);
  const [updatingSlot, setUpdatingSlot] = useState(false);

  const dhakaParts = useMemo(() => getDhakaDateParts(new Date()), []);

  const fetchTurfs = useCallback(async () => {
    setLoadingTurfs(true);
    try {
      const res = await ownerApi.getTurfs();
      const list = res?.items || [];
      setOwnerTurfs(list);
      if (list.length > 0) {
        setSelectedTurf(list[0]);
        // Keep editor form consistent with the turf we fetched (best-effort).
        setForm((prev) => ({
          ...prev,
          name: list[0].name || prev.name,
          location: list[0].area
            ? `${list[0].area}, ${list[0].city || ''}`.trim().replace(/,$/, '')
            : prev.location,
        }));
      }
    } catch (err) {
      console.log('Error fetching owner turfs:', err?.message);
      Alert.alert('Error', err?.message || 'Could not load your venues.');
    } finally {
      setLoadingTurfs(false);
    }
  }, []);

  const fetchBlocked = useCallback(
    async (turfId) => {
      if (!turfId) return;
      setLoadingBlocked(true);
      try {
        const res = await ownerApi.getBlockedIntervals(turfId);
      setBlockedIntervals(res?.items || []);
      } catch (err) {
        console.log('Error fetching blocked intervals:', err?.message);
        Alert.alert('Error', err?.message || 'Could not load blocked slots.');
      } finally {
        setLoadingBlocked(false);
      }
    },
    [setBlockedIntervals]
  );

  useEffect(() => {
    fetchTurfs();
  }, [fetchTurfs]);

  useEffect(() => {
    if (selectedTurf?.id) fetchBlocked(selectedTurf.id);
  }, [selectedTurf?.id, fetchBlocked]);

  const hero = useMemo(() => {
    if (!selectedTurf) return OWNER_TURF_CARD;

    const totalSlotsEstimate =
      (selectedTurf.activeBookingsCount || 0) + (selectedTurf.blockedIntervalsCount || 0);

    return {
      name: selectedTurf.name,
      location: `${selectedTurf.area || ''}, ${selectedTurf.city || ''}`.trim().replace(/,$/, ''),
      rating: selectedTurf.rating || 0,
      reviewCount: 0,
      pricePerHour: selectedTurf.basePricePerHour || 0,
      bookedSlots: selectedTurf.activeBookingsCount || 0,
      totalSlots: Math.max(1, totalSlotsEstimate),
      image: selectedTurf.coverImage || OWNER_TURF_CARD.image,
    };
  }, [selectedTurf]);

  const slotTemplates = useMemo(
    () => OWNER_SLOTS.map((s) => ({ id: s.id, startTime: s.startTime, endTime: s.endTime })),
    []
  );

  const computedSlots = useMemo(() => {
    const toSlotWindow = (slot) => {
      const { startTime, endTime } = toDhakaSlotISO({
        dhakaParts,
        startHHMM: slot.startTime,
        endHHMM: slot.endTime,
      });
      return { startTime, endTime };
    };

    return slotTemplates.map((slot) => {
      const { startTime, endTime } = toSlotWindow(slot);

      const hit = (blockedIntervals || []).find((bi) => {
        const biStart = new Date(bi.startTime);
        const biEnd = new Date(bi.endTime);
        const sStart = new Date(startTime);
        const sEnd = new Date(endTime);
        return sStart < biEnd && sEnd > biStart;
      });

      return {
        ...slot,
        status: hit ? 'booked' : 'available',
        blockedInterval: hit || null,
        // carry computed ISO times so toggleSlot can re-use them
        startTimeISO: startTime,
        endTimeISO: endTime,
      };
    });
  }, [blockedIntervals, dhakaParts, slotTemplates]);

  const toggleSlot = useCallback(
    async (slot) => {
      if (!selectedTurf?.id) return;
      if (updatingSlot) return;

      setUpdatingSlot(true);
      try {
        if (slot.status === 'available') {
          await ownerApi.createBlockedInterval({
            turfId: selectedTurf.id,
            startTime: slot.startTimeISO,
            endTime: slot.endTimeISO,
            reason: DEFAULT_BLOCK_REASON,
          });
        } else if (slot.blockedInterval?.id) {
          await ownerApi.deleteBlockedInterval(slot.blockedInterval.id);
        }

        // Refresh UI from the source of truth.
        await fetchBlocked(selectedTurf.id);
      } catch (err) {
        console.log('Error updating blocked slot:', err?.message);
        Alert.alert('Error', err?.message || 'Failed to update blocked slot.');
      } finally {
        setUpdatingSlot(false);
      }
    },
    [fetchBlocked, selectedTurf?.id, updatingSlot]
  );

  if (loadingTurfs) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading your venue...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Turf hero header */}
        <View style={styles.heroWrap}>
          <Image source={{ uri: hero.image }} style={styles.heroImage} />
          <View style={styles.heroOverlay} />
          <View style={styles.heroContent}>
            <Text style={styles.heroName}>{hero.name}</Text>
            <View style={styles.heroMetaRow}>
              <Ionicons name="location-sharp" size={14} color={COLORS.textOnPrimary} />
              <Text style={styles.heroMeta}>{hero.location}</Text>
            </View>
            <View style={styles.heroMetaRow}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.heroMeta}>
                {hero.rating} ({hero.reviewCount} reviews)
              </Text>
            </View>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => setShowEditTurf(true)}
          >
            <Ionicons name="create-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Edit Turf</Text>
          </Pressable>
          <View style={{ width: SPACING.sm }} />
          <Pressable
            style={({ pressed }) => [styles.actionBtn, pressed && styles.actionBtnPressed]}
            onPress={() => setShowEditPrice(true)}
          >
            <Ionicons name="pricetag-outline" size={16} color={COLORS.primary} />
            <Text style={styles.actionText}>Edit Pricing</Text>
          </Pressable>
        </View>

        {/* Pricing summary cards */}
        <SectionTitle title="Pricing" />
        <View style={styles.section}>
          {tiers.map((tier) => (
            <View key={tier.id} style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>{tier.label}</Text>
                <Text style={styles.priceHint}>{tier.hint}</Text>
              </View>
              <Text style={styles.priceValue}>৳ {tier.price}/hr</Text>
            </View>
          ))}
        </View>

        {/* Slot availability grid */}
        <SectionTitle title="Slot Availability" />
        <View style={styles.section}>
          {loadingBlocked ? (
            <View style={styles.loadingSlotsInline}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.loadingTextSmall}>Syncing blocked slots...</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {computedSlots.map((slot) => (
                <View key={slot.id} style={styles.slotCell}>
                  <OwnerSlotTile slot={slot} onPress={() => toggleSlot(slot)} />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: SPACING.xxl }} />
      </ScrollView>

      {/* Modals */}
      <EditTurfModal
        visible={showEditTurf}
        form={form}
        onChange={setForm}
        onClose={() => setShowEditTurf(false)}
        onSave={() => setShowEditTurf(false)}
      />
      <EditPriceModal
        visible={showEditPrice}
        tiers={tiers}
        onClose={() => setShowEditPrice(false)}
        onSave={(next) => {
          setTiers(next);
          setShowEditPrice(false);
        }}
      />
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
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  loadingSlotsInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  loadingTextSmall: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  heroWrap: {
    height: 200,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  heroContent: {
    position: 'absolute',
    bottom: SPACING.lg,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  heroName: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textOnPrimary,
    marginBottom: SPACING.xs,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  heroMeta: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textOnPrimary,
    marginLeft: 4,
  },
  actionsRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnPressed: {
    opacity: 0.7,
  },
  actionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
    marginLeft: SPACING.xs,
  },
  section: {
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
  },
  priceLabel: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  priceHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  priceValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  slotCell: {
    width: '50%',
    padding: SPACING.xs,
  },
});
