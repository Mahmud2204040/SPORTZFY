import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../constants/theme';

export default function Header({ title, subtitle, section, actionIcon, actionLabel, onAction, style }) {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <View style={styles.mark}><Ionicons name="football" size={21} color={COLORS.textOnPrimary} /></View>
          <View>
            <Text style={styles.brand}>SPORTZFY</Text>
            <Text style={styles.brandCaption}>PLAY MORE · BOOK SMARTER</Text>
          </View>
        </View>
        {onAction ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel || 'Header action'} onPress={onAction} style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}>
            <Ionicons name={actionIcon || 'ellipsis-horizontal'} size={21} color={COLORS.primaryDark} />
          </Pressable>
        ) : <View style={styles.accent}><View style={styles.accentDot} /></View>}
      </View>
      {(title || section) ? (
        <View style={styles.headingBlock}>
          {section ? <Text style={styles.section}>{section.toUpperCase()}</Text> : null}
          {title ? <Text accessibilityRole="header" style={styles.title}>{title}</Text> : null}
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: COLORS.card, paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#E5ECE7' },
  topRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  mark: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primaryDark, borderWidth: 2, borderColor: '#DDF2E4' },
  brand: { color: COLORS.primaryDark, fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold, letterSpacing: 1.7 },
  brandCaption: { color: COLORS.textMuted, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold, letterSpacing: 0.5, marginTop: 2 },
  accent: { width: 32, height: 32, borderRadius: RADIUS.pill, borderWidth: 1, borderColor: '#D9E8DC', alignItems: 'center', justifyContent: 'center' },
  accentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  action: { minWidth: 48, minHeight: 48, borderRadius: RADIUS.lg, backgroundColor: '#EEF6F0', alignItems: 'center', justifyContent: 'center' },
  actionPressed: { opacity: 0.7 },
  headingBlock: { marginTop: SPACING.lg, marginBottom: SPACING.xs },
  section: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.bold, letterSpacing: 1.1, marginBottom: SPACING.xs },
  title: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold, letterSpacing: -0.5 },
  subtitle: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 20, marginTop: SPACING.xs },
});
