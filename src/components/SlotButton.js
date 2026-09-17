// Time-slot button supporting both mock and live API shapes.
// API statuses: AVAILABLE, BOOKED, BLOCKED, UNAVAILABLE, HELD
// ML pricing badges: Surge +15%, Off-Peak 20% OFF, Standard Rate

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

export default function SlotButton({ slot, isSelected, onPress, style }) {
  // Normalize old (lowercase) and new (UPPERCASE) status formats
  const raw = (slot.status || '').toLowerCase();
  const isAvailable = raw === 'available';
  const isBooked = raw === 'booked';
  const isBlocked = raw === 'blocked' || raw === 'unavailable' || raw === 'held';
  const disabled = isBooked || isBlocked;

  // Price badge logic
  const multiplier = slot.multiplier || 1;
  const badgeText = slot.badgeText || null;
  const isSurge = multiplier > 1.05;
  const isOffPeak = multiplier < 0.95;

  // Visual state tokens
  let containerStyle = styles.available;
  let textStyle = styles.availableText;

  if (disabled) {
    containerStyle = styles.booked;
    textStyle = styles.bookedText;
  } else if (isSelected) {
    containerStyle = styles.selected;
    textStyle = styles.selectedText;
  }

  // Time label: use API timeLabel or mock startTime/endTime
  const timeLabel =
    slot.timeLabel ||
    (slot.startTime && slot.endTime ? `${slot.startTime} – ${slot.endTime}` : '');

  // Price: use API dynamic price or slot.price
  const price = slot.price;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => isAvailable && onPress && onPress(slot)}
      style={[styles.base, containerStyle, style]}
    >
      <Text style={[styles.time, textStyle]}>{timeLabel}</Text>

      {/* Dynamic pricing badge */}
      {badgeText && !disabled && (
        <View
          style={[
            styles.badge,
            isSurge ? styles.badgeSurge : isOffPeak ? styles.badgeDiscount : styles.badgeStandard,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isSurge ? styles.badgeTextSurge : isOffPeak ? styles.badgeTextDiscount : styles.badgeTextStandard,
            ]}
          >
            {badgeText}
          </Text>
        </View>
      )}

      {/* Price tag */}
      {price != null && (
        <Text style={[styles.price, disabled && styles.bookedText]}>
          ৳{price}
        </Text>
      )}

      {/* Status indicator for non-available */}
      {isBlocked && (
        <View style={styles.blockedRow}>
          <Ionicons
            name={raw === 'held' ? 'lock-closed' : 'close-circle'}
            size={12}
            color={COLORS.textMuted}
          />
          <Text style={styles.blockedText}>
            {raw === 'held' ? 'Held' : raw === 'blocked' ? 'Blocked' : 'N/A'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    minWidth: 130,
    minHeight: 64,
  },

  // Available
  available: {
    backgroundColor: COLORS.slotAvailableBg,
    borderColor: COLORS.slotAvailableBorder,
  },
  availableText: {
    color: COLORS.slotAvailableText,
  },

  // Booked / Blocked / Unavailable
  booked: {
    backgroundColor: COLORS.slotBookedBg,
    borderColor: COLORS.slotBookedBg,
  },
  bookedText: {
    color: COLORS.slotBookedText,
  },

  // Selected
  selected: {
    backgroundColor: COLORS.slotSelectedBg,
    borderColor: COLORS.slotSelectedBg,
  },
  selectedText: {
    color: COLORS.slotSelectedText,
  },

  time: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    textAlign: 'center',
  },

  // Price
  price: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
    marginTop: 2,
  },

  // ML pricing badges
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.pill,
    marginTop: 3,
  },
  badgeSurge: {
    backgroundColor: '#FEE2E2',
  },
  badgeDiscount: {
    backgroundColor: '#DCFCE7',
  },
  badgeStandard: {
    backgroundColor: '#F3F4F6',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: FONT_WEIGHT.bold,
  },
  badgeTextSurge: {
    color: '#B91C1C',
  },
  badgeTextDiscount: {
    color: '#166534',
  },
  badgeTextStandard: {
    color: '#6B7280',
  },

  // Blocked indicator
  blockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 3,
  },
  blockedText: {
    fontSize: 9,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
});
