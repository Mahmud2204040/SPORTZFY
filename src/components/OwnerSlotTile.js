// OwnerSlotTile — one slot in the owner's slot grid.
// Shows a start–end time label and a toggleable status pill.
//
// In the owner UI we treat:
// - status === 'available' → slot is open for online bookings
// - status === 'booked'    → slot is BLOCKED (locked for walk-in / maintenance)

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

function formatHour(hhmm) {
  const [hRaw, mRaw] = String(hhmm).split(':');
  const h = parseInt(hRaw, 10);
  const m = mRaw || '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const display = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return m === '00' ? `${display} ${period}` : `${display}:${m} ${period}`;
}

export default function OwnerSlotTile({ slot, onPress }) {
  const { startTime, endTime, status } = slot;
  const isBlocked = status === 'booked';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        isBlocked && styles.tileBooked,
        pressed && !isBlocked && styles.tilePressed,
      ]}
    >
      <View style={styles.timeWrap}>
        <Text style={[styles.time, isBlocked && styles.timeBooked]}>
          {formatHour(startTime)}
        </Text>
        <Text style={[styles.timeMuted, isBlocked && styles.timeBooked]}>
          to {formatHour(endTime)}
        </Text>
      </View>

      <View style={[styles.pill, isBlocked ? styles.pillBooked : styles.pillAvailable]}>
        <Ionicons
          name={isBlocked ? 'lock-closed' : 'checkmark-circle'}
          size={12}
          color={isBlocked ? COLORS.textMuted : COLORS.primary}
        />
        <Text
          style={[
            styles.pillText,
            isBlocked ? styles.pillTextBooked : styles.pillTextAvailable,
          ]}
        >
          {isBlocked ? 'Blocked' : 'Available'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    minHeight: 86,
    justifyContent: 'space-between',
  },
  tileBooked: {
    backgroundColor: COLORS.slotBookedBg,
    borderColor: COLORS.divider,
  },
  tilePressed: {
    opacity: 0.7,
    borderColor: COLORS.primary,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  time: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  timeMuted: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  timeBooked: {
    color: COLORS.textMuted,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
    marginTop: SPACING.sm,
  },
  pillAvailable: {
    backgroundColor: '#E8F4EC',
  },
  pillBooked: {
    backgroundColor: COLORS.background,
  },
  pillText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    marginLeft: 4,
  },
  pillTextAvailable: {
    color: COLORS.primary,
  },
  pillTextBooked: {
    color: COLORS.textMuted,
  },
});
