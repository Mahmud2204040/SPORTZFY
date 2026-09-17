// AIInsightCard — displays AI pricing recommendation with rate comparison.
// Used on Owner Dashboard to surface dynamic pricing suggestions.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../constants/theme';

export default function AIInsightCard({ insight, onPress }) {
  const {
    title,
    body,
    cta,
    icon = 'sparkles-outline',
    currentRate,
    suggestedRate,
    demandProbability,
    demandTag,
    targetWindow,
  } = insight;

  // Calculate percentage change
  const pctChange = currentRate && suggestedRate
    ? Math.round(((suggestedRate - currentRate) / currentRate) * 100)
    : 0;
  const isIncrease = pctChange > 0;
  const isDecrease = pctChange < 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Header with icon and demand tag */}
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <Ionicons name={icon} size={20} color="#7C3AED" />
        </View>
        <View style={styles.headerRight}>
          <Text style={styles.title}>{title}</Text>
          {demandTag && (
            <View style={[
              styles.tag,
              isIncrease ? styles.tagSurge : isDecrease ? styles.tagSaver : styles.tagNeutral
            ]}>
              <Text style={[
                styles.tagText,
                isIncrease ? styles.tagTextSurge : isDecrease ? styles.tagTextSaver : styles.tagTextNeutral
              ]}>
                {demandTag}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Time window */}
      {targetWindow && (
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color="#6B7280" />
          <Text style={styles.timeText}>{targetWindow}</Text>
        </View>
      )}

      {/* Rate comparison */}
      {currentRate && suggestedRate ? (
        <View style={styles.rateRow}>
          <View style={styles.rateBox}>
            <Text style={styles.rateLabel}>Current</Text>
            <Text style={styles.rateValue}>৳{currentRate}</Text>
          </View>

          <View style={styles.arrowWrap}>
            <Ionicons
              name={isIncrease ? 'arrow-up' : isDecrease ? 'arrow-down' : 'remove'}
              size={16}
              color={isIncrease ? '#DC2626' : isDecrease ? '#16A34A' : '#6B7280'}
            />
            <Text style={[
              styles.pctText,
              isIncrease ? styles.pctUp : isDecrease ? styles.pctDown : styles.pctNeutral
            ]}>
              {isIncrease ? '+' : ''}{pctChange}%
            </Text>
          </View>

          <View style={styles.rateBox}>
            <Text style={styles.rateLabel}>Suggested</Text>
            <Text style={[styles.rateValue, styles.rateValueHighlight]}>
              ৳{suggestedRate}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Demand probability */}
      {demandProbability != null && (
        <View style={styles.demandRow}>
          <Ionicons name="trending-up-outline" size={14} color="#7C3AED" />
          <Text style={styles.demandText}>
            Demand probability: <Text style={styles.demandValue}>{demandProbability}%</Text>
          </Text>
        </View>
      )}

      {/* Recommendation text */}
      {body && <Text style={styles.body2}>{body}</Text>}

      {/* CTA */}
      {cta && (
        <View style={styles.ctaRow}>
          <Text style={styles.ctaText}>{cta}</Text>
          <Ionicons name="arrow-forward" size={14} color="#7C3AED" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F4ECFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: '#E0CCFF',
  },
  cardPressed: {
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  title: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#5B21B6',
    flex: 1,
  },
  tag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.pill,
  },
  tagSurge: {
    backgroundColor: '#FEE2E2',
  },
  tagSaver: {
    backgroundColor: '#DCFCE7',
  },
  tagNeutral: {
    backgroundColor: '#F3F4F6',
  },
  tagText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },
  tagTextSurge: {
    color: '#DC2626',
  },
  tagTextSaver: {
    color: '#16A34A',
  },
  tagTextNeutral: {
    color: '#6B7280',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  timeText: {
    fontSize: FONT_SIZE.xs,
    color: '#6B7280',
  },
  rateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  rateBox: {
    alignItems: 'center',
    flex: 1,
  },
  rateLabel: {
    fontSize: FONT_SIZE.xs,
    color: '#6B7280',
    marginBottom: 2,
  },
  rateValue: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: '#374151',
  },
  rateValueHighlight: {
    color: '#7C3AED',
  },
  arrowWrap: {
    alignItems: 'center',
    paddingHorizontal: SPACING.sm,
  },
  pctText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.bold,
  },
  pctUp: {
    color: '#DC2626',
  },
  pctDown: {
    color: '#16A34A',
  },
  pctNeutral: {
    color: '#6B7280',
  },
  demandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: SPACING.xs,
  },
  demandText: {
    fontSize: FONT_SIZE.xs,
    color: '#6B7280',
  },
  demandValue: {
    fontWeight: FONT_WEIGHT.semibold,
    color: '#7C3AED',
  },
  body2: {
    fontSize: FONT_SIZE.xs,
    color: '#6B21A8',
    marginTop: SPACING.sm,
    lineHeight: 18,
  },
  ctaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  ctaText: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: '#7C3AED',
    marginRight: 4,
  },
});