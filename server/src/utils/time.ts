import { DateTime } from 'luxon';

// A calendar day in the player's time zone, as 'YYYY-MM-DD'.
// Using plain strings for days avoids the classic bug where a JavaScript Date at
// midnight UTC shows up as "the day before" in another time zone.
export type LocalDate = string;

// Today's date for a player, e.g. '2026-11-24' in Africa/Tunis
export function localDate(timezone: string, now: Date): LocalDate {
  return DateTime.fromJSDate(now).setZone(timezone).toISODate()!;
}

export function addDays(date: LocalDate, days: number): LocalDate {
  return DateTime.fromISO(date, { zone: 'utc' }).plus({ days }).toISODate()!;
}

// Monday of the week containing `date` (weeks start on Monday)
export function mondayOf(date: LocalDate): LocalDate {
  return DateTime.fromISO(date, { zone: 'utc' }).startOf('week').toISODate()!;
}

// The instant the player's day ends (next local midnight), as a real timestamp.
// Luxon handles daylight-saving changes, where a day can last 23 or 25 hours.
export function endOfLocalDay(date: LocalDate, timezone: string): Date {
  return DateTime.fromISO(date, { zone: timezone }).plus({ days: 1 }).toJSDate();
}

// The instant the week starting on `monday` ends (next Monday, local midnight)
export function endOfLocalWeek(monday: LocalDate, timezone: string): Date {
  return DateTime.fromISO(monday, { zone: timezone }).plus({ weeks: 1 }).toJSDate();
}

// PostgreSQL DATE columns are read and written by Prisma as midnight UTC
export function toDbDate(date: LocalDate): Date {
  return new Date(`${date}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): LocalDate {
  return date.toISOString().slice(0, 10);
}
