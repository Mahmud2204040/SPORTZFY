import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import PrimaryButton from '../../components/PrimaryButton';
import RosterPlayerCard from '../../components/RosterPlayerCard';
import { matchesApi } from '../../api/matches';
import { useAuth } from '../../context/AuthContext';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

const ROLES = ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'];

export default function MatchDetailScreen({ route, navigation }) {
  const { matchId } = route.params || {};
  const { user, setPendingDestination } = useAuth();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Join modal state
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('Goalkeeper');
  const [joining, setJoining] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState(false);

  const isCaptain = user && match && user.id === match.hostUserId;
  const pendingRequests = (match?.joinRequests || []).filter((r) => r.status === 'PENDING');
  const acceptedPlayers = (match?.joinRequests || []).filter((r) => r.status === 'ACCEPTED');
  const hasRequested = (match?.joinRequests || []).some(
    (r) => r.userId === user?.id && (r.status === 'PENDING' || r.status === 'ACCEPTED')
  );

  const fetchMatch = useCallback(async () => {
    if (!matchId) return;
    try {
      const res = await matchesApi.getMatchById(matchId);
      // matchesApi.getMatchById() may return either `match` or `{ data: match }`.
      const matchData = res?.data ? res.data : res;
      if (matchData) {
        setMatch(matchData);
      }
    } catch (err) {
      console.log('Error fetching match:', err?.message);
      Alert.alert('Error', 'Could not load match details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [matchId]);

  useFocusEffect(useCallback(() => { fetchMatch(); }, [fetchMatch]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatch();
  };

  // Format match time
  let matchTimeStr = '';
  let matchDateStr = '';
  if (match?.matchTime) {
    const d = new Date(match.matchTime);
    matchTimeStr = d.toLocaleTimeString('en-GB', { timeZone: 'Asia/Dhaka', hour: '2-digit', minute: '2-digit' });
    matchDateStr = d.toLocaleDateString('en-GB', { timeZone: 'Asia/Dhaka', weekday: 'long', day: 'numeric', month: 'short' });
  }

  async function handleJoin() {
    if (joining) return;
    setJoining(true);
    try {
      await matchesApi.joinMatch(matchId, selectedRole);
      setShowJoinModal(false);
      Alert.alert('Request Sent!', `Your join request has been sent to the captain. Role: ${selectedRole}`);
      fetchMatch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not send join request.');
    } finally {
      setJoining(false);
    }
  }

  async function handleDecision(requestId, decision) {
    if (decisionBusy) return;
    setDecisionBusy(true);
    try {
      await matchesApi.decideRequest(matchId, requestId, decision);
      Alert.alert(
        decision === 'ACCEPTED' ? 'Player Added!' : 'Request Declined',
        decision === 'ACCEPTED' ? 'Player added to squad.' : 'Request has been declined.'
      );
      fetchMatch();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not process decision.');
    } finally { setDecisionBusy(false); }
  }

  function closePost() {
    Alert.alert('Close recruitment?', 'Players will no longer be able to request a spot.', [
      { text: 'Keep open', style: 'cancel' },
      { text: 'Close post', onPress: async () => { try { await matchesApi.closeMatch(matchId); await fetchMatch(); } catch (err) { Alert.alert('Could not close post', err?.message || 'Try again.'); } } },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!match) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
          <Text style={styles.errorText}>Match not found.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const turfImage = match.turf?.coverImage;
  const openSpots = match.openSpots ?? 0;
  const totalSpots = match.totalSpots ?? 14;
  const isFull = openSpots <= 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />
        }
      >
        {/* Hero image */}
        {turfImage ? <Image source={{ uri: turfImage }} style={styles.hero} /> : <View style={styles.hero} />}

        {/* Match info */}
        <View style={styles.section}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{match.title}</Text>
            <View style={[styles.formatBadge, { backgroundColor: COLORS.primary }]}>
              <Text style={styles.formatText}>{match.sportFormat || '7v7'}</Text>
            </View>
          </View>

          <Text style={styles.description}>{match.description}</Text>
          <Text style={styles.description}>Status: {match.status}</Text>
          {isCaptain && match.status !== 'CLOSED' ? <TouchableOpacity accessibilityRole="button" onPress={closePost}><Text style={styles.description}>Close recruitment</Text></TouchableOpacity> : null}

          {/* Info rows */}
          <InfoRow icon="location-outline" value={`${match.turf?.name || 'Unknown'} • ${match.area || ''}`} />
          <InfoRow icon="calendar-outline" value={matchDateStr} />
          <InfoRow icon="time-outline" value={matchTimeStr} />
          <InfoRow icon="cash-outline" value={`৳${match.costPerPlayer ?? 'Free'} per player`} />
          <InfoRow icon="football-outline" value={`Need: ${match.requiredRole || 'Any role'}`} />
        </View>

        {/* Spots overview */}
        <View style={styles.section}>
          <View style={styles.spotsHeader}>
            <Text style={styles.sectionTitle}>Squad Roster</Text>
            <View style={styles.spotsBadge}>
              <Ionicons name="people" size={14} color={isFull ? COLORS.textMuted : COLORS.primary} />
              <Text style={[styles.spotsCount, isFull && { color: COLORS.textMuted }]}>
                {openSpots}/{totalSpots} spots left
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${((totalSpots - openSpots) / totalSpots) * 100}%` },
              ]}
            />
          </View>

          {/* Captain card */}
          <View style={styles.captainCard}>
            <Ionicons name="ribbon" size={20} color="#F59E0B" />
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Text style={styles.captainLabel}>Match Captain</Text>
              <Text style={styles.captainName}>{match.hostUser?.name || 'Unknown'}</Text>
            </View>
          </View>

          {/* Confirmed players */}
          {acceptedPlayers.length > 0 && (
            <View style={styles.rosterSection}>
              <Text style={styles.rosterLabel}>Confirmed ({acceptedPlayers.length})</Text>
              {acceptedPlayers.map((req) => (
                <RosterPlayerCard
                  key={req.id}
                  player={req.user}
                  role={req.preferredRole}
                  status="ACCEPTED"
                />
              ))}
            </View>
          )}

          {/* Empty spots */}
          {Array.from({ length: Math.max(0, openSpots - 0) }).map((_, i) => (
            <View key={`empty-${i}`} style={styles.emptySpot}>
              <Ionicons name="person-add-outline" size={20} color={COLORS.textMuted} />
              <Text style={styles.emptySpotText}>Open spot</Text>
            </View>
          ))}
        </View>

        {/* Captain review section */}
        {isCaptain && match.status === 'OPEN' && pendingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📋 Pending Requests ({pendingRequests.length})</Text>
            {pendingRequests.map((req) => (
              <RosterPlayerCard
                key={req.id}
                player={req.user}
                role={req.preferredRole}
                status="PENDING"
                showActions={!decisionBusy}
                onAccept={() => handleDecision(req.id, 'ACCEPTED')}
                onReject={() => handleDecision(req.id, 'REJECTED')}
              />
            ))}
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Join button */}
      {!isCaptain && match.status === 'OPEN' && !isFull && !hasRequested && (
        <View style={styles.bottomBar}>
          <PrimaryButton
            title={`Join Squad • ৳${match.costPerPlayer ?? 'Free'}/player`}
            onPress={() => user ? setShowJoinModal(true) : (setPendingDestination({ name: 'MatchDetail', params: { matchId } }), navigation.navigate('SignIn'))}
          />
        </View>
      )}

      {hasRequested && (
        <View style={styles.bottomBar}>
          <View style={styles.alreadyRequested}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
            <Text style={styles.alreadyRequestedText}>{match.joinRequests.find(r => r.userId === user?.id)?.status === 'ACCEPTED' ? 'You are in the squad' : 'Request sent — waiting for captain'}</Text>
          </View>
        </View>
      )}

      {/* Join Role Selection Modal */}
      {showJoinModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>Select Your Preferred Role</Text>
            <Text style={styles.modalSub}>Choose the position you'd like to play</Text>

            <View style={styles.roleGrid}>
              {ROLES.map((r) => (
                <TouchableOpacity
                  key={r}
                  activeOpacity={0.8}
                  onPress={() => setSelectedRole(r)}
                  style={[styles.roleOption, selectedRole === r && styles.roleOptionSelected]}
                >
                  <Text style={[styles.roleOptionText, selectedRole === r && styles.roleOptionTextSelected]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowJoinModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <PrimaryButton
                  title={joining ? 'Sending...' : 'Send Request'}
                  loading={joining}
                  onPress={handleJoin}
                />
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function InfoRow({ icon, value }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={COLORS.textSecondary} />
      <Text style={styles.infoText}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SPACING.xl,
  },
  hero: {
    width: '100%',
    height: 200,
    backgroundColor: COLORS.divider,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },

  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.card,
    marginTop: SPACING.sm,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  title: {
    flex: 1,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginRight: SPACING.sm,
  },
  formatBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.pill,
  },
  formatText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.bold,
  },
  description: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.xs,
    gap: SPACING.sm,
  },
  infoText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textSecondary,
    flex: 1,
  },

  // Spots
  spotsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  spotsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  spotsCount: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.primary,
  },
  progressTrack: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  captainCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  captainLabel: {
    fontSize: FONT_SIZE.xs,
    color: '#92400E',
    fontWeight: FONT_WEIGHT.medium,
  },
  captainName: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.bold,
    color: '#92400E',
  },

  rosterSection: {
    marginTop: SPACING.sm,
  },
  rosterLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },

  emptySpot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    gap: SPACING.sm,
  },
  emptySpotText: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.card,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  alreadyRequested: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  alreadyRequestedText: {
    fontSize: FONT_SIZE.md,
    color: COLORS.success,
    fontWeight: FONT_WEIGHT.semibold,
  },

  // Join modal
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  modalTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  modalSub: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginBottom: SPACING.lg,
  },
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  roleOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleOptionText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textPrimary,
  },
  roleOptionTextSelected: {
    color: COLORS.textOnPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  modalCancelBtn: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  modalCancelText: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
  },
});
