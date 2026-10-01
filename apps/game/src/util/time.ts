/**
 * Clock helpers. DB timestamps are wall-clock values read as UTC Dates (packages/db README "Type mapping"),
 * and the protocol writes DateTime parts with utc=true, so the server treats "now" as UTC wall clock.
 */
export type Clock = () => Date;
export const systemClock: Clock = () => new Date();

/** C# DateTime.MinValue (0001-01-01 00:00:00). */
export const MIN_DATE = new Date(Date.UTC(1, 0, 1));
MIN_DATE.setUTCFullYear(1);

export function sameUtcDay(a: Date, b: Date): boolean {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

export function unixSeconds(d: Date = new Date()): number {
  return Math.floor(d.getTime() / 1000);
}

/** Valid C# DateTime for the wire (year 1..9999); null/invalid -> MinValue. */
export function wireDate(d: Date | null | undefined): Date {
  if (!d || Number.isNaN(d.getTime())) return MIN_DATE;
  const y = d.getUTCFullYear();
  if (y < 1 || y > 9999) return MIN_DATE;
  return d;
}
