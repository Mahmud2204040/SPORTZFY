// Success modal after booking confirmation.
// Shows reference code, optional QR pass, and action buttons.

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PrimaryButton from './PrimaryButton';
import {
  COLORS,
  SPACING,
  RADIUS,
  FONT_SIZE,
  FONT_WEIGHT,
} from '../constants/theme';

export default function SuccessModal({
  visible,
  bookingId,
  qrCode,
  turfName,
  date,
  time,
  price,
  onViewBookings,
  onDone,
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDone}
    >
      <Pressable style={styles.backdrop} onPress={onDone}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Green check icon */}
          <View style={styles.iconCircle}>
            <Ionicons name="checkmark" size={36} color={COLORS.textOnPrimary} />
          </View>

          <Text style={styles.title}>Booking Confirmed!</Text>
          <Text style={styles.subtitle}>
            Your turf slot has been booked successfully.
          </Text>

          {/* QR Code Pass */}
          {qrCode ? (
            <View style={styles.qrCard}>
              <Image
                source={{ uri: qrCode }}
                style={styles.qrImage}
                resizeMode="contain"
              />
              <Text style={styles.qrHint}>Show this QR at the venue</Text>
            </View>
          ) : null}

          {/* Summary card */}
          <View style={styles.summaryCard}>
            <SummaryRow label="Reference" value={bookingId || 'SPZ-XXXX'} highlight />
            <View style={styles.divider} />
            <SummaryRow label="Turf" value={turfName} />
            <View style={styles.divider} />
            <SummaryRow label="Date" value={date} />
            <View style={styles.divider} />
            <SummaryRow label="Time" value={time} />
            {price != null && (
              <>
                <View style={styles.divider} />
                <SummaryRow label="Total Paid" value={`৳${price}`} highlight />
              </>
            )}
          </View>

          <View style={styles.actions}>
            <PrimaryButton title="View My Bookings" onPress={onViewBookings} />
            <TouchableOpacity
              style={styles.secondaryBtn}
              activeOpacity={0.7}
              onPress={onDone}
            >
              <Text style={styles.secondaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SummaryRow({ label, value, highlight }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[styles.summaryValue, highlight && styles.summaryValueHighlight]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    width: '100%',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    maxHeight: '85%',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },

  // QR
  qrCard: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrImage: {
    width: 160,
    height: 160,
  },
  qrHint: {
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
  },

  summaryCard: {
    width: '100%',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
  },
  summaryLabel: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    fontWeight: FONT_WEIGHT.medium,
  },
  summaryValue: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.semibold,
    flex: 1,
    textAlign: 'right',
    marginLeft: SPACING.md,
  },
  summaryValueHighlight: {
    color: COLORS.primary,
    fontWeight: FONT_WEIGHT.bold,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  actions: {
    width: '100%',
  },
  secondaryBtn: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  secondaryText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
});
