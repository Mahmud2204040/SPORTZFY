// App header used inside tab screens (Home, Explore, Matches, Bookings, Profile).
// Shows the Sportzfy brand mark and wordmark. Nothing else — location lives in
// the Explore screen's filters, not the chrome.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

export default function Header({ style }) {
  return (
    <View style={[styles.container, style]}>
      {/* Brand mark */}
      <View style={styles.mark}>
        <Ionicons name="football" size={20} color={COLORS.primary} />
      </View>

      <Text style={styles.brand}>Sportzfy</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mark: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  brand: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    letterSpacing: 0.5,
  },
});
