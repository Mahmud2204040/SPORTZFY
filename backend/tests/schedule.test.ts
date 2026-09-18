import { test } from "node:test";
import { strict as assert } from "node:assert";
import { dhakaDayStart, scheduleForDate, slotSchedule } from "../lib/schedule";

test("owner rules replace the legacy timetable and cover after-midnight slots", () => {
  const rules = [{ dayOfWeek: 6, openHour: 20, closeHour: 25, hourlyRate: 1800 }];
  const schedule = scheduleForDate("2026-09-19", rules);
  assert.deepEqual(schedule.hours, [20, 21, 22, 23, 24]);
  assert.equal(schedule.fallback, false);
  const midnight = new Date(dhakaDayStart("2026-09-19").getTime() + 24 * 60 * 60 * 1000);
  assert.deepEqual(slotSchedule(midnight, new Date(midnight.getTime() + 60 * 60 * 1000), rules), { hourlyRate: 1800, fallback: false });
  assert.equal(slotSchedule(new Date(midnight.getTime() + 60 * 60 * 1000), new Date(midnight.getTime() + 2 * 60 * 60 * 1000), rules), null);
});
