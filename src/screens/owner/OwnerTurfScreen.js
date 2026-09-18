import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { ownerApi } from '../../api/owner';
import { upcomingDates, dateLabel, timeRange, money } from '../../utils/mobile';
import { COLORS, FONT_SIZE, FONT_WEIGHT, RADIUS, SPACING } from '../../constants/theme';

const FACILITIES = [
  ['hasFloodlights', 'Floodlights'], ['hasParking', 'Parking'], ['hasWashroom', 'Washroom'],
  ['hasChangingRoom', 'Changing room'], ['hasWater', 'Drinking water'],
];
const STATUS_LABEL = { AVAILABLE: 'Available', BLOCKED: 'Inventory block', BOOKED: 'Booked', HELD: 'Held', UNAVAILABLE: 'Unavailable' };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function EditField({ label, value, onChangeText, multiline = false, keyboardType }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={keyboardType} style={[styles.input, multiline && styles.multiline]} placeholderTextColor={COLORS.textMuted} /></View>;
}

export default function OwnerTurfScreen({ route }) {
  const [venues, setVenues] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dates, setDates] = useState(() => upcomingDates(7));
  const [date, setDate] = useState(() => upcomingDates(7)[0]);
  const [slots, setSlots] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [slotError, setSlotError] = useState('');
  const [editing, setEditing] = useState(false);
  const [creatingNew, setCreatingNew] = useState(false);
  const [draft, setDraft] = useState(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState([]);
  const [scheduleError, setScheduleError] = useState('');
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [walkInSlot, setWalkInSlot] = useState(null);
  const [walkInName, setWalkInName] = useState('');
  const slotRequest = useRef(0);

  const selected = useMemo(() => venues.find(venue => venue.id === selectedId) || null, [venues, selectedId]);
  useFocusEffect(useCallback(() => {
    if (route?.params?.turfId) setSelectedId(route.params.turfId);
  }, [route?.params?.turfId]));
  const loadVenues = useCallback(async () => {
    setLoading(true); setError('');
    try { const page = await ownerApi.getTurfs(); setVenues(page.items); setSelectedId(current => page.items.some(t => t.id === current) ? current : page.items[0]?.id || null); }
    catch (e) { setVenues([]); setSelectedId(null); setError(e?.message || 'Could not load your venues.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { loadVenues(); }, [loadVenues]));
  useFocusEffect(useCallback(() => { const next = upcomingDates(7); setDates(next); setDate(current => next.includes(current) ? current : next[0]); }, []));

  const loadSlots = useCallback(async () => {
    const request = ++slotRequest.current;
    if (!selectedId) { setSlots([]); setBlocks([]); return; }
    setSlotsLoading(true); setSlotError('');
    const [availability, intervals] = await Promise.allSettled([ownerApi.getAvailability(selectedId, date), ownerApi.getBlockedIntervals(selectedId)]);
    if (request !== slotRequest.current) return;
    if (availability.status === 'fulfilled') setSlots(availability.value.slots);
    else { setSlots([]); setSlotError(availability.reason?.message || 'Could not load slot availability.'); }
    if (intervals.status === 'fulfilled') setBlocks(intervals.value.items);
    else { setBlocks([]); setSlotError(intervals.reason?.message || 'Could not load inventory blocks.'); }
    setSlotsLoading(false);
  }, [selectedId, date]);
  useFocusEffect(useCallback(() => {
    if (AppState.currentState === 'active') loadSlots();
    const timer = setInterval(() => { if (AppState.currentState === 'active') loadSlots(); }, 30000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') loadSlots(); });
    return () => { clearInterval(timer); subscription.remove(); slotRequest.current += 1; };
  }, [loadSlots]));

  function openEdit() {
    if (!selected) return;
    const proposed = { ...selected, ...(selected.pendingRevision?.payload || {}) };
    setDraft({ name: proposed.name || '', city: proposed.city || '', area: proposed.area || '', address: proposed.address || '', description: proposed.description || '', pitchFormats: proposed.pitchFormats || '', coverImage: proposed.coverImage || '', imageUrlsText: (proposed.imageUrls || proposed.images?.map(image => image.url) || []).join('\n'), basePricePerHour: String(proposed.basePricePerHour || ''), ...Object.fromEntries(FACILITIES.map(([key]) => [key, !!proposed[key]])) });
    setCreatingNew(false);
    setEditing(true);
  }

  function openCreate() {
    setDraft({ name: '', city: '', area: '', address: '', description: '', pitchFormats: '', coverImage: '', imageUrlsText: '', basePricePerHour: '', ...Object.fromEntries(FACILITIES.map(([key]) => [key, false])) });
    setCreatingNew(true); setEditing(true);
  }

  async function saveEdit() {
    if ((!selected && !creatingNew) || !draft || busy) return;
    const rate = Number(draft.basePricePerHour);
    if (!draft.name.trim() || (!creatingNew && (!draft.city.trim() || !draft.area.trim() || !Number.isFinite(rate) || rate <= 0))) {
      Alert.alert('Check venue details', 'Name, city, area and a positive base hourly rate are required.'); return;
    }
    setBusy(true);
    try {
      const { imageUrlsText, ...fields } = draft;
      const payload = { ...fields, imageUrls: imageUrlsText.split(/\r?\n/).map(url => url.trim()).filter(Boolean), name: draft.name.trim(), city: draft.city.trim(), area: draft.area.trim(), basePricePerHour: Number.isFinite(rate) ? rate : 0 };
      const updated = creatingNew ? await ownerApi.createDraft(payload) : await ownerApi.updateTurf(selected.id, payload);
      if (creatingNew) { setVenues(current => [updated, ...current]); setSelectedId(updated.id); }
      else setVenues(current => current.map(venue => venue.id === updated.id ? { ...venue, ...updated } : venue));
      setEditing(false); setDraft(null);
      Alert.alert(creatingNew ? 'Draft saved' : selected.status === 'APPROVED' ? 'Submitted for review' : 'Venue saved', creatingNew ? 'Complete the details, then submit this draft for review.' : selected.status === 'APPROVED' ? 'Your approved listing stays visible while an administrator reviews these changes.' : 'Your venue details have been saved.');
    } catch (e) { Alert.alert('Update failed', e?.message || 'Could not save venue details.'); }
    finally { setBusy(false); }
  }

  async function submitDraft() {
    if (!selected || busy) return;
    setBusy(true);
    try { const updated = await ownerApi.submitTurf(selected.id); setVenues(current => current.map(venue => venue.id === updated.id ? updated : venue)); Alert.alert('Submitted', 'The venue is in the administrator review queue.'); }
    catch (e) { Alert.alert('Could not submit', e?.message || 'Complete the venue details and try again.'); }
    finally { setBusy(false); }
  }

  async function openSchedule() {
    if (!selected) return;
    setScheduleOpen(true); setScheduleLoading(true); setScheduleError('');
    try {
      const result = await ownerApi.getSchedule(selected.id);
      const shownRules = result.proposedRules || result.rules;
      setScheduleDraft(WEEKDAYS.map((_, dayOfWeek) => {
        const rule = shownRules.find(item => item.dayOfWeek === dayOfWeek);
        return { dayOfWeek, enabled: result.proposedRules ? !!rule : result.source === 'LEGACY_TIMETABLE' || !!rule, openHour: String(rule?.openHour ?? 16), closeHour: String(rule?.closeHour ?? 25), hourlyRate: String(rule?.hourlyRate ?? selected.basePricePerHour) };
      }));
    } catch (e) { setScheduleError(e?.message || 'Could not load weekly hours.'); }
    finally { setScheduleLoading(false); }
  }

  function updateScheduleDay(dayOfWeek, field, value) {
    setScheduleDraft(current => current.map(item => item.dayOfWeek === dayOfWeek ? { ...item, [field]: value } : item));
  }

  async function saveSchedule() {
    if (!selected || busy) return;
    const rules = scheduleDraft.filter(item => item.enabled).map(item => ({ dayOfWeek: item.dayOfWeek, openHour: Number(item.openHour), closeHour: Number(item.closeHour), hourlyRate: Number(item.hourlyRate) }));
    if (rules.length === 0 || rules.some(rule => !Number.isInteger(rule.openHour) || !Number.isInteger(rule.closeHour) || rule.openHour < 0 || rule.closeHour > 30 || rule.closeHour <= rule.openHour || !Number.isFinite(rule.hourlyRate) || rule.hourlyRate <= 0)) { setScheduleError('Keep at least one open day. Use valid whole hours and a positive hourly rate. Hours after midnight can be 24–30.'); return; }
    setBusy(true); setScheduleError('');
    try { const result = await ownerApi.updateSchedule(selected.id, rules); setScheduleOpen(false); await loadVenues(); await loadSlots(); Alert.alert(result.source === 'PENDING_REVIEW' ? 'Schedule submitted' : 'Weekly hours saved', result.source === 'PENDING_REVIEW' ? 'Current hours stay live until administrator approval.' : 'Availability now follows this schedule.'); }
    catch (e) { setScheduleError(e?.message || 'Could not save weekly hours.'); }
    finally { setBusy(false); }
  }

  function actionFor(slot) {
    if (slot.status !== 'AVAILABLE' && slot.status !== 'BLOCKED') return;
    const interval = slot.status === 'BLOCKED' ? blocks.find(block => new Date(block.startTime) < new Date(slot.endTime) && new Date(block.endTime) > new Date(slot.startTime)) : null;
    if (slot.status === 'BLOCKED' && !interval) { setSlotError('Block details are unavailable. Refresh and try again.'); return; }
    const removing = !!interval;
    if (!removing) {
      Alert.alert('Reserve owner inventory', `${selected.name}\n${dateLabel(date)} · ${timeRange(slot.startTime, slot.endTime)}`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Inventory block', onPress: () => updateBlock(slot, null) },
        { text: 'Walk-in booking', onPress: () => { setWalkInName(''); setWalkInSlot(slot); } },
      ]);
      return;
    }
    Alert.alert(
      removing ? 'Remove inventory block?' : 'Block this slot?',
      `${selected.name}\n${dateLabel(date)} · ${timeRange(interval?.startTime || slot.startTime, interval?.endTime || slot.endTime)}\n${removing ? 'This entire inventory block will become available again.' : 'Players will not be able to reserve this interval. This is not a paid booking.'}`,
      [{ text: 'Cancel', style: 'cancel' }, { text: removing ? 'Remove block' : 'Block slot', onPress: () => updateBlock(slot, interval) }]
    );
  }

  async function saveWalkIn() {
    if (!selected || !walkInSlot || busy) return;
    if (!walkInName.trim()) { setSlotError('Enter the walk-in customer name.'); return; }
    setBusy(true); setSlotError('');
    try { await ownerApi.createWalkIn({ turfId: selected.id, startTime: walkInSlot.startTime, endTime: walkInSlot.endTime, customerName: walkInName.trim() }); setWalkInSlot(null); await loadSlots(); }
    catch (e) { setSlotError(e?.message || 'Could not record walk-in inventory.'); await loadSlots(); }
    finally { setBusy(false); }
  }

  async function updateBlock(slot, interval) {
    if (busy || !selected) return;
    setBusy(true); setSlotError('');
    try {
      if (interval) await ownerApi.deleteBlockedInterval(interval.id);
      else await ownerApi.createBlockedInterval({ turfId: selected.id, startTime: slot.startTime, endTime: slot.endTime, reason: 'Inventory block' });
      await loadSlots();
    } catch (e) { await loadSlots(); setSlotError(e?.message || 'Could not update this slot.'); }
    finally { setBusy(false); }
  }

  return <SafeAreaView style={styles.safe} edges={['top']}>
    <Header section="Venue partner" title="Manage venues" subtitle="Details, base rate and live inventory" />
    <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={loading} onRefresh={() => { loadVenues(); loadSlots(); }} colors={[COLORS.primaryDark]} />}>
      <Pressable accessibilityRole="button" onPress={openCreate} style={styles.editButton}><Ionicons name="add-circle-outline" size={20} color="#fff"/><Text style={styles.editText}>Create venue draft</Text></Pressable>
      {loading ? <View style={styles.state}><ActivityIndicator color={COLORS.primaryDark}/><Text style={styles.muted}>Loading your venues…</Text></View> : error ? <View style={styles.state}><Text style={styles.error}>{error}</Text><Pressable onPress={loadVenues} style={styles.retry}><Text style={styles.retryText}>Retry</Text></Pressable></View> : venues.length === 0 ? <View style={styles.state}><Ionicons name="football-outline" size={36} color={COLORS.primaryDark}/><Text style={styles.stateTitle}>No venues yet</Text><Text style={styles.muted}>A venue will appear here after it is linked to your owner account.</Text></View> : <>
        {venues.length > 1 ? <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.venuePicker}>{venues.map(venue => <Pressable key={venue.id} accessibilityRole="button" accessibilityState={{ selected: venue.id === selectedId }} onPress={() => setSelectedId(venue.id)} style={[styles.venueChip, venue.id === selectedId && styles.venueChipSelected]}><Text style={[styles.venueChipText, venue.id === selectedId && styles.venueChipTextSelected]} numberOfLines={1}>{venue.name}</Text></Pressable>)}</ScrollView> : null}
        {selected ? <>
          <View style={styles.venueCard}>
            {selected.coverImage ? <Image source={{ uri: selected.coverImage }} style={styles.cover} /> : <View style={styles.coverPlaceholder}><Ionicons name="football" size={35} color={COLORS.primaryDark}/></View>}
            <View style={styles.venueBody}><Text style={styles.venueName}>{selected.name}</Text><Text style={styles.muted}>{[selected.area, selected.city].filter(Boolean).join(', ')}</Text><Text style={styles.status}>{String(selected.status || '').replace(/_/g, ' ')}</Text>{selected.pendingRevision ? <Text style={styles.muted}>Your proposed changes await review. The current approved listing remains live.</Text> : selected.status === 'PENDING_REVIEW' ? <Text style={styles.muted}>Awaiting administrator review. Players cannot see this venue yet.</Text> : null}<View style={styles.rateRow}><Text style={styles.rateLabel}>Base hourly rate</Text><Text style={styles.rate}>{money(selected.basePricePerHour)}</Text></View><Pressable accessibilityRole="button" onPress={openEdit} style={styles.editButton}><Ionicons name="create-outline" size={18} color="#fff"/><Text style={styles.editText}>Edit venue and base rate</Text></Pressable></View>
          </View>
          {['DRAFT', 'REJECTED'].includes(selected.status) ? <Pressable accessibilityRole="button" accessibilityState={{ disabled: busy }} disabled={busy} onPress={submitDraft} style={styles.editButton}><Text style={styles.editText}>Submit venue for review</Text></Pressable> : null}
          <Pressable accessibilityRole="button" onPress={openSchedule} style={styles.editButton}><Ionicons name="calendar-outline" size={18} color="#fff"/><Text style={styles.editText}>Weekly hours and rates</Text></Pressable>
          <Text style={styles.sectionTitle}>Slot inventory</Text><Text style={styles.muted}>Select a date, then tap an available slot to block it or an inventory block to remove it.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>{dates.map(day => <Pressable key={day} accessibilityRole="button" accessibilityState={{ selected: day === date }} onPress={() => setDate(day)} style={[styles.dateChip, day === date && styles.dateSelected]}><Text style={[styles.dateText, day === date && styles.dateTextSelected]}>{dateLabel(day)}</Text></Pressable>)}</ScrollView>
          {slotError ? <View style={styles.errorPanel}><Text style={styles.error}>{slotError}</Text><Pressable accessibilityRole="button" onPress={loadSlots}><Text style={styles.retryTextInline}>Refresh slots</Text></Pressable></View> : null}
          {slotsLoading ? <View style={styles.state}><ActivityIndicator color={COLORS.primaryDark}/><Text style={styles.muted}>Loading live inventory…</Text></View> : slots.length === 0 ? <View style={styles.state}><Text style={styles.muted}>No slots for this date.</Text></View> : <View style={styles.slotGrid}>{slots.map(slot => <Pressable key={slot.slotId} accessibilityRole="button" accessibilityLabel={`${timeRange(slot.startTime, slot.endTime)}, ${STATUS_LABEL[slot.status] || slot.status}`} accessibilityState={{ disabled: busy || !['AVAILABLE', 'BLOCKED'].includes(slot.status), busy }} disabled={busy || !['AVAILABLE', 'BLOCKED'].includes(slot.status)} onPress={() => actionFor(slot)} style={[styles.slot, slot.status === 'AVAILABLE' ? styles.slotAvailable : slot.status === 'BLOCKED' ? styles.slotBlocked : styles.slotUnavailable]}><Text style={styles.slotTime}>{timeRange(slot.startTime, slot.endTime)}</Text><Text style={styles.slotStatus}>{STATUS_LABEL[slot.status] || slot.status}</Text></Pressable>)}</View>}
        </> : null}
      </>}
    </ScrollView>

    <Modal visible={editing} animationType="slide" onRequestClose={() => !busy && setEditing(false)}><SafeAreaView style={styles.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalHeader}><Text style={styles.modalTitle}>{creatingNew ? 'Create draft' : 'Edit venue'}</Text><Pressable accessibilityRole="button" accessibilityLabel="Close editor" disabled={busy} onPress={() => setEditing(false)} style={styles.close}><Ionicons name="close" size={24} color={COLORS.textPrimary}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>{draft ? <><Text style={styles.muted}>{creatingNew ? 'Save a draft, then submit it for review when complete.' : selected?.status === 'APPROVED' ? 'Saving submits changes for administrator review. Your approved listing stays visible until the decision.' : 'Save venue details before submitting for review.'}</Text><EditField label="Venue name" value={draft.name} onChangeText={name => setDraft({ ...draft, name })}/><EditField label="City" value={draft.city} onChangeText={city => setDraft({ ...draft, city })}/><EditField label="Area" value={draft.area} onChangeText={area => setDraft({ ...draft, area })}/><EditField label="Address" value={draft.address} onChangeText={address => setDraft({ ...draft, address })}/><EditField label="Description" value={draft.description} multiline onChangeText={description => setDraft({ ...draft, description })}/><EditField label="Pitch formats (e.g. 5v5, 7v7)" value={draft.pitchFormats} onChangeText={pitchFormats => setDraft({ ...draft, pitchFormats })}/><EditField label="Cover image URL" value={draft.coverImage} onChangeText={coverImage => setDraft({ ...draft, coverImage })}/><EditField label="Gallery image URLs (one per line, up to 10)" value={draft.imageUrlsText} multiline onChangeText={imageUrlsText => setDraft({ ...draft, imageUrlsText })}/><EditField label="Base price per hour (BDT)" value={draft.basePricePerHour} keyboardType="numeric" onChangeText={basePricePerHour => setDraft({ ...draft, basePricePerHour })}/><Text style={styles.fieldLabel}>Facilities</Text><View style={styles.facilities}>{FACILITIES.map(([key, label]) => <Pressable key={key} accessibilityRole="checkbox" accessibilityState={{ checked: !!draft[key] }} onPress={() => setDraft({ ...draft, [key]: !draft[key] })} style={[styles.facility, draft[key] && styles.facilityOn]}><Ionicons name={draft[key] ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={draft[key] ? COLORS.primaryDark : COLORS.textMuted}/><Text style={styles.facilityText}>{label}</Text></Pressable>)}</View></> : null}</ScrollView><View style={styles.modalFooter}><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={saveEdit} style={styles.saveButton}>{busy ? <ActivityIndicator color="#fff"/> : <Text style={styles.saveText}>{creatingNew ? 'Save draft' : selected?.status === 'APPROVED' ? 'Submit changes for review' : 'Save details'}</Text>}</Pressable></View></KeyboardAvoidingView></SafeAreaView></Modal>
    <Modal visible={!!walkInSlot} animationType="slide" onRequestClose={() => !busy && setWalkInSlot(null)}><SafeAreaView style={styles.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Walk-in booking</Text><Pressable accessibilityRole="button" accessibilityLabel="Close walk-in form" disabled={busy} onPress={() => setWalkInSlot(null)} style={styles.close}><Ionicons name="close" size={24} color={COLORS.textPrimary}/></Pressable></View><View style={styles.modalContent}><Text style={styles.muted}>{walkInSlot ? `${dateLabel(date)} · ${timeRange(walkInSlot.startTime, walkInSlot.endTime)}` : ''}</Text><Text style={styles.muted}>This reserves inventory without an online payment.</Text><EditField label="Customer name" value={walkInName} onChangeText={setWalkInName}/>{slotError ? <Text accessibilityRole="alert" style={styles.error}>{slotError}</Text> : null}<Pressable accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={saveWalkIn} style={styles.saveButton}><Text style={styles.saveText}>{busy ? 'Saving…' : 'Record walk-in'}</Text></Pressable></View></KeyboardAvoidingView></SafeAreaView></Modal>
    <Modal visible={scheduleOpen} animationType="slide" onRequestClose={() => !busy && setScheduleOpen(false)}><SafeAreaView style={styles.safe} edges={['top', 'bottom']}><KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Weekly schedule</Text><Pressable accessibilityRole="button" accessibilityLabel="Close schedule" disabled={busy} onPress={() => setScheduleOpen(false)} style={styles.close}><Ionicons name="close" size={24} color={COLORS.textPrimary}/></Pressable></View><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.modalContent}>{scheduleLoading ? <ActivityIndicator color={COLORS.primaryDark}/> : scheduleDraft.map(item => <View key={item.dayOfWeek} style={styles.venueCard}><View style={{ padding: SPACING.md, gap: SPACING.sm }}><Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.enabled }} onPress={() => updateScheduleDay(item.dayOfWeek, 'enabled', !item.enabled)} style={styles.facility}><Ionicons name={item.enabled ? 'checkmark-circle' : 'ellipse-outline'} size={20} color={COLORS.primaryDark}/><Text style={styles.fieldLabel}>{WEEKDAYS[item.dayOfWeek]}</Text></Pressable>{item.enabled ? <><EditField label="Open hour (0–23)" value={item.openHour} keyboardType="numeric" onChangeText={value => updateScheduleDay(item.dayOfWeek, 'openHour', value)}/><EditField label="Close hour (up to 30 for after midnight)" value={item.closeHour} keyboardType="numeric" onChangeText={value => updateScheduleDay(item.dayOfWeek, 'closeHour', value)}/><EditField label="Hourly rate (BDT)" value={item.hourlyRate} keyboardType="numeric" onChangeText={value => updateScheduleDay(item.dayOfWeek, 'hourlyRate', value)}/></> : <Text style={styles.muted}>Closed</Text>}</View></View>)}{scheduleError ? <Text accessibilityRole="alert" style={styles.error}>{scheduleError}</Text> : null}</ScrollView><View style={styles.modalFooter}><Pressable accessibilityRole="button" accessibilityState={{ disabled: busy || scheduleLoading, busy }} disabled={busy || scheduleLoading} onPress={saveSchedule} style={styles.saveButton}><Text style={styles.saveText}>{busy ? 'Saving…' : 'Save weekly schedule'}</Text></Pressable></View></KeyboardAvoidingView></SafeAreaView></Modal>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background }, content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl, gap: SPACING.md }, muted: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, lineHeight: 20 }, error: { color: COLORS.danger, fontSize: FONT_SIZE.sm }, state: { minHeight: 150, backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', padding: SPACING.lg, gap: SPACING.sm }, stateTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.lg, fontWeight: FONT_WEIGHT.bold }, retry: { minHeight: 44, backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.md, paddingHorizontal: SPACING.lg, justifyContent: 'center' }, retryText: { color: '#fff', fontWeight: FONT_WEIGHT.semibold },
  venuePicker: { gap: SPACING.sm }, venueChip: { minHeight: 44, maxWidth: 185, paddingHorizontal: SPACING.md, backgroundColor: COLORS.card, borderRadius: RADIUS.pill, justifyContent: 'center', borderWidth: 1, borderColor: COLORS.border }, venueChipSelected: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark }, venueChipText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold }, venueChipTextSelected: { color: '#fff' },
  venueCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden' }, cover: { width: '100%', height: 180 }, coverPlaceholder: { height: 140, backgroundColor: '#E7F3EA', alignItems: 'center', justifyContent: 'center' }, venueBody: { padding: SPACING.lg, gap: SPACING.xs }, venueName: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold }, status: { alignSelf: 'flex-start', paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.pill, backgroundColor: '#E7F3EA', color: COLORS.primaryDark, fontSize: FONT_SIZE.xs, fontWeight: FONT_WEIGHT.semibold }, rateRow: { marginTop: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, rateLabel: { color: COLORS.textMuted, fontSize: FONT_SIZE.sm }, rate: { color: COLORS.primaryDark, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold }, editButton: { marginTop: SPACING.md, minHeight: 48, borderRadius: RADIUS.lg, backgroundColor: COLORS.primaryDark, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm }, editText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.semibold },
  sectionTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xl, fontWeight: FONT_WEIGHT.bold, marginTop: SPACING.md }, dates: { gap: SPACING.sm }, dateChip: { minHeight: 44, paddingHorizontal: SPACING.md, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, justifyContent: 'center' }, dateSelected: { backgroundColor: COLORS.primaryDark, borderColor: COLORS.primaryDark }, dateText: { color: COLORS.textSecondary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold }, dateTextSelected: { color: '#fff' }, errorPanel: { padding: SPACING.md, borderRadius: RADIUS.md, backgroundColor: '#FFF0F0', gap: SPACING.sm }, retryTextInline: { color: COLORS.primaryDark, fontWeight: FONT_WEIGHT.semibold, fontSize: FONT_SIZE.sm }, slotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }, slot: { width: '48%', minHeight: 78, borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, justifyContent: 'space-between' }, slotAvailable: { backgroundColor: '#F3FAF5', borderColor: COLORS.primaryDark }, slotBlocked: { backgroundColor: '#FFF6E6', borderColor: '#C78013' }, slotUnavailable: { backgroundColor: '#F1F3F2', borderColor: COLORS.border }, slotTime: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.bold }, slotStatus: { color: COLORS.textSecondary, fontSize: FONT_SIZE.xs },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border }, modalTitle: { color: COLORS.textPrimary, fontSize: FONT_SIZE.xxl, fontWeight: FONT_WEIGHT.bold }, close: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }, modalContent: { padding: SPACING.lg, gap: SPACING.md, paddingBottom: SPACING.xxl }, field: { gap: SPACING.xs }, fieldLabel: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm, fontWeight: FONT_WEIGHT.semibold }, input: { minHeight: 48, borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card, color: COLORS.textPrimary, paddingHorizontal: SPACING.md, fontSize: FONT_SIZE.md }, multiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: SPACING.md }, facilities: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm }, facility: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.pill, backgroundColor: COLORS.card, paddingHorizontal: SPACING.md }, facilityOn: { borderColor: COLORS.primaryDark, backgroundColor: '#E7F3EA' }, facilityText: { color: COLORS.textPrimary, fontSize: FONT_SIZE.sm }, modalFooter: { padding: SPACING.lg, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.border }, saveButton: { minHeight: 50, backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.lg, alignItems: 'center', justifyContent: 'center' }, saveText: { color: '#fff', fontSize: FONT_SIZE.md, fontWeight: FONT_WEIGHT.bold },
});
