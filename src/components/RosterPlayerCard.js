// Player card for squad lineups and applicant review.
// Used in MatchDetailScreen for confirmed roster and pending requests.

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const STATUS_STYLES = {
  ACCEPTED: { bg: '#DCFCE7', text: '#166534', label: 'Confirmed' },
  PENDING: { bg: '#FEF3C7', text: '#92400E', label: 'Pending' },
  REJECTED: { bg: '#FEE2E2', text: '#B91C1C', label: 'Rejected' },
};

export default function RosterPlayerCard({
  player,
  role,
  status,
  showActions,
  onAccept,
  onReject,
  style,
}) {
  const roleColor = ROLE_COLORS[role] || COLORS.primary;
  const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.PENDING;

  return (
    <View style={[styles.card, style]}>
      {/* Avatar circle with initial */}
      <View style={[styles.avatar, { backgroundColor: roleColor + '20' }]}>
        <Text style={[styles.avatarText, { color: roleColor }]}>
          {(player?.name || '?')[0].toUpperCase()}
        </Text>
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{player?.name || 'Unknown'}</Text>

        <View style={styles.metaRow}>
          {role && (
            <View style={[styles.roleChip, { backgroundColor: roleColor + '20' }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{role}</Text>
            </View>
          )}
          {status && (
            <View style={[styles.statusChip, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.statusText, { color: statusStyle.text }]}>
                {statusStyle.label}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Captain action buttons */}
      {showActions && status === 'PENDING' && (
        <View style={styles.actions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onAccept && onAccept()}
            style={styles.acceptBtn}
          >
            <Ionicons name="checkmark-circle" size={22} color="#16A34A" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onReject && onReject()}
            style={styles.rejectBtn}
          >
            <Ionicons name="close-circle" size={22} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  roleChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderRadius: RADIUS.pill,
  },
  roleText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
  },
  statusChip: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 1,
    borderRadius: RADIUS.pill,
  },
  statusText: {
    fontSize: 10,
    fontWeight: FONT_WEIGHT.semibold,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  acceptBtn: {
    padding: 4,
  },
  rejectBtn: {
    padding: 4,
  },
});
