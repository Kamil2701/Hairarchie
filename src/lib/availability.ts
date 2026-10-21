import { businessHours } from "@/lib/data/hours";

export type BookedRange = { startMin: number; durationMin: number };

const SLOT_STEP_MIN = 30;

/** Minutes-from-midnight "HH:MM" formatter, for slot labels. */
export function minutesToLabel(min: number): string {
  const h = Math.floor(min / 60)
    .toString()
    .padStart(2, "0");
  const m = (min % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export function dateToWeekday(dateISO: string): number {
  // Parse as a local calendar date, not UTC midnight, so weekday matches
  // what the salon (and the customer) means by that date.
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

export type SlotInfo = { startMin: number; available: boolean };

/**
 * Every slot the salon could start a service in on a given date, each
 * flagged whether it's still free — a slot must fully fit before
 * closing time, and must not overlap anything already booked.
 */
export function daySlots(
  dateISO: string,
  serviceDurationMin: number,
  booked: BookedRange[],
): SlotInfo[] {
  const weekday = dateToWeekday(dateISO);
  const window = businessHours[weekday];
  if (!window) return [];

  const slots: SlotInfo[] = [];
  for (
    let start = window.openMin;
    start + serviceDurationMin <= window.closeMin;
    start += SLOT_STEP_MIN
  ) {
    const end = start + serviceDurationMin;
    const overlaps = booked.some(
      (b) => start < b.startMin + b.durationMin && end > b.startMin,
    );
    slots.push({ startMin: start, available: !overlaps });
  }
  return slots;
}

/**
 * Every bookable start time for a given date and service duration, minus
 * whatever's already booked. A slot must fully fit before closing time.
 */
export function availableSlots(
  dateISO: string,
  serviceDurationMin: number,
  booked: BookedRange[],
): number[] {
  return daySlots(dateISO, serviceDurationMin, booked)
    .filter((s) => s.available)
    .map((s) => s.startMin);
}

/** A blocked period as it applies to one specific date — either a
 * specific window (startMin/endMin set) or the whole day (both null). */
export type BlockedWindow = { startMin: number | null; endMin: number | null };

/** Turns admin-created blocks into the same shape as `booked` ranges, so
 * `daySlots` can treat "blocked" and "already booked" identically. A
 * whole-day block expands to the full business-hours window for that
 * date — if the salon is closed that day anyway, it's a no-op. */
export function blocksToRanges(dateISO: string, blocks: BlockedWindow[]): BookedRange[] {
  const window = businessHours[dateToWeekday(dateISO)];
  if (!window) return [];

  return blocks.map((b) => {
    if (b.startMin === null || b.endMin === null) {
      return { startMin: window.openMin, durationMin: window.closeMin - window.openMin };
    }
    return { startMin: b.startMin, durationMin: b.endMin - b.startMin };
  });
}

/** The next N bookable dates (YYYY-MM-DD), skipping days the salon is closed. */
export function upcomingOpenDates(count: number, from: Date = new Date()): string[] {
  const dates: string[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (dates.length < count) {
    if (businessHours[cursor.getDay()]) {
      const y = cursor.getFullYear();
      const m = (cursor.getMonth() + 1).toString().padStart(2, "0");
      const d = cursor.getDate().toString().padStart(2, "0");
      dates.push(`${y}-${m}-${d}`);
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}
