export type ScheduleRule = { dayOfWeek: number; openHour: number; closeHour: number; hourlyRate: number };

const HOUR = 60 * 60 * 1000;
const DHAKA_OFFSET = 6 * HOUR;

export function dhakaDate(date: Date): string {
  return new Date(date.getTime() + DHAKA_OFFSET).toISOString().slice(0, 10);
}

export function dhakaDayStart(date: string): Date {
  return new Date(new Date(`${date}T00:00:00.000Z`).getTime() - DHAKA_OFFSET);
}

export function scheduleForDate(date: string, rules: ScheduleRule[]): { hours: number[]; rateByHour: Map<number, number>; fallback: boolean } {
  if (rules.length === 0) return { hours: [16, 17, 18, 19, 20, 21, 22, 23, 24], rateByHour: new Map(), fallback: true };
  const dayStart = dhakaDayStart(date);
  const weekday = new Date(dayStart.getTime() + DHAKA_OFFSET).getUTCDay();
  const applicable = rules.filter(rule => rule.dayOfWeek === weekday);
  const hours: number[] = [];
  const rateByHour = new Map<number, number>();
  for (const rule of applicable) {
    if (!Number.isInteger(rule.openHour) || !Number.isInteger(rule.closeHour) || rule.openHour < 0 || rule.closeHour > 30 || rule.closeHour <= rule.openHour) continue;
    for (let hour = rule.openHour; hour < rule.closeHour; hour++) {
      if (!rateByHour.has(hour)) hours.push(hour);
      rateByHour.set(hour, rule.hourlyRate);
    }
  }
  return { hours: hours.sort((a, b) => a - b), rateByHour, fallback: false };
}

export function slotFitsSchedule(start: Date, end: Date, rules: ScheduleRule[]): boolean {
  return slotSchedule(start, end, rules) !== null;
}

export function slotSchedule(start: Date, end: Date, rules: ScheduleRule[]): { hourlyRate: number | undefined; fallback: boolean } | null {
  const current = dhakaDayStart(dhakaDate(start));
  for (const dayStart of [current, new Date(current.getTime() - 24 * HOUR)]) {
    const date = dhakaDate(dayStart);
    const schedule = scheduleForDate(date, rules);
    const startHour = (start.getTime() - dayStart.getTime()) / HOUR;
    const endHour = (end.getTime() - dayStart.getTime()) / HOUR;
    if (!Number.isInteger(startHour) || !Number.isInteger(endHour)) continue;
    let valid = true;
    for (let hour = startHour; hour < endHour; hour++) if (!schedule.hours.includes(hour)) valid = false;
    if (valid) return { hourlyRate: schedule.rateByHour.get(startHour), fallback: schedule.fallback };
  }
  return null;
}
