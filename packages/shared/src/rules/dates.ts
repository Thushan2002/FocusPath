/** Calendar date (YYYY-MM-DD) of an instant in the learner's timezone. */
export function localDate(at: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(at);
  } catch {
    return at.toISOString().slice(0, 10);
  }
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIsoDate: string, toIsoDate: string): number {
  const a = Date.parse(`${fromIsoDate}T00:00:00Z`);
  const b = Date.parse(`${toIsoDate}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/** The 7 dates of the week (Sunday-first, like the design) containing `isoDate`. */
export function weekDates(isoDate: string): string[] {
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  const start = addDays(isoDate, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}
