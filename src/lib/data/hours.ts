/** Business hours by JS `Date#getDay()` index (0 = Sunday … 6 = Saturday). */
export const businessHours: Record<number, { openMin: number; closeMin: number } | null> = {
  0: null, // Sonntag – geschlossen
  1: { openMin: 9 * 60, closeMin: 19 * 60 },
  2: { openMin: 9 * 60, closeMin: 19 * 60 },
  3: { openMin: 9 * 60, closeMin: 19 * 60 },
  4: { openMin: 9 * 60, closeMin: 19 * 60 },
  5: { openMin: 9 * 60, closeMin: 19 * 60 },
  6: { openMin: 9 * 60, closeMin: 18 * 60 },
};

export const weekdayLabels = [
  "Sonntag",
  "Montag",
  "Dienstag",
  "Mittwoch",
  "Donnerstag",
  "Freitag",
  "Samstag",
];

/** Mon → Sun, for the opening-hours chart. */
export const weeklySchedule: { short: string; window: { openMin: number; closeMin: number } | null }[] = [
  1, 2, 3, 4, 5, 6, 0,
].map((weekday) => ({
  short: weekdayLabels[weekday].slice(0, 2).toUpperCase(),
  window: businessHours[weekday],
}));
