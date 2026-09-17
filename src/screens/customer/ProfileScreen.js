// ProfileScreen — shows the user profile & quick actions.
//
// Note: The old "Profile | Bookings" segmented toggle has been removed.
// Bookings live under the dedicated bottom tab.

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import Header from '../../components/Header';

import { useAuth } from '../../context/AuthContext';
import { matchesApi } from '../../api/matches';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [myMatchesSummary, setMyMatchesSummary] = useState(null);
  const [matchesLoading, setMatchesLoading] = useState(false);

  async function handleUnauthorized(e) {
    if (e?.status === 401) {
      await logout();
    }
  }

  async function loadMyMatches() {
    if (!user?.id) return;

    try {
      setMatchesLoading(true);
      const res = await matchesApi.getMyMatches();
      const hosting = res?.hosting || [];
      const joined = res?.joined || [];
      setMyMatchesSummary({
        hostingCount: hosting.length,
        joinedCount: joined.length,
      });
    } catch (e) {
      setMyMatchesSummary(null);
      console.log('Error loading my matches');
      console.log('Profile screen:', e?.message || e);
      await handleUnauthorized(e);
    } finally {
      setMatchesLoading(false);
    }
  }

  useEffect(() => {
    loadMyMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const hostingCount = myMatchesSummary?.hostingCount ?? 0;
  const joinedCount = myMatchesSummary?.joinedCount ?? 0;
  const totalMySquads = hostingCount + joinedCount;

  const profile = {
    name: user?.name || 'Sportzfy User',
    phone: user?.phone || '',
    email: user?.email || '',
  };

  function handleLogout() {
    logout();
  }

  const squadsBadgeText = matchesLoading ? '—' : String(totalMySquads);

  if (!user) {
    return <SafeAreaView style={styles.safe} edges={['top']}><Header title="Your profile" section="Player" /><View style={styles.guestState}><Ionicons name="person-circle-outline" size={64} color={COLORS.primary}/><Text style={styles.guestTitle}>Sign in to manage your profile</Text><TouchableOpacity style={styles.guestButton} onPress={() => navigation.navigate('SignIn')}><Text style={styles.guestButtonText}>Sign in</Text></TouchableOpacity></View></SafeAreaView>;
  }

  const MENU_ITEMS = [
    {
      id: 'squads',
      icon: 'football-outline',
      label: 'My Squads',
      disabled: false,
      onPress: () => navigation.navigate('Matches'),
      showChevron: true,
      right: (
        <View style={styles.countBadgeWrap}>
          <Text style={styles.countBadgeText}>{squadsBadgeText}</Text>
        </View>
      ),
    },
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      disabled: true,
      showChevron: false,
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help & Support',
      disabled: true,
      showChevron: false,
    },
    {
      id: 'about',
      icon: 'information-circle-outline',
      label: 'About Sportzfy',
      disabled: true,
      showChevron: false,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <Header title="Your profile" section="Player" />

      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={styles.profileScroll}
        showsVerticalScrollIndicator={false}
      >
        {/* User card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.name
                .split(' ')
                .filter(Boolean)
                .map((n) => n[0])
                .join('')
                .slice(0, 2)
                .toUpperCase() || 'S'}
            </Text>
          </View>

          <Text style={styles.profileName} numberOfLines={1} ellipsizeMode="tail">
            {profile.name}
          </Text>
          {profile.phone ? <Text style={styles.profilePhone}>{profile.phone}</Text> : null}
          {profile.email ? <Text style={styles.profileEmail}>{profile.email}</Text> : null}
        </View>

        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        {/* Menu */}
        <View style={styles.menuCard}>
          {MENU_ITEMS.map((item, idx) => (
            <React.Fragment key={item.id}>
              <MenuItem
                icon={item.icon}
                label={item.label}
                disabled={item.disabled}
                onPress={item.onPress}
                right={item.right}
                showChevron={item.showChevron}
              />
              {idx !== MENU_ITEMS.length - 1 ? <MenuDivider /> : null}
            </React.Fragment>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} activeOpacity={0.9} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Sportzfy v1.0.0</Text>
        <View style={{ height: SPACING.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, disabled, onPress, right, showChevron }) {
  const rowContent = (
    <View style={styles.menuRowInner}>
      <Ionicons
        name={icon}
        size={20}
        color={disabled ? COLORS.textMuted : COLORS.textSecondary}
      />

      <Text
        style={[
          styles.menuLabel,
          disabled && styles.menuLabelDisabled,
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {label}
      </Text>

      {right ? right : null}

      {!disabled && showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
      ) : null}
    </View>
  );

  if (disabled) {
    return <View style={styles.menuRow}>{rowContent}</View>;
  }

  return (
    <TouchableOpacity activeOpacity={0.7} style={styles.menuRow} onPress={onPress}>
      {rowContent}
    </TouchableOpacity>
  );
}

function MenuDivider() {
  return <View style={styles.menuDivider} />;
}

const styles = StyleSheet.create({
  guestState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACING.xl, backgroundColor: COLORS.background },
  guestTitle: { marginTop: SPACING.md, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold, color: COLORS.textPrimary, textAlign: 'center' },
  guestButton: { marginTop: SPACING.lg, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: SPACING.xl, paddingVertical: SPACING.md },
  guestButtonText: { color: COLORS.textOnPrimary, fontWeight: FONT_WEIGHT.bold, fontSize: FONT_SIZE.md },
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  profileScroll: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  profileCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',

    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.primary,
    borderWidth: 3,
    borderColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  avatarText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xxl,
    fontWeight: FONT_WEIGHT.bold,
  },
  profileName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    maxWidth: '90%',
    textAlign: 'center',
  },
  profilePhone: {
    fontSize: FONT_SIZE.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  profileEmail: {
    fontSize: FONT_SIZE.sm,
    color: COLORS.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  sectionLabel: {
    marginTop: SPACING.md,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
  },

  menuCard: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    borderWidth: 0,

    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  menuRow: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  menuRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
    fontWeight: FONT_WEIGHT.medium,
    marginLeft: SPACING.md,
  },
  menuLabelDisabled: {
    color: COLORS.textSecondary,
  },

  countBadgeWrap: {
    minWidth: 54,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.pill,
  },
  countBadgeText: {
    color: COLORS.textOnPrimary,
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.semibold,
  },

  menuDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginLeft: SPACING.lg + 24,
  },

  logoutBtn: {
    marginTop: SPACING.lg,
    backgroundColor: 'rgba(220, 38, 38, 0.08)',
    borderColor: 'rgba(220, 38, 38, 0.35)',
    borderWidth: 1,
    borderRadius: RADIUS.lg,

    flexDirection: 'row',
    alignItems: 'center',

    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  logoutText: {
    marginLeft: SPACING.sm,
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.danger,
  },

  versionText: {
    textAlign: 'center',
    fontSize: FONT_SIZE.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
});
