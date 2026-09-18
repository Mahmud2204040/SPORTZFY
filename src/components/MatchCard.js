// Match recruitment card used in MatchesScreen feed.
// Shows venue, match time, open spots, format, host, and cost.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

const ROLE_COLORS = {
  Goalkeeper: '#7C3AED',
  Defender: '#2563EB',
  Midfielder: '#059669',
  Striker: '#DC2626',
};

export default function MatchCard({ match, onPress, style }) {
  if (!match) return null;

  const turfImage = match.turf?.coverImage;
  const turfName = match.turf?.name || match.area || 'Unknown Venue';
  const hostName = match.hostUser?.name || 'Match Captain';
  const openSpots = match.openSpots ?? 0;
  const totalSpots = match.totalSpots ?? 14;
  const isFull = openSpots <= 0;
  const roleColor = ROLE_COLORS[match.requiredRole] || COLORS.primary;

  // Format match time
  let matchTimeStr = '';
  if (match.matchTime) {
    const d = new Date(match.matchTime);
    matchTimeStr = d.toLocaleString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true });
  }

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`${match.title}, ${matchTimeStr}, ${openSpots} spots open`}
      activeOpacity={0.85}
      onPress={() => onPress && onPress(match)}
      style={[styles.card, style]}
    >
      {/* Hero image */}
      <View style={styles.imageWrap}>
        {turfImage ? <Image source={{ uri: turfImage }} style={styles.image} resizeMode="cover" /> : <View style={[styles.image, { alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF4ED' }]}><Ionicons name="football-outline" size={48} color={COLORS.primaryDark}/></View>}
        <View style={[styles.formatBadge, { backgroundColor: roleColor }]}>
          <Text style={styles.formatText}>{match.sportFormat || 'Format unavailable'}</Text>
        </View>
        {isFull && (
          <View style={styles.fullBadge}>
            <Text style={styles.fullBadgeText}>FULL</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={1}>{match.title}</Text>

        {/* Venue */}
        <View style={styles.venueRow}>
          <Ionicons name="location-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.venueText} numberOfLines={1}>{turfName}</Text>
        </View>

        {/* Match time */}
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.timeText}>{matchTimeStr}</Text>
        </View>

        {/* Cost + Required role */}
        <View style={styles.metaRow}>
          <View style={styles.costWrap}>
            <Text style={styles.costValue}>{match.costPerPlayer === null || match.costPerPlayer === undefined ? 'Cost unavailable' : match.costPerPlayer === 0 ? 'Free' : `৳${match.costPerPlayer}`}</Text>
            <Text style={styles.costUnit}>/player</Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: roleColor + '20' }]}>
            <Text style={[styles.roleBadgeText, { color: roleColor }]}>
              Need: {match.requiredRole || 'Any'}
            </Text>
          </View>
        </View>

        {/* Spots progress + Host */}
        <View style={styles.footerRow}>
          <View style={styles.spotsRow}>
            <Ionicons name="people" size={14} color={isFull ? COLORS.textMuted : COLORS.primary} />
            <Text style={[styles.spotsText, isFull && { color: COLORS.textMuted }]}>
              {openSpots}/{totalSpots} spots left
            </Text>
          </View>
          <Text style={styles.hostText}>Host: {hostName}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${totalSpots > 0 ? Math.max(0, Math.min(100, ((totalSpots - openSpots) / totalSpots) * 100)) : 0}%`,
                backgroundColor: isFull ? COLORS.textMuted : COLORS.primary,
              },
            ]}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  imageWrap: {
    position: 'relative',
    width: '100%',
    height: 120,
    backgroundColor: COLORS.divider,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  formatBadge: {
    position: 'absolute',
    top: SPACING.sm,
    left: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  formatText: {
    color: '#FFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  fullBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  fullBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: FONT_WEIGHT.bold,
  },
  body: {
    padding: SPACING.md,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  venueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 4,
  },
  venueText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
    gap: 4,
  },
  timeText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  costWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  costValue: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  costUnit: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginLeft: 2,
  },
  roleBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  roleBadgeText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  spotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotsText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  hostText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});
