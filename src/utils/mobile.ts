import type { Booking, Slot } from '../types/models';
export const DHAKA_OFFSET = 6 * 60 * 60 * 1000;
export function dateKey(value: string | Date = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return new Date(new Date(value).getTime() + DHAKA_OFFSET).toISOString().slice(0, 10);
}
export function upcomingDates(count = 14) {
  const start = new Date(`${dateKey()}T00:00:00+06:00`).getTime();
  return Array.from({length: count}, (_, i) => dateKey(new Date(start + i * 86400000)));
}
export function dateLabel(value: string | Date) {
  const d = new Date(`${dateKey(value)}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', {timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short'});
}
export function timeLabel(value: string) {
  return new Date(value).toLocaleTimeString('en-US', {timeZone: 'Asia/Dhaka', hour: 'numeric', minute: '2-digit'});
}
export function timeRange(start: string, end: string) { return `${timeLabel(start)} – ${timeLabel(end)}`; }
export function money(value: number) { return `৳${Number(value).toLocaleString('en-BD', {maximumFractionDigits: 0})}`; }
export function bookingGroup(b: Booking, now = Date.now()) {
  const status = b.status.toUpperCase();
  if (status === 'CANCELLED') return 'cancelled';
  if (status === 'COMPLETED' || (status === 'CONFIRMED' && new Date(b.endTime).getTime() <= now)) return 'past';
  return 'upcoming';
}
export function cheaperSlots(selected: Slot, slots: Slot[]) {
  return slots.filter(s => s.status === 'AVAILABLE' && s.slotId !== selected.slotId && s.price < selected.price)
    .sort((a,b) => a.price - b.price || a.startTime.localeCompare(b.startTime)).slice(0,3);
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : 'Unable to connect. Please try again.'; }
export function remainingMs(expiresAt: string, serverOffset: number, now = Date.now()) {
  return Math.max(0, new Date(expiresAt).getTime() - now - serverOffset);
}
