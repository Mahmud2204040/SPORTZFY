// Reusable turf card used in Home (sections/shelves) and Explore (results).
// Venue information comes from the API; missing availability is shown as unknown.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
} from 'react-native';
import Rating from './Rating';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

export default function TurfCard({ turf, onPress, style }) {
  if (!turf) return null;

  const imageUri = turf.coverImage || turf.image;
  const price = turf.selectedDateAvailability?.lowestAvailablePrice ?? turf.basePricePerHour ?? turf.pricePerHour;
  const locationText = [turf.area, turf.city].filter(Boolean).join(', ') || turf.address || 'Location unavailable';
  const formatTag = turf.pitchFormats ? turf.pitchFormats.split(',')[0] : 'Format unavailable';
  const availability = turf.selectedDateAvailability;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress && onPress(turf)}
      style={[styles.card, style]}
    >
      <View style={styles.imageWrap}>
        {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" /> : <View style={styles.image} />}
        {turf.distanceKm ? (
          <View style={styles.distanceBadge}>
            <Text style={styles.distanceText}>{turf.distanceKm} km</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {turf.name}
          </Text>
          {Number.isFinite(turf.rating) ? <Rating rating={turf.rating} reviewCount={turf.reviewCount} /> : null}
        </View>

        <Text style={styles.location} numberOfLines={1}>
          📍 {locationText}
        </Text>

        <View style={styles.metaRow}>
          <View style={styles.sportTag}>
            <Text style={styles.sportText}>{formatTag}</Text>
          </View>
          <Text style={styles.price}>{price === null || price === undefined ? 'Price unavailable' : `৳${price}`}<Text style={styles.priceUnit}>{price === null || price === undefined ? '' : '/hr'}</Text></Text>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.availableDot}>
            {availability?.availableCount > 0 ? <View style={styles.greenDot} /> : null}
            <Text style={styles.availableText}>{availability ? `${availability.availableCount} available on ${availability.date}` : 'Availability unknown'}</Text>
          </View>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onPress && onPress(turf)}
            style={styles.bookButton}
          >
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
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
    height: 140,
    backgroundColor: COLORS.divider,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: RADIUS.pill,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  distanceText: {
    color: '#FFF',
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  body: {
    padding: SPACING.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  name: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  location: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  sportTag: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  sportText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  price: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  priceUnit: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.regular,
    color: COLORS.textMuted,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SPACING.sm,
  },
  availableDot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greenDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.success,
    marginRight: SPACING.xs,
  },
  availableText: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.medium,
  },
  bookButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  bookButtonText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
});
