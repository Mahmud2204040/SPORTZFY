// Lightweight date helpers used by the Turf Details screen and
// Booking/Confirmation flow. Keeping them centralized so swapping
// for a real API later is easy.

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format like "20 August 2026"
export function formatLongDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// Format like "20 Aug"
export function formatShortDate(date) {
  return `${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}

// Format like "Thu, 20 Aug"
export function formatDayWithDate(date) {
  return `${DAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()].slice(0, 3)}`;
}

// Format date to YYYY-MM-DD for API query params
export function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Build a list of N upcoming dates starting from today.
export function getUpcomingDates(count = 4) {
  const list = [];
  for (let i = 0; i < count; i++) {
    const [year, month, day] = dhakaDateOffset(i).split('-').map(Number);
    list.push(new Date(year, month - 1, day));
  }
  return list;
}

// ISO time label like "5:00 PM – 6:00 PM" from ISO strings
export function formatTimeRange(startISO, endISO) {
  if (!startISO || !endISO) return '';
  const fmt = (iso) => {
    const d = new Date(iso);
    let h = d.getHours();
    const m = String(d.getMinutes()).padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${h}:${m} ${ampm}`;
  };
  return `${fmt(startISO)} – ${fmt(endISO)}`;
}

// Countdown timer helper: returns "M:SS" from milliseconds remaining
export function formatCountdown(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

export function dhakaDateOffset(days = 0) {
  const dhaka = new Date(Date.now() + 6 * 60 * 60 * 1000);
  dhaka.setUTCDate(dhaka.getUTCDate() + days);
  return dhaka.toISOString().slice(0, 10);
}

export function nextDhakaFriday() {
  const today = new Date(`${dhakaDateOffset()}T00:00:00Z`);
  return dhakaDateOffset((5 - today.getUTCDay() + 7) % 7);
}
