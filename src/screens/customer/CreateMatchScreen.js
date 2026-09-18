import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import PrimaryButton from '../../components/PrimaryButton';
import { matchesApi } from '../../api/matches';
import { turfsApi } from '../../api/turfs';
import { dhakaDateOffset } from '../../utils/dateUtils';

import { COLORS, SPACING, RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../constants/theme';

const FORMATS = ['7v7', '5v5', '11v11'];
const ROLES = ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'];

export default function CreateMatchScreen({ navigation }) {
  const [turfs, setTurfs] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTurfId, setSelectedTurfId] = useState(null);
  const [format, setFormat] = useState('7v7');
  const [requiredRole, setRequiredRole] = useState('Goalkeeper');
  const [matchDate, setMatchDate] = useState(dhakaDateOffset(1));
  const [matchClock, setMatchClock] = useState('18:00');
  const [totalSpots, setTotalSpots] = useState('14');
  const [openSpots, setOpenSpots] = useState('1');
  const [costPerPlayer, setCostPerPlayer] = useState('150');
  const [creating, setCreating] = useState(false);

  // Fetch turfs for selection
  useEffect(() => {
    (async () => {
      try {
        const res = await turfsApi.getTurfs();
        if (res?.items) setTurfs(res.items);
      } catch (err) {
        console.log('Error fetching turfs:', err?.message);
      }
    })();
  }, []);

  async function handleCreate() {
    if (creating) return;
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a match title.');
      return;
    }
    if (!selectedTurfId) {
      Alert.alert('Select Venue', 'Please choose a turf venue.');
      return;
    }
    const parsedDate = new Date(`${matchDate}T00:00:00Z`);
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(matchDate) && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === matchDate;
    const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(matchClock);
    const matchTime = validDate && validTime ? new Date(`${matchDate}T${matchClock}:00+06:00`) : null;
    if (!matchTime || matchTime <= new Date()) {
      Alert.alert('Match time', 'Choose a future date and time in Asia/Dhaka.');
      return;
    }

    setCreating(true);
    try {
      await matchesApi.createMatch({
        title: title.trim(),
        description: description.trim() || undefined,
        turfId: selectedTurfId,
        sportFormat: format,
        matchTime: matchTime.toISOString(),
        totalSpots: parseInt(totalSpots, 10) || 14,
        openSpots: parseInt(openSpots, 10) || 1,
        costPerPlayer: parseFloat(costPerPlayer) || 150,
        requiredRole,
      });
      Alert.alert('Match Created!', 'Your squad recruitment post is now live.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not create match.');
    } finally {
      setCreating(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <Field label="Match Title">
          <TextInput
            style={styles.input}
            placeholder="e.g. Need 2 strikers for evening match"
            placeholderTextColor={COLORS.textMuted}
            value={title}
            onChangeText={setTitle}
          />
        </Field>

        {/* Description */}
        <Field label="Description (optional)">
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Any details about the match..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
          />
        </Field>

        {/* Venue selection */}
        <Field label="Select Venue">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueScroll}>
            {turfs.map((t) => (
              <TouchableOpacity
                key={t.id}
                activeOpacity={0.8}
                onPress={() => setSelectedTurfId(t.id)}
                style={[styles.venueChip, selectedTurfId === t.id && styles.venueChipSelected]}
              >
                <Text style={[styles.venueChipText, selectedTurfId === t.id && { color: COLORS.textOnPrimary }]} numberOfLines={1}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Field>

        {/* Sport Format */}
        <Field label="Sport Format">
          <View style={styles.chipRow}>
            {FORMATS.map((f) => (
              <TouchableOpacity
                key={f}
                activeOpacity={0.8}
                onPress={() => setFormat(f)}
                style={[styles.chip, format === f && styles.chipSelected]}
              >
                <Text style={[styles.chipText, format === f && { color: COLORS.textOnPrimary }]}>{f}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* Required Role */}
        <Field label="Need Players For">
          <View style={styles.chipRow}>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r}
                activeOpacity={0.8}
                onPress={() => setRequiredRole(r)}
                style={[styles.chip, requiredRole === r && styles.chipSelected]}
              >
                <Text style={[styles.chipText, requiredRole === r && { color: COLORS.textOnPrimary }]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* Local date and time */}
        <Field label="Match date · Asia/Dhaka (YYYY-MM-DD)">
          <TextInput
            style={styles.input}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
            value={matchDate}
            onChangeText={setMatchDate}
            autoCapitalize="none"
          />
        </Field>
        <Field label="Start time · Asia/Dhaka (HH:mm)"><TextInput style={styles.input} placeholder="18:00" value={matchClock} onChangeText={setMatchClock} keyboardType="numbers-and-punctuation" /></Field>

        {/* Spots */}
        <View style={styles.rowFields}>
          <Field label="Total Spots" style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="14"
              placeholderTextColor={COLORS.textMuted}
              value={totalSpots}
              onChangeText={setTotalSpots}
              keyboardType="numeric"
            />
          </Field>
          <Field label="Open Spots" style={{ flex: 1 }}>
            <TextInput
              style={styles.input}
              placeholder="1"
              placeholderTextColor={COLORS.textMuted}
              value={openSpots}
              onChangeText={setOpenSpots}
              keyboardType="numeric"
            />
          </Field>
        </View>

        {/* Cost */}
        <Field label="Cost per Player (BDT)">
          <TextInput
            style={styles.input}
            placeholder="150"
            placeholderTextColor={COLORS.textMuted}
            value={costPerPlayer}
            onChangeText={setCostPerPlayer}
            keyboardType="numeric"
          />
        </Field>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* CTA */}
      <View style={styles.bottomBar}>
        <PrimaryButton
          title={creating ? 'Creating...' : 'Create Match Post'}
          loading={creating}
          onPress={handleCreate}
        />
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children, style }) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.label}>{label}</Text>
      {children}
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
    padding: SPACING.lg,
  },
  field: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.semibold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZE.md,
    color: COLORS.textPrimary,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
  },
  rowFields: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  venueScroll: {
    marginBottom: SPACING.xs,
  },
  venueChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.pill,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.sm,
  },
  venueChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  venueChipText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    color: COLORS.textPrimary,
    maxWidth: 160,
  },
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
});
